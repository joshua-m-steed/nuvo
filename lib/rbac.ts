import type { Role, User, Student } from "./types";

export function canAccessRoute(role: Role, route: string) {
  if (route.startsWith("/app/admin")) return role === "CLINIC_ADMIN";
  if (route.startsWith("/app")) return role !== "STUDENT";
  return true;
}

export function canViewStudent(user: User, student: Student) {
  if (user.role === "CLINIC_ADMIN") return user.clinic_id === student.clinic_id;
  if (user.role === "SLP") return user.id === student.assigned_slp_id;
  return false;
}
