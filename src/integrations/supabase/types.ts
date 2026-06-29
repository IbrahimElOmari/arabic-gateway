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
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
        }
        Relationships: []
      }
      analytics_daily_stats: {
        Row: {
          active_users: number
          avg_session_duration_seconds: number
          class_id: string | null
          created_at: string
          exercises_completed: number
          exercises_started: number
          id: string
          lessons_attended: number
          level_id: string | null
          new_users: number
          page_views: number
          stat_date: string
          total_sessions: number
          total_users: number
        }
        Insert: {
          active_users?: number
          avg_session_duration_seconds?: number
          class_id?: string | null
          created_at?: string
          exercises_completed?: number
          exercises_started?: number
          id?: string
          lessons_attended?: number
          level_id?: string | null
          new_users?: number
          page_views?: number
          stat_date: string
          total_sessions?: number
          total_users?: number
        }
        Update: {
          active_users?: number
          avg_session_duration_seconds?: number
          class_id?: string | null
          created_at?: string
          exercises_completed?: number
          exercises_started?: number
          id?: string
          lessons_attended?: number
          level_id?: string | null
          new_users?: number
          page_views?: number
          stat_date?: string
          total_sessions?: number
          total_users?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_stats_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_stats_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id: string
          os: string | null
          page_path: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          os?: string | null
          page_path?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          os?: string | null
          page_path?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at: string
          description_ar: string
          description_en: string
          description_nl: string
          icon: string
          id: string
          name_ar: string
          name_en: string
          name_nl: string
          points_value: number
          rarity: Database["public"]["Enums"]["badge_rarity"]
          requirement_value: number | null
        }
        Insert: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          description_ar: string
          description_en: string
          description_nl: string
          icon?: string
          id?: string
          name_ar: string
          name_en: string
          name_nl: string
          points_value?: number
          rarity?: Database["public"]["Enums"]["badge_rarity"]
          requirement_value?: number | null
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          description_ar?: string
          description_en?: string
          description_nl?: string
          icon?: string
          id?: string
          name_ar?: string
          name_en?: string
          name_nl?: string
          points_value?: number
          rarity?: Database["public"]["Enums"]["badge_rarity"]
          requirement_value?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          completed_at: string | null
          enrolled_at: string
          final_score: number | null
          id: string
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          completed_at?: string | null
          enrolled_at?: string
          final_score?: number | null
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string
          completed_at?: string | null
          enrolled_at?: string
          final_score?: number | null
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          level_id: string
          max_students: number | null
          name: string
          paddle_price_id_monthly: string | null
          paddle_price_id_yearly: string | null
          paddle_product_id: string | null
          price: number | null
          price_monthly: number | null
          price_yearly: number | null
          start_date: string | null
          teacher_id: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          level_id: string
          max_students?: number | null
          name: string
          paddle_price_id_monthly?: string | null
          paddle_price_id_yearly?: string | null
          paddle_product_id?: string | null
          price?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          start_date?: string | null
          teacher_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          level_id?: string
          max_students?: number | null
          name?: string
          paddle_price_id_monthly?: string | null
          paddle_price_id_yearly?: string | null
          paddle_product_id?: string | null
          price?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          start_date?: string | null
          teacher_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      cron_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          ended_at: string | null
          id: string
          jobid: number
          jobname: string
          return_message: string | null
          runid: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          jobid: number
          jobname: string
          return_message?: string | null
          runid?: number | null
          started_at?: string | null
          status: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          jobid?: number
          jobname?: string
          return_message?: string | null
          runid?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      curriculum_item_attempts: {
        Row: {
          answer_json: Json | null
          answer_text: string | null
          attempt_number: number
          created_at: string
          feedback_shown: string | null
          id: string
          is_correct: boolean | null
          item_id: string
          max_score: number
          score: number
          student_id: string
          time_spent_sec: number | null
          upload_path: string | null
        }
        Insert: {
          answer_json?: Json | null
          answer_text?: string | null
          attempt_number?: number
          created_at?: string
          feedback_shown?: string | null
          id?: string
          is_correct?: boolean | null
          item_id: string
          max_score?: number
          score?: number
          student_id: string
          time_spent_sec?: number | null
          upload_path?: string | null
        }
        Update: {
          answer_json?: Json | null
          answer_text?: string | null
          attempt_number?: number
          created_at?: string
          feedback_shown?: string | null
          id?: string
          is_correct?: boolean | null
          item_id?: string
          max_score?: number
          score?: number
          student_id?: string
          time_spent_sec?: number | null
          upload_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_item_attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "curriculum_items"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_item_media: {
        Row: {
          alt: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          kind: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          alt?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          kind: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          alt?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          kind?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_item_media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "curriculum_items"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_items: {
        Row: {
          audio_url: string | null
          correct_answer: string
          correct_options: Json | null
          created_at: string
          created_by: string | null
          display_order: number
          exercise_subtype: string
          exercise_type: Database["public"]["Enums"]["curriculum_exercise_type"]
          feedback_correct: string
          feedback_incorrect: string
          id: string
          image_url: string | null
          input_arabic: string
          input_translation_nl: string
          input_transliteration: string
          instruction_nl: string
          is_published: boolean
          item_id: string
          media_alt: string | null
          media_production: Json
          media_url: string | null
          needs_image: boolean | null
          needs_ns_audio: boolean | null
          needs_student_recording: boolean | null
          options: Json
          points: number
          question: string
          reference_media: string
          review_flag: string
          skill: string
          strict_tashkeel: boolean
          unit_code: string
          updated_at: string
          week: number
        }
        Insert: {
          audio_url?: string | null
          correct_answer?: string
          correct_options?: Json | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          exercise_subtype?: string
          exercise_type: Database["public"]["Enums"]["curriculum_exercise_type"]
          feedback_correct?: string
          feedback_incorrect?: string
          id?: string
          image_url?: string | null
          input_arabic?: string
          input_translation_nl?: string
          input_transliteration?: string
          instruction_nl?: string
          is_published?: boolean
          item_id: string
          media_alt?: string | null
          media_production?: Json
          media_url?: string | null
          needs_image?: boolean | null
          needs_ns_audio?: boolean | null
          needs_student_recording?: boolean | null
          options?: Json
          points?: number
          question?: string
          reference_media?: string
          review_flag?: string
          skill: string
          strict_tashkeel?: boolean
          unit_code: string
          updated_at?: string
          week: number
        }
        Update: {
          audio_url?: string | null
          correct_answer?: string
          correct_options?: Json | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          exercise_subtype?: string
          exercise_type?: Database["public"]["Enums"]["curriculum_exercise_type"]
          feedback_correct?: string
          feedback_incorrect?: string
          id?: string
          image_url?: string | null
          input_arabic?: string
          input_translation_nl?: string
          input_transliteration?: string
          instruction_nl?: string
          is_published?: boolean
          item_id?: string
          media_alt?: string | null
          media_production?: Json
          media_url?: string | null
          needs_image?: boolean | null
          needs_ns_audio?: boolean | null
          needs_student_recording?: boolean | null
          options?: Json
          points?: number
          question?: string
          reference_media?: string
          review_flag?: string
          skill?: string
          strict_tashkeel?: boolean
          unit_code?: string
          updated_at?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_items_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["code"]
          },
        ]
      }
      curriculum_progress: {
        Row: {
          created_at: string
          id: string
          items_completed: number
          items_correct: number
          last_activity_at: string
          student_id: string
          total_points: number
          unit_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_completed?: number
          items_correct?: number
          last_activity_at?: string
          student_id: string
          total_points?: number
          unit_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items_completed?: number
          items_correct?: number
          last_activity_at?: string
          student_id?: string
          total_points?: number
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_progress_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["code"]
          },
        ]
      }
      curriculum_units: {
        Row: {
          cefr_from: string
          cefr_to: string
          code: string
          created_at: string
          description_nl: string
          display_order: number
          id: string
          title_ar: string
          title_en: string
          title_nl: string
          updated_at: string
          week_end: number | null
          week_start: number | null
        }
        Insert: {
          cefr_from?: string
          cefr_to?: string
          code: string
          created_at?: string
          description_nl?: string
          display_order: number
          id?: string
          title_ar?: string
          title_en?: string
          title_nl?: string
          updated_at?: string
          week_end?: number | null
          week_start?: number | null
        }
        Update: {
          cefr_from?: string
          cefr_to?: string
          code?: string
          created_at?: string
          description_nl?: string
          display_order?: number
          id?: string
          title_ar?: string
          title_en?: string
          title_nl?: string
          updated_at?: string
          week_end?: number | null
          week_start?: number | null
        }
        Relationships: []
      }
      data_retention_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          processed_at: string | null
          retention_end_date: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          processed_at?: string | null
          retention_end_date?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          processed_at?: string | null
          retention_end_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          class_id: string | null
          code: string
          created_at: string
          created_by: string
          current_uses: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          class_id?: string | null
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          class_id?: string | null
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          creator_id: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          reminder_minutes: number[] | null
          start_time: string
          target_id: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          end_time: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number[] | null
          start_time: string
          target_id?: string | null
          target_type: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number[] | null
          start_time?: string
          target_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_attempts: {
        Row: {
          attempt_number: number
          exercise_id: string
          id: string
          passed: boolean | null
          started_at: string
          student_id: string
          submitted_at: string | null
          time_spent_seconds: number
          total_score: number | null
        }
        Insert: {
          attempt_number?: number
          exercise_id: string
          id?: string
          passed?: boolean | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
          time_spent_seconds?: number
          total_score?: number | null
        }
        Update: {
          attempt_number?: number
          exercise_id?: string
          id?: string
          passed?: boolean | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          time_spent_seconds?: number
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          name: Database["public"]["Enums"]["exercise_category"]
          name_ar: string
          name_en: string
          name_nl: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon: string
          id?: string
          name: Database["public"]["Enums"]["exercise_category"]
          name_ar: string
          name_en: string
          name_nl: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name?: Database["public"]["Enums"]["exercise_category"]
          name_ar?: string
          name_en?: string
          name_nl?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category_id: string
          class_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          instructions: Json | null
          is_published: boolean
          max_attempts: number
          passing_score: number
          release_date: string
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          class_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: Json | null
          is_published?: boolean
          max_attempts?: number
          passing_score?: number
          release_date?: string
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          class_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: Json | null
          is_published?: boolean
          max_attempts?: number
          passing_score?: number
          release_date?: string
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          paddle_price_id: string | null
          paddle_product_id: string | null
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          paddle_price_id?: string | null
          paddle_product_id?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          paddle_price_id?: string | null
          paddle_product_id?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      faq_articles: {
        Row: {
          category_id: string
          content_ar: string
          content_en: string
          content_nl: string
          created_at: string
          created_by: string
          display_order: number
          helpful_count: number
          id: string
          is_published: boolean
          not_helpful_count: number
          title_ar: string
          title_en: string
          title_nl: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category_id: string
          content_ar: string
          content_en: string
          content_nl: string
          created_at?: string
          created_by: string
          display_order?: number
          helpful_count?: number
          id?: string
          is_published?: boolean
          not_helpful_count?: number
          title_ar: string
          title_en: string
          title_nl: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category_id?: string
          content_ar?: string
          content_en?: string
          content_nl?: string
          created_at?: string
          created_by?: string
          display_order?: number
          helpful_count?: number
          id?: string
          is_published?: boolean
          not_helpful_count?: number
          title_ar?: string
          title_en?: string
          title_nl?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "faq_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          name_nl: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          name_nl: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          name_nl?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          enabled_for_roles: string[]
          key: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          enabled_for_roles?: string[]
          key: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          enabled_for_roles?: string[]
          key?: string
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          unique_users: number
          usage_count: number
          usage_date: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          unique_users?: number
          usage_count?: number
          usage_date: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          unique_users?: number
          usage_count?: number
          usage_date?: string
        }
        Relationships: []
      }
      feedback_rubrics: {
        Row: {
          created_at: string
          criteria: Json
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      final_exam_attempts: {
        Row: {
          attempt_number: number
          final_exam_id: string
          id: string
          passed: boolean | null
          promoted_to_level_id: string | null
          started_at: string
          student_id: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          attempt_number?: number
          final_exam_id: string
          id?: string
          passed?: boolean | null
          promoted_to_level_id?: string | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          attempt_number?: number
          final_exam_id?: string
          id?: string
          passed?: boolean | null
          promoted_to_level_id?: string | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "final_exam_attempts_final_exam_id_fkey"
            columns: ["final_exam_id"]
            isOneToOne: false
            referencedRelation: "final_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_exam_attempts_promoted_to_level_id_fkey"
            columns: ["promoted_to_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      final_exam_questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          display_order: number
          final_exam_id: string
          id: string
          options: Json | null
          points: number
          question_text: Json
          type: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          display_order?: number
          final_exam_id: string
          id?: string
          options?: Json | null
          points?: number
          question_text: Json
          type?: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          display_order?: number
          final_exam_id?: string
          id?: string
          options?: Json | null
          points?: number
          question_text?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_exam_questions_final_exam_id_fkey"
            columns: ["final_exam_id"]
            isOneToOne: false
            referencedRelation: "final_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      final_exams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          level_id: string
          max_attempts: number
          passing_score: number
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_id: string
          max_attempts?: number
          passing_score?: number
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_id?: string
          max_attempts?: number
          passing_score?: number
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_exams_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          likes_count: number
          room_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          likes_count?: number
          room_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          likes_count?: number
          room_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "forum_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_rooms: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          name: string
          name_ar: string
          name_en: string
          name_nl: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name: string
          name_ar: string
          name_en: string
          name_nl: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name?: string
          name_ar?: string
          name_en?: string
          name_nl?: string
        }
        Relationships: []
      }
      installment_plans: {
        Row: {
          created_at: string
          description: Json | null
          id: string
          interval_months: number
          is_active: boolean | null
          name: string
          total_installments: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json | null
          id?: string
          interval_months?: number
          is_active?: boolean | null
          name: string
          total_installments: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json | null
          id?: string
          interval_months?: number
          is_active?: boolean | null
          name?: string
          total_installments?: number
          updated_at?: string
        }
        Relationships: []
      }
      leaderboards: {
        Row: {
          class_id: string | null
          id: string
          level_id: string | null
          period: Database["public"]["Enums"]["leaderboard_period"]
          period_start: string
          points: number
          rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          id?: string
          level_id?: string | null
          period: Database["public"]["Enums"]["leaderboard_period"]
          period_start: string
          points?: number
          rank?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          id?: string
          level_id?: string | null
          period?: Database["public"]["Enums"]["leaderboard_period"]
          period_start?: string
          points?: number
          rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_recommendations: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          metadata: Json
          priority: number
          reason: string
          source: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          metadata?: Json
          priority?: number
          reason: string
          source?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          metadata?: Json
          priority?: number
          reason?: string
          source?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_attendance: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          joined_at: string | null
          lesson_id: string
          notes: string | null
          student_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          lesson_id: string
          notes?: string | null
          student_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          lesson_id?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_materials: {
        Row: {
          created_at: string
          display_order: number
          file_type: string
          file_url: string
          id: string
          lesson_id: string
          recording_id: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_type: string
          file_url: string
          id?: string
          lesson_id: string
          recording_id?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string
          recording_id?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_materials_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "lesson_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          lesson_id: string
          thumbnail_url: string | null
          transcript: string | null
          uploaded_by: string
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          thumbnail_url?: string | null
          transcript?: string | null
          uploaded_by: string
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          uploaded_by?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_themes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          name_ar: string
          name_en: string
          name_nl: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          name_ar: string
          name_en: string
          name_nl: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          name_ar?: string
          name_en?: string
          name_nl?: string
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          id: string
          meet_link: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["lesson_status"]
          theme_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meet_link?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["lesson_status"]
          theme_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meet_link?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          theme_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "lesson_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          name_ar: string
          name_en: string
          name_nl: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          name_ar: string
          name_en: string
          name_nl: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          name_ar?: string
          name_en?: string
          name_nl?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          message: string
          metadata: Json
          related_id: string | null
          related_table: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          message: string
          metadata?: Json
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_tests: {
        Row: {
          assessed_by: string | null
          assessment_notes: string | null
          assigned_level_id: string | null
          created_at: string
          id: string
          meet_link: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["placement_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assessed_by?: string | null
          assessment_notes?: string | null
          assigned_level_id?: string | null
          created_at?: string
          id?: string
          meet_link?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["placement_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assessed_by?: string | null
          assessment_notes?: string | null
          assigned_level_id?: string | null
          created_at?: string
          id?: string
          meet_link?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["placement_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_tests_assigned_level_id_fkey"
            columns: ["assigned_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          action: Database["public"]["Enums"]["points_action"]
          created_at: string
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["points_action"]
          created_at?: string
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["points_action"]
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      private_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "private_chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      private_chat_participants: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "private_chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      private_chat_rooms: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chat_rooms_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          email_notifications: boolean
          exercise_notifications: boolean
          full_name: string
          id: string
          lesson_reminders: boolean
          phone: string | null
          preferred_language: string | null
          preferred_theme: string | null
          study_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          email_notifications?: boolean
          exercise_notifications?: boolean
          full_name: string
          id?: string
          lesson_reminders?: boolean
          phone?: string | null
          preferred_language?: string | null
          preferred_theme?: string | null
          study_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          email_notifications?: boolean
          exercise_notifications?: boolean
          full_name?: string
          id?: string
          lesson_reminders?: boolean
          phone?: string | null
          preferred_language?: string | null
          preferred_theme?: string | null
          study_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          display_order: number
          exercise_id: string
          explanation: string | null
          id: string
          media_url: string | null
          options: Json | null
          points: number
          question_text: Json
          time_limit_seconds: number | null
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          display_order?: number
          exercise_id: string
          explanation?: string | null
          id?: string
          media_url?: string | null
          options?: Json | null
          points?: number
          question_text: Json
          time_limit_seconds?: number | null
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          display_order?: number
          exercise_id?: string
          explanation?: string | null
          id?: string
          media_url?: string | null
          options?: Json | null
          points?: number
          question_text?: Json
          time_limit_seconds?: number | null
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          action: string
          id: string
          identifier: string
          last_refill: string
          tokens: number
          updated_at: string
        }
        Insert: {
          action: string
          id?: string
          identifier: string
          last_refill?: string
          tokens: number
          updated_at?: string
        }
        Update: {
          action?: string
          id?: string
          identifier?: string
          last_refill?: string
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_analytics: {
        Row: {
          avg_score: number | null
          created_at: string
          exercises_attempted: number
          exercises_passed: number
          id: string
          lessons_attended: number
          streak_days: number
          strongest_category: string | null
          study_time_minutes: number
          user_id: string
          weakest_category: string | null
          week_start: string
        }
        Insert: {
          avg_score?: number | null
          created_at?: string
          exercises_attempted?: number
          exercises_passed?: number
          id?: string
          lessons_attended?: number
          streak_days?: number
          strongest_category?: string | null
          study_time_minutes?: number
          user_id: string
          weakest_category?: string | null
          week_start: string
        }
        Update: {
          avg_score?: number | null
          created_at?: string
          exercises_attempted?: number
          exercises_passed?: number
          id?: string
          lessons_attended?: number
          streak_days?: number
          strongest_category?: string | null
          study_time_minutes?: number
          user_id?: string
          weakest_category?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_analytics_strongest_category_fkey"
            columns: ["strongest_category"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_analytics_weakest_category_fkey"
            columns: ["weakest_category"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          answer_data: Json | null
          answer_text: string | null
          exercise_attempt_id: string
          feedback: string | null
          file_url: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          answer_data?: Json | null
          answer_text?: string | null
          exercise_attempt_id: string
          feedback?: string | null
          file_url?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          answer_data?: Json | null
          answer_text?: string | null
          exercise_attempt_id?: string
          feedback?: string | null
          file_url?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_exercise_attempt_id_fkey"
            columns: ["exercise_attempt_id"]
            isOneToOne: false
            referencedRelation: "exercise_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          average_score: number
          category_id: string
          class_id: string
          exercises_completed: number
          exercises_total: number
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          average_score?: number
          category_id: string
          class_id: string
          exercises_completed?: number
          exercises_total?: number
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          average_score?: number
          category_id?: string
          class_id?: string
          exercises_completed?: number
          exercises_total?: number
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_feedback: {
        Row: {
          created_at: string
          curriculum_attempt_id: string | null
          feedback_text: string
          id: string
          rubric_id: string | null
          rubric_scores: Json
          status: string
          student_answer_id: string | null
          student_id: string
          teacher_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          curriculum_attempt_id?: string | null
          feedback_text: string
          id?: string
          rubric_id?: string | null
          rubric_scores?: Json
          status?: string
          student_answer_id?: string | null
          student_id: string
          teacher_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          curriculum_attempt_id?: string | null
          feedback_text?: string
          id?: string
          rubric_id?: string | null
          rubric_scores?: Json
          status?: string
          student_answer_id?: string | null
          student_id?: string
          teacher_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_feedback_curriculum_attempt_id_fkey"
            columns: ["curriculum_attempt_id"]
            isOneToOne: false
            referencedRelation: "curriculum_item_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          class_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          installment_plan_id: string | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_id: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          class_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          installment_plan_id?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          class_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          installment_plan_id?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_applications: {
        Row: {
          created_at: string
          experience: string | null
          id: string
          qualifications: string | null
          requested_levels: string[] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          experience?: string | null
          id?: string
          qualifications?: string | null
          requested_levels?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          experience?: string | null
          id?: string
          qualifications?: string | null
          requested_levels?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: []
      }
      ticket_label_assignments: {
        Row: {
          label_id: string
          ticket_id: string
        }
        Insert: {
          label_id: string
          ticket_id: string
        }
        Update: {
          label_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "ticket_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_label_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_labels: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_attempts: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          method: Database["public"]["Enums"]["two_factor_method"]
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          method: Database["public"]["Enums"]["two_factor_method"]
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          method?: Database["public"]["Enums"]["two_factor_method"]
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          is_displayed: boolean
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          is_displayed?: boolean
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          is_displayed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_state: {
        Row: {
          completed_at: string | null
          completed_steps: string[]
          created_at: string
          dismissed: boolean
          dismissed_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          dismissed?: boolean
          dismissed_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          dismissed?: boolean
          dismissed_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          current_streak: number
          exercises_completed: number
          id: string
          last_activity_date: string | null
          lessons_attended: number
          longest_streak: number
          perfect_scores: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          exercises_completed?: number
          id?: string
          last_activity_date?: string | null
          lessons_attended?: number
          longest_streak?: number
          perfect_scores?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          exercises_completed?: number
          id?: string
          last_activity_date?: string | null
          lessons_attended?: number
          longest_streak?: number
          perfect_scores?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_two_factor: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean
          last_used_at: string | null
          method: Database["public"]["Enums"]["two_factor_method"]
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_used_at?: string | null
          method?: Database["public"]["Enums"]["two_factor_method"]
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_used_at?: string | null
          method?: Database["public"]["Enums"]["two_factor_method"]
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users_pending_deletion: {
        Row: {
          created_at: string
          deletion_scheduled_at: string
          id: string
          status: string
          unenrolled_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deletion_scheduled_at: string
          id?: string
          status?: string
          unenrolled_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deletion_scheduled_at?: string
          id?: string
          status?: string
          unenrolled_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      curriculum_progress_by_skill: {
        Row: {
          items_attempted: number | null
          items_correct: number | null
          points_total: number | null
          skill: string | null
          student_id: string | null
          unit_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_items_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      _seed_vault_secret: {
        Args: { p_name: string; p_value: string }
        Returns: string
      }
      acknowledge_cron_alert: {
        Args: { p_alert_id: string }
        Returns: undefined
      }
      anonymize_user_data: { Args: { p_user_id: string }; Returns: undefined }
      award_points: {
        Args: {
          p_action: Database["public"]["Enums"]["points_action"]
          p_points: number
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: number
      }
      can_access_curriculum: { Args: { _user_id: string }; Returns: boolean }
      cancel_user_deletion: { Args: { p_user_id: string }; Returns: undefined }
      cleanup_rate_limit_buckets: { Args: never; Returns: number }
      cm_grade_answer: {
        Args: {
          p_answer_json: Json
          p_answer_text: string
          p_correct_answer: string
          p_correct_options: Json
          p_options: Json
          p_strict: boolean
          p_type: string
        }
        Returns: boolean
      }
      cm_norm: { Args: { s: string; strict: boolean }; Returns: string }
      consume_rate_limit: {
        Args: {
          p_action: string
          p_capacity: number
          p_cost?: number
          p_identifier: string
          p_refill_per_sec: number
        }
        Returns: Json
      }
      count_unassigned_students: { Args: never; Returns: number }
      create_notification_event: {
        Args: {
          p_channel: string
          p_event_type: string
          p_message: string
          p_metadata?: Json
          p_related_id?: string
          p_related_table?: string
          p_scheduled_for?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      create_private_chat_room: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      get_cron_job_status: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          last_run_duration_ms: number
          last_run_finished_at: string
          last_run_return_message: string
          last_run_started_at: string
          last_run_status: string
          schedule: string
        }[]
      }
      get_upcoming_deletions: {
        Args: { days_ahead?: number }
        Returns: {
          days_until_deletion: number
          deletion_scheduled_at: string
          email: string
          full_name: string
          unenrolled_at: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_with_context: { Args: { _user_id: string }; Returns: Json }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_discount_usage: { Args: { p_code: string }; Returns: undefined }
      is_teacher_of: { Args: { _student: string }; Returns: boolean }
      mark_user_for_deletion: {
        Args: { p_unenrolled_at?: string; p_user_id: string }
        Returns: undefined
      }
      private_chat_can_add_participant: {
        Args: { _actor_id: string; _room_id: string }
        Returns: boolean
      }
      private_chat_is_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      process_data_retention: {
        Args: never
        Returns: {
          admin_notifications: Json
          processed_count: number
        }[]
      }
      promote_student_to_next_level: {
        Args: {
          p_current_level_id: string
          p_exam_attempt_id: string
          p_student_id: string
        }
        Returns: string
      }
      start_direct_chat: { Args: { _other: string }; Returns: string }
      submit_curriculum_attempt: {
        Args: {
          p_answer_json?: Json
          p_answer_text?: string
          p_item_id: string
          p_time_spent_sec?: number
          p_upload_path?: string
        }
        Returns: Json
      }
      update_user_streak: { Args: { p_user_id: string }; Returns: number }
      user_can_access_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      analytics_event_type:
        | "page_view"
        | "exercise_start"
        | "exercise_complete"
        | "lesson_join"
        | "lesson_leave"
        | "video_play"
        | "video_pause"
        | "video_complete"
        | "download"
        | "search"
        | "login"
        | "logout"
        | "signup"
        | "error"
        | "feature_use"
      app_role: "admin" | "teacher" | "student"
      application_status: "pending" | "approved" | "rejected"
      badge_rarity: "common" | "rare" | "epic" | "legendary"
      badge_type:
        | "first_exercise"
        | "first_lesson"
        | "streak_7"
        | "streak_30"
        | "streak_100"
        | "perfect_score"
        | "speed_learner"
        | "night_owl"
        | "early_bird"
        | "community_helper"
        | "level_complete"
        | "all_categories"
        | "dedication"
      curriculum_exercise_type:
        | "meerkeuze"
        | "meerdere-antwoorden"
        | "open-tekst"
        | "gatentekst"
        | "bestand-upload"
        | "audio-opname"
        | "rangschikken"
        | "koppelen"
      discount_type: "percentage" | "fixed_amount"
      exercise_category:
        | "reading"
        | "writing"
        | "listening"
        | "speaking"
        | "grammar"
      leaderboard_period: "weekly" | "monthly" | "all_time"
      lesson_status: "scheduled" | "in_progress" | "completed" | "canceled"
      payment_method: "stripe" | "manual" | "cash" | "bank_transfer"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      placement_status: "pending" | "scheduled" | "completed" | "cancelled"
      plan_type: "one_time" | "subscription" | "installment"
      points_action:
        | "exercise_complete"
        | "exercise_perfect"
        | "lesson_attend"
        | "streak_bonus"
        | "badge_earned"
        | "forum_post"
        | "forum_help"
        | "daily_login"
        | "level_complete"
      question_type:
        | "multiple_choice"
        | "checkbox"
        | "open_text"
        | "audio_upload"
        | "video_upload"
        | "file_upload"
        | "ordering"
      subscription_status:
        | "pending"
        | "active"
        | "past_due"
        | "canceled"
        | "paused"
      ticket_category:
        | "technical"
        | "billing"
        | "content"
        | "account"
        | "feedback"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_response"
        | "resolved"
        | "closed"
      two_factor_method: "totp" | "sms" | "email"
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
    Enums: {
      analytics_event_type: [
        "page_view",
        "exercise_start",
        "exercise_complete",
        "lesson_join",
        "lesson_leave",
        "video_play",
        "video_pause",
        "video_complete",
        "download",
        "search",
        "login",
        "logout",
        "signup",
        "error",
        "feature_use",
      ],
      app_role: ["admin", "teacher", "student"],
      application_status: ["pending", "approved", "rejected"],
      badge_rarity: ["common", "rare", "epic", "legendary"],
      badge_type: [
        "first_exercise",
        "first_lesson",
        "streak_7",
        "streak_30",
        "streak_100",
        "perfect_score",
        "speed_learner",
        "night_owl",
        "early_bird",
        "community_helper",
        "level_complete",
        "all_categories",
        "dedication",
      ],
      curriculum_exercise_type: [
        "meerkeuze",
        "meerdere-antwoorden",
        "open-tekst",
        "gatentekst",
        "bestand-upload",
        "audio-opname",
        "rangschikken",
        "koppelen",
      ],
      discount_type: ["percentage", "fixed_amount"],
      exercise_category: [
        "reading",
        "writing",
        "listening",
        "speaking",
        "grammar",
      ],
      leaderboard_period: ["weekly", "monthly", "all_time"],
      lesson_status: ["scheduled", "in_progress", "completed", "canceled"],
      payment_method: ["stripe", "manual", "cash", "bank_transfer"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      placement_status: ["pending", "scheduled", "completed", "cancelled"],
      plan_type: ["one_time", "subscription", "installment"],
      points_action: [
        "exercise_complete",
        "exercise_perfect",
        "lesson_attend",
        "streak_bonus",
        "badge_earned",
        "forum_post",
        "forum_help",
        "daily_login",
        "level_complete",
      ],
      question_type: [
        "multiple_choice",
        "checkbox",
        "open_text",
        "audio_upload",
        "video_upload",
        "file_upload",
        "ordering",
      ],
      subscription_status: [
        "pending",
        "active",
        "past_due",
        "canceled",
        "paused",
      ],
      ticket_category: [
        "technical",
        "billing",
        "content",
        "account",
        "feedback",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_response",
        "resolved",
        "closed",
      ],
      two_factor_method: ["totp", "sms", "email"],
    },
  },
} as const
