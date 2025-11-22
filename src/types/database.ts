export interface ChildContestSubmission {
  id: string;
  full_name: string;
  department: string;
  city: string;
  child_name: string;
  child_age: number;
  title: string;
  telegram_user_id?: number;
  file_url: string;
  is_active: boolean;
  moderated_at?: string;
  moderated_by?: number;
  created_at: string;
}

export interface TeamContestSubmission {
  id: string;
  team_name: string;
  department: string;
  city: string;
  participants: string;
  telegram_user_id?: number;
  file_url: string;
  is_active: boolean;
  moderated_at?: string;
  moderated_by?: number;
  created_at: string;
}

export interface IndividualContestSubmission {
  id: string;
  full_name: string;
  department: string;
  city: string;
  title: string;
  telegram_user_id?: number;
  file_url: string;
  is_active: boolean;
  moderated_at?: string;
  moderated_by?: number;
  created_at: string;
}

export interface Vote {
  id: string;
  submission_id: string;
  telegram_user_id: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  telegram_user_id: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  is_channel_member: boolean;
  channel_check_at?: string;
  created_at: string;
}

export interface ContestSettings {
  id: string;
  contest_type: 'child' | 'team' | 'individual';
  voting_enabled: boolean;
  voting_start_at?: string;
  voting_end_at?: string;
  updated_at: string;
}

export interface SubmissionWithVotes extends ChildContestSubmission {
  average_rating?: number;
  votes_count?: number;
  user_rating?: number; // Оценка текущего пользователя
}
