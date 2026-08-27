export type AppShellProps = {
  children: React.ReactNode;
};

export type SidebarProps = {
  children: React.ReactNode;
};

export type NavItemProps = {
  name: string;
  urlEndpoint: string;
};

export type PageContainerProps = {
  children: React.ReactNode;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
};

export type TodayOverviewProps = {
  noOfTasks: number;
  totalMinutes: number;
};

export type Task = {
  id: string;
  task: string;
  subGoalId: string;
  priority: number;
  estimatedMinutes: number;
  dueDate?: string;
  status: "todo" | "in_progress" | "completed";
};

export type TaskCardProps = {
  task: Task;
};
