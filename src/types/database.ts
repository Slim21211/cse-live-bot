export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      contest_submissions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          photo_url: string;
          contest_type: 'child' | 'team' | 'individual';
          telegram_user_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          photo_url: string;
          contest_type: 'child' | 'team' | 'individual';
          telegram_user_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          photo_url?: string;
          contest_type?: 'child' | 'team' | 'individual';
          telegram_user_id?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
