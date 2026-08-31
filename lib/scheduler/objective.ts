import type {
    ScheduledTask,
    SchedulerConfig,
    SchedulingProblem,
} from "./types";

export const defaultSchedulerConfig: SchedulerConfig = {
  urgencyWeight: 0.35,
  utilisationWeight: 0.2,
  fragmentationWeight: 0.01,
  contextSwitchWeight: 0.25,
  urgencySlopePerMinute: 0.08,
  urgencyMidpointMinutes: 24 * 60,
  defaultUrgency: 0.25,
  maxIterations: 1000,
};

export function resolveSchedulerConfig(
  config: SchedulingProblem["config"],
): SchedulerConfig {
  return { ...defaultSchedulerConfig, ...config };
}

export function normalisePriority(priority: number): number {
  return Math.max(0, Math.min(10, priority)) / 10;
}

export function deadlineUrgency(
  deadline: Date | undefined,
  completionTime: Date,
  config: Pick<
    SchedulerConfig,
    "defaultUrgency" | "urgencySlopePerMinute" | "urgencyMidpointMinutes"
  >,
): number {
  if (!deadline) return config.defaultUrgency;

  const remainingMinutes =
    (deadline.getTime() - completionTime.getTime()) / 60000;
  const exponent =
    config.urgencySlopePerMinute *
    (remainingMinutes - config.urgencyMidpointMinutes);
  return 1 / (1 + Math.exp(exponent));
}

export function taskTimingValue(
  scheduledTask: ScheduledTask,
  config: SchedulerConfig,
): number {
  const baseValue = normalisePriority(scheduledTask.task.priority);
  const urgency = deadlineUrgency(
    scheduledTask.task.dueDate,
    scheduledTask.endTime,
    config,
  );
  return baseValue + config.urgencyWeight * urgency;
}

function availableMinutes(problem: SchedulingProblem): number {
  return problem.workingPeriods.reduce(
    (total, period) =>
      total +
      Math.max(0, (period.end.getTime() - period.start.getTime()) / 60000),
    0,
  );
}

function scheduledMinutes(schedule: ReadonlyArray<ScheduledTask>): number {
  return schedule.reduce(
    (total, item) => total + item.task.estimatedMinutes,
    0,
  );
}

function fragmentationMinutes(
  schedule: ReadonlyArray<ScheduledTask>,
  problem: SchedulingProblem,
): number {
  let total = 0;
  for (const period of problem.workingPeriods) {
    const tasks = schedule
      .filter(
        (item) => item.startTime >= period.start && item.endTime <= period.end,
      )
      .sort(
        (left, right) => left.startTime.getTime() - right.startTime.getTime(),
      );
    for (let index = 1; index < tasks.length; index += 1) {
      total += Math.max(
        0,
        (tasks[index].startTime.getTime() -
          tasks[index - 1].endTime.getTime()) /
          60000,
      );
    }
  }
  return total;
}

function contextSwitches(schedule: ReadonlyArray<ScheduledTask>): number {
  const ordered = [...schedule].sort(
    (left, right) => left.startTime.getTime() - right.startTime.getTime(),
  );
  let switches = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].task.category !== ordered[index].task.category) {
      switches += 1;
    }
  }
  return switches;
}

export type ObjectiveBreakdown = {
  timingValue: number;
  utilisation: number;
  fragmentation: number;
  contextSwitches: number;
  efficacy: number;
};

export function evaluateSchedule(
  schedule: ReadonlyArray<ScheduledTask>,
  problem: SchedulingProblem,
): ObjectiveBreakdown {
  const config = resolveSchedulerConfig(problem.config);
  const available = availableMinutes(problem);
  const utilisation =
    available === 0 ? 0 : scheduledMinutes(schedule) / available;
  const fragmentation = fragmentationMinutes(schedule, problem);
  const switches = contextSwitches(schedule);
  const timingValue = schedule.reduce(
    (total, item) => total + taskTimingValue(item, config),
    0,
  );

  return {
    timingValue,
    utilisation,
    fragmentation,
    contextSwitches: switches,
    efficacy:
      timingValue +
      config.utilisationWeight * utilisation -
      config.fragmentationWeight * fragmentation -
      config.contextSwitchWeight * switches,
  };
}
