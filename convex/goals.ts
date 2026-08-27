import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all goals.
 */
export const getGoals = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("goals").collect();
  },
});

/**
 * Get a single goal by ID.
 */
export const getGoal = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.goalId);
  },
});

/**
 * Create a new goal.
 */
export const createGoal = mutation({
  args: {
    goalName: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.goalName.trim()) {
      throw new Error("Goal name cannot be empty.");
    }

    return await ctx.db.insert("goals", {
      goalName: args.goalName,
    });
  },
});

/**
 * Rename an existing goal.
 */
export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    goalName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.goalId, {
      goalName: args.goalName,
    });
  },
});

/**
 * Delete a goal, cascading to its sub-goals and their tasks.
 */
export const deleteGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) {
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
