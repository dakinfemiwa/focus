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

describe("createTask", () => {
  test("persists every field and defaults status to todo", async () => {
    const t = asUser();
    const { subGoalAId } = await seedHierarchy(t);

    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Write chapter 3",
      subGoalId: subGoalAId,
      priority: 7,
      estimatedMinutes: 45,
      dueDate: "2026-09-01",
    });

    const task = await t.query(api.tasks.getTask, { taskId });

    expect(task).toMatchObject({
      task: "Write chapter 3",
      subGoalId: subGoalAId,
      priority: 7,
      estimatedMinutes: 45,
      dueDate: "2026-09-01",
      status: "todo",
    });
  });

  test.each([-1, 11])(
    "rejects a priority of %i, outside 0-10",
    async (priority) => {
      const t = asUser();
      const { subGoalAId } = await seedHierarchy(t);

      await expect(
        t.mutation(api.tasks.createTask, {
          task: "Bad priority",
          subGoalId: subGoalAId,
          priority,
          estimatedMinutes: 30,
        }),
      ).rejects.toThrow();
    },
  );

  test.each([0, 10])("accepts a priority of %i, the boundary values", async (priority) => {
    const t = asUser();
    const { subGoalAId } = await seedHierarchy(t);

    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Boundary priority",
      subGoalId: subGoalAId,
      priority,
      estimatedMinutes: 30,
    });

    const task = await t.query(api.tasks.getTask, { taskId });
    expect(task?.priority).toBe(priority);
  });

  test.each([0, -5])(
    "rejects an estimated time of %i minutes",
    async (estimatedMinutes) => {
      const t = asUser();
      const { subGoalAId } = await seedHierarchy(t);

      await expect(
        t.mutation(api.tasks.createTask, {
          task: "Bad minutes",
          subGoalId: subGoalAId,
          priority: 5,
          estimatedMinutes,
        }),
      ).rejects.toThrow();
    },
  );

  test("a rejected create writes nothing to the sub-goal's task list", async () => {
    const t = asUser();
    const { subGoalAId } = await seedHierarchy(t);
    const before = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalAId,
    });

    await expect(
      t.mutation(api.tasks.createTask, {
        task: "Should not persist",
        subGoalId: subGoalAId,
        priority: 99,
        estimatedMinutes: 30,
      }),
    ).rejects.toThrow();

    const after = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalAId,
    });
    expect(after).toEqual(before);
  });
});

describe("updateTaskStatus", () => {
  test("moves a task through todo, in_progress, completed and back", async () => {
    const t = asUser();
    const { taskAId } = await seedHierarchy(t);

    await t.mutation(api.tasks.updateTaskStatus, {
      taskId: taskAId,
      status: "in_progress",
    });
    expect(
      (await t.query(api.tasks.getTask, { taskId: taskAId }))?.status,
    ).toBe("in_progress");

    await t.mutation(api.tasks.updateTaskStatus, {
      taskId: taskAId,
      status: "completed",
    });
    expect(
      (await t.query(api.tasks.getTask, { taskId: taskAId }))?.status,
    ).toBe("completed");

    await t.mutation(api.tasks.updateTaskStatus, {
      taskId: taskAId,
      status: "todo",
    });
    expect(
      (await t.query(api.tasks.getTask, { taskId: taskAId }))?.status,
    ).toBe("todo");
  });

  test("rejects a status outside the known union", async () => {
    const t = asUser();
    const { taskAId } = await seedHierarchy(t);

    await expect(
      t.mutation(api.tasks.updateTaskStatus, {
        taskId: taskAId,
        // @ts-expect-error - deliberately invalid status
        status: "archived",
      }),
    ).rejects.toThrow();
  });
});

describe("completeTask", () => {
  test("marks a task completed, and is idempotent", async () => {
    const t = asUser();
    const { taskAId } = await seedHierarchy(t);

    await t.mutation(api.tasks.completeTask, { taskId: taskAId });
    await t.mutation(api.tasks.completeTask, { taskId: taskAId });

    const task = await t.query(api.tasks.getTask, { taskId: taskAId });
    expect(task?.status).toBe("completed");
  });
});

describe("updateTask", () => {
  test("enforces the same priority and minutes rules as createTask", async () => {
    const t = asUser();
    const { taskAId } = await seedHierarchy(t);

    await expect(
      t.mutation(api.tasks.updateTask, { taskId: taskAId, priority: 11 }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.tasks.updateTask, {
        taskId: taskAId,
        estimatedMinutes: 0,
      }),
    ).rejects.toThrow();
  });

  test("a rejected update leaves the stored task unchanged", async () => {
    const t = asUser();
    const { taskAId } = await seedHierarchy(t);
    const before = await t.query(api.tasks.getTask, { taskId: taskAId });

    await expect(
      t.mutation(api.tasks.updateTask, { taskId: taskAId, priority: -1 }),
    ).rejects.toThrow();

    const after = await t.query(api.tasks.getTask, { taskId: taskAId });
    expect(after).toEqual(before);
  });

  test("updating priority alone does not clobber title, minutes, or due date", async () => {
    const t = asUser();
    const { subGoalAId } = await seedHierarchy(t);
    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Write chapter 3",
      subGoalId: subGoalAId,
      priority: 5,
      estimatedMinutes: 60,
      dueDate: "2026-09-10",
    });

    await t.mutation(api.tasks.updateTask, { taskId, priority: 9 });

    const task = await t.query(api.tasks.getTask, { taskId });
    expect(task).toMatchObject({
      task: "Write chapter 3",
      priority: 9,
      estimatedMinutes: 60,
      dueDate: "2026-09-10",
    });
  });

  test("setting a due date on a task that had none persists it", async () => {
    const t = asUser();
    const { taskAId } = await seedHierarchy(t);

    await t.mutation(api.tasks.updateTask, {
      taskId: taskAId,
      dueDate: "2026-10-01",
    });

    const task = await t.query(api.tasks.getTask, { taskId: taskAId });
    expect(task?.dueDate).toBe("2026-10-01");
  });

  test("changing an existing due date persists the new value", async () => {
    const t = asUser();
    const { subGoalAId } = await seedHierarchy(t);
    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Write chapter 3",
      subGoalId: subGoalAId,
      priority: 5,
      estimatedMinutes: 60,
      dueDate: "2026-09-10",
    });

    await t.mutation(api.tasks.updateTask, {
      taskId,
      dueDate: "2026-09-20",
    });

    const task = await t.query(api.tasks.getTask, { taskId });
    expect(task?.dueDate).toBe("2026-09-20");
  });

  test("clearing a due date by omitting it from the update leaves it unchanged", async () => {
    // `ctx.db.patch` removes a field set to `undefined`, but Convex strips
    // `undefined` args in transport, so the client can never actually send
    // `dueDate: undefined` — it simply omits the key, which patch leaves
    // alone. This documents current behaviour: once set, a due date cannot
    // be cleared through updateTask. See implementation plan note T-10.
    const t = asUser();
    const { subGoalAId } = await seedHierarchy(t);
    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Write chapter 3",
      subGoalId: subGoalAId,
      priority: 5,
      estimatedMinutes: 60,
      dueDate: "2026-09-10",
    });

    await t.mutation(api.tasks.updateTask, { taskId, task: "Renamed" });

    const task = await t.query(api.tasks.getTask, { taskId });
    expect(task?.dueDate).toBe("2026-09-10");
  });
});

describe("deleteTask", () => {
  test("removes it from getTask, getTasks, and getAllTasks", async () => {
    const t = asUser();
    const { taskAId, subGoalAId } = await seedHierarchy(t);

    await t.mutation(api.tasks.deleteTask, { taskId: taskAId });

    const task = await t.query(api.tasks.getTask, { taskId: taskAId });
    const subGoalTasks = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalAId,
    });
    const allTasks = await t.query(api.tasks.getAllTasks, {});

    expect(task).toBeNull();
    expect(subGoalTasks.find((x) => x._id === taskAId)).toBeUndefined();
    expect(allTasks.find((x) => x._id === taskAId)).toBeUndefined();
  });
});

describe("getTasks", () => {
  test("returns only the requested sub-goal's tasks", async () => {
    const t = asUser();
    const { subGoalAId, subGoalBId, taskAId, taskBId } =
      await seedHierarchy(t);

    const subGoalATasks = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalAId,
    });
    const subGoalBTasks = await t.query(api.tasks.getTasks, {
      subGoalId: subGoalBId,
    });

    expect(subGoalATasks.map((x) => x._id)).toEqual([taskAId]);
    expect(subGoalBTasks.map((x) => x._id)).toEqual([taskBId]);
  });
});

describe("invalid task data", () => {
  test("rejects creating a task under a deleted sub-goal", async () => {
    const t = asUser();
    const { goalId, subGoalAId } = await seedHierarchy(t);
    void goalId;

    await t.mutation(api.subGoals.deleteSubGoal, { subGoalId: subGoalAId });

    await expect(
      t.mutation(api.tasks.createTask, {
        task: "Orphaned task",
        subGoalId: subGoalAId,
        priority: 5,
        estimatedMinutes: 30,
      }),
    ).rejects.toThrow();
  });

  test("rejects a goal id where a sub-goal id is expected", async () => {
    const t = asUser();
    const { goalId } = await seedHierarchy(t);

    await expect(
      t.mutation(api.tasks.createTask, {
        task: "Wrong table id",
        // @ts-expect-error - deliberately passing a goal id where a subGoal id is expected
        subGoalId: goalId,
        priority: 5,
        estimatedMinutes: 30,
      }),
    ).rejects.toThrow();
  });

  test("rejects creating a task under another user's sub-goal", async () => {
    const owner = asUser();
    const intruder = newConvexTest(modules).withIdentity(OTHER_USER);
    const { subGoalAId } = await seedHierarchy(owner);

    await expect(
      intruder.mutation(api.tasks.createTask, {
        task: "Should be rejected",
        subGoalId: subGoalAId,
        priority: 5,
        estimatedMinutes: 30,
      }),
    ).rejects.toThrow();
  });
});

describe("authentication", () => {
  test("rejects reading and creating tasks with no identity", async () => {
    const owner = asUser();
    const anon = newConvexTest(modules);
    const { subGoalAId } = await seedHierarchy(owner);

    await expect(anon.query(api.tasks.getAllTasks, {})).rejects.toThrow();
    await expect(
      anon.query(api.tasks.getTasks, { subGoalId: subGoalAId }),
    ).rejects.toThrow();
    await expect(
      anon.mutation(api.tasks.createTask, {
        task: "Anything",
        subGoalId: subGoalAId,
        priority: 5,
        estimatedMinutes: 30,
      }),
    ).rejects.toThrow();
  });
});

describe("cross-user isolation", () => {
  test("a user's tasks are invisible to another user", async () => {
    const owner = asUser();
    const intruder = newConvexTest(modules).withIdentity(OTHER_USER);
    const { subGoalAId, taskAId } = await seedHierarchy(owner);

    expect(await intruder.query(api.tasks.getAllTasks, {})).toEqual([]);
    expect(
      await intruder.query(api.tasks.getTasks, { subGoalId: subGoalAId }),
    ).toEqual([]);
    expect(
      await intruder.query(api.tasks.getTask, { taskId: taskAId }),
    ).toBeNull();
  });

  test("another user cannot update, complete, or delete someone else's task", async () => {
    const owner = asUser();
    const intruder = newConvexTest(modules).withIdentity(OTHER_USER);
    const { taskAId } = await seedHierarchy(owner);

    await expect(
      intruder.mutation(api.tasks.updateTask, {
        taskId: taskAId,
        task: "Hijacked",
      }),
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.tasks.updateTaskStatus, {
        taskId: taskAId,
        status: "completed",
      }),
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.tasks.completeTask, { taskId: taskAId }),
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.tasks.deleteTask, { taskId: taskAId }),
    ).rejects.toThrow();

    const task = await owner.query(api.tasks.getTask, { taskId: taskAId });
    expect(task).toMatchObject({ task: "Write chapter 3", status: "todo" });
  });
});
