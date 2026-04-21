/**
 * Modular role-tier check for edge functions.
 * Tiers (highest to lowest privilege): owner > admin > moderator
 *
 * Pass the minimum required tier and it returns true if the user has
 * that tier or any higher one.
 */
export type RoleTier = "owner" | "admin" | "moderator";

const TIER_ORDER: RoleTier[] = ["moderator", "admin", "owner"];

export interface RoleCheckResult {
  allowed: boolean;
  roles: string[];
  matchedTier?: RoleTier;
}

export async function checkMinRole(
  supabaseAdmin: any,
  userId: string,
  minTier: RoleTier
): Promise<RoleCheckResult> {
  const { data: userRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (userRoles || []).map((r: any) => r.role);
  const minIdx = TIER_ORDER.indexOf(minTier);
  const acceptedTiers = TIER_ORDER.slice(minIdx);

  const matched = acceptedTiers.find((t) => roles.includes(t));
  return {
    allowed: !!matched,
    roles,
    matchedTier: matched,
  };
}
