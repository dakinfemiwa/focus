"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { api } from "@/convex/_generated/api";
import { getPriorityStyles } from "@/lib/priority";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { useState } from "react";

export default function CalendarPage() {
  const { isSignedIn } = useAuth();
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const tasks = useQuery(api.tasks.getAllTasks, isSignedIn ? {} : "skip") ?? [];

  const selectedDateKey = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : "";
  const tasksForSelectedDate = tasks.filter(
    (task) => task.dueDate === selectedDateKey,
  );
  const scheduledDates = tasks.flatMap((task) =>
    task.dueDate ? [parseISO(task.dueDate)] : [],
  );
  const weekStart = startOfWeek(selectedDate ?? new Date(), {
    weekStartsOn: 1,
  });
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Calendar" description="Your upcoming plan" />

        <div className="mt-8 space-y-6">
          <div className="flex w-fit rounded-lg border bg-muted p-1">
            <Button
              type="button"
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              type="button"
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </div>

          {view === "month" ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{ hasTasks: scheduledDates }}
                  modifiersClassNames={{
                    hasTasks:
                      "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                  }}
                  className="mx-auto"
                />
              </div>

              <DayAgenda
                selectedDate={selectedDate}
                tasks={tasksForSelectedDate}
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <div className="grid min-w-[840px] grid-cols-7 divide-x">
                {weekDays.map((day) => {
                  const dayTasks = tasks.filter(
                    (task) => task.dueDate === format(day, "yyyy-MM-dd"),
                  );

                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-80 p-3 text-left align-top transition-colors hover:bg-muted/50 ${
                        selectedDate && isSameDay(day, selectedDate)
                          ? "bg-muted/40"
                          : ""
                      }`}
                    >
                      <div className="border-b pb-3">
                        <div className="text-xs uppercase text-muted-foreground">
                          {format(day, "EEE")}
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {format(day, "d")}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {dayTasks.map((task) => {
                          const styles = getPriorityStyles(task.priority);
                          return (
                            <div
                              key={task._id}
                              className={`rounded-md border-l-4 bg-background p-2 text-xs shadow-sm ${styles.rail} ${
                                task.status === "completed"
                                  ? "opacity-60 line-through"
                                  : ""
                              }`}
                            >
                              <div className="font-medium">{task.task}</div>
                              <div className="mt-1 text-muted-foreground">
                                {task.estimatedMinutes} min
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}

function DayAgenda({
  selectedDate,
  tasks,
}: {
  selectedDate: Date | undefined;
  tasks: Array<{
    _id: string;
    task: string;
    priority: number;
    estimatedMinutes: number;
    status: "todo" | "in_progress" | "completed";
  }>;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium">
        {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"}
      </h2>

      <div className="mt-4 space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks scheduled for this day.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className={`rounded-lg border border-l-4 p-3 ${getPriorityStyles(task.priority).rail} ${
                task.status === "completed" ? "bg-muted/50 opacity-70" : ""
              }`}
            >
              <div
                className={
                  task.status === "completed" ? "line-through" : "font-medium"
                }
              >
                {task.task}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {task.status === "completed" ? "Completed · " : "Open · "}
                <span className={getPriorityStyles(task.priority).badge}>
                  Priority {task.priority}
                </span>{" "}
                · {task.estimatedMinutes} min
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
