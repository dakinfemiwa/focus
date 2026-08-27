import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all tasks belonging to a sub-goal.
 */
export const getTasks = query({
  args: {
    subGoalId: v.id("subGoals"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_subGoal", (q) => q.eq("subGoalId", args.subGoalId))
      .collect();
  },
});

/**
 * Get a single task.
 */
export const getTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Get all tasks across the app.
 */
export const getAllTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

/**
 * Create a task.
 */
export const createTask = mutation({
  args: {
    task: v.string(),
    subGoalId: v.id("subGoals"),
    priority: v.number(),
    estimatedMinutes: v.number(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.priority < 0 || args.priority > 10) {
      throw new Error("Priority must be between 0 and 10.");
    }

    if (args.estimatedMinutes <= 0) {
      throw new Error("Estimated time must be greater than 0.");
    }

    const subGoal = await ctx.db.get(args.subGoalId);
    if (!subGoal) {
      throw new Error("Sub-goal not found.");
    }

    return await ctx.db.insert("tasks", {
      task: args.task,
      subGoalId: args.subGoalId,
      priority: args.priority,
      estimatedMinutes: args.estimatedMinutes,
      dueDate: args.dueDate,
      status: "todo",
    });
  },
});

/**
 * Update a task.
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    task: v.optional(v.string()),
    priority: v.optional(v.number()),
    estimatedMinutes: v.optional(v.number()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (
      args.priority !== undefined &&
      (args.priority < 0 || args.priority > 10)
    ) {
      throw new Error("Priority must be between 0 and 10.");
    }

    if (args.estimatedMinutes !== undefined && args.estimatedMinutes <= 0) {
      throw new Error("Estimated time must be greater than 0.");
    }

    const { taskId, ...updates } = args;

    await ctx.db.patch(taskId, updates);
  },
});

/**
 * Change task status.
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
    await ctx.db.patch(args.taskId, {
      status: args.status,
    });
  },
});

/**
 * Mark a task as completed.
 */
export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "completed",
    });
  },
});

/**
 * Delete a task.
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});
