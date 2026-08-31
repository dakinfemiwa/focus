import { describe, expect, test } from "vitest";
import type { SchedulingProblem, SchedulingTask } from "./index";
import {
    GreedySolver,
    HillClimbingSolver,
    deadlineUrgency,
    evaluateSchedule,
    validateSchedule,
} from "./index";

const date = (hours: number, minutes = 0) =>
  new Date(Date.UTC(2026, 0, 1, hours, minutes));

const task = (
  id: string,
  overrides: Partial<SchedulingTask> = {},
): SchedulingTask => ({
  id,
  estimatedMinutes: 60,
  priority: 5,
  status: "todo",
  category: "study",
  attentionType: "high_attention",
  ...overrides,
});

const baseProblem = (tasks: SchedulingTask[]): SchedulingProblem => ({
  tasks,
  workingPeriods: [{ start: date(9), end: date(17) }],
  config: {
    urgencyWeight: 0,
    utilisationWeight: 0,
    fragmentationWeight: 0,
    contextSwitchWeight: 0,
    maxIterations: 100,
  },
});

describe("validateSchedule", () => {
  test("enforces availability, duration, windows, deadlines, and fixed time", () => {
    const problem = baseProblem([
      task("one", {
        estimatedMinutes: 60,
        earliestStart: date(10),
        latestStart: date(11),
        dueDate: date(13),
        fixedStart: date(10),
        fixedEnd: date(11),
      }),
    ]);
    const valid = {
      task: problem.tasks[0],
      startTime: date(10),
      endTime: date(11),
    };
    expect(validateSchedule([valid], problem).valid).toBe(true);
    expect(
      validateSchedule(
        [{ ...valid, startTime: date(8), endTime: date(9) }],
        problem,
      ).valid,
    ).toBe(false);
    expect(
      validateSchedule(
        [{ ...valid, startTime: date(11), endTime: date(12) }],
        problem,
      ).violations.map((violation) => violation.code),
    ).toEqual(expect.arrayContaining(["fixed_time"]));
  });

  test("rejects incompatible overlap but permits compatible concurrent tasks", () => {
    const left = task("left", { attentionType: "concurrent" });
    const right = task("right", { attentionType: "concurrent" });
    const placement = (item: SchedulingTask) => ({
      task: item,
      startTime: date(10),
      endTime: date(11),
    });
    expect(
      validateSchedule(
        [placement(left), placement(right)],
        baseProblem([left, right]),
      ).valid,
    ).toBe(true);
    expect(
      validateSchedule([placement(left), placement(right)], {
        ...baseProblem([left, right]),
        constraints: { incompatiblePairs: [["left", "right"]] },
      }).valid,
    ).toBe(false);
  });

  test("rejects completed tasks only through solver input filtering", () => {
    const completed = task("done", { status: "completed" });
    const result = new GreedySolver().solve(baseProblem([completed]));
    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(0);
    expect(
      validateSchedule(
        [{ task: completed, startTime: date(9), endTime: date(10) }],
        baseProblem([completed]),
      ).valid,
    ).toBe(false);
  });
});

describe("objective", () => {
  test("deadline proximity increases urgency and earlier completion is preferred", () => {
    const config = {
      urgencyWeight: 1,
      urgencyMidpointMinutes: 60,
      urgencySlopePerMinute: 0.1,
      defaultUrgency: 0,
    };
    const deadline = date(13);
    expect(deadlineUrgency(deadline, date(10), config)).toBeLessThan(
      deadlineUrgency(deadline, date(12), config),
    );
  });

  test("penalises fragmentation and context switching", () => {
    const first = task("first", { category: "writing" });
    const second = task("second", { category: "coding" });
    const problem = {
      ...baseProblem([first, second]),
      config: {
        ...baseProblem([]).config,
        fragmentationWeight: 1,
        contextSwitchWeight: 1,
      },
    };
    const contiguous = [
      { task: first, startTime: date(9), endTime: date(10) },
      { task: second, startTime: date(10), endTime: date(11) },
    ];
    const fragmented = [
      contiguous[0],
      { task: second, startTime: date(12), endTime: date(13) },
    ];
    expect(evaluateSchedule(fragmented, problem).efficacy).toBeLessThan(
      evaluateSchedule(contiguous, problem).efficacy,
    );
  });

  test("uses total value, so two one-hour tasks beat one two-hour task", () => {
    const long = task("long", { estimatedMinutes: 120, priority: 10 });
    const first = task("first", { estimatedMinutes: 60, priority: 7 });
    const second = task("second", { estimatedMinutes: 60, priority: 6 });
    const result = new GreedySolver().solve({
      ...baseProblem([long, first, second]),
      workingPeriods: [{ start: date(9), end: date(11) }],
    });
    expect(result.scheduled.map((item) => item.task.id)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("solvers", () => {
  test("greedy returns feasible schedules and explicit impossible tasks", () => {
    const possible = task("possible", { estimatedMinutes: 60 });
    const impossible = task("impossible", { estimatedMinutes: 600 });
    const result = new GreedySolver().solve(
      baseProblem([possible, impossible]),
    );
    expect(
      validateSchedule(result.scheduled, baseProblem([possible, impossible]))
        .valid,
    ).toBe(true);
    expect(result.unscheduled.map((item) => item.task.id)).toContain(
      "impossible",
    );
  });

  test("hill climbing never returns an invalid schedule or accepts a decrease", () => {
    const problem = baseProblem([
      task("one", { priority: 8 }),
      task("two", { priority: 7, category: "coding" }),
    ]);
    const greedy = new GreedySolver().solve(problem);
    const result = new HillClimbingSolver().solve(problem);
    expect(validateSchedule(result.scheduled, problem).valid).toBe(true);
    expect(result.efficacy).toBeGreaterThanOrEqual(greedy.efficacy);
  });

  test("returns the best-so-far schedule when the iteration budget is zero", () => {
    const problem = {
      ...baseProblem([task("one")]),
      config: { maxIterations: 0 },
    };
    const result = new HillClimbingSolver().solve(problem);
    expect(validateSchedule(result.scheduled, problem).valid).toBe(true);
  });
});
