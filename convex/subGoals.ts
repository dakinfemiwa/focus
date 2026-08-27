import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all sub-goals belonging to a goal.
 */
export const getSubGoals = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subGoals")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
  },
});

/**
 * Get a single sub-goal.
 */
export const getSubGoal = query({
  args: {
    subGoalId: v.id("subGoals"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.subGoalId);
  },
});

/**
 * Create a sub-goal under a goal.
 */
export const createSubGoal = mutation({
  args: {
    name: v.string(),
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throw new Error("Sub-goal name cannot be empty.");
    }

    const goal = await ctx.db.get(args.goalId);
    if (!goal) {
      throw new Error("Goal not found.");
    }

    return await ctx.db.insert("subGoals", {
      name: args.name,
      goalId: args.goalId,
    });
  },
});

/**
 * Update a sub-goal.
 */
export const updateSubGoal = mutation({
  args: {
    subGoalId: v.id("subGoals"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subGoalId, {
      name: args.name,
    });
  },
});

/**
 * Delete a sub-goal, cascading to its tasks.
 */
export const deleteSubGoal = mutation({
  args: {
    subGoalId: v.id("subGoals"),
  },
  handler: async (ctx, args) => {
    const subGoal = await ctx.db.get(args.subGoalId);
    if (!subGoal) {
      throw new Error("Sub-goal not found.");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_subGoal", (q) => q.eq("subGoalId", args.subGoalId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(args.subGoalId);
  },
});
