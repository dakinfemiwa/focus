import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  goals: defineTable({
    goalName: v.string(),
  }),

  subGoals: defineTable({
    name: v.string(),
    goalId: v.id("goals"),
  }).index("by_goal", ["goalId"]),

  tasks: defineTable({
    task: v.string(),
    subGoalId: v.id("subGoals"),
    priority: v.number(),
    estimatedMinutes: v.number(),
    dueDate: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  }).index("by_subGoal", ["subGoalId"]),
});
