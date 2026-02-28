"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/authClient";
import {
  assignments as assignmentsApi,
  students as studentsApi,
} from "../../../lib/api";
import type {
  HomeworkAssignment,
  Student as ApiStudent,
  StudentGoal,
} from "../../../lib/types";
import {
  getStudentAutoFillPref,
  loadSessionEvents,
  SessionEvent,
  setStudentAutoFillPref,
} from "../../../lib/sessionPlanning";

type GoalStatus = "in progress" | "met" | "not met";

type Goal = {
  goalId?: string;
  title: string;
  phoneme?: string;
  position?: string;
  level?: string;
  cue?: string;
  now: string;
  last: string;
  status: GoalStatus;
};

type Student = {
  id: string;
  name: string;
  status: "Active" | "Inactive";
  setting: "Clinic" | "School" | "Telehealth";
  slp: string;
  targets: string[];
  metrics: {
    accuracy: string;
    trend: string;
    practice: string;
    streak: string;
  };
  goals: Goal[];
  autoFillFromGoals: boolean;
  homework: {
    due: string;
    items: { name: string; minutes: number; focus: string }[];
  };
  notes: { date: string; text: string }[];
};

type StudentDraft = {
  name: string;
  status: Student["status"];
  setting: Student["setting"];
  slp: string;
  targetsText: string;
  goals: Goal[];
};

const STATUS_SCORE: Record<HomeworkAssignment["status"], number> = {
  draft: 0.3,
  assigned: 0.5,
  in_progress: 0.7,
  completed: 1,
};

function targetLabel(t: ApiStudent["targets"][number]) {
  return `/${t.phoneme.toLowerCase()}/ ${t.position}`;
}

function computeSetting(id: string): Student["setting"] {
  const v = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3;
  return v === 0 ? "School" : v === 1 ? "Clinic" : "Telehealth";
}

function toDateLabel(iso?: string) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toUiStudents(
  apiStudents: ApiStudent[],
  assignments: HomeworkAssignment[]
): Student[] {
  const today = Date.now();
  return apiStudents.map((s) => {
    const list = assignments.filter((a) => a.student_id === s.id);
    const recent = list.filter(
      (a) =>
        Date.now() - new Date(a.created_at).getTime() < 14 * 24 * 60 * 60 * 1000
    );
    const older = list.filter(
      (a) =>
        Date.now() - new Date(a.created_at).getTime() >=
        14 * 24 * 60 * 60 * 1000
    );

    const score = list.length
      ? (list.reduce((sum, a) => sum + STATUS_SCORE[a.status], 0) /
          list.length) *
        100
      : 0;
    const recentScore = recent.length
      ? (recent.reduce((sum, a) => sum + STATUS_SCORE[a.status], 0) /
          recent.length) *
        100
      : score;
    const olderScore = older.length
      ? (older.reduce((sum, a) => sum + STATUS_SCORE[a.status], 0) /
          older.length) *
        100
      : score;
    const delta = Math.round(recentScore - olderScore);

    const dueAssignments = list
      .filter((a) => a.due_date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    const practiceMinutes = list.reduce(
      (sum, a) => sum + a.items.length * (a.settings.reps ?? 1),
      0
    );

    const lastDaysAgo = s.last_activity_at
      ? Math.max(
          0,
          Math.floor(
            (today - new Date(s.last_activity_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : 30;
    const streak = Math.max(0, 7 - Math.min(7, lastDaysAgo));

    const structuredGoals: StudentGoal[] = s.goals ?? [];
    const goals: Goal[] = (
      structuredGoals.length
        ? structuredGoals
        : (s.targets ?? []).map(
            (t, i) =>
              ({
                goalId: `fallback-${s.id}-${i}`,
                title: `${targetLabel(t)} (words)`,
                phoneme: `/${t.phoneme.toLowerCase()}/`,
                position: t.position[0].toUpperCase() + t.position.slice(1),
                level: "Words",
                cue: "Visual",
                isActive: true,
              } as unknown as StudentGoal)
          )
    ).map((g) => ({
      goalId: g.goalId,
      title: g.title,
      phoneme: g.phoneme,
      position: g.position,
      level: g.level,
      cue: g.cue,
      now: `${Math.round(score)}%`,
      last: `${Math.max(0, Math.round(score - 4))}, ${Math.round(
        score
      )}, ${Math.min(100, Math.round(score + 3))}%`,
      status: score >= 80 ? "met" : score >= 60 ? "in progress" : "not met",
    }));

    return {
      id: s.id,
      name: s.name,
      status: lastDaysAgo <= 30 ? "Active" : "Inactive",
      setting: computeSetting(s.id),
      slp: s.assigned_slp_id,
      targets: (s.targets ?? []).map(targetLabel),
      metrics: {
        accuracy: `${Math.round(score)}%`,
        trend: `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}% vs prior`,
        practice: `${practiceMinutes}`,
        streak: `${streak}`,
      },
      goals,
      autoFillFromGoals: getStudentAutoFillPref(
        s.id,
        s.autoFillSessionPlan ?? true
      ),
      homework: {
        due: dueAssignments[0]?.due_date ?? "No due date",
        items: (dueAssignments[0]?.items ?? []).slice(0, 3).map((it) => ({
          name: `${it.minigame_id} — /${it.target_phoneme.toLowerCase()}/ ${
            it.target_position
          }`,
          minutes: it.reps * 2,
          focus: `${it.reps} reps • ${it.syllable_count} syllable`,
        })),
      },
      notes: [
        {
          date: toDateLabel(s.last_activity_at),
          text: s.notes || "No notes recorded.",
        },
      ],
    };
  });
}

function toDraft(s: Student): StudentDraft {
  return {
    name: s.name,
    status: s.status,
    setting: s.setting,
    slp: s.slp,
    targetsText: s.targets.join(", "),
    goals: s.goals.map((g) => ({ ...g })),
  };
}

function fromDraft(id: string, d: StudentDraft, prev: Student): Student {
  const targets = d.targetsText
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    ...prev,
    id,
    name: d.name.trim() || prev.name,
    status: d.status,
    setting: d.setting,
    slp: d.slp.trim() || prev.slp,
    targets,
    goals: d.goals
      .map((g) => ({ ...g, title: g.title.trim() }))
      .filter((g) => g.title.length > 0),
  };
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "Active", setting: "All" });
  const [studentsState, setStudentsState] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<StudentDraft | null>(null);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, a] = await Promise.all([
        studentsApi.list(user),
        assignmentsApi.list(user),
      ]);
      const mapped = toUiStudents(s, a);
      setStudentsState(mapped);
      setSelectedId((prev) => prev || mapped[0]?.id || "");
      setSessionEvents(loadSessionEvents());
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studentsState
      .filter((s) =>
        filters.status === "All" ? true : s.status === filters.status
      )
      .filter((s) =>
        filters.setting === "All" ? true : s.setting === filters.setting
      )
      .filter((s) => (!q ? true : s.name.toLowerCase().includes(q)));
  }, [query, filters, studentsState]);

  const selected = useMemo(
    () => studentsState.find((s) => s.id === selectedId) || studentsState[0],
    [selectedId, studentsState]
  );

  const upcomingSession = useMemo(() => {
    if (!selected) return undefined;
    const today = new Date().toISOString().slice(0, 10);
    return sessionEvents
      .filter(
        (e) =>
          e.studentId === selected.id &&
          e.date >= today &&
          e.status !== "Canceled"
      )
      .sort((a, b) =>
        `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
      )[0];
  }, [selected, sessionEvents]);

  function openEdit() {
    if (!selected) return;
    setDraft(toDraft(selected));
    setEditOpen(true);
  }

  function saveEdit() {
    if (!draft || !selected) return;
    setStudentsState((prev) =>
      prev.map((s) =>
        s.id === selected.id ? fromDraft(selected.id, draft, s) : s
      )
    );
    setEditOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-black/60 mt-1">
            Manage caseload, assign homework, and view goal-level progress.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-0 overflow-hidden">
          <div className="p-4 border-b border-black/10">
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <img
                  src="/assets/searchicon.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl ring-1 ring-black/10"
                  placeholder="Search students"
                />
              </div>
              <button className="px-3 py-2 rounded-xl bg-black/5">+</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SelectInline
                label="Status"
                value={filters.status}
                options={["Active", "Inactive", "All"]}
                onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              />
              <SelectInline
                label="Setting"
                value={filters.setting}
                options={["All", "Clinic", "School", "Telehealth"]}
                onChange={(v) => setFilters((f) => ({ ...f, setting: v }))}
              />
            </div>
          </div>

          <div className="divide-y divide-black/5">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-4 hover:bg-black/[.02] ${
                  s.id === selectedId ? "bg-[#FFF1EC]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-black/5 flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-black/60">
                        {s.setting} • {s.slp}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.targets.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10 text-black/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-black/60">
                No students match those filters.
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {selected ? (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium">{selected.name}</h2>
                  <div className="text-sm text-black/60 mt-1">
                    {selected.setting} • {selected.slp} • Status:{" "}
                    {selected.status}
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {selected.targets.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-1 rounded-lg bg-[#FFE7E0] text-[#D94E3A] ring-1 ring-black/10"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-xl bg-black/5"
                    onClick={openEdit}
                  >
                    Edit
                  </button>
                  <Link
                    href="/app/messages"
                    className="px-3 py-2 rounded-xl bg-white ring-1 ring-black/10"
                  >
                    Message Parent
                  </Link>
                  <Link
                    href={`/app/students/${selected.id}/assign-homework`}
                    className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white"
                  >
                    Assign Homework
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <MiniStat
                  label="Accuracy (30d)"
                  value={selected.metrics.accuracy}
                  caption={selected.metrics.trend}
                />
                <MiniStat
                  label="Practice (7d)"
                  value={selected.metrics.practice}
                  caption="minutes"
                />
                <MiniStat
                  label="Streak"
                  value={selected.metrics.streak}
                  caption="days"
                />
              </div>

              <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Goals</div>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-black/5 text-sm"
                    onClick={openEdit}
                  >
                    Edit goals
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {selected.goals.map((g) => (
                    <GoalRow
                      key={g.title}
                      title={g.title}
                      now={g.now}
                      last={g.last}
                      status={g.status}
                    />
                  ))}
                  {selected.goals.length === 0 && (
                    <div className="text-sm text-black/60">No goals yet.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Session Plan Preferences
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-black/70">
                    <input
                      type="checkbox"
                      checked={selected.autoFillFromGoals}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setStudentAutoFillPref(selected.id, checked);
                        setStudentsState((prev) =>
                          prev.map((s) =>
                            s.id === selected.id
                              ? { ...s, autoFillFromGoals: checked }
                              : s
                          )
                        );
                      }}
                    />
                    Auto-fill session plan from goals
                  </label>
                </div>
                <div className="mt-2 text-xs text-black/60">
                  Default ON. You can override per session in the Schedule
                  modal.
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-sm text-black/60">
                No students available for this account.
              </div>
            </Card>
          )}

          {selected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-medium">Next Session</h3>
                {upcomingSession ? (
                  <>
                    <div className="text-sm text-black/60 mt-1">
                      {upcomingSession.date} • {upcomingSession.start}-
                      {upcomingSession.end} • {upcomingSession.location}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {upcomingSession.plannedTargets.map((t, idx) => (
                        <span
                          key={`${upcomingSession.id}-${idx}`}
                          className="text-xs px-2 py-1 rounded-lg bg-[#FFE7E0] text-[#D94E3A] ring-1 ring-black/10"
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/app/calendar?sessionId=${upcomingSession.id}`}
                      className="mt-3 inline-flex w-full justify-center px-3 py-2 rounded-xl bg-white ring-1 ring-black/10"
                    >
                      Edit plan
                    </Link>
                  </>
                ) : (
                  <div className="text-sm text-black/60 mt-2">
                    No upcoming sessions scheduled.
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-medium">Homework</h3>
                <div className="text-sm text-black/60 mt-1">
                  Next due: {selected.homework.due}
                </div>
                <div className="mt-3 space-y-2">
                  {selected.homework.items.map((it) => (
                    <div
                      key={it.name}
                      className="rounded-xl ring-1 ring-black/10 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{it.name}</div>
                        <span className="text-xs px-2 py-1 rounded-lg bg-black/5">
                          {it.minutes}m
                        </span>
                      </div>
                      <div className="text-xs text-black/60 mt-1">
                        {it.focus}
                      </div>
                    </div>
                  ))}
                  {selected.homework.items.length === 0 && (
                    <div className="text-sm text-black/60">
                      No upcoming homework items.
                    </div>
                  )}
                </div>
                <button className="mt-3 w-full px-3 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white">
                  Assign new
                </button>
              </Card>

              <Card>
                <h3 className="text-lg font-medium">Notes</h3>
                <div className="mt-3 space-y-2">
                  {selected.notes.map((n) => (
                    <div
                      key={`${n.date}-${n.text}`}
                      className="rounded-xl ring-1 ring-black/10 p-3"
                    >
                      <div className="text-xs text-black/50">{n.date}</div>
                      <div className="text-sm mt-1 text-black/70">{n.text}</div>
                    </div>
                  ))}
                </div>
                <button className="mt-3 w-full px-3 py-2 rounded-xl bg-white ring-1 ring-black/10">
                  Add note
                </button>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      {editOpen && draft && selected ? (
        <Modal
          title={`Edit Student — ${selected.name}`}
          onClose={() => setEditOpen(false)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Student name">
              <input
                className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                }
              />
            </Field>
            <Field label="Status">
              <SelectValue
                value={draft.status}
                options={["Active", "Inactive"]}
                onChange={(v) =>
                  setDraft((d) =>
                    d ? { ...d, status: v as Student["status"] } : d
                  )
                }
              />
            </Field>
            <Field label="Setting">
              <SelectValue
                value={draft.setting}
                options={["Clinic", "School", "Telehealth"]}
                onChange={(v) =>
                  setDraft((d) =>
                    d ? { ...d, setting: v as Student["setting"] } : d
                  )
                }
              />
            </Field>
            <Field label="Assigned SLP">
              <input
                className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                value={draft.slp}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, slp: e.target.value } : d))
                }
              />
            </Field>
          </div>

          <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
            <div className="text-sm font-medium">Targets / Phonemes</div>
            <div className="text-xs text-black/60 mt-1">
              Comma-separated (e.g., /r/ initial, /s/ final, minimal pairs)
            </div>
            <input
              className="mt-2 w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
              value={draft.targetsText}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, targetsText: e.target.value } : d))
              }
            />
          </div>

          <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Goals</div>
              <button
                className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-black/10"
                onClick={() =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          goals: [
                            ...d.goals,
                            {
                              title: "",
                              now: "",
                              last: "",
                              status: "in progress",
                            },
                          ],
                        }
                      : d
                  )
                }
              >
                Add goal
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {draft.goals.map((g, idx) => (
                <div key={idx} className="rounded-xl ring-1 ring-black/10 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Goal title">
                      <input
                        className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                        placeholder="e.g., /r/ initial (words)"
                        value={g.title}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  goals: d.goals.map((x, i) =>
                                    i === idx
                                      ? { ...x, title: e.target.value }
                                      : x
                                  ),
                                }
                              : d
                          )
                        }
                      />
                    </Field>
                    <Field label="Status">
                      <SelectValue
                        value={g.status}
                        options={["in progress", "met", "not met"]}
                        onChange={(v) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  goals: d.goals.map((x, i) =>
                                    i === idx
                                      ? { ...x, status: v as GoalStatus }
                                      : x
                                  ),
                                }
                              : d
                          )
                        }
                      />
                    </Field>
                    <Field label="Phoneme: Comma-Separated">
                      <input
                        className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                        placeholder="e.g., /r/ initial, /s/ final"
                        value={
                          g.phoneme === undefined
                            ? ""
                            : "/r/ initial, /s/ final"
                        }
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  goals: d.goals.map((x, i) =>
                                    i === idx
                                      ? { ...x, now: e.target.value }
                                      : x
                                  ),
                                }
                              : d
                          )
                        }
                      />
                    </Field>
                    <Field label="Accuracy">
                      <input
                        className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                        placeholder="e.g., 68, 74, 73"
                        value={g.last}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  goals: d.goals.map((x, i) =>
                                    i === idx
                                      ? { ...x, last: e.target.value }
                                      : x
                                  ),
                                }
                              : d
                          )
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      className="px-3 py-2 rounded-xl bg-black/5"
                      onClick={() =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                goals: d.goals.filter((_, i) => i !== idx),
                              }
                            : d
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {draft.goals.length === 0 && (
                <div className="text-sm text-black/60">No goals yet.</div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-black/60">
              This is a local demo editor view.
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-xl bg-black/5"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-5 ring-1 ring-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="px-3 py-1.5 rounded-lg bg-black/5"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function SelectValue({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">
        ▾
      </div>
    </div>
  );
}

function SelectInline({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-black/60">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white px-2 py-2 rounded-xl ring-1 ring-black/10 text-sm text-black/70"
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">
          ▾
        </div>
      </div>
    </label>
  );
}

function GoalRow({
  title,
  now,
  last,
  status,
}: {
  title: string;
  now: string;
  last: string;
  status: "in progress" | "met" | "not met";
}) {
  const tone =
    status === "met" ? "emerald" : status === "in progress" ? "amber" : "stone";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl ring-1 ring-black/10 p-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-black/60 mt-0.5">
          Last sessions: {last}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-black/70">
          Now <span className="font-medium">{now}</span>
        </div>
        <Badge tone={tone}>{status}</Badge>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 md:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function MiniStat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-xl ring-1 ring-black/10 p-3 text-center">
      <div className="text-xs text-black/60">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {caption ? <div className="text-xs text-black/50">{caption}</div> : null}
    </div>
  );
}

function Badge({
  children,
  tone = "stone",
}: {
  children: React.ReactNode;
  tone?: "stone" | "amber" | "emerald" | "violet";
}) {
  const tones: Record<string, string> = {
    stone: "bg-stone-100 text-stone-700 ring-stone-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
