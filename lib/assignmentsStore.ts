export type HomeworkAssignment = any; // keep simple for now

const KEY = "nuvo_assignments_v1";

export function listAssignments(): HomeworkAssignment[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAssignment(a: HomeworkAssignment) {
  const all = listAssignments();
  const next = [a, ...all];
  localStorage.setItem(KEY, JSON.stringify(next));
}
