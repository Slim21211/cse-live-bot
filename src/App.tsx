import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useTelegramUser } from './hooks/useTelegramUser';
import { useChannelSubscription } from './hooks/useChannelSubscription';
import './App.css';

const CHANNEL_LINK = 'https://t.me/+lN_1vtO95K4xZmUy';

function App() {
  const { user, isLoading: userLoading } = useTelegramUser();
  const { isSubscribed, isLoading: subscriptionLoading } =
    useChannelSubscription(user?.id);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.setBackgroundColor('#FFFFFF');
      window.Telegram.WebApp.setHeaderColor('#FFFFFF');
    }
  }, []);

  // Проверяем, админ ли пользователь
  useEffect(() => {
    if (!user) return;

    const checkAdmin = async () => {
      const { data } = await supabase
        .from('admins')
        .select('id')
        .eq('telegram_user_id', user.id)
        .single();

      setIsAdmin(!!data);
    };

    checkAdmin();
  }, [user]);

  if (userLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          {' '}
          {/* 🆕 Новый класс */}
          <div className="loading-icon">⏳</div> {/* 🆕 Иконка */}
          <p className="loading-text">Загрузка данных пользователя...</p>{' '}
          {/* 🆕 Текст */}
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован через Telegram
  if (!user) {
    return (
      <div className="app">
        <div className="container">
          <div className="auth-required">
            <div className="icon">🔐</div>
            <h2>Требуется авторизация</h2>
            <p>Откройте эту страницу через Telegram бота</p>
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="auth-required">
            <div className="loading-icon">🔍</div>
            <p className="loading-text">
              Проверка подписки на канал КСЭ Live...
            </p>{' '}
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь не подписан на канал (и не админ)
  if (!isSubscribed && !isAdmin) {
    return (
      <div className="app">
        <div className="container">
          <div className="subscription-required">
            <div className="icon">📢</div>
            <h2>Подпишитесь на наш канал</h2>
            <p>
              Для участия в голосовании необходимо подписаться на канал КСЭ Live
            </p>
            <a
              href={CHANNEL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-button"
            >
              Подписаться на канал
            </a>
            <p className="hint">
              После подписки вернитесь сюда и обновите страницу
            </p>
          </div>
          {user && <p className="user-id">ID: {user.id}</p>}
        </div>
      </div>
    );
  }

  // Главный экран с конкурсами (для подписанных пользователей)
  return (
    <div className="app">
      <div className="container">
        <h1>🎄 Новогодние конкурсы</h1>

        <p className="welcome">Привет, {user.first_name}!</p>

        <p className="subtitle">Выбери конкурс для голосования:</p>

        <div className="contests-grid">
          <Link to="/vote/child" className="contest-card">
            <span className="contest-icon">🎄</span>
            <h2>Детский конкурс</h2>
            <p>Голосуй за лучшие детские работы</p>
          </Link>

          <Link to="/vote/team" className="contest-card">
            <span className="contest-icon">✨</span>
            <h2>Командный конкурс</h2>
            <p>Поддержи свою команду</p>
          </Link>

          <Link to="/vote/individual" className="contest-card">
            <span className="contest-icon">⭐</span>
            <h2>Индивидуальный конкурс</h2>
            <p>Выбери лучшую работу</p>
          </Link>
        </div>

        {/* Кнопка админ-панели — только для админов */}
        {isAdmin && (
          <>
            <Link to="/admin" className="admin-link">
              🛠 Админ-панель
            </Link>
            <Link to="/results" className="admin-link results-link">
              🏆 Результаты голосования
            </Link>
          </>
        )}

        <p className="user-id">ID: {user.id}</p>
      </div>
    </div>
  );
}

export default App;
