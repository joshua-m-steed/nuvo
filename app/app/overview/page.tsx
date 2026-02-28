"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/authClient";
import { assignments as assignmentsApi, students as studentsApi } from "../../../lib/api";
import { loadDemoDb } from "../../../lib/demoData";
import type { HomeworkAssignment, Student } from "../../../lib/types";

type AgendaItem = {
  time: string;
  student: string;
  status: "Scheduled" | "Completed" | "No-show" | "Canceled";
  location: string;
  goal: string;
};

type GameItem = {
  name: string;
  plays: string;
  pct: string;
};

const STATUS_SCORE: Record<HomeworkAssignment["status"], number> = {
  draft: 0.3,
  assigned: 0.5,
  in_progress: 0.7,
  completed: 1,
};

function toPct(n: number) {
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}

function formatTimeLabel(i: number) {
  const hour = 9 + (i % 8);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:00 ${suffix}`;
}

function formatGameLabel(gameId: string) {
  if (gameId === "dj_dino") return "DJ Dino";
  if (gameId === "fish_bobber") return "Fish Bobber";
  if (gameId === "safari_jeep") return "Safari Jeep";
  return gameId;
}

function toAgendaStatus(status: HomeworkAssignment["status"]): AgendaItem["status"] {
  if (status === "completed") return "Completed";
  if (status === "draft") return "Canceled";
  return "Scheduled";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, a] = await Promise.all([studentsApi.list(user), assignmentsApi.list(user)]);
      setStudents(s);
      setAssignments(a);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const kpis = useMemo(() => {
    const avgScore = assignments.length
      ? assignments.reduce((sum, a) => sum + STATUS_SCORE[a.status], 0) / assignments.length
      : 0;
    const avgAccuracy = toPct(avgScore * 100);

    const sessionsToday = assignments.filter((a) => a.due_date === today);
    const completedToday = sessionsToday.filter((a) => a.status === "completed").length;
    const noShowToday = sessionsToday.filter((a) => a.status === "draft").length;

    const activeStudents = students.filter((s) => {
      if (!s.last_activity_at) return false;
      return new Date(s.last_activity_at).getTime() >= weekAgo;
    }).length;

    const actionable = assignments.filter((a) => a.status !== "draft");
    const adherence = actionable.length
      ? toPct((actionable.filter((a) => a.status === "completed").length / actionable.length) * 100)
      : "0%";

    const demoDb = loadDemoDb();
    const visibleIds = new Set(students.map((s) => s.id));
    const unreadMessages = (demoDb?.messages ?? []).filter((m) => visibleIds.has(m.student_id) && !m.read).length;

    return {
      avgAccuracy,
      sessionsToday: sessionsToday.length,
      completedToday,
      noShowToday,
      activeStudents,
      adherence,
      unreadMessages,
    };
  }, [assignments, students, today, weekAgo]);

  const needsAttention = useMemo(() => {
    const studentScores = students.map((s) => {
      const list = assignments.filter((a) => a.student_id === s.id);
      const score = list.length ? (list.reduce((sum, a) => sum + STATUS_SCORE[a.status], 0) / list.length) * 100 : 0;
      return { id: s.id, score };
    });

    const lowAccuracy = studentScores.filter((s) => s.score < 60).length;
    const overdue = assignments.filter((a) => a.due_date < today && a.status !== "completed").length;

    const demoDb = loadDemoDb();
    const visibleIds = new Set(students.map((s) => s.id));
    const staleMessages = (demoDb?.messages ?? []).filter((m) => {
      if (!visibleIds.has(m.student_id) || m.read) return false;
      return new Date(m.created_at).getTime() < now - 2 * 24 * 60 * 60 * 1000;
    }).length;

    return { lowAccuracy, overdue, staleMessages };
  }, [assignments, students, today, now]);

  const agenda = useMemo<AgendaItem[]>(() => {
    const studentById = new Map(students.map((s) => [s.id, s]));
    return assignments
      .filter((a) => a.due_date === today)
      .slice(0, 4)
      .map((a, i) => {
        const st = studentById.get(a.student_id);
        return {
          time: formatTimeLabel(i),
          student: st?.name ?? "Unknown Student",
          status: toAgendaStatus(a.status),
          location: "Clinic",
          goal: `/${a.targets.phoneme.toLowerCase()}/ ${a.targets.position}`,
        };
      });
  }, [assignments, students, today]);

  const topGames = useMemo<GameItem[]>(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const a of assignments) {
      for (const item of a.items) {
        counts[item.minigame_id] = (counts[item.minigame_id] ?? 0) + 1;
        total += 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({
        name: formatGameLabel(id),
        plays: `${count} plays`,
        pct: `${total ? Math.round((count / total) * 100) : 0}%`,
      }));
  }, [assignments]);

  return (
    <div className="text-[#161616] rounded-3xl p-4 md:p-6">
      <main className="mx-auto max-w-[1460px] py-2">
        <div className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-black/60 mt-1">Today at a glance: sessions, risks, homework, and progress.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-full max-w-[240px]">
                <Select options={["Today", "Last 7 days", "Last 30 days", "Quarter to date", "Custom…"]} />
              </div>
            </div>
            <div className="w-full md:max-w-[340px] relative">
              <img
                src="/assets/searchicon.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
              />
              <input className="w-full pl-10 pr-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="Search students, goals, or games" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Kpi title="Avg Accuracy" value={kpis.avgAccuracy} sub="derived from assignment outcomes" tone="success" />
            <Kpi title="Sessions Today" value={`${kpis.sessionsToday}`} sub={`${kpis.completedToday} completed • ${kpis.noShowToday} no-show`} tone="warn" />
            <Kpi title="Active Students" value={`${kpis.activeStudents}`} sub="in last 7 days" />
            <Kpi title="Homework Adherence" value={kpis.adherence} sub="completed / actionable" />
            <Link href="/app/messages" className="block">
              <Kpi title="Messages from students" value={`${kpis.unreadMessages}`} sub="unread" variant="orange" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">Needs attention</h2>
                  <div className="text-sm text-black/60">Auto-generated tasks to keep you on track.</div>
                </div>
                <button className="px-3 py-2 rounded-xl bg-black/5 text-sm">View all</button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <AlertItem title={`${needsAttention.lowAccuracy} students below 60% accuracy`} desc="Review targets & cue levels." badge="Clinical" />
                <AlertItem title={`${needsAttention.overdue} overdue homework assignments`} desc="Send a reminder or adjust difficulty." badge="Homework" />
                <AlertItem title={`${needsAttention.staleMessages} parent replies waiting >48h`} desc="Reply from the message center." badge="Communication" />
                <AlertItem title="IEP due in 14 days (1 student)" desc="Generate quarterly report." badge="Compliance" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Today’s agenda</h2>
                <button className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white text-sm">New</button>
              </div>
              <div className="mt-3 space-y-2">
                {agenda.length ? (
                  agenda.map((a) => (
                    <div key={`${a.time}-${a.student}`} className="rounded-xl ring-1 ring-black/10 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{a.student}</div>
                        <StatusPill status={a.status} />
                      </div>
                      <div className="text-sm text-black/70 mt-0.5">{a.time} • {a.location}</div>
                      <div className="text-xs text-black/50 mt-1">Goal: {a.goal}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl ring-1 ring-black/10 p-3 text-sm text-black/60">No sessions due today.</div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Progress trends</h2>
                <button className="px-3 py-2 rounded-xl bg-black/5 text-sm">Open in Reports</button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <MiniStat label="Practice minutes" value={`${Math.round(assignments.length * 8)}m`} caption="last 7 days" />
                <MiniStat label="Engagement" value={kpis.adherence} caption="completed / actionable" />
                <MiniStat label="Mastery gained" value={`+${Math.round((kpis.activeStudents || 0) / 2)}`} caption="targets" />
              </div>
              <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
                <div className="text-sm font-medium">Accuracy (30 days)</div>
                <div className="mt-3 h-28 rounded-lg bg-gradient-to-r from-black/5 to-black/10" />
                <div className="mt-2 text-xs text-black/50">Tip: open the Students page to see goal-level detail.</div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-medium">Top games</h2>
              <div className="mt-3 space-y-2">
                {topGames.length ? (
                  topGames.map((g) => (
                    <div key={g.name} className="rounded-xl ring-1 ring-black/10 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{g.name}</div>
                        <div className="text-sm text-black/70">{g.plays}</div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-black/10">
                        <div className="h-2 rounded-full bg-gradient-to-r from-[#E45B3E] to-[#D94E3A]" style={{ width: g.pct }} />
                      </div>
                      <div className="text-xs text-black/50 mt-1">{g.pct} of weekly plays</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl ring-1 ring-black/10 p-3 text-sm text-black/60">No play data yet.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function AlertItem({ title, desc, badge }: { title: string; desc: string; badge: string }) {
  return (
    <div className="rounded-xl ring-1 ring-black/10 p-3 hover:bg-black/[.02]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-sm text-black/60 mt-0.5">{desc}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded-lg bg-[#FFE7E0] text-[#D94E3A] ring-1 ring-black/10">{badge}</span>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  sub,
  tone,
  variant,
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "success" | "warn";
  variant?: "orange";
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${
        variant === "orange" ? "bg-[#E45B3E] text-white" : "bg-white"
      }`}
    >
      <div className={`text-sm ${variant === "orange" ? "text-white/85" : "text-black/60"}`}>{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? (
        <div
          className={`text-xs mt-1 ${
            variant === "orange"
              ? "text-white/80"
              : tone === "success"
              ? "text-emerald-700"
              : tone === "warn"
              ? "text-orange-700"
              : "text-black/50"
          }`}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 ${className}`}>{children}</section>;
}

function MiniStat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-xl ring-1 ring-black/10 p-3 text-center">
      <div className="text-xs text-black/60">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {caption ? <div className="text-xs text-black/50">{caption}</div> : null}
    </div>
  );
}

function Select({ options }: { options: string[] }) {
  return (
    <div className="relative">
      <select className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70">
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">▾</div>
    </div>
  );
}

function StatusPill({ status }: { status: AgendaItem["status"] }) {
  const cls =
    status === "Completed"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "No-show"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : status === "Canceled"
      ? "bg-stone-100 text-stone-700 ring-stone-200"
      : "bg-orange-50 text-orange-700 ring-orange-200";
  return <span className={`px-2 py-1 rounded-lg text-xs ring-1 ${cls}`}>{status}</span>;
}
