export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit: {
        Row: { action: string; actor_email: string; actor_user_id: string | null; created_at: string; details: Json | null; id: string; target: string }
        Insert: { action: string; actor_email?: string; actor_user_id?: string | null; created_at?: string; details?: Json | null; id?: string; target?: string }
        Update: { action?: string; actor_email?: string; actor_user_id?: string | null; created_at?: string; details?: Json | null; id?: string; target?: string }
        Relationships: []
      }
      admins: {
        Row: { created_at: string; email: string; user_id: string }
        Insert: { created_at?: string; email: string; user_id: string }
        Update: { created_at?: string; email?: string; user_id?: string }
        Relationships: []
      }
      announcements: {
        Row: { body: Json; created_at: string; id: string; is_published: boolean; kind: string; published_at: string | null; title: string; updated_at: string }
        Insert: { body?: Json; created_at?: string; id?: string; is_published?: boolean; kind?: string; published_at?: string | null; title?: string; updated_at?: string }
        Update: { body?: Json; created_at?: string; id?: string; is_published?: boolean; kind?: string; published_at?: string | null; title?: string; updated_at?: string }
        Relationships: []
      }
      event_settings: {
        Row: { key: string; updated_at: string; value: Json }
        Insert: { key: string; updated_at?: string; value: Json }
        Update: { key?: string; updated_at?: string; value?: Json }
        Relationships: []
      }
      attendance: {
        Row: { day: number; is_present: boolean; marked_at: string; member_key: string; member_name: string; reg_no: string; team_id: string }
        Insert: { day: number; is_present?: boolean; marked_at?: string; member_key: string; member_name?: string; reg_no?: string; team_id: string }
        Update: { day?: number; is_present?: boolean; marked_at?: string; member_key?: string; member_name?: string; reg_no?: string; team_id?: string }
        Relationships: [{ foreignKeyName: "attendance_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      game_slots: {
        Row: { booked_at: string | null; created_at: string; game: string; id: string; slot_index: number; start_time: string; taken_by_team_id: string | null }
        Insert: { booked_at?: string | null; created_at?: string; game: string; id?: string; slot_index: number; start_time: string; taken_by_team_id?: string | null }
        Update: { booked_at?: string | null; created_at?: string; game?: string; id?: string; slot_index?: number; start_time?: string; taken_by_team_id?: string | null }
        Relationships: [{ foreignKeyName: "game_slots_taken_by_team_id_fkey"; columns: ["taken_by_team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      gallery_photos: {
        Row: { caption: string; created_at: string; id: string; sort_order: number; storage_path: string }
        Insert: { caption?: string; created_at?: string; id?: string; sort_order?: number; storage_path: string }
        Update: { caption?: string; created_at?: string; id?: string; sort_order?: number; storage_path?: string }
        Relationships: []
      }
      integration_secrets: {
        Row: { key: string; value: string; updated_at: string }
        Insert: { key: string; value: string; updated_at?: string }
        Update: { key?: string; value?: string; updated_at?: string }
        Relationships: []
      }
      registrations: {
        Row: { id: string; reg_no: string; phone: string; email: string; created_at: string; updated_at: string }
        Insert: { id?: string; reg_no: string; phone: string; email: string; created_at?: string; updated_at?: string }
        Update: { id?: string; reg_no?: string; phone?: string; email?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      people: {
        Row: { created_at: string; id: string; is_published: boolean; kind: string; name: string; photo_path: string | null; role: string; sort_order: number; tagline: string; tags: Json; updated_at: string }
        Insert: { created_at?: string; id?: string; is_published?: boolean; kind: string; name: string; photo_path?: string | null; role?: string; sort_order?: number; tagline?: string; tags?: Json; updated_at?: string }
        Update: { created_at?: string; id?: string; is_published?: boolean; kind?: string; name?: string; photo_path?: string | null; role?: string; sort_order?: number; tagline?: string; tags?: Json; updated_at?: string }
        Relationships: []
      }
      leaderboard_visibility: {
        Row: { is_published: boolean; published_at: string | null; round: string; updated_at: string }
        Insert: { is_published?: boolean; published_at?: string | null; round: string; updated_at?: string }
        Update: { is_published?: boolean; published_at?: string | null; round?: string; updated_at?: string }
        Relationships: []
      }
      problem_statements: {
        Row: { code: string; created_at: string; description: string; id: number; is_active: boolean; max_teams: number; taken_count: number; title: string; updated_at: string }
        Insert: { code: string; created_at?: string; description?: string; id?: never; is_active?: boolean; max_teams?: number; taken_count?: number; title: string; updated_at?: string }
        Update: { code?: string; created_at?: string; description?: string; id?: never; is_active?: boolean; max_teams?: number; taken_count?: number; title?: string; updated_at?: string }
        Relationships: []
      }
      scores: {
        Row: { entered_at: string; id: string; notes: string; round: string; team_id: string; total_score: number }
        Insert: { entered_at?: string; id?: string; notes?: string; round: string; team_id: string; total_score: number }
        Update: { entered_at?: string; id?: string; notes?: string; round?: string; team_id?: string; total_score?: number }
        Relationships: [{ foreignKeyName: "scores_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      submissions: {
        Row: { file_name: string | null; file_size: number | null; id: string; round: string; storage_path: string | null; submitted_at: string; team_id: string; type: string; url: string | null }
        Insert: { file_name?: string | null; file_size?: number | null; id?: string; round: string; storage_path?: string | null; submitted_at?: string; team_id: string; type: string; url?: string | null }
        Update: { file_name?: string | null; file_size?: number | null; id?: string; round?: string; storage_path?: string | null; submitted_at?: string; team_id?: string; type?: string; url?: string | null }
        Relationships: [{ foreignKeyName: "submissions_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      teams: {
        Row: { auth_user_id: string | null; created_at: string; id: string; leader_email: string; members: Json; password_set: boolean; problem_statement_id: number | null; ps_locked_at: string | null; status: string; team_code: string; team_name: string; updated_at: string }
        Insert: { auth_user_id?: string | null; created_at?: string; id?: string; leader_email: string; members?: Json; password_set?: boolean; problem_statement_id?: number | null; ps_locked_at?: string | null; status?: string; team_code: string; team_name: string; updated_at?: string }
        Update: { auth_user_id?: string | null; created_at?: string; id?: string; leader_email?: string; members?: Json; password_set?: boolean; problem_statement_id?: number | null; ps_locked_at?: string | null; status?: string; team_code?: string; team_name?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "teams_ps_fk"; columns: ["problem_statement_id"]; isOneToOne: false; referencedRelation: "problem_statements"; referencedColumns: ["id"] }]
      }
    }
    Views: {
      leaderboard_final_public: {
        Row: { notes: string | null; rank: number | null; team_code: string | null; team_id: string | null; team_name: string | null; total_score: number | null }
        Relationships: [{ foreignKeyName: "scores_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      leaderboard_round1_public: {
        Row: { notes: string | null; rank: number | null; team_code: string | null; team_id: string | null; team_name: string | null; total_score: number | null }
        Relationships: [{ foreignKeyName: "scores_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      leaderboard_round2_public: {
        Row: { notes: string | null; rank: number | null; team_code: string | null; team_id: string | null; team_name: string | null; total_score: number | null }
        Relationships: [{ foreignKeyName: "scores_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      winners_public: {
        Row: { body: Json | null; id: string | null; published_at: string | null; title: string | null }
        Relationships: []
      }
    }
    Functions: {
      roll_problem_statement: {
        Args: never
        Returns: { code: string; description: string; id: number; title: string }[]
      }
      decrement_ps_taken: {
        Args: { ps_id: number }
        Returns: never
      }
      book_game_slot: {
        Args: { p_slot_id: string }
        Returns: { slot_id: string; slot_game: string; slot_start: string }[]
      }
      roll_problem_statement_for: {
        Args: { p_team_id: string }
        Returns: { id: number; code: string; title: string; description: string }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Team = Database["public"]["Tables"]["teams"]["Row"]
export type ProblemStatement = Database["public"]["Tables"]["problem_statements"]["Row"]
export type Submission = Database["public"]["Tables"]["submissions"]["Row"]
export type Score = Database["public"]["Tables"]["scores"]["Row"]
export type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"]
export type Person = Database["public"]["Tables"]["people"]["Row"]
export type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"]
export type GameSlot = Database["public"]["Tables"]["game_slots"]["Row"]
export type LeaderboardEntry = Database["public"]["Views"]["leaderboard_round1_public"]["Row"]

export const GAMES = ["tekken", "fifa"] as const
export type Game = (typeof GAMES)[number]

export function gameLabel(game: string): string {
  return game === "tekken" ? "Tekken" : game === "fifa" ? "FIFA" : game
}

export function memberKeyOf(m: TeamMember): string {
  return m.member_id?.trim() ? m.member_id.trim() : `name:${m.name.trim().toLowerCase()}`
}

export interface TeamMember {
  member_id?: string | null
  name: string
  email?: string | null
  phone?: string | null
  college?: string | null
  payment_status?: string | null
  college_type?: string | null
}

export interface WinnersEntry {
  position: number
  team_code: string
  team_name: string
  prize?: string
}

export interface EventTiming {
  event_start: string | null
  ps_release_at: string | null
  round1_deadline: string | null
  final_deadline: string | null
  event_end: string | null
}

export const TEAM_STATUSES = ["registered", "round1", "advanced", "finalist", "eliminated"] as const
export type TeamStatus = (typeof TEAM_STATUSES)[number]
