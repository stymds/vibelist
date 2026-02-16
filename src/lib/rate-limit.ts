import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT } from "@/lib/constants";

let ratelimit: Ratelimit | null = null;

export function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT.MAX_REQUESTS,
        `${RATE_LIMIT.WINDOW_SECONDS} s`
      ),
      analytics: true,
    });
  }
  return ratelimit;
}
