import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useTelegramUser } from './hooks/useTelegramUser';
import './App.css';

function App() {
  const { user, isLoading } = useTelegramUser();
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

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <h1>🎄 Новогодние конкурсы</h1>

        {user && <p className="welcome">Привет, {user.first_name}!</p>}

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
          <Link to="/admin" className="admin-link">
            🛠 Админ-панель
          </Link>
        )}

        {user && <p className="user-id">ID: {user.id}</p>}
      </div>
    </div>
  );
}

export default App;
