import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { newConvexTest } from "./testUtils";

describe("createSubGoal", () => {
  test("persists the goalId it was given", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const subGoalId = await t.mutation(api.subGoals.createSubGoal, {
      goalId,
      name: "Finish dissertation",
    });

    const subGoal = await t.query(api.subGoals.getSubGoal, { subGoalId });

    expect(subGoal).toMatchObject({
      name: "Finish dissertation",
      goalId,
    });
  });
});

describe("getSubGoals", () => {
  test("returns only the requested goal's children", async () => {
    const t = newConvexTest();

    const goalAId = await t.mutation(api.goals.createGoal, {
      goalName: "Goal A",
    });
    const goalBId = await t.mutation(api.goals.createGoal, {
      goalName: "Goal B",
    });

    await t.mutation(api.subGoals.createSubGoal, {
      goalId: goalAId,
      name: "A1",
    });
    await t.mutation(api.subGoals.createSubGoal, {
      goalId: goalAId,
      name: "A2",
    });
    await t.mutation(api.subGoals.createSubGoal, {
      goalId: goalBId,
      name: "B1",
    });

    const goalASubGoals = await t.query(api.subGoals.getSubGoals, {
      goalId: goalAId,
    });
    const goalBSubGoals = await t.query(api.subGoals.getSubGoals, {
      goalId: goalBId,
    });

    expect(goalASubGoals.map((s) => s.name).sort()).toEqual(["A1", "A2"]);
    expect(goalBSubGoals.map((s) => s.name)).toEqual(["B1"]);
  });

  test("returns an empty array for a goal with no sub-goals", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });

    const subGoals = await t.query(api.subGoals.getSubGoals, { goalId });

    expect(subGoals).toEqual([]);
  });
});

describe("updateSubGoal", () => {
  test("renames without changing the parent goal", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const subGoalId = await t.mutation(api.subGoals.createSubGoal, {
      goalId,
      name: "Finish dissertation",
    });

    await t.mutation(api.subGoals.updateSubGoal, {
      subGoalId,
      name: "Finish and submit dissertation",
    });

    const subGoal = await t.query(api.subGoals.getSubGoal, { subGoalId });

    expect(subGoal).toMatchObject({
      name: "Finish and submit dissertation",
      goalId,
    });
  });
});

describe("deleteSubGoal", () => {
  test("removes it from both getSubGoal and the parent's getSubGoals", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const subGoalId = await t.mutation(api.subGoals.createSubGoal, {
      goalId,
      name: "Finish dissertation",
    });

    await t.mutation(api.subGoals.deleteSubGoal, { subGoalId });

    const subGoal = await t.query(api.subGoals.getSubGoal, { subGoalId });
    const subGoals = await t.query(api.subGoals.getSubGoals, { goalId });

    expect(subGoal).toBeNull();
    expect(subGoals).toEqual([]);
  });
});

describe("invalid goal associations", () => {
  test("rejects creating a sub-goal under a deleted goal", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    await t.mutation(api.goals.deleteGoal, { goalId });

    await expect(
      t.mutation(api.subGoals.createSubGoal, {
        goalId,
        name: "Orphaned sub-goal",
      }),
    ).rejects.toThrow();
  });

  test("rejects a task id where a goal id is expected", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });
    const subGoalId = await t.mutation(api.subGoals.createSubGoal, {
      goalId,
      name: "Finish dissertation",
    });
    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Write chapter 3",
      subGoalId,
      priority: 5,
      estimatedMinutes: 30,
    });

    await expect(
      t.mutation(api.subGoals.createSubGoal, {
        // @ts-expect-error - deliberately passing a task id where a goal id is expected
        goalId: taskId,
        name: "Should be rejected",
      }),
    ).rejects.toThrow();
  });

  test("rejects an empty or whitespace-only sub-goal name", async () => {
    const t = newConvexTest();

    const goalId = await t.mutation(api.goals.createGoal, {
      goalName: "Get a First",
    });

    await expect(
      t.mutation(api.subGoals.createSubGoal, { goalId, name: "" }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.subGoals.createSubGoal, { goalId, name: "   " }),
    ).rejects.toThrow();
  });
});
