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

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  close: () => void;
  ready: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}
