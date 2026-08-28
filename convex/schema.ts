import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  taskCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    defaultProfile: v.object({
      attentionDemand: v.number(),
      interruptibility: v.number(),
      cognitive: v.number(),
      visual: v.number(),
      auditory: v.number(),
      physical: v.number(),
    }),
  }).index("by_slug", ["slug"]),

  goals: defineTable({
    goalName: v.string(),
    userId: v.string(),
  }).index("by_user", ["userId"]),

  subGoals: defineTable({
    name: v.string(),
    goalId: v.id("goals"),
    userId: v.string(),
  })
    .index("by_goal", ["goalId"])
    .index("by_user_and_goal", ["userId", "goalId"]),

  tasks: defineTable({
    task: v.string(),
    subGoalId: v.id("subGoals"),
    priority: v.number(),
    estimatedMinutes: v.number(),
    dueDate: v.optional(v.string()),
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
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    userId: v.string(),
  })
    .index("by_subGoal", ["subGoalId"])
    .index("by_user_and_subGoal", ["userId", "subGoalId"]),
});
