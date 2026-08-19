import { cookies } from "next/headers";

export const ACCESS_COOKIE = "scaresafe_admin_access";
export const REFRESH_COOKIE = "scaresafe_admin_refresh";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function getAccessToken() { return (await cookies()).get(ACCESS_COOKIE)?.value ?? null; }

export async function supabaseRequest(path: string, token: string, init: RequestInit = {}) {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");
  return fetch(`${config.url}${path}`, { ...init, cache: "no-store", headers: { apikey: config.key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
}

export async function verifyAdmin(token?: string | null) {
  const accessToken = token ?? await getAccessToken();
  if (!accessToken) return null;
  const userResponse = await supabaseRequest("/auth/v1/user", accessToken);
  if (!userResponse.ok) return null;
  const user = await userResponse.json() as { id: string; email?: string };
  const roleResponse = await supabaseRequest("/rest/v1/rpc/current_app_role", accessToken, { method: "POST", body: "{}" });
  if (!roleResponse.ok) return null;
  const role = await roleResponse.json();
  if (role !== "admin") return null;
  return { user, token: accessToken };
}
