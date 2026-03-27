/**
 * Centralized subscription/role access check.
 * Used by all edge functions that gate on staff / beta / subscription.
 */
export interface AccessResult {
  allowed: boolean;
  reason?: string;
  roles: string[];
  isStaff: boolean;
  subscription?: {
    active: boolean;
    beta?: boolean;
    unlimited?: boolean;
    expires?: string;
  };
}

export async function checkAccess(
  supabaseAdmin: any,
  userId: string
): Promise<AccessResult> {
  // Fetch roles
  const { data: userRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role, created_at")
    .eq("user_id", userId);

  const roles = (userRoles || []).map((r: any) => r.role);
  const isStaff = roles.includes("owner") || roles.includes("admin");

  // Staff get unlimited access
  if (isStaff) {
    return {
      allowed: true,
      roles,
      isStaff: true,
      subscription: { active: true, unlimited: true },
    };
  }

  // Beta testers: access expires based on role assignment date + configured duration
  if (roles.includes("beta")) {
    const betaRole = (userRoles || []).find((r: any) => r.role === "beta");
    if (betaRole) {
      const { data: betaSetting } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "beta_duration_days")
        .single();

      const betaDays = (betaSetting?.value as any)?.days ?? 30;
      const assignedAt = new Date(betaRole.created_at).getTime();
      const expiresAt = new Date(assignedAt + betaDays * 24 * 60 * 60 * 1000);
      const isActive = expiresAt > new Date();

      if (isActive) {
        return {
          allowed: true,
          roles,
          isStaff: false,
          subscription: { active: true, beta: true, expires: expiresAt.toISOString() },
        };
      }
    }
  }

  // Regular subscription
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const isActive = !!sub && !!sub.current_period_end && new Date(sub.current_period_end) > new Date();

  return {
    allowed: isActive,
    reason: isActive ? undefined : "No active subscription",
    roles,
    isStaff: false,
    subscription: isActive
      ? { active: true, expires: sub.current_period_end }
      : { active: false },
  };
}
