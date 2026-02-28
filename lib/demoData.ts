import type { HomeworkAssignment, HomeworkItem, Student, StudentGoal, User } from "./types";
import { createId, mockAssignments, mockExemplars, mockStudents, mockUsers } from "./mockDb";

type DemoDb = {
  version: number;
  seed: number;
  students: Student[];
  assignments: HomeworkAssignment[];
  // extra demo-only data (won’t break anything if unused)
  messages: Array<{
    id: string;
    student_id: string;
    from: "SLP" | "PARENT";
    text: string;
    created_at: string;
    read: boolean;
  }>;
};

const KEY = "nuvo_demo_db_v2";
const VERSION = 2;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function int(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function isoDaysFromNow(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}
function isoDateOnlyFromNow(daysFromNow: number) {
  return isoDaysFromNow(daysFromNow).slice(0, 10);
}

const FIRST = ["Mia", "Noah", "Ava", "Liam", "Emma", "Olivia", "Ethan", "Sofia", "Mason", "Zoe", "Lucas", "Ella"];
const LAST = ["Johnson", "Smith", "Brown", "Davis", "Miller", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "White"];
const PHONEMES = ["AH", "R", "S", "T", "K", "L", "CH", "SH", "TH", "F", "P", "B"];
const POS: Array<"initial" | "medial" | "final"> = ["initial", "medial", "final"];
const NOTE_SNIPS = [
  "Responds well to short, upbeat practice.",
  "Needs reminders to slow down and over-articulate.",
  "Great engagement with game-based practice.",
  "Parent reports practice is easiest right after dinner.",
  "Working on carryover to conversation.",
];
const GOAL_LEVELS: StudentGoal["level"][] = ["Words", "Phrases", "Sentences"];
const GOAL_CUES: StudentGoal["cue"][] = ["Visual", "Verbal", "Multiple"];

function toGoalPhoneme(raw: string) {
  const core = String(raw || "").trim().toLowerCase();
  if (!core) return "/ə/";
  return `/${core}/`;
}

function toGoalPosition(pos: "initial" | "medial" | "final"): StudentGoal["position"] {
  if (pos === "initial") return "Initial";
  if (pos === "medial") return "Medial";
  return "Final";
}

function generateStudents(rng: () => number, user: User, count: number, slpIds: string[]): Student[] {
  const students: Student[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    const dobYear = int(rng, 2014, 2019);
    const dobMonth = String(int(rng, 1, 12)).padStart(2, "0");
    const dobDay = String(int(rng, 1, 28)).padStart(2, "0");

    const phoneme = pick(rng, PHONEMES);
    const position = pick(rng, POS);
    const lastActiveDaysAgo = int(rng, 0, 14);

    const goals: StudentGoal[] = [
      {
        goalId: createId("g"),
        title: `${toGoalPhoneme(phoneme)} ${toGoalPosition(position)} at word level`,
        phoneme: toGoalPhoneme(phoneme),
        position: toGoalPosition(position),
        level: pick(rng, GOAL_LEVELS),
        cue: pick(rng, GOAL_CUES),
        criterion: "80% across 3 sessions",
        isActive: true,
      },
    ];

    students.push({
      id: createId("s"),
      clinic_id: user.clinic_id,
      assigned_slp_id: pick(rng, slpIds),
      name,
      dob: `${dobYear}-${dobMonth}-${dobDay}`,
      targets: [{ phoneme, position }],
      goals,
      autoFillSessionPlan: true,
      notes: pick(rng, NOTE_SNIPS),
      last_activity_at: isoDaysFromNow(-lastActiveDaysAgo),
    });
  }
  return students;
}

function generateHomeworkItems(rng: () => number, phoneme: string, position: "initial" | "medial" | "final", reps: number, count: number): HomeworkItem[] {
  const items: HomeworkItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      item_id: createId("it"),
      prompt_text: `${phoneme}-${position}-${i + 1}`, // placeholder prompt if word bank not used on demo
      target_phoneme: phoneme,
      target_position: position,
      syllable_count: int(rng, 1, 4),
      reps,
      minigame_id: pick(rng, ["fish_bobber", "dj_dino", "safari_jeep"]),
      scoring_rules: { accuracy_threshold: 0.7 },
    });
  }
  return items;
}

function generateAssignments(rng: () => number, students: Student[]): HomeworkAssignment[] {
  const all: HomeworkAssignment[] = [];

  for (const s of students) {
    const target = s.targets?.[0] ?? { phoneme: "AH", position: "initial" as const };
    const assignmentCount = int(rng, 1, 6);

    for (let k = 0; k < assignmentCount; k++) {
      const itemCount = pick(rng, [6, 8, 10, 12, 15]);
      const reps = pick(rng, [2, 3, 4]);
      const status = pick(rng, ["draft", "assigned", "in_progress", "completed"] as const);

      // due dates: some past, some future
      const dueInDays = int(rng, -10, 14);

      all.push({
        id: createId("a"),
        student_id: s.id,
        slp_id: s.assigned_slp_id,
        clinic_id: s.clinic_id,
        created_at: isoDaysFromNow(-int(rng, 1, 30)),
        due_date: isoDateOnlyFromNow(dueInDays),
        schedule: { days_per_week: pick(rng, [2, 3, 4, 5]) },
        targets: { phoneme: target.phoneme, position: target.position },
        items: generateHomeworkItems(rng, target.phoneme, target.position, reps, itemCount),
        settings: {
          play_exemplar_before_attempt: true,
          allow_replay: true,
          require_replay: false,
          item_count: itemCount,
          reps,
        },
        status,
        schema_version: "1.0",
        parent_note: "Please keep practice short and positive. Celebrate effort.",
      });
    }
  }

  // newest first
  all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return all;
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i);
  return Math.abs(h);
}

function generateMessages(rng: () => number, students: Student[]) {
  const samples = [
    "Quick update: great progress this week!",
    "Could you try practicing right before screen time?",
    "He’s mixing /s/ and /sh/—any tips at home?",
    "We missed a session—can we reschedule?",
    "Today went awesome. Keep reps short + fun.",
  ];

  const out: DemoDb["messages"] = [];
  for (const s of students) {
    const threadSize = int(rng, 2, 12);
    for (let i = 0; i < threadSize; i++) {
      const from = i % 2 === 0 ? "SLP" : "PARENT";
      out.push({
        id: createId("m"),
        student_id: s.id,
        from,
        text: pick(rng, samples),
        created_at: isoDaysFromNow(-int(rng, 0, 20)),
        read: rng() > 0.35,
      });
    }
  }
  out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return out;
}

export function loadDemoDb(): DemoDb | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoDb;
    if (parsed.version !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDemoDb(db: DemoDb) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
}

/**
 * Ensures the in-memory mock arrays are hydrated with a big, realistic dataset.
 * Call this at the top of API methods (students.list/get, assignments.list/get/create, etc.)
 */
export function ensureDemoData(user: User, opts?: { seed?: number; studentCount?: number }) {
  // Only run in browser
  if (typeof window === "undefined") return;

  const seed = opts?.seed ?? 1337;
  const existing = loadDemoDb() ?? { version: VERSION, seed, students: [], assignments: [], messages: [] };
  const clinicHasData = existing.students.some((s) => s.clinic_id === user.clinic_id);

  if (!clinicHasData) {
    const clinicSeed = seed + hashString(user.clinic_id);
    const rng = mulberry32(clinicSeed);
    const studentCount = opts?.studentCount ?? int(rng, 25, 60);
    const slpIds = mockUsers
      .filter((u) => u.clinic_id === user.clinic_id && u.role === "SLP")
      .map((u) => u.id);

    const fallbackSlpIds = slpIds.length ? slpIds : [user.id];
    const students = generateStudents(rng, user, studentCount, fallbackSlpIds);
    const assignments = generateAssignments(rng, students);
    const messages = generateMessages(rng, students);

    existing.students.push(...students);
    existing.assignments.push(...assignments);
    existing.messages.push(...messages);
    existing.version = VERSION;
    existing.seed = seed;
    saveDemoDb(existing);
  }

  const latest = loadDemoDb() ?? existing;
  mockStudents.splice(0, mockStudents.length, ...latest.students);
  mockAssignments.splice(0, mockAssignments.length, ...latest.assignments);
  mockExemplars.splice(0, mockExemplars.length);
}

/** Utility: reset demo DB (handy button later in settings). */
export function resetDemoDb() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
