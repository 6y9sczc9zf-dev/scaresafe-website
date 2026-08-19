import { NextResponse } from "next/server";
import { verifyAdmin, supabaseRequest } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await request.json();
  let result: Response;
  if (body.kind === "reviewProposal" && body.id && ["approve", "reject", "archive", "lock", "unlock"].includes(body.action)) {
    result = await supabaseRequest("/rest/v1/rpc/admin_review_scare_mapping_proposal", admin.token, { method: "POST", body: JSON.stringify({ p_proposal_id: body.id, p_action: body.action, p_note: body.note || null, p_timestamp_ms: body.timestampMs ?? null, p_intensity: body.intensity ?? null, p_category: body.category ?? null }) });
  } else if (body.kind === "updateMovie" && body.id && body.title) {
    result = await supabaseRequest("/rest/v1/rpc/admin_cms_update_movie", admin.token, { method: "POST", body: JSON.stringify({ p_movie_id: body.id, p_title: body.title, p_release_date: body.releaseDate || null, p_runtime_minutes: body.runtimeMinutes || null, p_genres: body.genres || null }) });
  } else if (body.kind === "setRole" && body.userId && ["member", "moderator", "admin"].includes(body.role)) {
    result = await supabaseRequest("/rest/v1/rpc/admin_cms_set_user_role", admin.token, { method: "POST", body: JSON.stringify({ p_user_id: body.userId, p_role: body.role }) });
  } else return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  const payload = await result.json().catch(() => ({}));
  return NextResponse.json(result.ok ? payload : { error: payload.message ?? "The action could not be completed." }, { status: result.ok ? 200 : result.status });
}
