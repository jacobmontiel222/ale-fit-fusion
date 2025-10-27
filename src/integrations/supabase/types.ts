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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_steps: {
        Row: {
          calories_burned: number | null
          created_at: string
          date: string
          distance_km: number | null
          id: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          date: string
          distance_km?: number | null
          id?: string
          steps: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          id?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_water_intake: {
        Row: {
          created_at: string
          date: string
          id: string
          ml_consumed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          ml_consumed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ml_consumed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_weight: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      exercise_history: {
        Row: {
          created_at: string
          exercise_name: string
          goal_achieved: boolean | null
          id: string
          notes: string | null
          session_id: string
          sets_data: Json
          suggested_reps_max: number | null
          suggested_reps_min: number | null
          suggested_weight: number | null
          technique_good: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          goal_achieved?: boolean | null
          id?: string
          notes?: string | null
          session_id: string
          sets_data: Json
          suggested_reps_max?: number | null
          suggested_reps_min?: number | null
          suggested_weight?: number | null
          technique_good?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          goal_achieved?: boolean | null
          id?: string
          notes?: string | null
          session_id?: string
          sets_data?: Json
          suggested_reps_max?: number | null
          suggested_reps_min?: number | null
          suggested_weight?: number | null
          technique_good?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number
          carbs: number
          category: string
          created_at: string | null
          fat: number
          fiber: number | null
          id: string
          last_updated: string | null
          micronutrients: Json | null
          name: string
          protein: number
          search_terms: string[] | null
          serving_size: number
          serving_unit: string
          sugar: number | null
          tags: Json | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories: number
          carbs: number
          category: string
          created_at?: string | null
          fat: number
          fiber?: number | null
          id: string
          last_updated?: string | null
          micronutrients?: Json | null
          name: string
          protein: number
          search_terms?: string[] | null
          serving_size?: number
          serving_unit?: string
          sugar?: number | null
          tags?: Json | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string | null
          fat?: number
          fiber?: number | null
          id?: string
          last_updated?: string | null
          micronutrients?: Json | null
          name?: string
          protein?: number
          search_terms?: string[] | null
          serving_size?: number
          serving_unit?: string
          sugar?: number | null
          tags?: Json | null
        }
        Relationships: []
      }
      gym_routines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gym_sets: {
        Row: {
          created_at: string | null
          date: string | null
          exercise_id: string
          id: string
          performed_at: string | null
          reps: number | null
          set_number: number
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          exercise_id: string
          id?: string
          performed_at?: string | null
          reps?: number | null
          set_number: number
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          exercise_id?: string
          id?: string
          performed_at?: string | null
          reps?: number | null
          set_number?: number
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      meal_entries: {
        Row: {
          amount: number
          barcode: string | null
          brand: string | null
          calories: number
          carbs: number
          created_at: string
          date: string
          entry_method: string
          fat: number
          food_name: string
          id: string
          meal_type: string
          micronutrients: Json | null
          protein: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          brand?: string | null
          calories: number
          carbs: number
          created_at?: string
          date: string
          entry_method: string
          fat: number
          food_name: string
          id?: string
          meal_type: string
          micronutrients?: Json | null
          protein: number
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs?: number
          created_at?: string
          date?: string
          entry_method?: string
          fat?: number
          food_name?: string
          id?: string
          meal_type?: string
          micronutrients?: Json | null
          protein?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          calories_goal: number
          carbs_goal: number
          created_at: string
          fat_goal: number
          id: string
          protein_goal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_goal?: number
          carbs_goal?: number
          created_at?: string
          fat_goal?: number
          id?: string
          protein_goal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_goal?: number
          carbs_goal?: number
          created_at?: string
          fat_goal?: number
          id?: string
          protein_goal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_icon: string | null
          avatar_url: string | null
          created_at: string
          current_weight: number | null
          height: number | null
          id: string
          name: string
          target_weight: number | null
          updated_at: string
        }
        Insert: {
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string
          current_weight?: number | null
          height?: number | null
          id: string
          name: string
          target_weight?: number | null
          updated_at?: string
        }
        Update: {
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string
          current_weight?: number | null
          height?: number | null
          id?: string
          name?: string
          target_weight?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          amount: number
          calories: number
          carbs: number
          created_at: string
          fat: number
          food_name: string
          id: string
          order_index: number
          protein: number
          recipe_id: string
          unit: string
        }
        Insert: {
          amount: number
          calories: number
          carbs: number
          created_at?: string
          fat: number
          food_name: string
          id?: string
          order_index?: number
          protein: number
          recipe_id: string
          unit: string
        }
        Update: {
          amount?: number
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          food_name?: string
          id?: string
          order_index?: number
          protein?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          notes: string | null
          order_index: number
          reps: number
          rest_seconds: number | null
          routine_id: string
          sets: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          notes?: string | null
          order_index?: number
          reps: number
          rest_seconds?: number | null
          routine_id: string
          sets: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number | null
          routine_id?: string
          sets?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "gym_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          exercise_type: string
          id: string
          order_index: number
          planned_sets: Json | null
          reps_max: number
          reps_min: number
          template_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          exercise_type?: string
          id?: string
          order_index?: number
          planned_sets?: Json | null
          reps_max?: number
          reps_min?: number
          template_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          exercise_type?: string
          id?: string
          order_index?: number
          planned_sets?: Json | null
          reps_max?: number
          reps_min?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_rest_day: boolean
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_rest_day?: boolean
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_rest_day?: boolean
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          notes: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
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
      [_ in never]: never
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
