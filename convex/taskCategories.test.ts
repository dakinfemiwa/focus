/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { newConvexTest, seedHierarchy, TEST_USER } from "./testUtils";

const modules = import.meta.glob("./**/*.ts");

describe("task categories and scheduling profiles", () => {
  test("seeds the predefined categories idempotently", async () => {
    const t = newConvexTest(modules).withIdentity(TEST_USER);

    await t.mutation(api.taskCategories.seedTaskCategories, {});
    await t.mutation(api.taskCategories.seedTaskCategories, {});

    const categories = await t.query(api.taskCategories.getTaskCategories, {});
    expect(categories).toHaveLength(18);
    expect(
      categories.find((category) => category.slug === "programming"),
    ).toMatchObject({
      name: "Programming",
      defaultProfile: {
        attentionDemand: 3,
        cognitive: 3,
      },
    });
  });

  test("persists explicit task-specific scheduling values", async () => {
    const t = newConvexTest(modules).withIdentity(TEST_USER);
    await t.mutation(api.taskCategories.seedTaskCategories, {});
    const categories = await t.query(api.taskCategories.getTaskCategories, {});
    const programming = categories.find(
      (category) => category.slug === "programming",
    );
    const { subGoalAId } = await seedHierarchy(t);

    const taskId = await t.mutation(api.tasks.createTask, {
      task: "Debug authentication bug",
      subGoalId: subGoalAId,
      priority: 8,
      estimatedMinutes: 60,
      categoryId: programming!._id,
      attentionDemand: 2,
      interruptibility: 3,
      concurrencyProfile: {
        cognitive: 3,
        visual: 2,
        auditory: 0,
        physical: 0,
      },
      contextRequirements: {
        locations: ["desk"],
        devices: ["laptop"],
        noiseLevel: "quiet",
      },
    });

    await expect(t.query(api.tasks.getTask, { taskId })).resolves.toMatchObject(
      {
        categoryId: programming!._id,
        attentionDemand: 2,
        interruptibility: 3,
        concurrencyProfile: { cognitive: 3, visual: 2 },
        contextRequirements: { locations: ["desk"], devices: ["laptop"] },
      },
    );
  });

  test("rejects scheduling values outside the 0-3 scale", async () => {
    const t = newConvexTest(modules).withIdentity(TEST_USER);
    const { subGoalAId } = await seedHierarchy(t);

    await expect(
      t.mutation(api.tasks.createTask, {
        task: "Invalid profile",
        subGoalId: subGoalAId,
        priority: 5,
        estimatedMinutes: 30,
        attentionDemand: 4,
      }),
    ).rejects.toThrow();
  });
});
