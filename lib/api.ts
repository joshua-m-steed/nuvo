import { createId, mockAssignments, mockExemplars, mockStudents, mockUsers } from "./mockDb";
import type { HomeworkAssignment, Student, User, Exemplar } from "./types";
import { ensureDemoData, loadDemoDb, saveDemoDb } from "./demoData";

const SESSION_KEY = "nuvo_session_user_id";
const DEMO_BOOT_KEY = "nuvo_demo_boot_v1";

type DemoUserWithPassword = User & { password?: string };

function getSessionUser(): DemoUserWithPassword | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return (mockUsers.find((u) => u.id === id) as DemoUserWithPassword) ?? null;
}

function setSessionUser(user: DemoUserWithPassword | null) {
  if (typeof window === "undefined") return;
  if (!user) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, user.id);
}

function rand(n: number) {
  return Math.floor(Math.random() * n);
}
function pick<T>(arr: T[]) {
  return arr[rand(arr.length)];
}
function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function isoDateOnlyFromNow(days: number) {
  return isoDaysFromNow(days).slice(0, 10);
}

const FIRST = ["Mia", "Noah", "Ava", "Liam", "Emma", "Olivia", "Ethan", "Sofia", "Mason", "Zoe", "Lucas", "Ella"];
const LAST = ["Johnson", "Smith", "Brown", "Davis", "Miller", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "White"];
const PHONEMES = ["AH", "R", "S", "T", "K", "L", "CH", "SH", "TH", "F", "P", "B"];
const POS: Array<"initial" | "medial" | "final"> = ["initial", "medial", "final"];

function seedDemoClinicData(clinicId: string, slpIds: string[]) {
  if (mockStudents.some((s) => s.clinic_id === clinicId)) return;

  const studentCount = 30 + rand(25);
  const studentIds: string[] = [];

  for (let i = 0; i < studentCount; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const phoneme = pick(PHONEMES);
    const position = pick(POS);
    const assigned_slp_id = pick(slpIds);
    const lastActiveDaysAgo = rand(21);

    const s: Student = {
      id: createId("s"),
      clinic_id: clinicId,
      assigned_slp_id,
      name,
      dob: `${2014 + rand(6)}-${String(1 + rand(12)).padStart(2, "0")}-${String(1 + rand(28)).padStart(2, "0")}`,
      targets: [{ phoneme, position }] as any,
      notes: "Demo student record.",
      last_activity_at: isoDaysFromNow(-lastActiveDaysAgo),
    } as any;

    mockStudents.push(s);
    studentIds.push(s.id);
  }

  for (const sid of studentIds) {
    const st = mockStudents.find((s) => s.id === sid);
    if (!st) continue;
    const t = (st.targets?.[0] ?? { phoneme: "AH", position: "initial" }) as any;

    const count = 1 + rand(6);
    for (let k = 0; k < count; k++) {
      const itemCount = pick([6, 8, 10, 12, 15]);
      const reps = pick([2, 3, 4]);
      const status = pick(["draft", "assigned", "in_progress", "completed"] as const);

      mockAssignments.push({
        id: createId("a"),
        student_id: sid,
        slp_id: st.assigned_slp_id,
        clinic_id: clinicId,
        created_at: isoDaysFromNow(-(1 + rand(30))),
        due_date: isoDateOnlyFromNow(-7 + rand(21)),
        schedule: { days_per_week: pick([2, 3, 4, 5]) },
        targets: { phoneme: t.phoneme, position: t.position },
        items: Array.from({ length: itemCount }).map((_, idx) => ({
          item_id: createId("it"),
          prompt_text: `${t.phoneme}-${t.position}-${idx + 1}`,
          target_phoneme: t.phoneme,
          target_position: t.position,
          syllable_count: 1 + rand(4),
          reps,
          minigame_id: pick(["fish_bobber", "dj_dino", "safari_jeep"]),
        })),
        settings: {
          play_exemplar_before_attempt: true,
          allow_replay: true,
          require_replay: false,
          item_count: itemCount,
          reps,
        },
        status,
        schema_version: "1.0",
        parent_note: "Demo note: short + positive practice works best.",
      } as any);
    }
  }

  mockAssignments.sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1));
}

function ensureDemoOrgAndUsers() {
  if (typeof window === "undefined") return;

  const clinicA = { id: "clinic_demo_a", name: "Summit Speech & Language" };
  const clinicB = { id: "clinic_demo_b", name: "Blue Sky Pediatric Therapy" };

  const demoUsers: DemoUserWithPassword[] = [
    {
      id: "u_admin_a",
      role: "CLINIC_ADMIN",
      clinic_id: clinicA.id,
      name: "Avery Admin",
      email: "admin@summitspeech.demo",
      password: "DemoPass!123",
    },
    {
      id: "u_slp_a1",
      role: "SLP",
      clinic_id: clinicA.id,
      name: "Sofia Therapist",
      email: "sofia@summitspeech.demo",
      password: "DemoPass!123",
    },
    {
      id: "u_slp_a2",
      role: "SLP",
      clinic_id: clinicA.id,
      name: "Noah Therapist",
      email: "noah@summitspeech.demo",
      password: "DemoPass!123",
    },
    {
      id: "u_admin_b",
      role: "CLINIC_ADMIN",
      clinic_id: clinicB.id,
      name: "Blake Admin",
      email: "admin@bluesky.demo",
      password: "DemoPass!123",
    },
    {
      id: "u_slp_b1",
      role: "SLP",
      clinic_id: clinicB.id,
      name: "Mia Therapist",
      email: "mia@bluesky.demo",
      password: "DemoPass!123",
    },
  ];

  const existingEmails = new Set(mockUsers.map((u) => u.email.toLowerCase()));
  for (const u of demoUsers) {
    if (!existingEmails.has(u.email.toLowerCase())) mockUsers.push(u as any);
  }

  // Keep demo data generation in lib/demoData.ts.
  // We only ensure demo users/org identities exist here.

  localStorage.setItem(DEMO_BOOT_KEY, "1");
}

export const auth = {
  async login(email: string, password: string): Promise<User> {
    ensureDemoOrgAndUsers();

    const u = mockUsers.find((x) => x.email.toLowerCase() === email.toLowerCase()) as DemoUserWithPassword | undefined;
    if (!u) throw new Error("No user found for that email.");
    if ((u.password ?? "") !== password) throw new Error("Incorrect password (demo password is: DemoPass!123)");

    setSessionUser(u);
    return u;
  },

  async currentUser(): Promise<User | null> {
    ensureDemoOrgAndUsers();
    return getSessionUser();
  },

  async logout(): Promise<void> {
    setSessionUser(null);
  },
};

export const students = {
  async list(user: User): Promise<Student[]> {
    ensureDemoOrgAndUsers();
    ensureDemoData(user);

    if (user.role === "CLINIC_ADMIN") return mockStudents.filter((s) => s.clinic_id === user.clinic_id);
    if (user.role === "SLP") return mockStudents.filter((s) => s.assigned_slp_id === user.id);
    return [];
  },

  async get(user: User, id: string): Promise<Student> {
    ensureDemoOrgAndUsers();
    ensureDemoData(user);

    const s = mockStudents.find((x) => x.id === id);
    if (!s) {
      const visible = await this.list(user);
      if (visible.length) return visible[0];
      throw new Error("Student not found");
    }

    if (user.role === "CLINIC_ADMIN" && s.clinic_id === user.clinic_id) return s;
    if (user.role === "SLP" && s.assigned_slp_id === user.id) return s;

    throw new Error("Not authorized");
  },
};

export const assignments = {
  async create(payload: HomeworkAssignment): Promise<HomeworkAssignment> {
    const created = { ...payload, id: payload.id || createId("a"), created_at: new Date().toISOString() };
    mockAssignments.unshift(created);

    // Persist into demo local DB so route transitions and refreshes can still resolve this id.
    if (typeof window !== "undefined") {
      const db = loadDemoDb();
      if (db) {
        db.assignments = [created, ...db.assignments.filter((a) => a.id !== created.id)];
        saveDemoDb(db);
      }
    }

    return created;
  },

  async list(user: User): Promise<HomeworkAssignment[]> {
    ensureDemoOrgAndUsers();
    ensureDemoData(user);

    if (user.role === "CLINIC_ADMIN") return mockAssignments.filter((a) => a.clinic_id === user.clinic_id);
    if (user.role === "SLP") return mockAssignments.filter((a) => a.slp_id === user.id);
    return [];
  },

  async get(user: User, id: string): Promise<HomeworkAssignment> {
    ensureDemoOrgAndUsers();
    ensureDemoData(user);

    const a = mockAssignments.find((x) => x.id === id);
    if (!a) throw new Error("Assignment not found");

    if (user.role === "CLINIC_ADMIN" && a.clinic_id === user.clinic_id) return a;
    if (user.role === "SLP" && a.slp_id === user.id) return a;

    throw new Error("Not authorized");
  },
};

export const exemplars = {
  async create(e: Omit<Exemplar, "id" | "created_at">): Promise<Exemplar> {
    const created: Exemplar = { ...e, id: createId("ex"), created_at: new Date().toISOString() };
    mockExemplars.unshift(created);
    return created;
  },

  async listByUser(user: User): Promise<Exemplar[]> {
    if (user.role === "CLINIC_ADMIN") return mockExemplars;
    if (user.role === "SLP") return mockExemplars.filter((e) => e.created_by_slp_id === user.id);
    return [];
  },
};

export const results = { async listByAssignment(_id: string) { return []; } };
