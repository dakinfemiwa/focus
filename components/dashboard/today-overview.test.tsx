import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "@/convex/_generated/api";
import {
  getMutationSpy,
  resetConvexMocks,
  setQueryResult,
} from "@/test/convex-mocks";
import { TodayOverview } from "./today-overview";

const goal = { _id: "goal_1", goalName: "Get a First" };
const subGoal = { _id: "subgoal_1", goalId: "goal_1", name: "Dissertation" };

const openTask = {
  _id: "task_1",
  task: "Write chapter 3",
  subGoalId: "subgoal_1",
  priority: 7,
  estimatedMinutes: 45,
  status: "todo" as const,
};
const completedTask = {
  _id: "task_2",
  task: "Submit proposal",
  subGoalId: "subgoal_1",
  priority: 4,
  estimatedMinutes: 20,
  status: "completed" as const,
};

function seedGoalAndSubGoal() {
  setQueryResult(api.goals.getGoals, [goal]);
  setQueryResult(api.subGoals.getSubGoals, [subGoal]);
}

beforeEach(() => {
  resetConvexMocks();
  seedGoalAndSubGoal();
});

describe("empty states", () => {
  test("shows the no-tasks message when there are no tasks at all", () => {
    setQueryResult(api.tasks.getAllTasks, []);
    render(<TodayOverview />);

    expect(
      screen.getByText(/no tasks yet\. add your first task/i),
    ).toBeInTheDocument();
  });

  test("shows a filter-specific message when tasks exist but none match", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, [completedTask]);
    render(<TodayOverview />);

    await user.selectOptions(screen.getByLabelText(/show/i), "open");

    expect(screen.getByText(/no tasks match this filter/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/no tasks yet\. add your first task/i),
    ).not.toBeInTheDocument();
  });
});

describe("rendering tasks", () => {
  test("renders one card per task, showing title, minutes, and priority", () => {
    setQueryResult(api.tasks.getAllTasks, [openTask, completedTask]);
    render(<TodayOverview />);

    expect(screen.getByText("Write chapter 3")).toBeInTheDocument();
    expect(screen.getByText("Submit proposal")).toBeInTheDocument();
    expect(screen.getByText(/priority 7/i)).toBeInTheDocument();
    expect(screen.getByText(/priority 4/i)).toBeInTheDocument();
  });
});

describe("status filter", () => {
  test("open hides completed tasks", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, [openTask, completedTask]);
    render(<TodayOverview />);

    await user.selectOptions(screen.getByLabelText(/show/i), "open");

    expect(screen.getByText("Write chapter 3")).toBeInTheDocument();
    expect(screen.queryByText("Submit proposal")).not.toBeInTheDocument();
  });

  test("completed shows only completed tasks", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, [openTask, completedTask]);
    render(<TodayOverview />);

    await user.selectOptions(screen.getByLabelText(/show/i), "completed");

    expect(screen.queryByText("Write chapter 3")).not.toBeInTheDocument();
    expect(screen.getByText("Submit proposal")).toBeInTheDocument();
  });
});

describe("creating a task", () => {
  test("submitting the form calls createTask with the entered values", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, []);
    const createTask = getMutationSpy(api.tasks.createTask);
    render(<TodayOverview />);

    await user.type(screen.getByPlaceholderText(/add a task/i), "  Read paper  ");
    await user.click(screen.getByRole("button", { name: /add task/i }));

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "Read paper",
        subGoalId: "subgoal_1",
      }),
    );
  });

  test("a blank task name does not call createTask", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, []);
    const createTask = getMutationSpy(api.tasks.createTask);
    render(<TodayOverview />);

    await user.click(screen.getByRole("button", { name: /add task/i }));

    expect(createTask).not.toHaveBeenCalled();
  });

  test("clears the form after a successful submit", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, []);
    getMutationSpy(api.tasks.createTask).mockResolvedValue("task_new");
    render(<TodayOverview />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, "Read paper");
    await user.click(screen.getByRole("button", { name: /add task/i }));

    expect(input).toHaveValue("");
  });

  test("with no goals yet, creates a default goal and sub-goal before the task", async () => {
    const user = userEvent.setup();
    setQueryResult(api.goals.getGoals, []);
    setQueryResult(api.subGoals.getSubGoals, []);
    setQueryResult(api.tasks.getAllTasks, []);

    const createGoal = getMutationSpy(api.goals.createGoal).mockResolvedValue(
      "goal_new",
    );
    const createSubGoal = getMutationSpy(
      api.subGoals.createSubGoal,
    ).mockResolvedValue("subgoal_new");
    const createTask = getMutationSpy(api.tasks.createTask);

    render(<TodayOverview />);

    await user.type(screen.getByPlaceholderText(/add a task/i), "Read paper");
    await user.click(screen.getByRole("button", { name: /add task/i }));

    expect(createGoal).toHaveBeenCalledWith({ goalName: "General" });
    expect(createSubGoal).toHaveBeenCalledWith({
      goalId: "goal_new",
      name: "General tasks",
    });
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "Read paper",
        subGoalId: "subgoal_new",
      }),
    );
  });
});

describe("creating goals and sub-goals", () => {
  test("Create goal calls createGoal with the trimmed name", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, []);
    const createGoal = getMutationSpy(api.goals.createGoal).mockResolvedValue(
      "goal_new",
    );
    render(<TodayOverview />);

    await user.type(screen.getByLabelText(/new goal name/i), "  Build Organise  ");
    await user.click(screen.getByRole("button", { name: /create goal/i }));

    expect(createGoal).toHaveBeenCalledWith({ goalName: "Build Organise" });
  });

  test("Create sub-goal calls createSubGoal against the active goal", async () => {
    const user = userEvent.setup();
    setQueryResult(api.tasks.getAllTasks, []);
    const createSubGoal = getMutationSpy(api.subGoals.createSubGoal);
    render(<TodayOverview />);

    await user.type(
      screen.getByLabelText(/new sub-goal name/i),
      "Revise for exams",
    );
    await user.click(screen.getByRole("button", { name: /create sub-goal/i }));

    expect(createSubGoal).toHaveBeenCalledWith({
      goalId: "goal_1",
      name: "Revise for exams",
    });
  });
});
