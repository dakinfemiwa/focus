import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "@/convex/_generated/api";
import type { Task } from "@/types/types";
import { getMutationSpy, resetConvexMocks } from "@/test/convex-mocks";
import { TaskCard } from "./task-card";

const baseTask: Task = {
  id: "task_1",
  task: "Write chapter 3",
  subGoalId: "subgoal_1",
  priority: 7,
  estimatedMinutes: 45,
  status: "todo",
};

beforeEach(() => {
  resetConvexMocks();
});

describe("completion toggle", () => {
  test("an open task's Done? button calls completeTask with its id", async () => {
    const user = userEvent.setup();
    const completeTask = getMutationSpy(api.tasks.completeTask);
    render(<TaskCard task={baseTask} />);

    await user.click(screen.getByRole("button", { name: /mark task as completed/i }));

    expect(completeTask).toHaveBeenCalledWith({ taskId: "task_1" });
  });

  test("a completed task's Done button calls updateTaskStatus with todo", async () => {
    const user = userEvent.setup();
    const updateTaskStatus = getMutationSpy(api.tasks.updateTaskStatus);
    render(<TaskCard task={{ ...baseTask, status: "completed" }} />);

    await user.click(
      screen.getByRole("button", { name: /mark task as not completed/i }),
    );

    expect(updateTaskStatus).toHaveBeenCalledWith({
      taskId: "task_1",
      status: "todo",
    });
  });
});

describe("editing", () => {
  test("editing the title and saving calls updateTask with trimmed values", async () => {
    const user = userEvent.setup();
    const updateTask = getMutationSpy(api.tasks.updateTask);
    render(<TaskCard task={baseTask} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const nameInput = screen.getByLabelText(/task name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "  Write chapter 4  ");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(updateTask).toHaveBeenCalledWith({
      taskId: "task_1",
      task: "Write chapter 4",
      priority: 7,
      estimatedMinutes: 45,
      dueDate: undefined,
    });
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  test("a blank title blocks the save and stays in edit mode", async () => {
    const user = userEvent.setup();
    const updateTask = getMutationSpy(api.tasks.updateTask);
    render(<TaskCard task={baseTask} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const nameInput = screen.getByLabelText(/task name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(updateTask).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
  });

  test("cancel exits edit mode without saving", async () => {
    const user = userEvent.setup();
    const updateTask = getMutationSpy(api.tasks.updateTask);
    render(<TaskCard task={baseTask} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(updateTask).not.toHaveBeenCalled();
    expect(screen.getByText("Write chapter 3")).toBeInTheDocument();
  });
});

describe("deletion", () => {
  test("Remove calls deleteTask with the task's id", async () => {
    const user = userEvent.setup();
    const deleteTask = getMutationSpy(api.tasks.deleteTask);
    render(<TaskCard task={baseTask} />);

    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    expect(deleteTask).toHaveBeenCalledWith({ taskId: "task_1" });
  });
});
