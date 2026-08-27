import { getFunctionName } from "convex/server";
import type { FunctionReference } from "convex/server";
import { vi } from "vitest";

const state = vi.hoisted(() => ({
  queryResults: new Map<string, unknown>(),
  mutationSpies: new Map<string, ReturnType<typeof vi.fn>>(),
}));

// `api.module.fn` is backed by a Proxy that mints a fresh object on every
// property access, so two references to "the same" function are never
// `===`. Convex functions are still identified uniquely by their
// `module:name` path, via `getFunctionName`, so the mocks are keyed by that
// path string instead of by object identity.
vi.mock("convex/react", () => ({
  useQuery: (query: FunctionReference<"query">, args?: unknown) => {
    if (args === "skip") return undefined;
    return state.queryResults.get(getFunctionName(query));
  },
  useMutation: (mutation: FunctionReference<"mutation">) => {
    const key = getFunctionName(mutation);
    if (!state.mutationSpies.has(key)) {
      state.mutationSpies.set(key, vi.fn());
    }
    return state.mutationSpies.get(key);
  },
}));

/** Set what `useQuery(query, ...)` returns for a given Convex function reference. */
export function setQueryResult(
  query: FunctionReference<"query">,
  value: unknown,
) {
  state.queryResults.set(getFunctionName(query), value);
}

/** Get (creating if needed) the spy backing `useMutation(mutation)`. */
export function getMutationSpy(mutation: FunctionReference<"mutation">) {
  const key = getFunctionName(mutation);
  if (!state.mutationSpies.has(key)) {
    state.mutationSpies.set(key, vi.fn());
  }
  return state.mutationSpies.get(key)!;
}

/** Clear all configured query results and mutation spies between tests. */
export function resetConvexMocks() {
  state.queryResults.clear();
  state.mutationSpies.clear();
}
