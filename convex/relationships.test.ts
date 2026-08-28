/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  newConvexTest,
  OTHER_USER,
  seedHierarchy,
  TEST_USER,
} from "./testUtils";

const modules = import.meta.glob("./**/*.ts");

function asUser() {
  return newConvexTest(modules).withIdentity(TEST_USER);
}

describe("hierarchy round trip", () => {
  test("a task's subGoalId leads back to the sub-goal's goalId, and on to the goal", async () => {
    const t = asUser();
    const { goalId, subGoalAId, taskAId } = await seedHierarchy(t);

    const task = await t.query(api.tasks.getTask, { taskId: taskAId });
    const subGoal = await t.query(api.subGoals.getSubGoal, {
      subGoalId: task!.subGoalId,
    });
    const goal = await t.query(api.goals.getGoal, {
      goalId: subGoal!.goalId,
    });

    expect(task?.subGoalId).toBe(subGoalAId);
    expect(subGoal?.goalId).toBe(goalId);
    expect(goal?._id).toBe(goalId);
  });
});

describe("deleting a goal", () => {
  test("leaves no sub-goals pointing at the deleted goal", async () => {
    const t = asUser();
    const { goalId, subGoalAId, subGoalBId } = await seedHierarchy(t);

    await t.mutation(api.goals.deleteGoal, { goalId });

    expect(
      await t.query(api.subGoals.getSubGoal, { subGoalId: subGoalAId }),
    ).toBeNull();
    expect(
      await t.query(api.subGoals.getSubGoal, { subGoalId: subGoalBId }),
    ).toBeNull();
  });

  test("leaves no tasks belonging to the deleted goal's sub-goals", async () => {
    const t = asUser();
    const { goalId, taskAId, taskBId } = await seedHierarchy(t);

    await t.mutation(api.goals.deleteGoal, { goalId });

    expect(
      await t.query(api.tasks.getTask, { taskId: taskAId }),
    ).toBeNull();
    expect(
      await t.query(api.tasks.getTask, { taskId: taskBId }),
    ).toBeNull();

    const allTasks = await t.query(api.tasks.getAllTasks, {});
    expect(allTasks.find((x) => x._id === taskAId)).toBeUndefined();
    expect(allTasks.find((x) => x._id === taskBId)).toBeUndefined();
  });
});

describe("deleting a sub-goal", () => {
  test("leaves no tasks pointing at the deleted sub-goal", async () => {
    const t = asUser();
    const { subGoalAId, taskAId } = await seedHierarchy(t);

    await t.mutation(api.subGoals.deleteSubGoal, { subGoalId: subGoalAId });

    expect(
      await t.query(api.tasks.getTask, { taskId: taskAId }),
    ).toBeNull();

    const allTasks = await t.query(api.tasks.getAllTasks, {});
    expect(allTasks.find((x) => x._id === taskAId)).toBeUndefined();
  });

  test("does not affect the sibling sub-goal or its tasks", async () => {
    const t = asUser();
    const { subGoalAId, subGoalBId, taskBId } = await seedHierarchy(t);

    await t.mutation(api.subGoals.deleteSubGoal, { subGoalId: subGoalAId });

    const survivingSubGoal = await t.query(api.subGoals.getSubGoal, {
      subGoalId: subGoalBId,
    });
    const survivingTask = await t.query(api.tasks.getTask, {
      taskId: taskBId,
    });

    expect(survivingSubGoal).not.toBeNull();
    expect(survivingTask).not.toBeNull();
  });
});

describe("isolation between goals", () => {
  test("identically-named sub-goals and tasks under different goals stay separate", async () => {
    const t = asUser();

    const goalAId = await t.mutation(api.goals.createGoal, {
      goalName: "Goal",
    });
    const goalBId = await t.mutation(api.goals.createGoal, {
      goalName: "Goal",
    });

    const subGoalAId = await t.mutation(api.subGoals.createSubGoal, {
      goalId: goalAId,
      name: "Sub-goal",
    });
    const subGoalBId = await t.mutation(api.subGoals.createSubGoal, {
      goalId: goalBId,
      name: "Sub-goal",
    });

    await t.mutation(api.tasks.createTask, {
      task: "Task",
      subGoalId: subGoalAId,
      priority: 5,
      estimatedMinutes: 30,
    });
    await t.mutation(api.tasks.createTask, {
      task: "Task",
      subGoalId: subGoalBId,
      priority: 5,
      estimatedMinutes: 30,
    });

    const goalASubGoals = await t.query(api.subGoals.getSubGoals, {
      goalId: goalAId,
    });
    const goalATasks = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalAId,
    });

    expect(goalASubGoals).toHaveLength(1);
    expect(goalASubGoals[0]._id).toBe(subGoalAId);
    expect(goalATasks).toHaveLength(1);
    expect(goalATasks[0].subGoalId).toBe(subGoalAId);
  });
});

describe("getAllTasks vs getTasks", () => {
  test("getAllTasks spans every goal, and getTasks partitions it exactly", async () => {
    const t = asUser();
    const { subGoalAId, subGoalBId, taskAId, taskBId } =
      await seedHierarchy(t);

    const allTasks = await t.query(api.tasks.getAllTasks, {});
    const subGoalATasks = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalAId,
    });
    const subGoalBTasks = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalBId,
    });

    expect(allTasks.map((x) => x._id).sort()).toEqual(
      [taskAId, taskBId].sort(),
    );
    expect(
      [...subGoalATasks, ...subGoalBTasks].map((x) => x._id).sort(),
    ).toEqual(allTasks.map((x) => x._id).sort());
  });
});

describe("cross-user isolation across the full hierarchy", () => {
  test("none of one user's goals, sub-goals, or tasks are visible to another user", async () => {
    const owner = asUser();
    const intruder = newConvexTest(modules).withIdentity(OTHER_USER);
    const { goalId, subGoalAId, taskAId } = await seedHierarchy(owner);

    expect(await intruder.query(api.goals.getGoals, {})).toEqual([]);
    expect(
      await intruder.query(api.subGoals.getSubGoals, { goalId }),
    ).toEqual([]);
    expect(
      await intruder.query(api.tasks.getTasks, { subGoalId: subGoalAId }),
    ).toEqual([]);
    expect(await intruder.query(api.tasks.getAllTasks, {})).toEqual([]);
    expect(await intruder.query(api.goals.getGoal, { goalId })).toBeNull();
    expect(
      await intruder.query(api.subGoals.getSubGoal, {
        subGoalId: subGoalAId,
      }),
    ).toBeNull();
    expect(
      await intruder.query(api.tasks.getTask, { taskId: taskAId }),
    ).toBeNull();
  });
});
