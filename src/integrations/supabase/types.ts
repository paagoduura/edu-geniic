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
      achievements: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          color: string | null
          earned_at: string | null
          icon: string | null
          id: string
          student_id: string
          tier: string | null
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          color?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          student_id: string
          tier?: string | null
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          color?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          student_id?: string
          tier?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          student_id: string
          subject?: Database["public"]["Enums"]["subject_type"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          student_id?: string
          subject?: Database["public"]["Enums"]["subject_type"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          target_class_id: string | null
          target_class_level: string | null
          target_type: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          target_class_id?: string | null
          target_class_level?: string | null
          target_type?: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          target_class_id?: string | null
          target_class_level?: string | null
          target_type?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          lesson_id: string | null
          max_score: number | null
          subject: Database["public"]["Enums"]["subject_type"]
          target_class_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          lesson_id?: string | null
          max_score?: number | null
          subject: Database["public"]["Enums"]["subject_type"]
          target_class_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_level?: Database["public"]["Enums"]["class_level"]
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          lesson_id?: string | null
          max_score?: number | null
          subject?: Database["public"]["Enums"]["subject_type"]
          target_class_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          language: string
          level: string
          solved_problems: number
          student_id: string
          topic_title: string
          total_problems: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          language: string
          level: string
          solved_problems?: number
          student_id: string
          topic_title: string
          total_problems?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          language?: string
          level?: string
          solved_problems?: number
          student_id?: string
          topic_title?: string
          total_problems?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          subject: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          subject?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          subject?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          answers: Json | null
          competition_id: string
          completed_at: string | null
          id: string
          joined_at: string
          school_name: string | null
          score: number | null
          time_spent: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          competition_id: string
          completed_at?: string | null
          id?: string
          joined_at?: string
          school_name?: string | null
          score?: number | null
          time_spent?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          competition_id?: string
          completed_at?: string | null
          id?: string
          joined_at?: string
          school_name?: string | null
          score?: number | null
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          class_level: string | null
          competition_type: string
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          end_time: string | null
          id: string
          questions: Json | null
          start_time: string | null
          status: string
          subject: string
          time_limit_minutes: number
          title: string
          updated_at: string
          winning_participant_id: string | null
          winning_school: string | null
        }
        Insert: {
          class_level?: string | null
          competition_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: string
          end_time?: string | null
          id?: string
          questions?: Json | null
          start_time?: string | null
          status?: string
          subject: string
          time_limit_minutes?: number
          title: string
          updated_at?: string
          winning_participant_id?: string | null
          winning_school?: string | null
        }
        Update: {
          class_level?: string | null
          competition_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          end_time?: string | null
          id?: string
          questions?: Json | null
          start_time?: string | null
          status?: string
          subject?: string
          time_limit_minutes?: number
          title?: string
          updated_at?: string
          winning_participant_id?: string | null
          winning_school?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string
          created_at: string
          id: string
          rating: number | null
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          rating?: number | null
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          rating?: number | null
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: []
      }
      group_quiz_submissions: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          quiz_id: string
          score: number | null
          student_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          id?: string
          quiz_id: string
          score?: number | null
          student_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          quiz_id?: string
          score?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "group_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      group_quizzes: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          group_id: string
          id: string
          is_active: boolean | null
          questions: Json
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          questions: Json
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_quizzes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          goal_description: string | null
          goal_title: string
          id: string
          is_completed: boolean | null
          progress: number | null
          student_id: string
          target_date: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          goal_description?: string | null
          goal_title: string
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          student_id: string
          target_date?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          goal_description?: string | null
          goal_title?: string
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          student_id?: string
          target_date?: string | null
        }
        Relationships: []
      }
      learning_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          class_level: Database["public"]["Enums"]["class_level"]
          content: Json
          created_at: string
          created_by: string | null
          examples: Json | null
          exercises: Json | null
          id: string
          is_approved: boolean | null
          objectives: string[] | null
          subject: Database["public"]["Enums"]["subject_type"]
          title: string
          updated_at: string
        }
        Insert: {
          class_level: Database["public"]["Enums"]["class_level"]
          content: Json
          created_at?: string
          created_by?: string | null
          examples?: Json | null
          exercises?: Json | null
          id?: string
          is_approved?: boolean | null
          objectives?: string[] | null
          subject: Database["public"]["Enums"]["subject_type"]
          title: string
          updated_at?: string
        }
        Update: {
          class_level?: Database["public"]["Enums"]["class_level"]
          content?: Json
          created_at?: string
          created_by?: string | null
          examples?: Json | null
          exercises?: Json | null
          id?: string
          is_approved?: boolean | null
          objectives?: string[] | null
          subject?: Database["public"]["Enums"]["subject_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      parent_child_links: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          card_number: string | null
          created_at: string
          currency: string
          id: string
          payment_reference: string | null
          plan: string
          raw_response: Json | null
          response_code: string | null
          response_description: string | null
          status: string
          txn_ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_number?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_reference?: string | null
          plan: string
          raw_response?: Json | null
          response_code?: string | null
          response_description?: string | null
          status?: string
          txn_ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_number?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_reference?: string | null
          plan?: string
          raw_response?: Json | null
          response_code?: string | null
          response_description?: string | null
          status?: string
          txn_ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance: {
        Row: {
          attempts: number | null
          created_at: string
          feedback: string | null
          id: string
          score: number
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"]
          topic: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          feedback?: string | null
          id?: string
          score: number
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"]
          topic: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number
          student_id?: string
          subject?: Database["public"]["Enums"]["subject_type"]
          topic?: string
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points_amount: number
          student_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points_amount: number
          student_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points_amount?: number
          student_id?: string
          transaction_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_level: Database["public"]["Enums"]["class_level"] | null
          created_at: string
          full_name: string
          id: string
          preferred_language: string | null
          reward_points: number | null
          school_name: string | null
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          class_level?: Database["public"]["Enums"]["class_level"] | null
          created_at?: string
          full_name: string
          id?: string
          preferred_language?: string | null
          reward_points?: number | null
          school_name?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          class_level?: Database["public"]["Enums"]["class_level"] | null
          created_at?: string
          full_name?: string
          id?: string
          preferred_language?: string | null
          reward_points?: number | null
          school_name?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          difficulty: string | null
          id: string
          lesson_id: string | null
          questions: Json
          score: number | null
          student_id: string
          time_spent: number | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          lesson_id?: string | null
          questions: Json
          score?: number | null
          student_id: string
          time_spent?: number | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          lesson_id?: string | null
          questions?: Json
          score?: number | null
          student_id?: string
          time_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      school_departments: {
        Row: {
          created_at: string
          description: string | null
          head_of_department: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          document_url: string
          id: string
          school_id: string
          status: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          document_url: string
          id?: string
          school_id: string
          status?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          school_id?: string
          status?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          department: string | null
          id: string
          is_active: boolean | null
          joined_at: string
          position: string | null
          school_id: string
          school_role: string
          user_id: string
        }
        Insert: {
          department?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          position?: string | null
          school_id: string
          school_role?: string
          user_id: string
        }
        Update: {
          department?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          position?: string | null
          school_id?: string
          school_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_timetable: {
        Row: {
          class_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          school_id: string
          start_time: string
          subject: string
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          school_id: string
          start_time: string
          subject: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          school_id?: string
          start_time?: string
          subject?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          founded_year: number | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          motto: string | null
          name: string
          phone: string | null
          registration_number: string | null
          school_type: string
          state: string | null
          updated_at: string
          verification_status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          founded_year?: number | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          motto?: string | null
          name: string
          phone?: string | null
          registration_number?: string | null
          school_type?: string
          state?: string | null
          updated_at?: string
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          founded_year?: number | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          phone?: string | null
          registration_number?: string | null
          school_type?: string
          state?: string | null
          updated_at?: string
          verification_status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      shared_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          group_id: string
          id: string
          is_collaborative: boolean | null
          last_edited_by: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          group_id: string
          id?: string
          is_collaborative?: boolean | null
          last_edited_by?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          group_id?: string
          id?: string
          is_collaborative?: boolean | null
          last_edited_by?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      student_challenge_progress: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          points_earned: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          points_earned?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          points_earned?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          max_members: number | null
          name: string
          subject: Database["public"]["Enums"]["subject_type"]
          updated_at: string | null
        }
        Insert: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          name: string
          subject: Database["public"]["Enums"]["subject_type"]
          updated_at?: string | null
        }
        Update: {
          class_level?: Database["public"]["Enums"]["class_level"]
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          name?: string
          subject?: Database["public"]["Enums"]["subject_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          session_end: string | null
          session_start: string | null
          student_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          student_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          student_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      study_time_limits: {
        Row: {
          child_id: string
          created_at: string | null
          daily_limit_minutes: number
          id: string
          is_active: boolean | null
          parent_id: string
          updated_at: string | null
          weekly_limit_minutes: number | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          daily_limit_minutes: number
          id?: string
          is_active?: boolean | null
          parent_id: string
          updated_at?: string | null
          weekly_limit_minutes?: number | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          daily_limit_minutes?: number
          id?: string
          is_active?: boolean | null
          parent_id?: string
          updated_at?: string | null
          weekly_limit_minutes?: number | null
        }
        Relationships: []
      }
      teacher_class_students: {
        Row: {
          class_id: string
          id: string
          is_active: boolean
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          academic_year: string
          class_level: Database["public"]["Enums"]["class_level"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          section: string | null
          subject: Database["public"]["Enums"]["subject_type"] | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          class_level: Database["public"]["Enums"]["class_level"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          section?: string | null
          subject?: Database["public"]["Enums"]["subject_type"] | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_level?: Database["public"]["Enums"]["class_level"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          section?: string | null
          subject?: Database["public"]["Enums"]["subject_type"] | null
          teacher_id?: string
          updated_at?: string
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
      weekly_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          description: string
          end_date: string
          id: string
          is_active: boolean | null
          reward_points: number
          start_date: string
          target_value: number
          title: string
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          description: string
          end_date: string
          id?: string
          is_active?: boolean | null
          reward_points: number
          start_date?: string
          target_value: number
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          reward_points?: number
          start_date?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_student_id: { Args: never; Returns: string }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_school_admin: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      owns_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      update_learning_streak: { Args: { user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "student" | "teacher" | "parent" | "admin" | "school_admin"
      class_level:
        | "primary_1"
        | "primary_2"
        | "primary_3"
        | "primary_4"
        | "primary_5"
        | "primary_6"
        | "jss_1"
        | "jss_2"
        | "jss_3"
        | "ss_1"
        | "ss_2"
        | "ss_3"
      subject_type:
        | "mathematics"
        | "english"
        | "science"
        | "social_studies"
        | "yoruba"
        | "hausa"
        | "igbo"
        | "french"
        | "basic_science"
        | "basic_technology"
        | "home_economics"
        | "civic_education"
        | "agriculture"
        | "business_studies"
        | "physics"
        | "chemistry"
        | "biology"
        | "economics"
        | "geography"
        | "literature"
        | "government"
        | "crk"
        | "irk"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["student", "teacher", "parent", "admin", "school_admin"],
      class_level: [
        "primary_1",
        "primary_2",
        "primary_3",
        "primary_4",
        "primary_5",
        "primary_6",
        "jss_1",
        "jss_2",
        "jss_3",
        "ss_1",
        "ss_2",
        "ss_3",
      ],
      subject_type: [
        "mathematics",
        "english",
        "science",
        "social_studies",
        "yoruba",
        "hausa",
        "igbo",
        "french",
        "basic_science",
        "basic_technology",
        "home_economics",
        "civic_education",
        "agriculture",
        "business_studies",
        "physics",
        "chemistry",
        "biology",
        "economics",
        "geography",
        "literature",
        "government",
        "crk",
        "irk",
      ],
    },
  },
} as const
