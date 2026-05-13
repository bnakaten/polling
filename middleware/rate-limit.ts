import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const requestCounts = new Map();

export function rateLimitMiddleware() {
  return (req: NextRequest) => {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, { count: 1, windowStart: now });
    } else {
      const record = requestCounts.get(ip);
      if (now - record.windowStart > RATE_LIMIT_WINDOW) {
        record.count = 1;
        record.windowStart = now;
      } else {
        record.count++;
        
        if (record.count > RATE_LIMIT_MAX_REQUESTS) {
          return NextResponse.json(
            { error: "Rate limit exceeded. Please try again later." },
            { status: 429 }
          );
        }
      }
    }

    return null;
  };
}
