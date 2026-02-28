export type Student = {
  id: string;
  name: string;
  assigned_slp_id?: string;
  clinic_id?: string;
  targets?: string[];
};

const KEY = "nuvo_students_v1";

export function getStudents(): Student[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStudents(students: Student[]) {
  localStorage.setItem(KEY, JSON.stringify(students));
}

export function ensureDemoStudent(): Student {
  const students = getStudents();
  if (students.length) return students[0];

  const demo: Student = {
    id: "student_demo_001",
    name: "John Doe",
    clinic_id: "clinic_demo_001",
    assigned_slp_id: "slp_demo_001",
    targets: ["/r/ initial"],
  };
  saveStudents([demo]);
  return demo;
}
