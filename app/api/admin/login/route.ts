import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, supabaseConfig, supabaseRequest } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 503 });
  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  const auth = await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const session = await auth.json();
  if (!auth.ok) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  const roleResponse = await supabaseRequest("/rest/v1/rpc/current_app_role", session.access_token, { method: "POST", body: "{}" });
  const role = roleResponse.ok ? await roleResponse.json() : "member";
  if (role !== "admin") return NextResponse.json({ error: "This account does not have administrator access." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.expires_in ?? 3600 });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api/admin", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
