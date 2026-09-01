import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Resolve the authenticated Clerk user's stable identifier, rejecting the
 * request if no identity is present. `tokenIdentifier` (not `subject`) is
 * the canonical stable identifier for auth-linked ownership checks.
 */
export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated.");
  }

  return identity.tokenIdentifier;
}

export async function requireAdminUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated.");
  }

  const email =
    identity.email ??
    (identity as { emailAddresses?: { emailAddress?: string }[] })
      .emailAddresses?.[0]?.emailAddress;

  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !allowedEmails.includes(email.toLowerCase())) {
    throw new Error("Admin access required.");
  }

  return identity.tokenIdentifier;
}
