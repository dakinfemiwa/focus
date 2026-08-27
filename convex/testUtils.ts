/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

export function newConvexTest() {
  return convexTest(schema, modules);
}

type ConvexTestInstance = ReturnType<typeof newConvexTest>;

/**
 * Seeds a goal with two sub-goals, each holding one task, and returns the
 * ids needed to exercise the hierarchy without repeating setup in every test.
 */
export async function seedHierarchy(t: ConvexTestInstance) {
  const goalId = await t.mutation(api.goals.createGoal, {
    goalName: "Get a First",
  });

  const subGoalAId = await t.mutation(api.subGoals.createSubGoal, {
    goalId,
    name: "Finish dissertation",
  });
  const subGoalBId = await t.mutation(api.subGoals.createSubGoal, {
    goalId,
    name: "Revise for exams",
  });

  const taskAId = await t.mutation(api.tasks.createTask, {
    task: "Write chapter 3",
    subGoalId: subGoalAId,
    priority: 8,
    estimatedMinutes: 90,
  });
  const taskBId = await t.mutation(api.tasks.createTask, {
    task: "Past paper 2023",
    subGoalId: subGoalBId,
    priority: 6,
    estimatedMinutes: 45,
  });

  return { goalId, subGoalAId, subGoalBId, taskAId, taskBId };
}
