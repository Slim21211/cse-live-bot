import { useEffect } from 'react';
import './App.css';

function App() {
  // Вычисляем contestType один раз, не используя state
  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div className="app">
      <h1>Форма для участия в конкурсе скоро появится</h1>
    </div>
  );
}

export default App;
