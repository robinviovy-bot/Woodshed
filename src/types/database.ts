// Row shapes for supabase/migrations/20260920000000_initial_schema.sql.
// Field names match DB columns (snake_case) directly -- no mapping layer.

export type Pool = "naturals" | "accidentals" | "chromatic" | "complete";
export type ExerciseMode = "single" | "pair" | "sequence";
export type Confidence = "rough" | "ok" | "solid";
export type MilestoneCode =
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "streak_365"
  | "complete_80_solid";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  notation: string;
  theme: string;
  validation_mode: string;
  metronome_sound: string;
  timezone: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  position: number;
  created_at: string;
}

export interface ExerciseConfig {
  reps_target: number;
  sequence_length: number | null;
}

export interface Exercise {
  id: string;
  program_id: string;
  slug: string;
  position: number;
  title: string;
  description: string | null;
  uses_metronome: boolean;
  mode: ExerciseMode;
  available_pools: Pool[];
  default_pool: Pool;
  config: ExerciseConfig;
  created_at: string;
}

export interface Drill {
  id: string;
  exercise_id: string;
  bpm: number | null;
  pool: Pool;
}

export interface DrillStats {
  id: string;
  user_id: string;
  drill_id: string;
  first_practiced_on: string | null;
  last_practiced_on: string | null;
  session_count: number;
  total_reps: number;
  last_confidence: Confidence | null;
  consecutive_solid: number;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  drill_id: string;
  started_at: string;
  ended_at: string | null;
  time_signature: string | null;
  actual_bpm: number | null;
  notes_done: number;
  reps_done: number;
  confidence: Confidence | null;
}

export interface SessionItem {
  id: string;
  user_id: string;
  session_id: string;
  note: string;
  position: number;
  reps_done: number;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  day: string;
  program_id: string;
  xp_awarded: number;
  is_rest_day: boolean;
}

export interface XpEvent {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  day: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  code: MilestoneCode;
  achieved_on: string;
}

export interface UserStats {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_practiced_day: string | null;
}
