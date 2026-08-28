import { v } from "convex/values";
import { requireUserId } from "./auth";
import { mutation, query } from "./_generated/server";

const schedulingProfileFields = {
  categoryId: v.optional(v.id("taskCategories")),
  attentionDemand: v.optional(v.number()),
  interruptibility: v.optional(v.number()),
  concurrencyProfile: v.optional(
    v.object({
      cognitive: v.number(),
      visual: v.number(),
      auditory: v.number(),
      physical: v.number(),
    }),
  ),
  contextRequirements: v.optional(
    v.object({
      locations: v.array(v.string()),
      devices: v.array(v.string()),
      noiseLevel: v.optional(v.string()),
    }),
  ),
};

function validateSchedulingProfile(args: {
  attentionDemand?: number;
  interruptibility?: number;
  concurrencyProfile?: {
    cognitive: number;
    visual: number;
    auditory: number;
    physical: number;
  };
}) {
  const values = [
    args.attentionDemand,
    args.interruptibility,
    ...(args.concurrencyProfile
      ? Object.values(args.concurrencyProfile)
      : []),
  ];

  if (values.some((value) => value !== undefined && (value < 0 || value > 3))) {
    throw new Error("Scheduling profile values must be between 0 and 3.");
  }
}

/**
 * Get all tasks belonging to a sub-goal, scoped to the authenticated user.
 * Returns an empty list if the sub-goal doesn't exist or isn't owned by the
 * caller, without distinguishing the two.
 */
export const getTasks = query({
  args: {
    subGoalId: v.id("subGoals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db
      .query("tasks")
      .withIndex("by_user_and_subGoal", (q) =>
        q.eq("userId", userId).eq("subGoalId", args.subGoalId),
      )
      .collect();
  },
});

/**
 * Get a single task. Returns null if it doesn't exist or isn't owned by the
 * authenticated user, without distinguishing the two.
 */
export const getTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      return null;
    }

    return task;
  },
});

/**
 * Get all tasks across the app belonging to the authenticated user.
 */
export const getAllTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    return await ctx.db
      .query("tasks")
      .withIndex("by_user_and_subGoal", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Create a task under a sub-goal owned by the authenticated user.
 */
export const createTask = mutation({
  args: {
    task: v.string(),
    subGoalId: v.id("subGoals"),
    priority: v.number(),
    estimatedMinutes: v.number(),
    dueDate: v.optional(v.string()),
    ...schedulingProfileFields,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (args.priority < 0 || args.priority > 10) {
      throw new Error("Priority must be between 0 and 10.");
    }

    if (args.estimatedMinutes <= 0) {
      throw new Error("Estimated time must be greater than 0.");
    }

    validateSchedulingProfile(args);

    const subGoal = await ctx.db.get(args.subGoalId);
    if (!subGoal || subGoal.userId !== userId) {
      throw new Error("Sub-goal not found.");
    }

    if (args.categoryId && !(await ctx.db.get(args.categoryId))) {
      throw new Error("Task category not found.");
    }

    return await ctx.db.insert("tasks", {
      task: args.task,
      subGoalId: args.subGoalId,
      priority: args.priority,
      estimatedMinutes: args.estimatedMinutes,
      dueDate: args.dueDate,
      categoryId: args.categoryId,
      attentionDemand: args.attentionDemand,
      interruptibility: args.interruptibility,
      concurrencyProfile: args.concurrencyProfile,
      contextRequirements: args.contextRequirements,
      status: "todo",
      userId,
    });
  },
});

/**
 * Update a task owned by the authenticated user.
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    task: v.optional(v.string()),
    priority: v.optional(v.number()),
    estimatedMinutes: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    ...schedulingProfileFields,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (
      args.priority !== undefined &&
      (args.priority < 0 || args.priority > 10)
    ) {
      throw new Error("Priority must be between 0 and 10.");
    }

    if (args.estimatedMinutes !== undefined && args.estimatedMinutes <= 0) {
      throw new Error("Estimated time must be greater than 0.");
    }

    validateSchedulingProfile(args);

    const { taskId, ...updates } = args;

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found.");
    }

    if (args.categoryId && !(await ctx.db.get(args.categoryId))) {
      throw new Error("Task category not found.");
    }

    await ctx.db.patch(taskId, updates);
  },
});

/**
 * Change task status on a task owned by the authenticated user.
 */
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found.");
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
    });
  },
});

/**
 * Mark a task owned by the authenticated user as completed.
 */
export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found.");
    }

    await ctx.db.patch(args.taskId, {
      status: "completed",
    });
  },
});

/**
 * Delete a task owned by the authenticated user.
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found.");
    }

    await ctx.db.delete(args.taskId);
  },
});
