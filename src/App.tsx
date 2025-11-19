import { useEffect } from 'react';
import './App.css';

function App() {
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div className="app">
      <h1>Здесь будет список конкурсных работ для голосования</h1>
    </div>
  );
}

export default App;
