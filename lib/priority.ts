export function getPriorityStyles(priority: number) {
  if (priority >= 8) {
    return {
      rail: "border-l-red-500",
      badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    };
  }

  if (priority >= 5) {
    return {
      rail: "border-l-amber-500",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    };
  }

  return {
    rail: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  };
}