import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

// `import.meta.glob` is Vite-only, so it must be called from `*.test.ts`
// files directly (Convex's own bundler excludes those from deployment but
// would fail to analyze this file if it called `import.meta.glob` itself).
// Each test file builds its own `modules` map and passes it in here.
export function newConvexTest(modules: Record<string, () => Promise<unknown>>) {
  return convexTest(schema, modules);
}

type ConvexTestInstance = ReturnType<typeof newConvexTest>;
type AuthedConvexTest = ReturnType<ConvexTestInstance["withIdentity"]>;

export const TEST_USER = { subject: "user_test_1" };
export const OTHER_USER = { subject: "user_test_2" };

/**
 * Seeds a goal with two sub-goals, each holding one task, owned by whichever
 * identity `t` is authenticated as. Returns the ids needed to exercise the
 * hierarchy without repeating setup in every test.
 */
export async function seedHierarchy(t: AuthedConvexTest) {
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
