"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Movie = { id: number; title?: string; release_date?: string; genres?: string[]; runtime_minutes?: number; updated_at?: string };
type Proposal = { id: string; movie_id: number; proposal_type: string; proposed_timestamp_ms: number; proposed_intensity?: string; details?: string; state: string; positive_validations: number; negative_validations: number; created_at: string };
type Report = { id: string; target_type: string; reason: string; status: string; reporter_name?: string; target_summary?: string; created_at: string };
type Contributor = { display_name?: string; contribution_count?: number; total_contributions?: number };
type AdminData = { movies: Movie[]; proposals: Proposal[]; reports: Report[]; contributors: Contributor[]; updatedAt: string };
const tabs = ["Overview", "Movies", "Jumpscares", "Timeline", "Moderation", "Users"] as const;

function time(ms: number) { const seconds = Math.round(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [data, setData] = useState<AdminData | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
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
  async function review(id: string, action: string) { setBusy(id + action); setNotice(""); const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "reviewProposal", id, action }) }); const body = await response.json(); setBusy(null); if (!response.ok) { setNotice(body.error ?? "Action failed."); return; } setNotice(`Proposal ${action}d.`); await load(); }
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }

  return <main className="admin-shell">
    <aside className="admin-sidebar"><a className="brand admin-brand" href="/admin"><Image src="/brand/ghostie-icon.png" alt="" width={39} height={39} /><span>ScareSafe<br /><small>ADMIN</small></span></a><nav aria-label="Admin sections">{tabs.map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{({ Overview: "⌂", Movies: "▣", Jumpscares: "⚡", Timeline: "⌁", Moderation: "◇", Users: "◎" } as Record<string,string>)[item]}</span>{item}</button>)}</nav><div className="admin-user"><span>{email}</span><button onClick={logout}>Sign out</button></div></aside>
    <section className="admin-main"><header><div><p>Private content workspace</p><h1>{tab}</h1></div><div className="live-state"><i /> Connected to ScareSafe</div></header>{notice && <div className="admin-notice" role="status">{notice}</div>}{!data ? <div className="admin-loading glass">Loading secure workspace…</div> : <>
      {tab === "Overview" && <div className="admin-overview"><div className="metric-grid"><Metric label="Mapped movies" value={data.movies.length} detail="Latest 100 loaded" /><Metric label="Scare proposals" value={data.proposals.length} detail={`${data.proposals.filter(x => ["pending","awaiting_validation","admin_review"].includes(x.state)).length} need attention`} /><Metric label="Open reports" value={data.reports.length} detail="Community queue" /><Metric label="Contributors" value={data.contributors.length} detail="Top contributors" /></div><div className="admin-grid"><Panel title="Recent activity"><Activity proposals={data.proposals.slice(0, 6)} /></Panel><Panel title="Top contributors"><div className="leader-list">{data.contributors.slice(0, 6).map((person, index) => <div key={index}><b>{index < 3 ? ["🥇","🥈","🥉"][index] : `#${index + 1}`}</b><span>{person.display_name ?? "ScareSafe member"}</span><strong>{person.total_contributions ?? person.contribution_count ?? 0}</strong></div>)}</div></Panel></div></div>}
      {tab === "Movies" && <><div className="admin-toolbar"><input aria-label="Search movies" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or movie ID…" /><span>{movies.length} movies</span></div><div className="data-table"><div className="table-head"><span>Movie</span><span>Release</span><span>Runtime</span><span>Genres</span></div>{movies.map(movie => <div className="table-row" key={movie.id}><span><strong>{movie.title || "Untitled movie"}</strong><small>#{movie.id}</small></span><span>{movie.release_date || "—"}</span><span>{movie.runtime_minutes ? `${movie.runtime_minutes} min` : "—"}</span><span>{movie.genres?.join(", ") || "—"}</span></div>)}</div></>}
      {tab === "Jumpscares" && <div className="proposal-list">{data.proposals.map(proposal => <article className="proposal-card" key={proposal.id}><div className="proposal-time">{time(proposal.proposed_timestamp_ms)}</div><div><span className={`status ${proposal.state}`}>{proposal.state.replaceAll("_", " ")}</span><h3>Movie #{proposal.movie_id} · {proposal.proposal_type.replaceAll("_", " ")}</h3><p>{proposal.details || "No spoiler-free description supplied."}</p><small>{proposal.proposed_intensity || "unrated"} · {proposal.positive_validations} correct / {proposal.negative_validations} incorrect</small></div><div className="proposal-actions"><button disabled={!!busy} onClick={() => review(proposal.id, "approve")}>Approve</button><button disabled={!!busy} onClick={() => review(proposal.id, "reject")}>Reject</button><button disabled={!!busy} onClick={() => review(proposal.id, "archive")}>Archive</button></div></article>)}</div>}
      {tab === "Timeline" && <Timeline proposals={data.proposals} />}
      {tab === "Moderation" && <div className="report-list">{data.reports.length ? data.reports.map(report => <article key={report.id}><span className="report-icon">!</span><div><h3>{report.reason} · {report.target_type}</h3><p>{report.target_summary || "Community report awaiting review."}</p><small>Reported by {report.reporter_name || "member"} · {new Date(report.created_at).toLocaleDateString()}</small></div><span className="status">{report.status}</span></article>) : <Empty title="No open reports" copy="The moderation queue is clear." />}</div>}
      {tab === "Users" && <div className="admin-grid"><Panel title="Contributor reputation"><div className="leader-list">{data.contributors.map((person, index) => <div key={index}><b>#{index + 1}</b><span>{person.display_name ?? "ScareSafe member"}</span><strong>{person.total_contributions ?? person.contribution_count ?? 0} contributions</strong></div>)}</div></Panel><Panel title="Role management"><Empty title="Protected by database roles" copy="Roles are managed through the server-verified user_roles system. No usernames or emails are hard-coded here." /></Panel></div>}
    </>}</section>
  </main>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <article className="metric-card glass"><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></article>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="admin-panel"><h2>{title}</h2>{children}</section>; }
function Activity({ proposals }: { proposals: Proposal[] }) { return <div className="activity-list">{proposals.map(item => <div key={item.id}><i /><span><strong>{item.proposal_type.replaceAll("_", " ")}</strong><small>Movie #{item.movie_id} · {time(item.proposed_timestamp_ms)}</small></span><time>{new Date(item.created_at).toLocaleDateString()}</time></div>)}</div>; }
function Empty({ title, copy }: { title: string; copy: string }) { return <div className="empty-state"><b>{title}</b><p>{copy}</p></div>; }
function Timeline({ proposals }: { proposals: Proposal[] }) { const visible = proposals.slice(0, 7); const max = Math.max(...visible.map(x => x.proposed_timestamp_ms), 1); return <section className="timeline-editor"><div className="timeline-editor-head"><div><p className="section-kicker">Visual editor</p><h2>Scare timeline preview</h2></div><span>Drag editing activates after selecting a movie</span></div><div className="editor-track">{visible.map(item => <button key={item.id} style={{ left: `${Math.max(2, Math.min(98, item.proposed_timestamp_ms / max * 100))}%` }} title={`${time(item.proposed_timestamp_ms)} — ${item.proposed_intensity || "scare"}`}><i /></button>)}</div><div className="editor-scale"><span>0:00</span><span>{time(max / 2)}</span><span>{time(max)}</span></div><div className="timeline-legend"><span><i className="mild" /> Mild</span><span><i className="major" /> Major</span><span><i className="pending" /> Pending</span></div></section>; }
