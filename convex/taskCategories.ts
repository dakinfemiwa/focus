import { v } from "convex/values";
import { requireUserId } from "./auth";
import { mutation, query } from "./_generated/server";

const profile = (
  attentionDemand: number,
  interruptibility: number,
  cognitive: number,
  visual: number,
  auditory: number,
  physical: number,
) => ({
  attentionDemand,
  interruptibility,
  cognitive,
  visual,
  auditory,
  physical,
});

export const TASK_CATEGORY_DEFINITIONS = [
  { name: "Programming", slug: "programming", defaultProfile: profile(3, 3, 3, 2, 0, 0) },
  { name: "Writing", slug: "writing", defaultProfile: profile(3, 3, 3, 2, 0, 0) },
  { name: "Reading", slug: "reading", defaultProfile: profile(2, 2, 2, 2, 0, 0) },
  { name: "Studying", slug: "studying", defaultProfile: profile(3, 3, 3, 2, 1, 0) },
  { name: "Language Learning", slug: "language_learning", defaultProfile: profile(2, 2, 2, 1, 2, 0) },
  { name: "Lecture Video", slug: "lecture_video", defaultProfile: profile(2, 2, 2, 2, 3, 0) },
  { name: "Flashcards", slug: "flashcards", defaultProfile: profile(2, 2, 2, 2, 0, 0) },
  { name: "Exercise", slug: "exercise", defaultProfile: profile(2, 3, 0, 0, 0, 3) },
  { name: "Walking", slug: "walking", defaultProfile: profile(1, 3, 0, 0, 1, 3) },
  { name: "Cooking", slug: "cooking", defaultProfile: profile(2, 2, 1, 2, 1, 2) },
  { name: "Household", slug: "household", defaultProfile: profile(1, 3, 1, 0, 0, 2) },
  { name: "Shopping", slug: "shopping", defaultProfile: profile(1, 2, 1, 2, 1, 2) },
  { name: "Errands", slug: "errands", defaultProfile: profile(1, 2, 1, 0, 1, 2) },
  { name: "Admin", slug: "admin", defaultProfile: profile(2, 2, 2, 1, 0, 0) },
  { name: "Meeting", slug: "meeting", defaultProfile: profile(2, 1, 1, 0, 3, 0) },
  { name: "Social", slug: "social", defaultProfile: profile(1, 1, 0, 0, 3, 0) },
  { name: "Creative", slug: "creative", defaultProfile: profile(3, 3, 2, 2, 1, 0) },
  { name: "Relaxation", slug: "relaxation", defaultProfile: profile(0, 3, 0, 0, 1, 0) },
] as const;

export const getTaskCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.db.query("taskCategories").withIndex("by_slug").collect();
  },
});

export const seedTaskCategories = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);

    for (const category of TASK_CATEGORY_DEFINITIONS) {
      const existing = await ctx.db
        .query("taskCategories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .unique();

      if (!existing) {
        await ctx.db.insert("taskCategories", category);
      }
    }
  },
});
