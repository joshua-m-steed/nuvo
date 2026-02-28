export type Role = "CLINIC_ADMIN" | "SLP" | "PARENT" | "STUDENT";

export type User = { id: string; role: Role; clinic_id: string; name: string; email: string; };
export type Clinic = { id: string; name: string; plan: "free" | "pro" | "enterprise"; };
export type GoalPosition = "Initial" | "Medial" | "Final" | "Blends" | "Other";
export type GoalLevel = "Isolation" | "Syllables" | "Words" | "Phrases" | "Sentences" | "Conversation";
export type GoalCue = "None" | "Visual" | "Verbal" | "Tactile" | "Multiple";
export type StudentGoal = {
  goalId: string;
  title: string;
  phoneme: string;
  position: GoalPosition;
  level: GoalLevel;
  cue: GoalCue;
  criterion?: string;
  isActive?: boolean;
};

export type Student = {
  id: string;
  clinic_id: string;
  assigned_slp_id: string;
  name: string;
  dob?: string;
  targets: Array<{ phoneme: string; position: "initial"|"medial"|"final"; difficulty?: "easy"|"medium"|"hard" }>;
  goals?: StudentGoal[];
  autoFillSessionPlan?: boolean;
  notes?: string;
  last_activity_at?: string;
};

// Raw schema from your word_bank.json
export type WordBankItemRaw = {
  text: string;
  syllables: number;
  phonemes: string[];
  positions: Record<string, Array<"initial"|"medial"|"final">>;
};

// Normalized format used by UI + assignment generation
export type WordBankItem = {
  word: string;
  syllable_count: number;
  phonemes: string[];
  positions: Record<string, Array<"initial"|"medial"|"final">>;
  difficulty?: "easy"|"medium"|"hard"; // optional if you add it later
};

export type Exemplar = {
  id: string;
  created_by_slp_id: string;
  scope: "global" | "per_word";
  media_type: "audio" | "video";
  storage_key: string;
  duration_ms?: number;
  created_at: string;
  label?: string;
};

export type HomeworkItem = {
  item_id: string;
  prompt_text: string;
  target_phoneme: string;
  target_position: "initial"|"medial"|"final";
  syllable_count: number;
  reps: number;
  minigame_id: string;
  exemplar_id?: string;
  scoring_rules?: { accuracy_threshold?: number; require_confidence?: number; };
};

export type HomeworkAssignment = {
  id: string;
  student_id: string;
  slp_id: string;
  clinic_id: string;
  created_at: string;
  due_date: string;
  schedule: { days_per_week: number };
  targets: { phoneme: string; position: "initial"|"medial"|"final"; syllable_min?: number; syllable_max?: number; difficulty?: "easy"|"medium"|"hard" };
  items: HomeworkItem[];
  global_exemplar_id?: string;
  settings: { play_exemplar_before_attempt: boolean; allow_replay: boolean; require_replay: boolean; item_count: number; reps: number; };
  status: "draft"|"assigned"|"in_progress"|"completed";
  schema_version: "1.0";
  parent_note?: string;
};
