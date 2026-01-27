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
          price: number | null
          start_date: string | null
          teacher_id: string | null
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
          price?: number | null
          start_date?: string | null
          teacher_id?: string | null
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
          price?: number | null
          start_date?: string | null
          teacher_id?: string | null
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
          uploaded_by: string
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          thumbnail_url?: string | null
          uploaded_by: string
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          thumbnail_url?: string | null
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
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
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
          full_name: string
          id?: string
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
          full_name?: string
          id?: string
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
      subscriptions: {
        Row: {
          class_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          installment_plan_id: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          installment_plan_id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          installment_plan_id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      application_status: "pending" | "approved" | "rejected"
      discount_type: "percentage" | "fixed_amount"
      exercise_category:
        | "reading"
        | "writing"
        | "listening"
        | "speaking"
        | "grammar"
      lesson_status: "scheduled" | "in_progress" | "completed" | "canceled"
      payment_method: "stripe" | "manual" | "cash" | "bank_transfer"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      plan_type: "one_time" | "subscription" | "installment"
      question_type:
        | "multiple_choice"
        | "checkbox"
        | "open_text"
        | "audio_upload"
        | "video_upload"
        | "file_upload"
      subscription_status:
        | "pending"
        | "active"
        | "past_due"
        | "canceled"
        | "paused"
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
      app_role: ["admin", "teacher", "student"],
      application_status: ["pending", "approved", "rejected"],
      discount_type: ["percentage", "fixed_amount"],
      exercise_category: [
        "reading",
        "writing",
        "listening",
        "speaking",
        "grammar",
      ],
      lesson_status: ["scheduled", "in_progress", "completed", "canceled"],
      payment_method: ["stripe", "manual", "cash", "bank_transfer"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      plan_type: ["one_time", "subscription", "installment"],
      question_type: [
        "multiple_choice",
        "checkbox",
        "open_text",
        "audio_upload",
        "video_upload",
        "file_upload",
      ],
      subscription_status: [
        "pending",
        "active",
        "past_due",
        "canceled",
        "paused",
      ],
    },
  },
} as const
