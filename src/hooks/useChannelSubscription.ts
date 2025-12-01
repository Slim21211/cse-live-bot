import { useState, useEffect } from 'react';

interface SubscriptionState {
  isSubscribed: boolean | null;
  isLoading: boolean;
  error: string | null;
}

export const useChannelSubscription = (telegramUserId?: number) => {
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // 🛑 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Если ID отсутствует,
    // мы устанавливаем isSubscribed: false и isLoading: false.
    // Это говорит App.tsx, что проверку подписки можно не ждать,
    // и он перейдет к проверке "if (!user)", которая покажет экран авторизации.
    if (!telegramUserId) {
      setState({ isSubscribed: false, isLoading: false, error: null });
      return;
    }

    // Сбрасываем state и начинаем загрузку
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isSubscribed: null,
      error: null,
    }));

    const checkSubscription = async () => {
      try {
        const response = await fetch('/api/check-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_user_id: telegramUserId }),
        });

        if (!response.ok) {
          throw new Error('Failed to check subscription');
        }

        const data = await response.json();
        setState({
          isSubscribed: data.isSubscribed,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Subscription check error:', error);
        setState({
          isSubscribed: false,
          isLoading: false,
          error: 'Ошибка проверки подписки',
        });
      }
    };

    checkSubscription();
  }, [telegramUserId]);

  return state;
};
