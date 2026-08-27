"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Task } from "@/types/types";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { TaskCard } from "./task-card";

export function TodayOverview() {
  const goals = useQuery(api.goals.getGoals) ?? [];
  const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals">>();
  const activeGoalId = selectedGoalId ?? goals[0]?._id;
  const subGoals =
    useQuery(
      api.subGoals.getSubGoals,
      activeGoalId ? { goalId: activeGoalId } : "skip",
    ) ?? [];
  const tasks = useQuery(api.tasks.getAllTasks) ?? [];
  const createGoal = useMutation(api.goals.createGoal);
  const createSubGoal = useMutation(api.subGoals.createSubGoal);
  const createTask = useMutation(api.tasks.createTask);

  const [taskName, setTaskName] = useState("");
  const [priority, setPriority] = useState(5);
  const [minutes, setMinutes] = useState(30);
  const [dueDate, setDueDate] = useState("");
  const [selectedSubGoalId, setSelectedSubGoalId] = useState<Id<"subGoals">>();
  const [newGoalName, setNewGoalName] = useState("");
  const [newSubGoalName, setNewSubGoalName] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "completed"
  >("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedTasks: Task[] = tasks.map((task) => ({
    id: task._id,
    task: task.task,
    subGoalId: task.subGoalId,
    priority: task.priority,
    estimatedMinutes: task.estimatedMinutes,
    dueDate: task.dueDate,
    status: task.status,
  }));

  const noOfTasks = normalizedTasks.length;
  const totalMinutes = normalizedTasks.reduce(
    (total, task) => total + task.estimatedMinutes,
    0,
  );
  const visibleTasks = normalizedTasks.filter((task) => {
    if (statusFilter === "completed") return task.status === "completed";
    if (statusFilter === "open") return task.status !== "completed";
    return true;
  });

  const ensureDefaultGoalAndSubGoal = async () => {
    let goalId = activeGoalId;

    if (!goalId) {
      goalId = await createGoal({ goalName: "General" });
    }

    const existingSubGoal =
      subGoals.find((subGoal) => subGoal._id === selectedSubGoalId) ??
      subGoals[0];
    if (existingSubGoal) {
      return existingSubGoal._id;
    }

    const newSubGoalId = await createSubGoal({
      goalId,
      name: "General tasks",
    });

    return newSubGoalId;
  };

  const handleCreateTask = async () => {
    if (!taskName.trim()) return;

    setIsSubmitting(true);

    try {
      const subGoalId = await ensureDefaultGoalAndSubGoal();

      await createTask({
        task: taskName.trim(),
        subGoalId,
        priority,
        estimatedMinutes: minutes,
        dueDate: dueDate || undefined,
      });

      setTaskName("");
      setPriority(5);
      setMinutes(30);
      setDueDate("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoalName.trim()) return;

    const goalId = await createGoal({ goalName: newGoalName.trim() });
    setSelectedGoalId(goalId);
    setSelectedSubGoalId(undefined);
    setNewGoalName("");
  };

  const handleCreateSubGoal = async () => {
    if (!activeGoalId || !newSubGoalName.trim()) return;

    const subGoalId = await createSubGoal({
      goalId: activeGoalId,
      name: newSubGoalName.trim(),
    });
    setSelectedSubGoalId(subGoalId);
    setNewSubGoalName("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.5fr_0.7fr_0.7fr_1fr_1fr_1fr_auto]">
          <Input
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="Add a task"
          />

          <Input
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value || 1))}
            aria-label="Priority"
          />

          <Input
            type="number"
            min={5}
            step={5}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value || 5))}
            aria-label="Estimated minutes"
          />

          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Due date"
          />

          <select
            value={activeGoalId ?? ""}
            onChange={(event) => {
              setSelectedGoalId(event.target.value as Id<"goals">);
              setSelectedSubGoalId(undefined);
            }}
            aria-label="Goal"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            disabled={goals.length === 0}
          >
            {goals.length === 0 ? (
              <option value="">General goal</option>
            ) : (
              goals.map((goal) => (
                <option key={goal._id} value={goal._id}>
                  {goal.goalName}
                </option>
              ))
            )}
          </select>

          <select
            value={selectedSubGoalId ?? subGoals[0]?._id ?? ""}
            onChange={(event) =>
              setSelectedSubGoalId(event.target.value as Id<"subGoals">)
            }
            aria-label="Sub-goal"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            disabled={subGoals.length === 0}
          >
            {subGoals.length === 0 ? (
              <option value="">General tasks</option>
            ) : (
              subGoals.map((subGoal) => (
                <option key={subGoal._id} value={subGoal._id}>
                  {subGoal.name}
                </option>
              ))
            )}
          </select>

          <Button
            type="button"
            onClick={handleCreateTask}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Add task"}
          </Button>
        </div>

        <div className="grid gap-3 rounded-lg border border-dashed p-3 md:grid-cols-2">
          <div className="flex gap-2">
            <Input
              value={newGoalName}
              onChange={(event) => setNewGoalName(event.target.value)}
              placeholder="New goal"
              aria-label="New goal name"
            />
            <Button type="button" variant="outline" onClick={handleCreateGoal}>
              Create goal
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={newSubGoalName}
              onChange={(event) => setNewSubGoalName(event.target.value)}
              placeholder="New sub-goal"
              aria-label="New sub-goal name"
              disabled={!activeGoalId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateSubGoal}
              disabled={!activeGoalId}
            >
              Create sub-goal
            </Button>
          </div>
        </div>

        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>
            {noOfTasks} {noOfTasks === 1 ? "task" : "tasks"}
          </span>

          <span>·</span>

          <span>{totalMinutes} min planned</span>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="task-filter" className="text-sm font-medium">
            Show
          </label>
          <select
            id="task-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "open" | "completed",
              )
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All tasks</option>
            <option value="open">Open tasks</option>
            <option value="completed">Completed tasks</option>
          </select>
        </div>

        <div className="flex flex-col gap-3">
          {visibleTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {normalizedTasks.length === 0
                ? "No tasks yet. Add your first task to start planning your day."
                : "No tasks match this filter."}
            </p>
          ) : (
            visibleTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
