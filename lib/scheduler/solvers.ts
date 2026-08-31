import {
    candidateStarts,
    classifyUnscheduledTask,
    isCompleted,
    placementIsFeasible,
    validateSchedule,
} from "./constraints";
import { evaluateSchedule, resolveSchedulerConfig } from "./objective";
import type {
    ScheduledTask,
    SchedulingProblem,
    SchedulingResult,
    SchedulingSolver,
    SchedulingTask,
    UnscheduledTask,
} from "./types";

function placementFor(task: SchedulingTask, startTime: Date): ScheduledTask {
  return {
    task,
    startTime,
    endTime: new Date(startTime.getTime() + task.estimatedMinutes * 60000),
  };
}

function comparePlacements(
  left: ScheduledTask,
  right: ScheduledTask,
  problem: SchedulingProblem,
): number {
  const leftValue = evaluateSchedule([left], problem).efficacy;
  const rightValue = evaluateSchedule([right], problem).efficacy;
  return (
    rightValue - leftValue ||
    left.startTime.getTime() - right.startTime.getTime() ||
    left.task.id.localeCompare(right.task.id)
  );
}

function taskOrder(problem: SchedulingProblem): ReadonlyArray<SchedulingTask> {
  return problem.tasks
    .filter((task) => !isCompleted(task))
    .sort((left, right) => {
      const leftDensity = left.priority / Math.max(1, left.estimatedMinutes);
      const rightDensity = right.priority / Math.max(1, right.estimatedMinutes);
      return rightDensity - leftDensity || left.id.localeCompare(right.id);
    });
}

function fixedPlacements(
  problem: SchedulingProblem,
): ReadonlyArray<ScheduledTask> {
  return taskOrder(problem)
    .filter((task) => task.fixedStart && task.fixedEnd)
    .map((task) => placementFor(task, task.fixedStart!));
}

function resultFor(
  problem: SchedulingProblem,
  schedule: ReadonlyArray<ScheduledTask>,
  iterations: number,
  timedOut: boolean,
): SchedulingResult {
  const validation = validateSchedule(schedule, problem);
  const validSchedule = validation.valid ? schedule : [];
  const scheduledIds = new Set(validSchedule.map((item) => item.task.id));
  const unscheduled: UnscheduledTask[] = taskOrder(problem)
    .filter((task) => !scheduledIds.has(task.id))
    .map((task) => ({
      task,
      reason: classifyUnscheduledTask(task, problem, validSchedule),
    }));
  return {
    scheduled: validSchedule,
    unscheduled,
    efficacy: evaluateSchedule(validSchedule, problem).efficacy,
    iterations,
    timedOut,
  };
}

export class GreedySolver implements SchedulingSolver {
  solve(problem: SchedulingProblem): SchedulingResult {
    const schedule = [...fixedPlacements(problem)];
    let iterations = 0;
    const orderedTasks = taskOrder(problem);

    for (const task of orderedTasks) {
      if (schedule.some((item) => item.task.id === task.id)) continue;
      const placements = candidateStarts(task, problem, schedule)
        .map((start) => placementFor(task, start))
        .filter((placement) =>
          placementIsFeasible(placement, problem, schedule),
        )
        .sort((left, right) => comparePlacements(left, right, problem));
      iterations += placements.length;
      if (placements[0]) schedule.push(placements[0]);
    }

    schedule.sort(
      (left, right) => left.startTime.getTime() - right.startTime.getTime(),
    );
    return resultFor(problem, schedule, iterations, false);
  }
}

export class HillClimbingSolver implements SchedulingSolver {
  constructor(
    private readonly initialSolver: SchedulingSolver = new GreedySolver(),
  ) {}

  solve(problem: SchedulingProblem): SchedulingResult {
    const config = resolveSchedulerConfig(problem.config);
    let best = this.initialSolver.solve(problem).scheduled;
    let bestScore = evaluateSchedule(best, problem).efficacy;
    let iterations = 0;
    const startedAt = Date.now();
    let timedOut = false;
    let improved = true;

    while (improved && iterations < config.maxIterations) {
      improved = false;
      if (
        config.maxTimeMs !== undefined &&
        Date.now() - startedAt >= config.maxTimeMs
      ) {
        timedOut = true;
        break;
      }
      const candidates: ScheduledTask[][] = [];
      for (let index = 0; index < best.length; index += 1) {
        const current = best[index];
        for (const start of candidateStarts(
          current.task,
          problem,
          best.filter((_, itemIndex) => itemIndex !== index),
        )) {
          const moved = placementFor(current.task, start);
          const proposal = [
            ...best.filter((_, itemIndex) => itemIndex !== index),
            moved,
          ];
          if (validateSchedule(proposal, problem).valid)
            candidates.push(proposal);
        }
      }
      for (const candidate of candidates) {
        iterations += 1;
        const score = evaluateSchedule(candidate, problem).efficacy;
        if (score > bestScore) {
          best = candidate.sort(
            (left, right) =>
              left.startTime.getTime() - right.startTime.getTime(),
          );
          bestScore = score;
          improved = true;
          break;
        }
        if (
          config.maxTimeMs !== undefined &&
          Date.now() - startedAt >= config.maxTimeMs
        ) {
          timedOut = true;
          break;
        }
      }
    }

    return resultFor(problem, best, iterations, timedOut);
  }
}

export function solve(
  problem: SchedulingProblem,
  solver: SchedulingSolver = new HillClimbingSolver(),
): SchedulingResult {
  return solver.solve(problem);
}
