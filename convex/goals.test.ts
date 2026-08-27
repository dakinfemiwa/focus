import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { newConvexTest } from "./testUtils";

describe("createGoal", () => {
  test("creates a goal and returns an id that resolves to the stored name", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const goal = await t.query(api.goals.getGoal, { goalId });

    expect(goal).toMatchObject({ goalName: "Get a First" });
  });
});

describe("getGoals", () => {
  test("returns every created goal", async () => {
    const t = newConvexTest();

    await t.mutation(api.goals.createGoal, { goalName: "Get a First" });
    await t.mutation(api.goals.createGoal, { goalName: "Build Organise" });

    const goals = await t.query(api.goals.getGoals, {});

    expect(goals.map((goal) => goal.goalName).sort()).toEqual([
      "Build Organise",
      "Get a First",
    ]);
  });

  test("returns an empty array when there are no goals", async () => {
    const t = newConvexTest();

    const goals = await t.query(api.goals.getGoals, {});

    expect(goals).toEqual([]);
  });
});

describe("updateGoal", () => {
  test("renames the target goal without touching other goals", async () => {
    const t = newConvexTest();

    const targetId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const otherId = await t.mutation(api.goals.createGoal, {
      goalName: "Build Organise",
    });

    await t.mutation(api.goals.updateGoal, {
      goalId: targetId,
      goalName: "Graduate with First-Class Honours",
    });

    const target = await t.query(api.goals.getGoal, { goalId: targetId });
    const other = await t.query(api.goals.getGoal, { goalId: otherId });

    expect(target?.goalName).toBe("Graduate with First-Class Honours");
    expect(other?.goalName).toBe("Build Organise");
  });

  test("rejects updating a goal that no longer exists", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    await t.mutation(api.goals.deleteGoal, { goalId });

    await expect(
      t.mutation(api.goals.updateGoal, {
        goalId,
        goalName: "Anything",
      }),
    ).rejects.toThrow();
  });
});

describe("deleteGoal", () => {
  test("removes the goal from both getGoal and getGoals", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });

    await t.mutation(api.goals.deleteGoal, { goalId });

    const goal = await t.query(api.goals.getGoal, { goalId });
    const goals = await t.query(api.goals.getGoals, {});

    expect(goal).toBeNull();
    expect(goals).toEqual([]);
  });

  test("rejects deleting a goal that no longer exists", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    await t.mutation(api.goals.deleteGoal, { goalId });

    await expect(
      t.mutation(api.goals.deleteGoal, { goalId }),
    ).rejects.toThrow();
  });
});

describe("invalid goal data", () => {
  test("rejects an id from a different table where a goal id is expected", async () => {
    const t = newConvexTest();

    const subGoalId = await t.mutation(api.subGoals.createSubGoal, {
      goalId: await t.mutation(api.goals.createGoal, { goalName: "Any" }),
      name: "Not a goal id",
    });

    await expect(
      // @ts-expect-error - deliberately passing a subGoal id where a goal id is expected
      t.query(api.goals.getGoal, { goalId: subGoalId }),
    ).rejects.toThrow();
  });

  test("rejects an empty or whitespace-only goal name", async () => {
    const t = newConvexTest();

    await expect(
      t.mutation(api.goals.createGoal, { goalName: "" }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.goals.createGoal, { goalName: "   " }),
    ).rejects.toThrow();
  });
});
