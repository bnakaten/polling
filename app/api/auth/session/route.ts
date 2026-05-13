import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const tokenCookie = (await cookies()).get("auth_token");
    
    if (!tokenCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
