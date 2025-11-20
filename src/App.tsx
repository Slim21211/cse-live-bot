import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { ChildContestSubmission } from './types/database';
import FileRenderer from './components/fileRenderer/fileRenderer';
import './App.css';
import styles from './styles/galery.module.scss';

function App() {
  const [submissions, setSubmissions] = useState<ChildContestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from('child_contest')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError('Не удалось загрузить работы: ' + error.message);
      } else {
        setSubmissions(data || []);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  if (loading)
    return (
      <div className={styles.container}>
        <p>Загрузка...</p>
      </div>
    );
  if (error)
    return (
      <div className={styles.container}>
        <p className="errorMessage">Ошибка {error}</p>
      </div>
    );

  return (
    <div className="app">
      <div className={styles.container}>
        <h1>Работы Детского Новогоднего Конкурса</h1>
        <p className={styles.subtitle}>Голосование скоро будет доступно!</p>

        {submissions.length === 0 ? (
          <p>Пока нет работ.</p>
        ) : (
          <div className={styles.grid}>
            {submissions.map((s) => (
              <div key={s.id} className={styles.card}>
                <div className={styles.preview}>
                  <FileRenderer filePath={s.file_url} />
                </div>
                <div className={styles.info}>
                  <h2 className={styles.title}>{s.title}</h2>
                  <p>
                    <strong>Ребёнок:</strong> {s.child_name}
                  </p>
                  <p>
                    <strong>Родитель:</strong> {s.full_name}
                  </p>
                  <p>
                    <strong>Подразделение:</strong> {s.department}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
