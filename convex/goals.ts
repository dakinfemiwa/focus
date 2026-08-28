import { v } from "convex/values";
import { requireUserId } from "./auth";
import { mutation, query } from "./_generated/server";

/**
 * Get all goals belonging to the authenticated user.
 */
export const getGoals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    return await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get a single goal by ID. Returns null if it doesn't exist or isn't owned
 * by the authenticated user, without distinguishing the two.
 */
export const getGoal = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      return null;
    }

    return goal;
  },
});

/**
 * Create a new goal, owned by the authenticated user.
 */
export const createGoal = mutation({
  args: {
    goalName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (!args.goalName.trim()) {
      throw new Error("Goal name cannot be empty.");
    }

    return await ctx.db.insert("goals", {
      goalName: args.goalName,
      userId,
    });
  },
});

/**
 * Rename an existing goal owned by the authenticated user.
 */
export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    goalName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found.");
    }

    await ctx.db.patch(args.goalId, {
      goalName: args.goalName,
    });
  },
});

/**
 * Delete a goal owned by the authenticated user, cascading to its sub-goals
 * and their tasks.
 */
export const deleteGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found.");
    }

    const subGoals = await ctx.db
      .query("subGoals")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    for (const subGoal of subGoals) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_subGoal", (q) => q.eq("subGoalId", subGoal._id))
        .collect();

      for (const task of tasks) {
        await ctx.db.delete(task._id);
      }

      await ctx.db.delete(subGoal._id);
    }

    await ctx.db.delete(args.goalId);
  },
});
