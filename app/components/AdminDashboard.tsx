"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Movie = { id: number; title?: string; release_date?: string; genres?: string[]; runtime_minutes?: number; updated_at?: string };
type Candidate = { id: string; movie_id: number; candidate_type: string; timestamp_ms: number; intensity?: string; description?: string; category?: string; verification_state: string; upvotes: number; downvotes: number; created_at: string; updated_at: string };
type Proposal = { id: string; movie_id: number; proposal_type: string; proposed_timestamp_ms: number; proposed_intensity?: string; details?: string; state: string; positive_validations: number; negative_validations: number; created_at: string };
type Report = { id: string; target_type: string; reason: string; status: string; reporter_name?: string; target_summary?: string; created_at: string };
type Contributor = { display_name?: string; contribution_count?: number; total_contributions?: number };
type AdminUser = { user_id: string; display_name: string; contribution_count: number; helpful_vote_count: number; app_role: string; member_since: string };
type AdminData = { movies: Movie[]; candidates: Candidate[]; proposals: Proposal[]; reports: Report[]; contributors: Contributor[]; users: AdminUser[]; updatedAt: string };
const tabs = ["Overview", "Movies", "Jumpscares", "Moderation", "Users"] as const;

function time(ms: number) { const seconds = Math.round(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function timeParts(ms: number) { const seconds = Math.round(ms / 1000); return { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60), seconds: seconds % 60 }; }
function timestampFrom(form: FormData) { return (Number(form.get("hours")) * 3600 + Number(form.get("minutes")) * 60 + Number(form.get("seconds"))) * 1000; }

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [data, setData] = useState<AdminData | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showCreateScare, setShowCreateScare] = useState(false);
  const [newScareMovieID, setNewScareMovieID] = useState("");
  const [newScareRuntime, setNewScareRuntime] = useState("");
  const [movieSource, setMovieSource] = useState<"saved" | "catalogue">("saved");
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [catalogueMovies, setCatalogueMovies] = useState<Movie[]>([]);
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [selectedCatalogueMovie, setSelectedCatalogueMovie] = useState<Movie | null>(null);
  const [scareMovieID, setScareMovieID] = useState("all");
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null);
  const [editingProposal, setEditingProposal] = useState<string | null>(null);
  async function load() { const response = await fetch("/api/admin/data", { cache: "no-store" }); if (response.status === 403) { router.replace("/admin/login"); return; } setData(await response.json()); }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/data", { cache: "no-store" }).then(async response => {
      if (response.status === 403) { router.replace("/admin/login"); return; }
      const payload = await response.json();
      if (active) setData(payload);
    });
    return () => { active = false; };
  }, [router]);
  const movies = useMemo(() => (data?.movies ?? []).filter(movie => `${movie.title ?? ""} ${movie.id}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const movieByID = useMemo(() => new Map((data?.movies ?? []).map(movie => [movie.id, movie])), [data]);
  const scareMovies = useMemo(() => {
    if (!data) return [];
    const ids = new Set([...data.candidates.map(item => item.movie_id), ...data.proposals.map(item => item.movie_id)]);
    return [...ids].map(id => movieByID.get(id) ?? { id, title: `Movie ${id}` }).sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }, [data, movieByID]);
  const visibleCandidates = useMemo(() => (data?.candidates ?? []).filter(item => item.verification_state !== "rejected" && (scareMovieID === "all" || String(item.movie_id) === scareMovieID)), [data, scareMovieID]);
  const visibleProposals = useMemo(() => (data?.proposals ?? []).filter(item => scareMovieID === "all" || String(item.movie_id) === scareMovieID), [data, scareMovieID]);
  async function review(id: string, action: string) { setBusy(id + action); setNotice(""); const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "reviewProposal", id, action }) }); const body = await response.json(); setBusy(null); if (!response.ok) { setNotice(body.error ?? "Action failed."); return; } setNotice(`Proposal ${action}d.`); await load(); }
  async function saveCandidate(event: React.FormEvent<HTMLFormElement>, candidate: Candidate) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const state = submitter?.value || null;
    const timestampMs = timestampFrom(form);
    setBusy(candidate.id + (state || "save")); setNotice("");
    const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "updateCandidate", id: candidate.id, timestampMs, intensity: form.get("intensity"), description: form.get("description"), state, note: form.get("note") }) });
    const body = await response.json(); setBusy(null);
    if (!response.ok) { setNotice(body.error ?? "Jumpscare could not be updated."); return; }
    setEditingCandidate(null); setNotice(state === "verified" ? "Jumpscare saved and approved immediately." : state === "rejected" ? "Jumpscare rejected immediately." : "Jumpscare changes saved."); await load();
  }
  async function saveProposal(event: React.FormEvent<HTMLFormElement>, proposal: Proposal) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value || "approve";
    setBusy(proposal.id + action); setNotice("");
    const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "reviewProposal", id: proposal.id, action, timestampMs: timestampFrom(form), intensity: form.get("intensity"), note: form.get("note") }) });
    const body = await response.json(); setBusy(null);
    if (!response.ok) { setNotice(body.error ?? "Proposal could not be overridden."); return; }
    setEditingProposal(null); setNotice(action === "approve" ? "Proposal corrected and approved immediately." : `Proposal ${action}d.`); await load();
  }
  function openCreateJumpscare() {
    const firstMovie = data?.movies[0];
    setNewScareMovieID(firstMovie ? String(firstMovie.id) : "");
    setNewScareRuntime(firstMovie?.runtime_minutes ? String(firstMovie.runtime_minutes) : "");
    setNotice("");
    setMovieSource("saved");
    setSelectedCatalogueMovie(null);
    setShowCreateScare(true);
  }
  async function searchCatalogue() {
    const query = catalogueQuery.trim();
    if (query.length < 2) { setNotice("Enter at least two characters to search."); return; }
    setCatalogueBusy(true);
    setNotice("");
    const response = await fetch(`/api/admin/movie-search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    const body = await response.json();
    setCatalogueBusy(false);
    if (!response.ok) { setNotice(body.error ?? "The movie catalogue could not be searched."); return; }
    setCatalogueMovies(body.movies ?? []);
    if (!(body.movies ?? []).length) setNotice("No compatible movies were found. Try another title.");
  }
  function chooseCatalogueMovie(movie: Movie) {
    setSelectedCatalogueMovie(movie);
    setNewScareMovieID(String(movie.id));
    setNewScareRuntime(movie.runtime_minutes ? String(movie.runtime_minutes) : "");
    setNotice("");
  }
  function selectScareMovie(movieID: string) {
    setNewScareMovieID(movieID);
    const movie = data?.movies.find(item => String(item.id) === movieID);
    setNewScareRuntime(movie?.runtime_minutes ? String(movie.runtime_minutes) : "");
  }
  async function createJumpscare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const movie = data.movies.find(item => String(item.id) === newScareMovieID) ?? selectedCatalogueMovie;
    const form = new FormData(event.currentTarget);
    const runtimeMinutes = Number(newScareRuntime);
    const hours = Number(form.get("hours"));
    const minutes = Number(form.get("minutes"));
    const seconds = Number(form.get("seconds"));
    if (!movie) { setNotice("Choose a movie."); return; }
    if (!Number.isInteger(runtimeMinutes) || runtimeMinutes < 1 || runtimeMinutes > 240) { setNotice("Runtime must be between 1 and 240 minutes."); return; }
    if (![hours, minutes, seconds].every(Number.isInteger) || hours < 0 || hours > 4 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) { setNotice("Enter a valid timestamp using 0–4 hours and 0–59 minutes and seconds."); return; }
    const timestampSeconds = hours * 3600 + minutes * 60 + seconds;
    if (timestampSeconds > runtimeMinutes * 60) { setNotice("The jumpscare time must fall within the movie runtime."); return; }
    setBusy("create-jumpscare");
    setNotice("");
    const response = await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "createJumpscare",
        movieId: movie.id,
        movieTitle: movie.title || `Movie ${movie.id}`,
        runtimeSeconds: runtimeMinutes * 60,
        timestampMs: timestampSeconds * 1000,
        intensity: form.get("intensity"),
        details: form.get("details"),
      }),
    });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) { setNotice(body.error ?? "The jumpscare could not be added."); return; }
    setShowCreateScare(false);
    setNotice(`Jumpscare added to ${movie.title || `Movie ${movie.id}`} at ${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.`);
    await load();
  }
  async function saveMovie(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!editingMovie) return; const form = new FormData(event.currentTarget); setBusy("movie"); const response = await fetch("/api/admin/action", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ kind:"updateMovie", id:editingMovie.id, title:form.get("title"), releaseDate:form.get("releaseDate"), runtimeMinutes:Number(form.get("runtime")) || null, genres:String(form.get("genres") || "").split(",").map(x=>x.trim()).filter(Boolean) }) }); const body=await response.json(); setBusy(null); if(!response.ok){setNotice(body.error ?? "Movie could not be updated.");return;} setEditingMovie(null);setNotice("Movie updated.");await load(); }
  async function setRole(userId:string, role:string){setBusy(userId);const response=await fetch("/api/admin/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"setRole",userId,role})});const body=await response.json();setBusy(null);if(!response.ok){setNotice(body.error??"Role could not be updated.");return;}setNotice(`Role changed to ${role}.`);await load();}
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }

  return <main className="admin-shell">
    <aside className="admin-sidebar"><a className="brand admin-brand" href="/admin"><Image src="/brand/ghostie-icon.png" alt="" width={39} height={39} /><span>ScareSafe<br /><small>ADMIN</small></span></a><nav aria-label="Admin sections">{tabs.map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{({ Overview: "⌂", Movies: "▣", Jumpscares: "⚡", Moderation: "◇", Users: "◎" } as Record<string,string>)[item]}</span>{item}</button>)}</nav><div className="admin-user"><span>{email}</span><button onClick={logout}>Sign out</button></div></aside>
    <section className="admin-main"><header><div><p>Private content workspace</p><h1>{tab}</h1></div><div className="live-state"><i /> Connected to ScareSafe</div></header>{notice && <div className="admin-notice" role="status">{notice}</div>}{!data ? <div className="admin-loading glass">Loading secure workspace…</div> : <>
      {tab === "Overview" && <div className="admin-overview"><div className="metric-grid"><Metric label="Mapped movies" value={data.movies.length} detail="Available in admin" /><Metric label="Scare proposals" value={data.proposals.length} detail={`${data.proposals.filter(x => ["pending","awaiting_validation","admin_review"].includes(x.state)).length} need attention`} /><Metric label="Open reports" value={data.reports.length} detail="Community queue" /><Metric label="Contributors" value={data.contributors.length} detail="Top contributors" /></div><div className="admin-grid"><Panel title="Recent activity"><Activity proposals={data.proposals.slice(0, 6)} /></Panel><Panel title="Top contributors"><div className="leader-list">{data.contributors.slice(0, 6).map((person, index) => <div key={index}><b>{index < 3 ? ["🥇","🥈","🥉"][index] : `#${index + 1}`}</b><span>{person.display_name ?? "ScareSafe member"}</span><strong>{person.total_contributions ?? person.contribution_count ?? 0}</strong></div>)}</div></Panel></div></div>}
      {tab === "Movies" && <><div className="admin-toolbar"><input aria-label="Search movies" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or movie ID…" /><span>{movies.length} movies</span></div><div className="data-table"><div className="table-head"><span>Movie</span><span>Release</span><span>Runtime</span><span>Genres</span><span /></div>{movies.map(movie => <div className="table-row" key={movie.id}><span><strong>{movie.title || "Untitled movie"}</strong><small>#{movie.id}</small></span><span>{movie.release_date || "—"}</span><span>{movie.runtime_minutes ? `${movie.runtime_minutes} min` : "—"}</span><span>{movie.genres?.join(", ") || "—"}</span><button className="edit-button" onClick={()=>setEditingMovie(movie)}>Edit</button></div>)}</div>{editingMovie&&<form className="movie-editor glass" onSubmit={saveMovie}><div><h2>Edit movie</h2><button type="button" onClick={()=>setEditingMovie(null)}>Close</button></div><label>Title<input name="title" defaultValue={editingMovie.title} required /></label><div className="editor-fields"><label>Release date<input name="releaseDate" type="date" defaultValue={editingMovie.release_date} /></label><label>Runtime (minutes)<input name="runtime" type="number" min="1" max="240" defaultValue={editingMovie.runtime_minutes} /></label></div><label>Genres<input name="genres" defaultValue={editingMovie.genres?.join(", ")} placeholder="Horror, Thriller" /></label><button className="button primary" disabled={busy==="movie"}>{busy==="movie"?"Saving…":"Save changes"}</button></form>}</>}
      {tab === "Jumpscares" && <>
        <div className="admin-section-actions">
          <div><strong>Scare Mapping</strong><span>Add a verified timestamp or review community submissions.</span></div>
          <button className="button primary" type="button" onClick={openCreateJumpscare}>＋ Add jumpscare</button>
        </div>
        {showCreateScare && <form className="admin-jumpscare-form glass" onSubmit={createJumpscare}>
          <div className="admin-form-heading"><div><p className="section-kicker">Verified immediately</p><h2>Add a jumpscare</h2></div><button type="button" onClick={() => setShowCreateScare(false)}>Close</button></div>
          <div className="admin-form-wide admin-movie-source"><span>Choose movie</span><div><button type="button" className={movieSource === "saved" ? "active" : ""} onClick={() => { setMovieSource("saved"); setSelectedCatalogueMovie(null); const first = data.movies[0]; setNewScareMovieID(first ? String(first.id) : ""); setNewScareRuntime(first?.runtime_minutes ? String(first.runtime_minutes) : ""); }}>Saved in ScareSafe</button><button type="button" className={movieSource === "catalogue" ? "active" : ""} onClick={() => { setMovieSource("catalogue"); setNewScareMovieID(""); setNewScareRuntime(""); }}>Search all movies</button></div></div>
          {movieSource === "saved" ? <label className="admin-form-wide">Movie<select value={newScareMovieID} onChange={event => selectScareMovie(event.target.value)} required><option value="" disabled>Select a movie…</option>{data.movies.map(movie => <option value={movie.id} key={movie.id}>{movie.title || "Untitled movie"} · #{movie.id}</option>)}</select></label> : <div className="admin-form-wide admin-catalogue-picker"><div className="catalogue-search"><input aria-label="Search all movies" value={catalogueQuery} onChange={event => setCatalogueQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void searchCatalogue(); } }} placeholder="Search by movie title…" /><button type="button" className="button primary" onClick={() => void searchCatalogue()} disabled={catalogueBusy}>{catalogueBusy ? "Searching…" : "Search"}</button></div>{selectedCatalogueMovie && <div className="catalogue-selected"><span>Selected</span><strong>{selectedCatalogueMovie.title}</strong><small>{selectedCatalogueMovie.release_date?.slice(0, 4) || "Year unknown"} · #{selectedCatalogueMovie.id}</small></div>}<div className="catalogue-results">{catalogueMovies.map(movie => <button type="button" className={selectedCatalogueMovie?.id === movie.id ? "active" : ""} key={movie.id} onClick={() => chooseCatalogueMovie(movie)}><span><strong>{movie.title}</strong><small>{movie.release_date?.slice(0, 4) || "Year unknown"}{movie.runtime_minutes ? ` · ${movie.runtime_minutes} min` : ""}</small></span><b>{selectedCatalogueMovie?.id === movie.id ? "Selected" : "Choose"}</b></button>)}</div></div>}
          <label>Runtime in minutes<input value={newScareRuntime} onChange={event => setNewScareRuntime(event.target.value)} type="number" min="1" max="240" inputMode="numeric" required /></label>
          <fieldset className="admin-time-fields"><legend>Jumpscare timestamp</legend><label>Hours<input name="hours" type="number" min="0" max="4" defaultValue="0" inputMode="numeric" required /></label><span>:</span><label>Minutes<input name="minutes" type="number" min="0" max="59" defaultValue="0" inputMode="numeric" required /></label><span>:</span><label>Seconds<input name="seconds" type="number" min="0" max="59" defaultValue="0" inputMode="numeric" required /></label></fieldset>
          <fieldset className="admin-intensity"><legend>Intensity</legend><label><input type="radio" name="intensity" value="mild" defaultChecked /><span>Mild</span></label><label><input type="radio" name="intensity" value="major" /><span>Major</span></label></fieldset>
          <label className="admin-form-wide">Spoiler-free description<textarea name="details" maxLength={1000} rows={3} placeholder="Optional — briefly describe the scare without revealing the plot." /></label>
          <div className="admin-form-submit"><small>This is recorded in moderation history and published as verified under your admin account.</small><button className="button primary" disabled={busy === "create-jumpscare"}>{busy === "create-jumpscare" ? "Adding…" : "Add verified jumpscare"}</button></div>
        </form>}
        <div className="scare-workspace-filter glass">
          <label>Manage by movie<select value={scareMovieID} onChange={event => { setScareMovieID(event.target.value); setEditingCandidate(null); setEditingProposal(null); }}><option value="all">All movies</option>{scareMovies.map(movie => <option key={movie.id} value={movie.id}>{movie.title || "Untitled movie"} · #{movie.id}</option>)}</select></label>
          <div><strong>{visibleCandidates.length}</strong><span>published jumpscares</span></div><div><strong>{visibleProposals.length}</strong><span>community proposals</span></div>
        </div>
        <section className="scare-admin-group">
          <div className="scare-admin-heading"><div><p className="section-kicker">Live Scare Sheet</p><h2>Published jumpscares</h2></div><span>Edit any timestamp immediately or override its status.</span></div>
          <div className="proposal-list">{visibleCandidates.length ? visibleCandidates.map(candidate => {
            const movie = movieByID.get(candidate.movie_id); const parts = timeParts(candidate.timestamp_ms); const isEditing = editingCandidate === candidate.id;
            return <article className={`proposal-card ${isEditing ? "editing" : ""}`} key={candidate.id}><div className="proposal-time">{time(candidate.timestamp_ms)}</div><div><span className={`status ${candidate.verification_state}`}>{candidate.verification_state}</span><h3>{movie?.title || `Movie #${candidate.movie_id}`}</h3><p>{candidate.description || "No spoiler-free description supplied."}</p><small>{candidate.intensity || "unrated"} · {candidate.upvotes} up / {candidate.downvotes} down</small></div><div className="proposal-actions"><button disabled={!!busy} onClick={() => setEditingCandidate(isEditing ? null : candidate.id)}>{isEditing ? "Close" : "Edit"}</button><button disabled={!!busy} onClick={() => { setEditingCandidate(candidate.id); }}>Override</button></div>{isEditing && <form className="admin-inline-editor" onSubmit={event => saveCandidate(event, candidate)}><TimeEditor parts={parts} /><fieldset className="admin-intensity"><legend>Intensity</legend><label><input type="radio" name="intensity" value="mild" defaultChecked={candidate.intensity !== "major"} /><span>Mild</span></label><label><input type="radio" name="intensity" value="major" defaultChecked={candidate.intensity === "major"} /><span>Major</span></label></fieldset><label>Description<textarea name="description" defaultValue={candidate.description} maxLength={1000} rows={3} /></label><label>Admin note<input name="note" placeholder="Optional reason for this change" /></label><div className="admin-override-actions"><button disabled={!!busy} value="">Save changes</button><button className="approve" disabled={!!busy} value="verified">Save & approve</button><button className="reject" disabled={!!busy} value="rejected">Reject now</button></div></form>}</article>;
          }) : <Empty title="No published jumpscares for this movie" copy="Add one above or approve a community proposal." />}</div>
        </section>
        <section className="scare-admin-group">
          <div className="scare-admin-heading"><div><p className="section-kicker">Validation queue</p><h2>Community proposals</h2></div><span>Correct the timestamp and approve in one action.</span></div>
          <div className="proposal-list">{visibleProposals.length ? visibleProposals.map(proposal => {
            const movie = movieByID.get(proposal.movie_id); const parts = timeParts(proposal.proposed_timestamp_ms); const isEditing = editingProposal === proposal.id;
            return <article className={`proposal-card ${isEditing ? "editing" : ""}`} key={proposal.id}><div className="proposal-time">{time(proposal.proposed_timestamp_ms)}</div><div><span className={`status ${proposal.state}`}>{proposal.state.replaceAll("_", " ")}</span><h3>{movie?.title || `Movie #${proposal.movie_id}`} · {proposal.proposal_type.replaceAll("_", " ")}</h3><p>{proposal.details || "No spoiler-free description supplied."}</p><small>{proposal.proposed_intensity || "unrated"} · {proposal.positive_validations} correct / {proposal.negative_validations} incorrect</small></div><div className="proposal-actions"><button disabled={!!busy} onClick={() => setEditingProposal(isEditing ? null : proposal.id)}>{isEditing ? "Close" : "Edit & override"}</button>{!isEditing && <><button disabled={!!busy} onClick={() => review(proposal.id, "approve")}>Approve</button><button disabled={!!busy} onClick={() => review(proposal.id, "reject")}>Reject</button><button disabled={!!busy} onClick={() => review(proposal.id, "archive")}>Archive</button></>}</div>{isEditing && <form className="admin-inline-editor" onSubmit={event => saveProposal(event, proposal)}><TimeEditor parts={parts} /><fieldset className="admin-intensity"><legend>Intensity</legend><label><input type="radio" name="intensity" value="mild" defaultChecked={proposal.proposed_intensity !== "major"} /><span>Mild</span></label><label><input type="radio" name="intensity" value="major" defaultChecked={proposal.proposed_intensity === "major"} /><span>Major</span></label></fieldset><label>Admin note<input name="note" placeholder="Optional moderation note" /></label><div className="admin-override-actions"><button className="approve" disabled={!!busy} value="approve">Correct & approve</button><button className="reject" disabled={!!busy} value="reject">Reject now</button><button disabled={!!busy} value="archive">Archive</button></div></form>}</article>;
          }) : <Empty title="No community proposals for this movie" copy="There is nothing awaiting review here." />}</div>
        </section>
      </>}
      {tab === "Moderation" && <div className="report-list">{data.reports.length ? data.reports.map(report => <article key={report.id}><span className="report-icon">!</span><div><h3>{report.reason} · {report.target_type}</h3><p>{report.target_summary || "Community report awaiting review."}</p><small>Reported by {report.reporter_name || "member"} · {new Date(report.created_at).toLocaleDateString()}</small></div><span className="status">{report.status}</span></article>) : <Empty title="No open reports" copy="The moderation queue is clear." />}</div>}
      {tab === "Users" && <div className="admin-grid"><Panel title="Contributor reputation"><div className="leader-list">{data.contributors.map((person, index) => <div key={index}><b>#{index + 1}</b><span>{person.display_name ?? "ScareSafe member"}</span><strong>{person.total_contributions ?? person.contribution_count ?? 0} contributions</strong></div>)}</div></Panel><Panel title="Role management">{data.users?.length?<div className="role-list">{data.users.map(user=><div key={user.user_id}><span><b>{user.display_name}</b><small>{user.contribution_count} contributions · {user.app_role}</small></span><select aria-label={`Role for ${user.display_name}`} value={user.app_role} disabled={busy===user.user_id} onChange={e=>setRole(user.user_id,e.target.value)}><option value="member">Member</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></div>)}</div>:<Empty title="Apply the CMS migration" copy="The secure user-role endpoint becomes available after the included website admin migration is applied." />}</Panel></div>}
    </>}</section>
  </main>;
}

function TimeEditor({ parts }: { parts: { hours: number; minutes: number; seconds: number } }) { return <fieldset className="admin-time-fields"><legend>Timestamp</legend><label>Hours<input name="hours" type="number" min="0" max="4" defaultValue={parts.hours} required /></label><span>:</span><label>Minutes<input name="minutes" type="number" min="0" max="59" defaultValue={parts.minutes} required /></label><span>:</span><label>Seconds<input name="seconds" type="number" min="0" max="59" defaultValue={parts.seconds} required /></label></fieldset>; }
function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <article className="metric-card glass"><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></article>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="admin-panel"><h2>{title}</h2>{children}</section>; }
function Activity({ proposals }: { proposals: Proposal[] }) { return <div className="activity-list">{proposals.map(item => <div key={item.id}><i /><span><strong>{item.proposal_type.replaceAll("_", " ")}</strong><small>Movie #{item.movie_id} · {time(item.proposed_timestamp_ms)}</small></span><time>{new Date(item.created_at).toLocaleDateString()}</time></div>)}</div>; }
function Empty({ title, copy }: { title: string; copy: string }) { return <div className="empty-state"><b>{title}</b><p>{copy}</p></div>; }
