import { describe, expect, test } from "vitest";
import { getPriorityStyles } from "./priority";

describe("getPriorityStyles", () => {
  test.each([
    [0, "emerald"],
    [4, "emerald"],
    [5, "amber"],
    [7, "amber"],
    [8, "red"],
    [10, "red"],
  ])("priority %i maps to the %s tier", (priority, tier) => {
    const styles = getPriorityStyles(priority);

    expect(styles.rail).toContain(tier);
    expect(styles.badge).toContain(tier);
  });
});
