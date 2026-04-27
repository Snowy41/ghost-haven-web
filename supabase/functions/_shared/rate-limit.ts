/**
 * Database-backed rate limiter.
 * Persistent across edge function cold starts and instances.
 *
 * Usage:
 *   const rl = await rateLimit(supabaseAdmin, `login:${ip}`, "login", 5, 300);
 *   if (!rl.allowed) return new Response(..., { status: 429 });
 */
export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterSeconds: number;
}

export async function rateLimit(
  supabaseAdmin: any,
  identifier: string,
  action: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });

    if (error || !data || !data[0]) {
      // Fail-open on infrastructure errors so legitimate users aren't locked out
      return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
    }

    return {
      allowed: data[0].allowed,
      currentCount: data[0].current_count,
      retryAfterSeconds: data[0].retry_after_seconds,
    };
  } catch {
    return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}
