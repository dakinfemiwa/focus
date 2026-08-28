import { v } from "convex/values";
import { requireUserId } from "./auth";
import { mutation, query } from "./_generated/server";

/**
 * Get all sub-goals belonging to a goal, scoped to the authenticated user.
 * Returns an empty list if the goal doesn't exist or isn't owned by the
 * caller, without distinguishing the two.
 */
export const getSubGoals = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db
      .query("subGoals")
      .withIndex("by_user_and_goal", (q) =>
        q.eq("userId", userId).eq("goalId", args.goalId),
      )
      .collect();
  },
});

/**
 * Get a single sub-goal. Returns null if it doesn't exist or isn't owned by
 * the authenticated user, without distinguishing the two.
 */
export const getSubGoal = query({
  args: {
    subGoalId: v.id("subGoals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const subGoal = await ctx.db.get(args.subGoalId);
    if (!subGoal || subGoal.userId !== userId) {
      return null;
    }

    return subGoal;
  },
});

/**
 * Create a sub-goal under a goal owned by the authenticated user.
 */
export const createSubGoal = mutation({
  args: {
    name: v.string(),
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (!args.name.trim()) {
      throw new Error("Sub-goal name cannot be empty.");
    }

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found.");
    }

    return await ctx.db.insert("subGoals", {
      name: args.name,
      goalId: args.goalId,
      userId,
    });
  },
});

/**
 * Update a sub-goal owned by the authenticated user.
 */
export const updateSubGoal = mutation({
  args: {
    subGoalId: v.id("subGoals"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const subGoal = await ctx.db.get(args.subGoalId);
    if (!subGoal || subGoal.userId !== userId) {
      throw new Error("Sub-goal not found.");
    }

    await ctx.db.patch(args.subGoalId, {
      name: args.name,
    });
  },
});

/**
 * Delete a sub-goal owned by the authenticated user, cascading to its
 * tasks.
 */
export const deleteSubGoal = mutation({
  args: {
    subGoalId: v.id("subGoals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const subGoal = await ctx.db.get(args.subGoalId);
    if (!subGoal || subGoal.userId !== userId) {
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
