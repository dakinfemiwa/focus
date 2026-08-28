/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { newConvexTest, OTHER_USER, TEST_USER } from "./testUtils";

const modules = import.meta.glob("./**/*.ts");

function asUser() {
  return newConvexTest(modules).withIdentity(TEST_USER);
}

describe("createGoal", () => {
  test("creates a goal and returns an id that resolves to the stored name", async () => {
    const t = asUser();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const goal = await t.query(api.goals.getGoal, { goalId });

    expect(goal).toMatchObject({ goalName: "Get a First" });
  });
});

describe("getGoals", () => {
  test("returns every created goal", async () => {
    const t = asUser();

    await t.mutation(api.goals.createGoal, { goalName: "Get a First" });
    await t.mutation(api.goals.createGoal, { goalName: "Build Organise" });

    const goals = await t.query(api.goals.getGoals, {});

    expect(goals.map((goal) => goal.goalName).sort()).toEqual([
      "Build Organise",
      "Get a First",
    ]);
  });

  test("returns an empty array when there are no goals", async () => {
    const t = asUser();

    const goals = await t.query(api.goals.getGoals, {});

    expect(goals).toEqual([]);
  });
});

describe("updateGoal", () => {
  test("renames the target goal without touching other goals", async () => {
    const t = asUser();

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
    const t = asUser();

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
    const t = asUser();

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
    const t = asUser();

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
    const t = asUser();

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
    const t = asUser();

    await expect(
      t.mutation(api.goals.createGoal, { goalName: "" }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.goals.createGoal, { goalName: "   " }),
    ).rejects.toThrow();
  });
});

describe("authentication", () => {
  test("rejects reading and creating goals with no identity", async () => {
    const t = newConvexTest(modules);

    await expect(t.query(api.goals.getGoals, {})).rejects.toThrow();
    await expect(
      t.mutation(api.goals.createGoal, { goalName: "Get a First" }),
    ).rejects.toThrow();
  });
});

describe("cross-user isolation", () => {
  test("a user's goals are invisible to another user", async () => {
    const owner = asUser();
    const intruder = newConvexTest(modules).withIdentity(OTHER_USER);

    const goalId = await owner.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });

    expect(await intruder.query(api.goals.getGoals, {})).toEqual([]);
    expect(await intruder.query(api.goals.getGoal, { goalId })).toBeNull();
  });

  test("another user cannot rename or delete someone else's goal", async () => {
    const owner = asUser();
    const intruder = newConvexTest(modules).withIdentity(OTHER_USER);

    const goalId = await owner.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });

    await expect(
      intruder.mutation(api.goals.updateGoal, {
        goalId,
        goalName: "Hijacked",
      }),
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.goals.deleteGoal, { goalId }),
    ).rejects.toThrow();

    const goal = await owner.query(api.goals.getGoal, { goalId });
    expect(goal?.goalName).toBe("Get a First");
  });
});
