import type { User, Clinic, Student, HomeworkAssignment, Exemplar } from "./types";

export const mockClinic: Clinic = { id: "clinic_1", name: "Nuvo Demo Clinic", plan: "pro" };

export const mockUsers: User[] = [
  { id: "u_admin", role: "CLINIC_ADMIN", clinic_id: mockClinic.id, name: "Alex Admin", email: "admin@nuvo.dev" },
  { id: "u_slp1", role: "SLP", clinic_id: mockClinic.id, name: "Taylor Therapist", email: "slp@nuvo.dev" },
  { id: "u_parent", role: "PARENT", clinic_id: mockClinic.id, name: "Pat Parent", email: "parent@nuvo.dev" }
];

export const mockStudents: Student[] = [
  { id: "s_1", clinic_id: mockClinic.id, assigned_slp_id: "u_slp1", name: "Mia Johnson", dob: "2017-04-11",
    targets: [{ phoneme: "AH", position: "initial" }],
    notes: "Working on /AH/ in initial position. Keep it fun and short.",
    last_activity_at: new Date(Date.now()-2*864e5).toISOString()
  },
  { id: "s_2", clinic_id: mockClinic.id, assigned_slp_id: "u_slp1", name: "Noah Smith", dob: "2016-09-22",
    targets: [{ phoneme: "T", position: "final" }],
    notes: "Focus on clear final /T/. Encourage slow speech.",
    last_activity_at: new Date(Date.now()-5*864e5).toISOString()
  }
];

export const mockExemplars: Exemplar[] = [];
export const mockAssignments: HomeworkAssignment[] = [];

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2,10)}`;
}
