export interface ChildContestSubmission {
  id?: string;
  full_name: string;
  department: string;
  city: string;
  child_name: string;
  child_age: number;
  title: string;
  telegram_user_id?: number;
  file_url: string;
  created_at?: string;
}
export interface TeamContestSubmission {
  id?: string;
  team_name: string;
  department: string;
  city: string;
  participants: string;
  telegram_user_id?: number;
  file_url: string;
  created_at?: string;
}

export interface IndividualContestSubmission {
  id?: string;
  full_name: string;
  department: string;
  city: string;
  title: string;
  telegram_user_id?: number;
  file_url: string;
  created_at?: string;
}
