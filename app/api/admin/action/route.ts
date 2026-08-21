import { NextResponse } from "next/server";
import { verifyAdmin, supabaseRequest } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await request.json();
  let result: Response;
  if (body.kind === "reviewProposal" && body.id && ["approve", "reject", "archive", "lock", "unlock"].includes(body.action)) {
    result = await supabaseRequest("/rest/v1/rpc/admin_review_scare_mapping_proposal", admin.token, { method: "POST", body: JSON.stringify({ p_proposal_id: body.id, p_action: body.action, p_note: body.note || null, p_timestamp_ms: body.timestampMs ?? null, p_intensity: body.intensity ?? null, p_category: body.category ?? null }) });
  } else if (body.kind === "updateCandidate" && body.id) {
    const timestampMs = Number(body.timestampMs);
    const intensity = String(body.intensity || "").toLowerCase();
    const description = String(body.description || "").trim().slice(0, 1000) || null;
    const state = body.state == null ? null : String(body.state);
    if (!Number.isInteger(timestampMs) || timestampMs < 0 || timestampMs > 14400000) {
      return NextResponse.json({ error: "Timestamp must be between 0 and 4 hours." }, { status: 400 });
    }
    if (!["mild", "major"].includes(intensity)) {
      return NextResponse.json({ error: "Choose Mild or Major intensity." }, { status: 400 });
    }
    if (state && !["verified", "rejected"].includes(state)) {
      return NextResponse.json({ error: "Unsupported override state." }, { status: 400 });
    }
    result = await supabaseRequest("/rest/v1/rpc/admin_update_jumpscare_candidate", admin.token, {
      method: "POST",
      body: JSON.stringify({ p_candidate_id: body.id, p_timestamp_ms: timestampMs, p_intensity: intensity, p_description: description }),
    });
    if (result.ok && state === "rejected") {
      result = await supabaseRequest("/rest/v1/rpc/admin_moderate_content", admin.token, { method: "POST", body: JSON.stringify({ p_target_type: "candidate", p_target_id: body.id, p_action: "remove", p_reason: body.note || "Overridden from the ScareSafe admin website", p_report_id: null }) });
    } else if (result.ok && state === "verified") {
      result = await supabaseRequest("/rest/v1/rpc/admin_moderate_content", admin.token, { method: "POST", body: JSON.stringify({ p_target_type: "candidate", p_target_id: body.id, p_action: "restore", p_reason: body.note || "Restored from the ScareSafe admin website", p_report_id: null }) });
      if (result.ok) result = await supabaseRequest("/rest/v1/rpc/admin_verify_candidate", admin.token, { method: "POST", body: JSON.stringify({ p_candidate_id: body.id, p_reason: body.note || "Approved from the ScareSafe admin website" }) });
    }
  } else if (body.kind === "removeCandidate" && body.id) {
    result = await supabaseRequest("/rest/v1/rpc/admin_moderate_content", admin.token, {
      method: "POST",
      body: JSON.stringify({ p_target_type: "candidate", p_target_id: body.id, p_action: "remove", p_reason: body.reason || "Removed from the ScareSafe admin website", p_report_id: null }),
    });
  } else if (body.kind === "createJumpscare") {
    const movieId = Number(body.movieId);
    const runtimeSeconds = Number(body.runtimeSeconds);
    const timestampMs = Number(body.timestampMs);
    const intensity = String(body.intensity || "").toLowerCase();
    const movieTitle = String(body.movieTitle || "").trim().slice(0, 300);
    const details = String(body.details || "").trim().slice(0, 1000) || null;
    if (!Number.isSafeInteger(movieId) || movieId <= 0 || !movieTitle) {
      return NextResponse.json({ error: "Choose a valid movie." }, { status: 400 });
    }
    if (!Number.isInteger(runtimeSeconds) || runtimeSeconds < 60 || runtimeSeconds > 14400) {
      return NextResponse.json({ error: "Runtime must be between 1 minute and 4 hours." }, { status: 400 });
    }
    if (!Number.isInteger(timestampMs) || timestampMs < 0 || timestampMs > runtimeSeconds * 1000) {
      return NextResponse.json({ error: "The jumpscare time must fall within the movie runtime." }, { status: 400 });
    }
    if (!["mild", "major"].includes(intensity)) {
      return NextResponse.json({ error: "Choose Mild or Major intensity." }, { status: 400 });
    }
    result = await supabaseRequest("/rest/v1/rpc/submit_scare_mapping_proposal", admin.token, {
      method: "POST",
      body: JSON.stringify({
        p_movie_id: movieId,
        p_movie_title: movieTitle,
        p_runtime_seconds: runtimeSeconds,
        p_source_platform: "ScareSafe admin website",
        p_version_key: "default",
        p_official_mapping_id: null,
        p_timestamp_ms: timestampMs,
        p_proposal_type: "missing_jumpscare",
        p_intensity: intensity,
        p_category: null,
        p_details: details,
        p_clustering_window_ms: 2000,
      }),
    });
  } else if (body.kind === "updateMovie" && body.id && body.title) {
    result = await supabaseRequest("/rest/v1/rpc/admin_cms_update_movie", admin.token, { method: "POST", body: JSON.stringify({ p_movie_id: body.id, p_title: body.title, p_release_date: body.releaseDate || null, p_runtime_minutes: body.runtimeMinutes || null, p_genres: body.genres || null }) });
  } else if (body.kind === "setRole" && body.userId && ["member", "moderator", "admin"].includes(body.role)) {
    result = await supabaseRequest("/rest/v1/rpc/admin_cms_set_user_role", admin.token, { method: "POST", body: JSON.stringify({ p_user_id: body.userId, p_role: body.role }) });
  } else return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  const payload = await result.json().catch(() => ({}));
  return NextResponse.json(result.ok ? payload : { error: payload.message ?? "The action could not be completed." }, { status: result.ok ? 200 : result.status });
}
