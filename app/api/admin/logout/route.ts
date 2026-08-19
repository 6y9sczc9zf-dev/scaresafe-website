import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../../../../lib/supabase-server";
export async function POST() { const response = NextResponse.json({ ok: true }); response.cookies.delete(ACCESS_COOKIE); response.cookies.delete(REFRESH_COOKIE); return response; }
