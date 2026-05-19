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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements_v2: {
        Row: {
          earned_at: string
          key: string
          pack_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          earned_at?: string
          key: string
          pack_id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          earned_at?: string
          key?: string
          pack_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      active_session_v2: {
        Row: {
          answers: Json
          mode: string
          pack_id: string
          path_node_id: string | null
          question_index: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          mode: string
          pack_id: string
          path_node_id?: string | null
          question_index?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          mode?: string
          pack_id?: string
          path_node_id?: string | null
          question_index?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmetics: {
        Row: {
          unlocked: string[]
          updated_at: string
          user_id: string
          wearing: string | null
        }
        Insert: {
          unlocked?: string[]
          updated_at?: string
          user_id: string
          wearing?: string | null
        }
        Update: {
          unlocked?: string[]
          updated_at?: string
          user_id?: string
          wearing?: string | null
        }
        Relationships: []
      }
      cosmetics_v2: {
        Row: {
          unlocked: string[]
          updated_at: string
          user_id: string
          wearing: string | null
        }
        Insert: {
          unlocked?: string[]
          updated_at?: string
          user_id: string
          wearing?: string | null
        }
        Update: {
          unlocked?: string[]
          updated_at?: string
          user_id?: string
          wearing?: string | null
        }
        Relationships: []
      }
      daily: {
        Row: {
          claimed: boolean
          day: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          day: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          day?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_v2: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          date: string
          pack_id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          date: string
          pack_id: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          date?: string
          pack_id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hearts: {
        Row: {
          hearts: number
          last_lost_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          hearts?: number
          last_lost_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          hearts?: number
          last_lost_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hearts_v2: {
        Row: {
          count: number
          last_regen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          last_regen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          last_regen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      laurels: {
        Row: {
          earned_at: string
          pack_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          earned_at?: string
          pack_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          earned_at?: string
          pack_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mastery_v2: {
        Row: {
          best_score: number
          correct: number
          last_played_at: string
          pack_id: string
          seen: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_score?: number
          correct?: number
          last_played_at?: string
          pack_id: string
          seen?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_score?: number
          correct?: number
          last_played_at?: string
          pack_id?: string
          seen?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      path_progress: {
        Row: {
          completed_at: string
          node_id: string
          pack_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          node_id: string
          pack_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          node_id?: string
          pack_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      path_progress_v2: {
        Row: {
          completed_at: string
          node_id: string
          pack_id: string
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          node_id: string
          pack_id: string
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          node_id?: string
          pack_id?: string
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          leaderboard_opt_in: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          leaderboard_opt_in?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          leaderboard_opt_in?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      profiles_v2: {
        Row: {
          level: number
          updated_at: string
          user_id: string
          username: string | null
          xp: number
        }
        Insert: {
          level?: number
          updated_at?: string
          user_id: string
          username?: string | null
          xp?: number
        }
        Update: {
          level?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      settings_v2: {
        Row: {
          daily_reminder_enabled: boolean
          daily_reminder_hour: number
          haptics_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_reminder_enabled?: boolean
          daily_reminder_hour?: number
          haptics_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_reminder_enabled?: boolean
          daily_reminder_hour?: number
          haptics_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spaced_repetition_v2: {
        Row: {
          difficulty: number
          item_id: string
          last_seen_at: string
          next_due_at: string
          pack_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          difficulty?: number
          item_id: string
          last_seen_at?: string
          next_due_at?: string
          pack_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          difficulty?: number
          item_id?: string
          last_seen_at?: string
          next_due_at?: string
          pack_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stats: {
        Row: {
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_all_time: {
        Row: {
          display_name: string | null
          level: number | null
          questions_answered: number | null
          sessions_count: number | null
          streak_days: number | null
          updated_at: string | null
          xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
      update_my_username: { Args: { new_username: string }; Returns: string }
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
