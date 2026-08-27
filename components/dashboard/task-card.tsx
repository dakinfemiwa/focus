"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TaskCardProps } from "@/types/types";
import { getPriorityStyles } from "@/lib/priority";
import { useMutation } from "convex/react";
import { useState } from "react";

export function TaskCard({ task }: TaskCardProps) {
  const completeTask = useMutation(api.tasks.completeTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const [isEditing, setIsEditing] = useState(false);
  const [taskName, setTaskName] = useState(task.task);
  const [priority, setPriority] = useState(task.priority);
  const [minutes, setMinutes] = useState(task.estimatedMinutes);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");

  const isCompleted = task.status === "completed";
  const priorityStyles = getPriorityStyles(task.priority);

  const handleToggleComplete = async () => {
    if (isCompleted) {
      await updateTaskStatus({
        taskId: task.id as Id<"tasks">,
        status: "todo",
      });
      return;
    }

    await completeTask({ taskId: task.id as Id<"tasks"> });
  };

  const handleSave = async () => {
    if (!taskName.trim()) return;

    await updateTask({
      taskId: task.id as Id<"tasks">,
      task: taskName.trim(),
      priority,
      estimatedMinutes: minutes,
      dueDate: dueDate || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-l-4 p-3 ${priorityStyles.rail} ${
        isCompleted ? "bg-muted/50 opacity-70" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={isCompleted ? "secondary" : "outline"}
          size="sm"
          onClick={handleToggleComplete}
          aria-label={
            isCompleted
              ? "Mark task as not completed"
              : "Mark task as completed"
          }
        >
          {isCompleted ? "Done" : "Done?"}
        </Button>

        {isEditing ? (
          <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_5rem_5rem_9rem_auto]">
            <Input
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              aria-label="Task name"
            />
            <Input
              type="number"
              min={0}
              max={10}
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value || 0))}
              aria-label="Priority"
            />
            <Input
              type="number"
              min={1}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value || 1))}
              aria-label="Estimated minutes"
            />
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="Due date"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className={isCompleted ? "line-through" : ""}>{task.task}</div>
            <div className="text-xs text-muted-foreground">
              {task.estimatedMinutes} min ·{" "}
              <span className={`rounded px-1.5 py-0.5 font-medium ${priorityStyles.badge}`}>
                Priority {task.priority}
              </span>
              {task.dueDate ? ` · ${task.dueDate}` : ""}
            </div>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => deleteTask({ taskId: task.id as Id<"tasks"> })}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
