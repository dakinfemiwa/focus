import type {
    ScheduledTask,
    ScheduleValidation,
    SchedulingProblem,
    SchedulingTask,
    UnscheduledReason,
    WorkingPeriod,
} from "./types";

const minuteMs = 60000;

export function isCompleted(task: SchedulingTask): boolean {
  return task.status === "completed";
}

export function durationMs(task: SchedulingTask): number {
  return task.estimatedMinutes * minuteMs;
}

export function taskFitsPeriod(
  task: SchedulingTask,
  startTime: Date,
  period: WorkingPeriod,
): boolean {
  const endTime = new Date(startTime.getTime() + durationMs(task));
  return startTime >= period.start && endTime <= period.end;
}

function pairsMatch(
  pair: readonly [string, string],
  leftId: string,
  rightId: string,
): boolean {
  return (
    (pair[0] === leftId && pair[1] === rightId) ||
    (pair[0] === rightId && pair[1] === leftId)
  );
}

export function tasksCanOverlap(
  left: SchedulingTask,
  right: SchedulingTask,
  problem: SchedulingProblem,
): boolean {
  if (
    problem.constraints?.incompatiblePairs?.some((pair) =>
      pairsMatch(pair, left.id, right.id),
    )
  ) {
    return false;
  }
  if (problem.constraints?.canOverlap) {
    return problem.constraints.canOverlap(left, right);
  }
  return (
    left.attentionType === "concurrent" && right.attentionType === "concurrent"
  );
}

function overlaps(left: ScheduledTask, right: ScheduledTask): boolean {
  return left.startTime < right.endTime && right.startTime < left.endTime;
}

function fixedFieldsAreConsistent(task: SchedulingTask): boolean {
  return (
    (!task.fixedStart && !task.fixedEnd) ||
    (!!task.fixedStart &&
      !!task.fixedEnd &&
      task.fixedEnd.getTime() - task.fixedStart.getTime() === durationMs(task))
  );
}

export function validateSchedule(
  schedule: ReadonlyArray<ScheduledTask>,
  problem: SchedulingProblem,
): ScheduleValidation {
  const violations: Array<ScheduleValidation["violations"][number]> = [];
  const periods = problem.workingPeriods;

  for (const period of periods) {
    if (period.end <= period.start) {
      violations.push({
        code: "invalid_period",
        message: "Working period must end after it starts.",
      });
    }
  }

  for (const item of schedule) {
    const expectedEnd = new Date(
      item.startTime.getTime() + durationMs(item.task),
    );
    if (
      item.task.estimatedMinutes <= 0 ||
      item.endTime.getTime() !== expectedEnd.getTime()
    ) {
      violations.push({
        taskId: item.task.id,
        code: "invalid_duration",
        message: "Scheduled duration does not match the task duration.",
      });
    }
    if (
      !periods.some((period) =>
        taskFitsPeriod(item.task, item.startTime, period),
      )
    ) {
      violations.push({
        taskId: item.task.id,
        code: "outside_working_period",
        message: "Task is outside a working period.",
      });
    }
    if (item.task.dueDate && item.endTime > item.task.dueDate) {
      violations.push({
        taskId: item.task.id,
        code: "deadline",
        message: "Task ends after its deadline.",
      });
    }
    if (item.task.earliestStart && item.startTime < item.task.earliestStart) {
      violations.push({
        taskId: item.task.id,
        code: "earliest_start",
        message: "Task starts before its earliest start.",
      });
    }
    if (item.task.latestStart && item.startTime > item.task.latestStart) {
      violations.push({
        taskId: item.task.id,
        code: "latest_start",
        message: "Task starts after its latest start.",
      });
    }
    if (!fixedFieldsAreConsistent(item.task)) {
      violations.push({
        taskId: item.task.id,
        code: "fixed_time",
        message: "Fixed time does not match task duration.",
      });
    } else if (
      item.task.fixedStart &&
      (item.startTime.getTime() !== item.task.fixedStart.getTime() ||
        item.endTime.getTime() !== item.task.fixedEnd?.getTime())
    ) {
      violations.push({
        taskId: item.task.id,
        code: "fixed_time",
        message: "Task does not respect its fixed time.",
      });
    }
  }

  for (let leftIndex = 0; leftIndex < schedule.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < schedule.length;
      rightIndex += 1
    ) {
      const left = schedule[leftIndex];
      const right = schedule[rightIndex];
      if (
        overlaps(left, right) &&
        !tasksCanOverlap(left.task, right.task, problem)
      ) {
        violations.push({
          taskId: right.task.id,
          code: "overlap",
          message: "Incompatible tasks overlap.",
        });
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

export function candidateStarts(
  task: SchedulingTask,
  problem: SchedulingProblem,
  schedule: ReadonlyArray<ScheduledTask>,
): ReadonlyArray<Date> {
  const starts = new Map<number, Date>();
  const add = (date: Date) => starts.set(date.getTime(), date);

  for (const period of problem.workingPeriods) {
    add(period.start);
    add(new Date(period.end.getTime() - durationMs(task)));
    if (task.earliestStart) add(task.earliestStart);
    if (task.latestStart) add(task.latestStart);
    if (task.dueDate) add(new Date(task.dueDate.getTime() - durationMs(task)));
  }
  for (const item of schedule) {
    add(item.endTime);
    add(new Date(item.startTime.getTime() - durationMs(task)));
  }
  if (task.fixedStart) add(task.fixedStart);

  return [...starts.values()].sort(
    (left, right) => left.getTime() - right.getTime(),
  );
}

export function placementIsFeasible(
  placement: ScheduledTask,
  problem: SchedulingProblem,
  schedule: ReadonlyArray<ScheduledTask>,
): boolean {
  return validateSchedule([...schedule, placement], problem).valid;
}

export function classifyUnscheduledTask(
  task: SchedulingTask,
  problem: SchedulingProblem,
  schedule: ReadonlyArray<ScheduledTask>,
): UnscheduledReason {
  if (task.fixedStart || task.fixedEnd) return "fixed_time_conflict";
  if (task.estimatedMinutes <= 0) return "insufficient_time";
  if (!problem.workingPeriods.some((period) => period.end > period.start)) {
    return "insufficient_time";
  }
  if (task.dueDate && task.dueDate.getTime() <= Date.now())
    return "deadline_conflict";
  const hasWindow = candidateStarts(task, problem, schedule).some((start) =>
    problem.workingPeriods.some((period) =>
      taskFitsPeriod(task, start, period),
    ),
  );
  return hasWindow ? "constraint_conflict" : "no_valid_window";
}
