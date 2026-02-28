import type { HomeworkAssignment, Student } from "./types";

export type PlannedPosition = "Initial" | "Medial" | "Final" | "Blends" | "Other";
export type PlannedLevel = "Isolation" | "Syllables" | "Words" | "Phrases" | "Sentences" | "Conversation";
export type PlannedCue = "None" | "Visual" | "Verbal" | "Tactile" | "Multiple";

export type PlannedTarget = {
  phoneme: string;
  position: PlannedPosition;
  level: PlannedLevel;
  cue: PlannedCue;
  goalId?: string;
  source?: "manual" | "goal";
  label: string;
  minutesPlanned?: number;
};

export type SessionEvent = {
  id: string;
  studentId: string;
  slpId: string;
  clinicId: string;
  date: string;
  start: string;
  end: string;
  location: "Clinic" | "School" | "Telehealth";
  type: "Therapy" | "Evaluation" | "Group" | "IEP";
  status: "Scheduled" | "Completed" | "No-show" | "Canceled";
  plannedTargets: PlannedTarget[];
  plannedNotes: string;
  autoFillFromGoals?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SessionNote = {
  sessionId: string;
  studentId: string;
  status: "Draft" | "Final";
  plannedTargets: PlannedTarget[];
  actualTargets: PlannedTarget[];
  cueUsed?: PlannedCue;
  narrative: string;
  homeworkAssigned?: string;
  seededPlanNote?: string;
  updatedAt: string;
};

const EVENTS_KEY = "nuvo_session_events_v1";
const NOTES_KEY = "nuvo_session_notes_v1";
const PREFS_KEY = "nuvo_student_plan_prefs_v1";

type StudentPlanPrefs = Record<string, boolean>;

function nowIso() {
  return new Date().toISOString();
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function parseSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function makeTargetLabel(t: Omit<PlannedTarget, "label"> | PlannedTarget) {
  return `${t.phoneme} • ${t.position} • ${t.level}`;
}

export function normalizePhoneme(p: string) {
  const raw = String(p || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && raw.endsWith("/")) return raw;
  return `/${raw}/`;
}

function plannedFromAssignment(a: HomeworkAssignment): PlannedTarget[] {
  const phoneme = normalizePhoneme(a.targets?.phoneme || "ə");
  const positionMap: Record<string, PlannedPosition> = {
    initial: "Initial",
    medial: "Medial",
    final: "Final",
  };
  const position = positionMap[String(a.targets?.position || "initial").toLowerCase()] ?? "Initial";
  const target: PlannedTarget = {
    phoneme,
    position,
    level: "Words",
    cue: "Visual",
    source: "manual",
    label: `${phoneme} • ${position} • Words`,
  };
  return [target];
}

export function loadSessionEvents(): SessionEvent[] {
  if (!canUseStorage()) return [];
  return parseSafe<SessionEvent[]>(localStorage.getItem(EVENTS_KEY), []);
}

export function saveSessionEvents(events: SessionEvent[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function upsertSessionEvent(event: SessionEvent): SessionEvent {
  const events = loadSessionEvents();
  const next = [event, ...events.filter((e) => e.id !== event.id)].sort((a, b) =>
    `${a.date}T${a.start}` < `${b.date}T${b.start}` ? -1 : 1
  );
  saveSessionEvents(next);
  return event;
}

export function getSessionEventById(id: string): SessionEvent | undefined {
  return loadSessionEvents().find((e) => e.id === id);
}

export function ensureSessionEventsFromAssignments(assignments: HomeworkAssignment[], students: Student[]): SessionEvent[] {
  if (!canUseStorage()) return [];

  const existing = loadSessionEvents();
  const byId = new Map(existing.map((e) => [e.id, e]));
  const studentById = new Map(students.map((s) => [s.id, s]));

  for (const [idx, a] of assignments.slice(0, 120).entries()) {
    if (byId.has(a.id)) continue;

    const minute = idx % 2 === 0 ? "00" : "30";
    const hour = 8 + (idx % 8);
    const endHour = minute === "00" ? hour : hour + 1;
    const endMinute = minute === "00" ? "30" : "00";

    const student = studentById.get(a.student_id);

    const seeded: SessionEvent = {
      id: a.id,
      studentId: a.student_id,
      slpId: a.slp_id,
      clinicId: a.clinic_id,
      date: a.due_date,
      start: `${String(hour).padStart(2, "0")}:${minute}`,
      end: `${String(endHour).padStart(2, "0")}:${endMinute}`,
      location: "Clinic",
      type: a.items.length > 10 ? "Group" : "Therapy",
      status: a.status === "completed" ? "Completed" : a.status === "draft" ? "Canceled" : "Scheduled",
      plannedTargets: plannedFromAssignment(a),
      plannedNotes: student?.notes || "",
      autoFillFromGoals: true,
      createdAt: a.created_at || nowIso(),
      updatedAt: nowIso(),
    };

    byId.set(seeded.id, seeded);
  }

  const merged = Array.from(byId.values()).sort((a, b) => (`${a.date}T${a.start}` < `${b.date}T${b.start}` ? -1 : 1));
  saveSessionEvents(merged);
  return merged;
}

export function loadSessionNotes(): SessionNote[] {
  if (!canUseStorage()) return [];
  return parseSafe<SessionNote[]>(localStorage.getItem(NOTES_KEY), []);
}

export function saveSessionNotes(notes: SessionNote[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function getSessionNoteBySessionId(sessionId: string): SessionNote | undefined {
  return loadSessionNotes().find((n) => n.sessionId === sessionId);
}

export function createOrLoadNoteDraft(event: SessionEvent): SessionNote {
  const existing = getSessionNoteBySessionId(event.id);
  if (existing) return existing;

  const seeded: SessionNote = {
    sessionId: event.id,
    studentId: event.studentId,
    status: "Draft",
    plannedTargets: [...event.plannedTargets],
    actualTargets: [...event.plannedTargets],
    cueUsed: event.plannedTargets[0]?.cue,
    narrative: event.plannedNotes ? `Plan: ${event.plannedNotes}` : "",
    seededPlanNote: event.plannedNotes,
    updatedAt: nowIso(),
  };

  const notes = loadSessionNotes();
  saveSessionNotes([seeded, ...notes.filter((n) => n.sessionId !== seeded.sessionId)]);
  return seeded;
}

export function upsertSessionNote(note: SessionNote): SessionNote {
  const next = { ...note, updatedAt: nowIso() };
  const notes = loadSessionNotes();
  saveSessionNotes([next, ...notes.filter((n) => n.sessionId !== next.sessionId)]);
  return next;
}

export function loadStudentPlanPrefs(): StudentPlanPrefs {
  if (!canUseStorage()) return {};
  return parseSafe<StudentPlanPrefs>(localStorage.getItem(PREFS_KEY), {});
}

export function getStudentAutoFillPref(studentId: string, fallback = true) {
  const prefs = loadStudentPlanPrefs();
  if (studentId in prefs) return prefs[studentId];
  return fallback;
}

export function setStudentAutoFillPref(studentId: string, value: boolean) {
  if (!canUseStorage()) return;
  const prefs = loadStudentPlanPrefs();
  prefs[studentId] = value;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
