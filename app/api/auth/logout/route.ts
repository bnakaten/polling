import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    (await cookies()).delete("auth_token");
    const origin = request.headers.get("origin") || "https://rfcs.fun:3443";
    return NextResponse.redirect(new URL("/login", origin));
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
