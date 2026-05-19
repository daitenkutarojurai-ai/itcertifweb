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
      user_achievements: {
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
      user_active_session: {
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
      user_cosmetics: {
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
      user_daily: {
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
      user_hearts: {
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
      user_mastery: {
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
      user_path_progress: {
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
      user_profile: {
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
      user_settings: {
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
      user_spaced_repetition: {
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
    }
    Views: {
      [_ in never]: never
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
