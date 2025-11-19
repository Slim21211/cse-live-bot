export type ContestType = 'child' | 'team' | 'individual';

export interface ContestSubmission {
  id?: string;
  name: string;
  description?: string;
  photo_url: string;
  contest_type: ContestType;
  telegram_user_id?: number;
  created_at?: string;
}
