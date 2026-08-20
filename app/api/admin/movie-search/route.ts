import { NextResponse } from "next/server";
import { verifyAdmin, supabaseRequest } from "../../../../lib/supabase-server";

type SearchRecord = { tvdb_id?: string | number };
type RemoteID = { id?: string; sourceName?: string };
type ExtendedMovie = {
  name?: string;
  year?: string;
  runtime?: number;
  genres?: Array<{ name?: string }>;
  remoteIds?: RemoteID[];
  first_release?: { date?: string };
};

export async function GET(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return NextResponse.json({ movies: [] });

  const search = await supabaseRequest(`/functions/v1/tvdb/search?query=${encodeURIComponent(query)}&type=movie&limit=10&offset=0`, admin.token);
  if (!search.ok) return NextResponse.json({ error: "The movie catalogue could not be searched." }, { status: search.status });
  const payload = await search.json() as { data?: SearchRecord[] };
  const tvdbIDs = (payload.data ?? []).map(item => Number(item.tvdb_id)).filter(Number.isSafeInteger).slice(0, 10);

  const movies = (await Promise.all(tvdbIDs.map(async tvdbID => {
    const detail = await supabaseRequest(`/functions/v1/tvdb/movies/${tvdbID}/extended?meta=translations`, admin.token);
    if (!detail.ok) return null;
    const body = await detail.json() as { data?: ExtendedMovie };
    const movie = body.data;
    const tmdbID = Number(movie?.remoteIds?.find(item => item.sourceName === "TheMovieDB.com")?.id);
    if (!movie || !Number.isSafeInteger(tmdbID) || tmdbID <= 0) return null;
    return {
      id: tmdbID,
      title: movie.name || `Movie ${tmdbID}`,
      release_date: movie.first_release?.date || (movie.year ? `${movie.year}-01-01` : undefined),
      genres: movie.genres?.map(item => item.name).filter(Boolean) ?? [],
      runtime_minutes: movie.runtime || undefined,
    };
  }))).filter(Boolean);

  return NextResponse.json({ movies });
}
