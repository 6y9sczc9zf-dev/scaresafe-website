import { NextResponse } from "next/server";
import { verifyAdmin, supabaseRequest } from "../../../../lib/supabase-server";

async function jsonOr<T>(response: Response, fallback: T): Promise<T> { return response.ok ? response.json() : fallback; }
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const [moviesR, proposalsR, reportsR, contributorsR, usersR] = await Promise.all([
    supabaseRequest("/rest/v1/movies?select=id,title,release_date,genres,runtime_minutes,updated_at&order=title.asc.nullslast&limit=1000", admin.token),
    supabaseRequest("/rest/v1/scare_mapping_proposals?select=id,movie_id,proposal_type,proposed_timestamp_ms,proposed_intensity,details,state,positive_validations,negative_validations,created_at&order=created_at.desc&limit=100", admin.token),
    supabaseRequest("/rest/v1/rpc/get_admin_report_queue", admin.token, { method: "POST", body: JSON.stringify({ p_include_closed: false }) }),
    supabaseRequest("/rest/v1/public_contributor_leaderboard?select=display_name,avatar_url,contribution_count,helpful_vote_count&order=contribution_count.desc&limit=25", admin.token),
    supabaseRequest("/rest/v1/rpc/admin_cms_users", admin.token, { method: "POST", body: "{}" }),
  ]);
  const [movies, proposals, reports, contributors, users] = await Promise.all([jsonOr(moviesR, []), jsonOr(proposalsR, []), jsonOr(reportsR, []), jsonOr(contributorsR, []), jsonOr(usersR, [])]);
  return NextResponse.json({ movies, proposals, reports, contributors, users, updatedAt: new Date().toISOString() });
}
