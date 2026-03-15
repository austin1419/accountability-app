export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          role: string
          content: string
          response_mode: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          role: string
          content: string
          response_mode?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          role?: string
          content?: string
          response_mode?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memories: {
        Row: {
          id: string
          user_id: string
          memory_type: string
          memory_text: string
          importance_score: number
          created_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          memory_type: string
          memory_text: string
          importance_score?: number
          created_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          memory_type?: string
          memory_text?: string
          importance_score?: number
          created_at?: string
          last_used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_journal: {
        Row: {
          id: string
          user_id: string
          date: string
          sleep_hours: number | null
          felt_rested: boolean | null
          protein_hit: boolean | null
          hydration_hit: boolean | null
          alcohol: boolean | null
          trained_today: boolean | null
          zone2_cardio: boolean | null
          recovery_work: boolean | null
          supplements_taken: boolean | null
          stress_level: number | null
          energy_level: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          sleep_hours?: number | null
          felt_rested?: boolean | null
          protein_hit?: boolean | null
          hydration_hit?: boolean | null
          alcohol?: boolean | null
          trained_today?: boolean | null
          zone2_cardio?: boolean | null
          recovery_work?: boolean | null
          supplements_taken?: boolean | null
          stress_level?: number | null
          energy_level?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          sleep_hours?: number | null
          felt_rested?: boolean | null
          protein_hit?: boolean | null
          hydration_hit?: boolean | null
          alcohol?: boolean | null
          trained_today?: boolean | null
          zone2_cardio?: boolean | null
          recovery_work?: boolean | null
          supplements_taken?: boolean | null
          stress_level?: number | null
          energy_level?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_journal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_profile_answers: {
        Row: {
          id: string
          user_id: string
          section_key: string
          question_key: string
          answer_value_json: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          section_key: string
          question_key: string
          answer_value_json: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          section_key?: string
          question_key?: string
          answer_value_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_profile_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          change_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          current_body_fat: number | null
          current_performance_value: number | null
          current_smm: number | null
          current_weight: number | null
          goal_body_fat: number | null
          goal_category: string
          goal_date: string | null
          goal_name: string
          goal_performance_value: number | null
          goal_smm: number | null
          goal_weight: number | null
          id: string
          is_active: boolean
          performance_direction: string | null
          performance_metric_name: string | null
          performance_unit: string | null
          start_weight: number | null
          starting_body_fat: number | null
          starting_performance_value: number | null
          starting_smm: number | null
          target_days_per_week: number
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          current_body_fat?: number | null
          current_performance_value?: number | null
          current_smm?: number | null
          current_weight?: number | null
          goal_body_fat?: number | null
          goal_category?: string
          goal_date?: string | null
          goal_name: string
          goal_performance_value?: number | null
          goal_smm?: number | null
          goal_weight?: number | null
          id?: string
          is_active?: boolean
          performance_direction?: string | null
          performance_metric_name?: string | null
          performance_unit?: string | null
          start_weight?: number | null
          starting_body_fat?: number | null
          starting_performance_value?: number | null
          starting_smm?: number | null
          target_days_per_week?: number
          user_id: string
        }
        Update: {
          change_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          current_body_fat?: number | null
          current_performance_value?: number | null
          current_smm?: number | null
          current_weight?: number | null
          goal_body_fat?: number | null
          goal_category?: string
          goal_date?: string | null
          goal_name?: string
          goal_performance_value?: number | null
          goal_smm?: number | null
          goal_weight?: number | null
          id?: string
          is_active?: boolean
          performance_direction?: string | null
          performance_metric_name?: string | null
          performance_unit?: string | null
          start_weight?: number | null
          starting_body_fat?: number | null
          starting_performance_value?: number | null
          starting_smm?: number | null
          target_days_per_week?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_chat_messages: {
        Row: {
          id: string
          user_id: string
          role: string
          message: string
          scenario: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          message: string
          scenario?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          message?: string
          scenario?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_logs: {
        Row: {
          body_fat: number | null
          created_at: string
          goal_id: string
          id: string
          logged_at: string
          performance_value: number | null
          smm: number | null
          user_id: string
        }
        Insert: {
          body_fat?: number | null
          created_at?: string
          goal_id: string
          id?: string
          logged_at?: string
          performance_value?: number | null
          smm?: number | null
          user_id: string
        }
        Update: {
          body_fat?: number | null
          created_at?: string
          goal_id?: string
          id?: string
          logged_at?: string
          performance_value?: number | null
          smm?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          goal_id: string
          id: string
          is_active: boolean
          removal_reason: string | null
          task_name: string
        }
        Insert: {
          category?: string
          created_at?: string
          goal_id: string
          id?: string
          is_active?: boolean
          removal_reason?: string | null
          task_name: string
        }
        Update: {
          category?: string
          created_at?: string
          goal_id?: string
          id?: string
          is_active?: boolean
          removal_reason?: string | null
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          archive_reason: string | null
          ai_access_enabled: boolean
          ai_access_updated_at: string | null
          auth_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          gender: string | null
          height: number | null
          id: string
          is_active: boolean
          name: string
          phone_number: string | null
          role: string
        }
        Insert: {
          ai_access_enabled?: boolean
          ai_access_updated_at?: string | null
          archive_reason?: string | null
          auth_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          gender?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          name: string
          phone_number?: string | null
          role: string
        }
        Update: {
          ai_access_enabled?: boolean
          ai_access_updated_at?: string | null
          archive_reason?: string | null
          auth_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          gender?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          name?: string
          phone_number?: string | null
          role?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_user_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never
