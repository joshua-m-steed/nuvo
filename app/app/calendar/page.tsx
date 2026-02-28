"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../../lib/authClient";
import { assignments as assignmentsApi, students as studentsApi } from "../../../lib/api";
import type { GoalCue, GoalLevel, GoalPosition, Student, StudentGoal } from "../../../lib/types";
import {
  createOrLoadNoteDraft,
  ensureSessionEventsFromAssignments,
  getSessionEventById,
  makeTargetLabel,
  normalizePhoneme,
  PlannedTarget,
  SessionEvent,
  SessionNote,
  setStudentAutoFillPref,
  getStudentAutoFillPref,
  upsertSessionEvent,
  upsertSessionNote,
  loadSessionEvents,
} from "../../../lib/sessionPlanning";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, m: number) {
  return new Date(d.getFullYear(), d.getMonth() + m, 1);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const IPA_TARGETS = ["/r/", "/s/", "/k/", "/g/", "/l/", "/t/", "/d/", "/ʃ/", "/tʃ/", "/θ/", "Blends", "Minimal pairs", "Other"];
const POSITIONS: PlannedTarget["position"][] = ["Initial", "Medial", "Final", "Blends", "Other"];
const LEVELS: PlannedTarget["level"][] = ["Isolation", "Syllables", "Words", "Phrases", "Sentences", "Conversation"];
const CUES: PlannedTarget["cue"][] = ["None", "Visual", "Verbal", "Tactile", "Multiple"];

type SessionForm = {
  id?: string;
  studentId: string;
  date: string;
  start: string;
  end: string;
  location: SessionEvent["location"];
  type: SessionEvent["type"];
  status: SessionEvent["status"];
  plannedTargets: PlannedTarget[];
  plannedNotes: string;
  autoFillFromGoals: boolean;
};

function defaultTarget(phoneme = "/r/"): PlannedTarget {
  const normalized = phoneme === "Blends" || phoneme === "Minimal pairs" || phoneme === "Other" ? phoneme : normalizePhoneme(phoneme);
  const position: PlannedTarget["position"] = normalized === "Blends" ? "Blends" : normalized === "Other" ? "Other" : "Initial";
  const base = {
    phoneme: normalized,
    position,
    level: "Words" as const,
    cue: "Visual" as const,
    source: "manual" as const,
    minutesPlanned: 10,
  };
  return { ...base, label: makeTargetLabel({ ...base }) };
}

function goalToTarget(goal: StudentGoal): PlannedTarget {
  const t: PlannedTarget = {
    phoneme: normalizePhoneme(goal.phoneme),
    position: goal.position,
    level: goal.level,
    cue: goal.cue,
    goalId: goal.goalId,
    source: "goal",
    minutesPlanned: 10,
    label: "",
  };
  t.label = makeTargetLabel(t);
  return t;
}

function dedupeTargets(list: PlannedTarget[]) {
  const out: PlannedTarget[] = [];
  for (const t of list) {
    const key = t.goalId ? `goal:${t.goalId}` : `${t.phoneme}|${t.position}|${t.level}|${t.cue}`;
    if (out.some((x) => (x.goalId ? `goal:${x.goalId}` : `${x.phoneme}|${x.position}|${x.level}|${x.cue}`) === key)) continue;
    out.push({ ...t, label: makeTargetLabel(t) });
  }
  return out;
}

function formatGoalPosition(pos: GoalPosition): PlannedTarget["position"] {
  return pos;
}
function formatGoalLevel(level: GoalLevel): PlannedTarget["level"] {
  return level;
}
function formatGoalCue(cue: GoalCue): PlannedTarget["cue"] {
  return cue;
}

function buildForm(event?: SessionEvent, selectedDate?: string): SessionForm {
  if (event) {
    return {
      id: event.id,
      studentId: event.studentId,
      date: event.date,
      start: event.start,
      end: event.end,
      location: event.location,
      type: event.type,
      status: event.status,
      plannedTargets: event.plannedTargets,
      plannedNotes: event.plannedNotes,
      autoFillFromGoals: event.autoFillFromGoals ?? true,
    };
  }
  return {
    studentId: "",
    date: selectedDate ?? fmtISODate(new Date()),
    start: "09:00",
    end: "09:30",
    location: "Clinic",
    type: "Therapy",
    status: "Scheduled",
    plannedTargets: [],
    plannedNotes: "",
    autoFillFromGoals: true,
  };
}

function applyFilters(filters: { slp: string; location: string; status: string; query: string }, studentsById: Map<string, Student>) {
  return (e: SessionEvent) => {
    const student = studentsById.get(e.studentId);
    const query = filters.query.trim().toLowerCase();
    return (
      (filters.slp === "All" || e.slpId === filters.slp) &&
      (filters.location === "All" || e.location === filters.location) &&
      (filters.status === "All" || e.status === filters.status) &&
      (!query || student?.name.toLowerCase().includes(query) || e.plannedTargets.some((t) => t.label.toLowerCase().includes(query)))
    );
  };
}

export default function SchedulingCalendarPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [filters, setFilters] = useState({ slp: "All", location: "All", status: "All", query: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [form, setForm] = useState<SessionForm>(buildForm(undefined, fmtISODate(new Date())));
  const [detailEventId, setDetailEventId] = useState<string>("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<SessionNote | null>(null);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [a, s] = await Promise.all([assignmentsApi.list(user), studentsApi.list(user)]);
      const seeded = ensureSessionEventsFromAssignments(a, s);
      setStudents(s);
      setEvents(seeded.length ? seeded : loadSessionEvents());
      if (seeded[0]) setDetailEventId(seeded[0].id);
    })();
  }, [user]);

  useEffect(() => {
    const sessionId = searchParams?.get("sessionId");
    if (!sessionId || !events.length) return;
    const event = events.find((e) => e.id === sessionId);
    if (!event) return;
    setDetailEventId(event.id);
    setSelected(new Date(`${event.date}T00:00:00`));
    openEdit(event);
  }, [searchParams, events]);

  const gridDays = useMemo(() => buildMonthGrid(current), [current]);

  const filteredEvents = useMemo(() => events.filter(applyFilters(filters, studentsById)), [events, filters, studentsById]);

  const dayEvents = useMemo(
    () => filteredEvents.filter((e) => e.date === fmtISODate(selected)).sort((a, b) => a.start.localeCompare(b.start)),
    [filteredEvents, selected]
  );

  const slpOptions = useMemo(() => ["All", ...Array.from(new Set(events.map((e) => e.slpId)))], [events]);

  const detailEvent = useMemo(() => getSessionEventById(detailEventId) || dayEvents[0], [detailEventId, dayEvents, events]);

  const selectedStudent = useMemo(() => studentsById.get(form.studentId), [studentsById, form.studentId]);
  const activeGoals = useMemo(() => (selectedStudent?.goals ?? []).filter((g) => g.isActive !== false), [selectedStudent]);

  function openCreate() {
    const initial = buildForm(undefined, fmtISODate(selected));
    setForm(initial);
    setSelectedGoalIds([]);
    setModalOpen(true);
  }

  function openEdit(event: SessionEvent) {
    setForm(buildForm(event));
    setSelectedGoalIds([]);
    setModalOpen(true);
  }

  function onStudentChange(studentId: string) {
    const pref = getStudentAutoFillPref(studentId, true);
    const student = studentsById.get(studentId);
    const goals = (student?.goals ?? []).filter((g) => g.isActive !== false);
    setForm((prev) => {
      const next = { ...prev, studentId, autoFillFromGoals: pref };
      if (pref && goals.length && prev.plannedTargets.length === 0) {
        next.plannedTargets = dedupeTargets(goals.map(goalToTarget));
      }
      return next;
    });
  }

  function updateTarget(index: number, patch: Partial<PlannedTarget>) {
    setForm((prev) => {
      const next = [...prev.plannedTargets];
      const merged = { ...next[index], ...patch };
      merged.phoneme = merged.phoneme === "Blends" || merged.phoneme === "Minimal pairs" || merged.phoneme === "Other" ? merged.phoneme : normalizePhoneme(merged.phoneme);
      merged.label = makeTargetLabel(merged);
      next[index] = merged;
      return { ...prev, plannedTargets: next };
    });
  }

  function addTargetChip(phoneme: string) {
    setForm((prev) => ({ ...prev, plannedTargets: dedupeTargets([...prev.plannedTargets, defaultTarget(phoneme)]) }));
  }

  function removeTarget(index: number) {
    setForm((prev) => ({ ...prev, plannedTargets: prev.plannedTargets.filter((_, i) => i !== index) }));
  }

  function importGoals(mode: "replace" | "append", ids?: string[]) {
    if (!selectedStudent) return;
    const goals = (selectedStudent.goals ?? []).filter((g) => g.isActive !== false);
    const picked = ids?.length ? goals.filter((g) => ids.includes(g.goalId)) : goals;
    const imported = picked.map(goalToTarget);

    setForm((prev) => {
      const base = mode === "replace" ? [] : prev.plannedTargets;
      return { ...prev, plannedTargets: dedupeTargets([...base, ...imported]) };
    });
  }

  function saveSession() {
    if (!user || !form.studentId) return;
    const id = form.id ?? `sess_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const existing = getSessionEventById(id);

    const event: SessionEvent = {
      id,
      studentId: form.studentId,
      slpId: user.id,
      clinicId: user.clinic_id,
      date: form.date,
      start: form.start,
      end: form.end,
      location: form.location,
      type: form.type,
      status: form.status,
      plannedTargets: dedupeTargets(form.plannedTargets),
      plannedNotes: form.plannedNotes,
      autoFillFromGoals: form.autoFillFromGoals,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertSessionEvent(event);
    setEvents(loadSessionEvents());
    setDetailEventId(event.id);
    setModalOpen(false);
  }

  function startOrCompleteSession(event: SessionEvent, markComplete: boolean) {
    const note = createOrLoadNoteDraft(event);
    setNoteDraft(note);
    setNoteOpen(true);

    if (markComplete) {
      const updated: SessionEvent = { ...event, status: "Completed", updatedAt: new Date().toISOString() };
      upsertSessionEvent(updated);
      setEvents(loadSessionEvents());
      setDetailEventId(updated.id);
    }
  }

  function saveNote() {
    if (!noteDraft) return;
    upsertSessionNote(noteDraft);
    setNoteOpen(false);
  }

  return (
    <div className="text-[#161616] rounded-3xl p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-black/60 mt-1">Plan sessions, manage attendance, and track service minutes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10 shadow-sm" onClick={openCreate}>New Session</button>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white shadow">Export Calendar</button>
        </div>
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Filter label="View"><Segment items={["Month", "Week", "Day"]} active={view === "month" ? 0 : view === "week" ? 1 : 2} onChange={(i) => setView(i === 0 ? "month" : i === 1 ? "week" : "day")} /></Filter>
          <Filter label="SLP"><Select value={filters.slp} options={slpOptions} onChange={(v) => setFilters((f) => ({ ...f, slp: v }))} /></Filter>
          <Filter label="Location"><Select value={filters.location} options={["All", "Clinic", "School", "Telehealth"]} onChange={(v) => setFilters((f) => ({ ...f, location: v }))} /></Filter>
          <Filter label="Status"><Select value={filters.status} options={["All", "Scheduled", "Completed", "No-show", "Canceled"]} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} /></Filter>
          <Filter label="Search">
            <div className="relative">
              <img src="/assets/searchicon.png" alt="" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
              <input value={filters.query} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} className="w-full pl-10 pr-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="Student or target" />
            </div>
          </Filter>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-4 border-b border-black/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 rounded-lg bg-black/5" onClick={() => setCurrent(addMonths(current, -1))}>←</button>
              <div className="text-lg font-medium">{current.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
              <button className="px-2 py-1 rounded-lg bg-black/5" onClick={() => setCurrent(addMonths(current, 1))}>→</button>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-black/5" onClick={() => { setCurrent(new Date()); setSelected(new Date()); }}>Today</button>
          </div>

          <div className="grid grid-cols-7 text-xs text-black/60 px-3 pt-3 pb-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center">{d}</div>)}</div>

          <div className="grid grid-cols-7 gap-px bg-black/10">
            {gridDays.map((cell, idx) => {
              const isCurrentMonth = cell.date.getMonth() === current.getMonth();
              const isToday = isSameDay(cell.date, new Date());
              const isSelected = isSameDay(cell.date, selected);
              const dayKey = fmtISODate(cell.date);
              const dayItems = filteredEvents.filter((e) => e.date === dayKey);

              return (
                <div key={idx} className={`min-h-[110px] bg-white ${!isCurrentMonth ? "opacity-60" : ""}`}>
                  <button onClick={() => setSelected(cell.date)} className={`w-full flex items-start justify-between p-2 ${isSelected ? "bg-[#FFF1EC]" : ""}`}>
                    <span className={`text-sm ${isToday ? "font-semibold text-[#D94E3A]" : ""}`}>{cell.date.getDate()}</span>
                    {isToday ? <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#FFE7E0] text-[#D94E3A]">Today</span> : null}
                  </button>
                  <div className="px-2 pb-2 space-y-1">
                    {dayItems.slice(0, 2).map((it) => {
                      const student = studentsById.get(it.studentId);
                      const chip = it.plannedTargets[0]?.phoneme;
                      return (
                        <button key={it.id} onClick={() => setDetailEventId(it.id)} className="w-full text-left rounded-lg ring-1 ring-black/10 px-2 py-1 bg-white text-xs hover:bg-black/[.02]">
                          <div className="truncate">{it.start} • {student?.name ?? "Student"}</div>
                          {chip ? <div className="mt-0.5 inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-[#FFE7E0] text-[#D94E3A]">{chip}</div> : <span className="inline-block mt-1 h-1.5 w-1.5 rounded-full bg-[#D94E3A]" />}
                        </button>
                      );
                    })}
                    {dayItems.length > 2 ? <div className="text-xs text-black/50">+{dayItems.length - 2} more…</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">{selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h2>
              <div className="text-sm text-black/60">{dayEvents.length} session{dayEvents.length === 1 ? "" : "s"}</div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white" onClick={openCreate}>New</button>
          </div>

          <div className="mt-3 space-y-2">
            {dayEvents.length === 0 ? <div className="rounded-xl ring-1 ring-black/10 p-3 text-sm text-black/60">No sessions scheduled.</div> : null}
            {dayEvents.map((s) => {
              const student = studentsById.get(s.studentId);
              const chips = s.plannedTargets.slice(0, 2);
              const overflow = Math.max(0, s.plannedTargets.length - chips.length);
              return (
                <div key={s.id} className="rounded-xl ring-1 ring-black/10 p-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDetailEventId(s.id)} className="text-sm font-medium hover:underline">{student?.name ?? "Student"}</button>
                    <span className={`text-xs px-2 py-1 rounded-lg ring-1 ${pillClass(s.status)}`}>{s.status}</span>
                  </div>
                  <div className="text-sm text-black/70 mt-0.5">{s.type} • {s.location} • {s.start}–{s.end}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chips.map((t, idx) => <PlanChip key={`${s.id}-${idx}`} text={t.label} source={t.source} />)}
                    {overflow > 0 ? <span className="text-xs px-2 py-0.5 rounded-lg bg-black/5">+{overflow}</span> : null}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-black/10" onClick={() => startOrCompleteSession(s, false)}>Start session</button>
                    <button className="px-3 py-1.5 rounded-lg bg-black/5" onClick={() => startOrCompleteSession(s, true)}>Mark complete</button>
                  </div>
                </div>
              );
            })}
          </div>

          {detailEvent ? (
            <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Session Plan</div>
                <button className="text-xs px-2 py-1 rounded-lg bg-black/5" onClick={() => openEdit(detailEvent)}>Edit</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detailEvent.plannedTargets.length ? detailEvent.plannedTargets.map((t, idx) => <PlanChip key={`detail-${idx}`} text={t.label} source={t.source} />) : <span className="text-sm text-black/60">No planned targets.</span>}
              </div>
              {detailEvent.plannedNotes ? <div className="mt-2 text-xs text-black/60">{detailEvent.plannedNotes}</div> : null}
            </div>
          ) : null}
        </aside>
      </section>

      {modalOpen ? (
        <Modal title={form.id ? "Edit Session" : "New Session"} onClose={() => setModalOpen(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Filter label="Student">
              <div className="relative">
                <select value={form.studentId} onChange={(e) => onStudentChange(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70">
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">▾</div>
              </div>
            </Filter>
            <Filter label="SLP"><input value={user?.id ?? ""} readOnly className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10 bg-black/[.02]" /></Filter>
            <Filter label="Date"><input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" /></Filter>
            <Filter label="Time"><div className="flex gap-2"><input value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" /><input value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" /></div></Filter>
            <Filter label="Location"><SimpleSelect value={form.location} options={["Clinic", "School", "Telehealth"]} onChange={(v) => setForm((f) => ({ ...f, location: v as SessionEvent["location"] }))} /></Filter>
            <Filter label="Type"><SimpleSelect value={form.type} options={["Therapy", "Evaluation", "Group", "IEP"]} onChange={(v) => setForm((f) => ({ ...f, type: v as SessionEvent["type"] }))} /></Filter>
          </div>

          <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Session Plan</div>
                <div className="text-xs text-black/60">Select planned targets for this session.</div>
              </div>
              <label className="flex items-center gap-2 text-xs text-black/60">
                <input type="checkbox" checked={form.autoFillFromGoals} onChange={(e) => setForm((f) => ({ ...f, autoFillFromGoals: e.target.checked }))} />
                Auto-fill from goals (session override)
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {IPA_TARGETS.map((p) => (
                <button key={p} type="button" onClick={() => addTargetChip(p)} className="text-xs px-2 py-1 rounded-lg bg-[#FFE7E0] text-[#D94E3A] ring-1 ring-black/10 hover:opacity-90">{p}</button>
              ))}
            </div>

            {form.studentId ? (
              <div className="mt-3 rounded-lg bg-black/[.02] ring-1 ring-black/10 p-2.5">
                {activeGoals.length ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-black/70">Import from student goals</div>
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10" onClick={() => importGoals("append")}>Import from student goals</button>
                      <button className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10" onClick={() => { setSelectedGoalIds(activeGoals.map((g) => g.goalId)); setGoalsOpen(true); }}>Choose goals...</button>
                      <button className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10" onClick={() => importGoals("replace")}>Replace</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-black/60">Set goals on the Student profile to speed up planning.</div>
                )}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {form.plannedTargets.map((t, idx) => (
                <div key={`${t.label}-${idx}`} className="rounded-lg ring-1 ring-black/10 p-2.5 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <SimpleSelect value={t.phoneme} options={IPA_TARGETS} onChange={(v) => updateTarget(idx, { phoneme: v })} />
                    <SimpleSelect value={t.position} options={POSITIONS} onChange={(v) => updateTarget(idx, { position: v as PlannedTarget["position"] })} />
                    <SimpleSelect value={t.level} options={LEVELS} onChange={(v) => updateTarget(idx, { level: v as PlannedTarget["level"] })} />
                    <SimpleSelect value={t.cue} options={CUES} onChange={(v) => updateTarget(idx, { cue: v as PlannedTarget["cue"] })} />
                    <div className="flex gap-2">
                      <input type="number" value={t.minutesPlanned ?? 10} onChange={(e) => updateTarget(idx, { minutesPlanned: Number(e.target.value || 0) })} className="w-full px-2 py-2 rounded-xl ring-1 ring-black/10 text-sm" placeholder="Minutes" />
                      <button className="px-2 py-2 rounded-xl bg-black/5 text-xs" onClick={() => removeTarget(idx)}>X</button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-black/60">{t.label} {t.source === "goal" ? <span className="ml-1 px-1.5 py-0.5 rounded bg-[#FFE7E0] text-[#D94E3A]">Goal</span> : null}</div>
                </div>
              ))}
              {form.plannedTargets.length === 0 ? <div className="text-sm text-black/60">No targets yet. Add a target chip above.</div> : null}
            </div>

            <div className="mt-3">
              <textarea value={form.plannedNotes} onChange={(e) => setForm((f) => ({ ...f, plannedNotes: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="Plan note (optional)" />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button className="px-3 py-2 rounded-xl bg-black/5" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white" onClick={saveSession} disabled={!form.studentId || form.plannedTargets.length === 0}>Save session</button>
          </div>
        </Modal>
      ) : null}

      {goalsOpen ? (
        <Modal title="Choose Goals" onClose={() => setGoalsOpen(false)}>
          <div className="space-y-2 max-h-[320px] overflow-auto">
            {activeGoals.map((g) => {
              const checked = selectedGoalIds.includes(g.goalId);
              return (
                <label key={g.goalId} className="flex items-start gap-2 rounded-lg ring-1 ring-black/10 p-2">
                  <input type="checkbox" checked={checked} onChange={(e) => setSelectedGoalIds((prev) => e.target.checked ? [...prev, g.goalId] : prev.filter((id) => id !== g.goalId))} />
                  <div className="text-sm">
                    <div className="font-medium">{g.title}</div>
                    <div className="text-xs text-black/60">{g.phoneme} • {g.position} • {g.level}</div>
                  </div>
                </label>
              );
            })}
            {!activeGoals.length ? <div className="text-sm text-black/60">No active goals.</div> : null}
          </div>
          <div className="mt-4 flex justify-between">
            <button className="px-3 py-2 rounded-xl bg-black/5" onClick={() => setSelectedGoalIds(activeGoals.map((g) => g.goalId))}>Select all</button>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-xl bg-black/5" onClick={() => setGoalsOpen(false)}>Cancel</button>
              <button className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white" onClick={() => { importGoals("append", selectedGoalIds); setGoalsOpen(false); }}>Import selected</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {noteOpen && noteDraft ? (
        <Modal title="Session Note Draft" onClose={() => setNoteOpen(false)}>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-black/60">Planned targets (read-only)</div>
              <div className="mt-1 flex flex-wrap gap-1.5">{noteDraft.plannedTargets.map((t, i) => <PlanChip key={`pt-${i}`} text={t.label} source={t.source} />)}</div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-black/60">Actual targets (editable)</div>
                <button className="text-xs px-2 py-1 rounded-lg bg-black/5" onClick={() => setNoteDraft((n) => n ? { ...n, actualTargets: [...n.plannedTargets] } : n)}>Copy planned → actual</button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {noteDraft.actualTargets.map((t, i) => <PlanChip key={`at-${i}`} text={t.label} source={t.source} />)}
              </div>
            </div>
            <div>
              <div className="text-xs text-black/60">Cue used</div>
              <SimpleSelect value={noteDraft.cueUsed ?? "Visual"} options={CUES} onChange={(v) => setNoteDraft((n) => n ? { ...n, cueUsed: v as PlannedTarget["cue"] } : n)} />
            </div>
            <div>
              <div className="text-xs text-black/60">Narrative note</div>
              <textarea value={noteDraft.narrative} onChange={(e) => setNoteDraft((n) => n ? { ...n, narrative: e.target.value } : n)} rows={4} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="px-3 py-2 rounded-xl bg-black/5" onClick={() => setNoteOpen(false)}>Cancel</button>
            <button className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white" onClick={saveNote}>Save draft</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function PlanChip({ text, source }: { text: string; source?: "manual" | "goal" }) {
  return <span className="text-xs px-2 py-1 rounded-lg bg-[#FFE7E0] text-[#D94E3A] ring-1 ring-black/10">{text}{source === "goal" ? " • Goal" : ""}</span>;
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-black/60">{label}</span>{children}</label>;
}

function Segment({ items, active = 0, onChange }: { items: string[]; active?: number; onChange: (index: number) => void }) {
  return <div className="inline-flex rounded-xl ring-1 ring-black/10 overflow-hidden">{items.map((it, i) => <button key={it} onClick={() => onChange(i)} className={`px-3 py-2 text-sm ${i === active ? "bg-[#FFE7E0] text-[#D94E3A] font-medium" : "bg-white text-black/70"}`}>{it}</button>)}</div>;
}

function Select({ value, options, onChange }: { value?: string; options: string[]; onChange: (v: string) => void }) {
  return <div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70">{options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select><div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">▾</div></div>;
}

function SimpleSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return <div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select><div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">▾</div></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white p-5 ring-1 ring-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="px-3 py-1.5 rounded-lg bg-black/5" onClick={onClose}>Close</button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function pillClass(status: SessionEvent["status"]) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "No-show") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "Canceled") return "bg-stone-100 text-stone-700 ring-stone-200";
  return "bg-orange-50 text-orange-700 ring-orange-200";
}

function buildMonthGrid(d: Date) {
  const start = startOfMonth(d);
  const end = endOfMonth(d);
  const startIndex = start.getDay();
  const daysInMonth = end.getDate();
  const cells: { date: Date }[] = [];
  for (let i = startIndex - 1; i >= 0; i--) {
    const dt = new Date(start);
    dt.setDate(dt.getDate() - (i + 1));
    cells.push({ date: dt });
  }
  for (let dnum = 1; dnum <= daysInMonth; dnum++) {
    cells.push({ date: new Date(start.getFullYear(), start.getMonth(), dnum) });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const dt = new Date(last);
    dt.setDate(dt.getDate() + 1);
    cells.push({ date: dt });
  }
  return cells;
}
