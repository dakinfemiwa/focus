export type SchedulerTaskStatus = "todo" | "in_progress" | "completed";

export type AttentionType = "high_attention" | "interruptible" | "concurrent";

export type SchedulingTask = {
  id: string;
  estimatedMinutes: number;
  priority: number;
  status: SchedulerTaskStatus;
  dueDate?: Date;
  earliestStart?: Date;
  latestStart?: Date;
  category: string;
  attentionType: AttentionType;
  goalId?: string;
  subGoalId?: string;
  fixedStart?: Date;
  fixedEnd?: Date;
};

export type WorkingPeriod = {
  start: Date;
  end: Date;
};

export type ScheduledTask = {
  task: SchedulingTask;
  startTime: Date;
  endTime: Date;
};

export type UnscheduledReason =
  | "insufficient_time"
  | "no_valid_window"
  | "deadline_conflict"
  | "fixed_time_conflict"
  | "availability_conflict"
  | "constraint_conflict";

export type UnscheduledTask = {
  task: SchedulingTask;
  reason: UnscheduledReason;
};

export type SchedulerConfig = {
  urgencyWeight: number;
  utilisationWeight: number;
  fragmentationWeight: number;
  contextSwitchWeight: number;
  urgencySlopePerMinute: number;
  urgencyMidpointMinutes: number;
  defaultUrgency: number;
  maxIterations: number;
  maxTimeMs?: number;
};

export type SchedulingConstraints = {
  incompatiblePairs?: ReadonlyArray<readonly [string, string]>;
  canOverlap?: (left: SchedulingTask, right: SchedulingTask) => boolean;
};

export type SchedulingProblem = {
  tasks: ReadonlyArray<SchedulingTask>;
  workingPeriods: ReadonlyArray<WorkingPeriod>;
  constraints?: SchedulingConstraints;
  currentTime?: Date;
  config?: Partial<SchedulerConfig>;
};

export type ScheduleViolation = {
  taskId?: string;
  code:
    | "invalid_duration"
    | "invalid_period"
    | "completed_task"
    | "outside_working_period"
    | "deadline"
    | "earliest_start"
    | "latest_start"
    | "fixed_time"
    | "overlap";
  message: string;
};

export type ScheduleValidation = {
  valid: boolean;
  violations: ReadonlyArray<ScheduleViolation>;
};

export type SchedulingResult = {
  scheduled: ReadonlyArray<ScheduledTask>;
  unscheduled: ReadonlyArray<UnscheduledTask>;
  efficacy: number;
  iterations: number;
  timedOut: boolean;
};

export interface SchedulingSolver {
  solve(problem: SchedulingProblem): SchedulingResult;
}
