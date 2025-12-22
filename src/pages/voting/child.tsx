import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTelegramUser } from '../../hooks/useTelegramUser';
import type { ChildContestSubmission } from '../../types/database';
import FileRenderer from '../../components/fileRenderer/fileRenderer';
import '../../styles/voting.scss';
import ScrollToTopButton from '../../components/scrollToTopButton/scrollToTopButton';

interface SubmissionWithRating extends ChildContestSubmission {
  userRating: number;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const ChildVoting = () => {
  const { user, isLoading: userLoading } = useTelegramUser();
  const [submissions, setSubmissions] = useState<SubmissionWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingEnabled, setVotingEnabled] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    const fetchData = async () => {
      try {
        const { data: settings } = await supabase
          .from('contest_settings')
          .select('voting_enabled')
          .eq('contest_type', 'child')
          .single();

        const votingEnabled = settings?.voting_enabled ?? true;
        setVotingEnabled(votingEnabled);

        const { data: works, error: worksError } = await supabase
          .from('child_contest')
          .select('*')
          .eq('is_active', true);

        if (worksError) throw worksError;

        let userVotes: Record<string, number> = {};

        if (user) {
          const { data: votes } = await supabase
            .from('child_votes')
            .select('submission_id, rating')
            .eq('telegram_user_id', user.id);

          if (votes) {
            userVotes = votes.reduce((acc, v) => {
              acc[v.submission_id] = v.rating;
              return acc;
            }, {} as Record<string, number>);
          }
        }

        const submissionsWithRating = (works || []).map((work) => ({
          ...work,
          userRating: userVotes[work.id] || 1,
        }));

        const shuffledSubmissions = shuffleArray(submissionsWithRating);
        setSubmissions(shuffledSubmissions);

        // 🆕 ИСПРАВЛЕННЫЙ БАТЧИНГ с разбивкой на чанки
        if (user && votingEnabled && works && works.length > 0) {
          const newVotes = works
            .filter((work) => !userVotes[work.id])
            .map((work) => ({
              submission_id: work.id,
              telegram_user_id: user.id,
              rating: 1,
              updated_at: new Date().toISOString(),
            }));

          if (newVotes.length > 0) {
            // Разбиваем на чанки по 50 для надежности
            const chunkSize = 50;
            for (let i = 0; i < newVotes.length; i += chunkSize) {
              const chunk = newVotes.slice(i, i + chunkSize);

              try {
                const { error } = await supabase
                  .from('child_votes')
                  .upsert(chunk, {
                    onConflict: 'submission_id,telegram_user_id',
                  });

                if (error) {
                  console.error(`Batch chunk ${i} error:`, error);
                }
              } catch (err) {
                console.error(`Batch chunk ${i} exception:`, err);
              }

              // Небольшая задержка между чанками
              if (i + chunkSize < newVotes.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userLoading]);

  const handleRating = async (submissionId: string, rating: number) => {
    if (!user || !votingEnabled) return;

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId ? { ...s, userRating: rating } : s
      )
    );

    try {
      const { error } = await supabase.from('child_votes').upsert(
        {
          submission_id: submissionId,
          telegram_user_id: user.id,
          rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'submission_id,telegram_user_id' }
      );

      if (error) throw error;
    } catch (err) {
      console.error('Vote error:', err);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, userRating: s.userRating } : s
        )
      );
    }
  };

  if (userLoading || loading) {
    return (
      <div className="voting-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!votingEnabled) {
    return (
      <div className="voting-container">
        <Link to="/" className="back-link">
          ← Назад
        </Link>
        <div className="voting-disabled">
          <div className="icon">🔒</div>
          <h2>Голосование завершено</h2>
          <p>Спасибо за участие! Результаты будут объявлены позже.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="voting-container">
        <Link to="/" className="back-link">
          ← Назад
        </Link>
        <div className="voting-disabled">
          <div className="icon">🔐</div>
          <h2>Требуется авторизация</h2>
          <p>Для голосования откройте эту страницу через Telegram бота.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-container">
      <Link to="/" className="back-link">
        ← Назад к конкурсам
      </Link>

      <div className="voting-header">
        <h1>🎄 Детский конкурс</h1>
        <p className="subtitle">Оцените работы от 1 до 5 звёзд</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {submissions.length === 0 ? (
        <div className="no-submissions">
          <p>Пока нет работ для голосования</p>
        </div>
      ) : (
        <div className="voting-grid">
          {submissions.map((submission) => (
            <div key={submission.id} className="voting-card">
              <div className="voting-card-media">
                <FileRenderer
                  filePath={submission.file_url}
                  rotation={submission.rotation || 0}
                />
              </div>

              <div className="voting-card-info">
                <h3>{submission.title}</h3>
                <p>
                  <strong>Автор:</strong> {submission.child_name}
                </p>
                <p>
                  <strong>Возраст:</strong> {submission.child_age}
                </p>
              </div>

              <div className="voting-card-rating">
                <span className="rating-label">Ваша оценка:</span>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-button ${
                        star <= submission.userRating
                          ? 'star-filled'
                          : 'star-empty'
                      }`}
                      onClick={() => handleRating(submission.id, star)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="voting-footer">Спасибо за участие в голосовании!</div>
      <ScrollToTopButton />
    </div>
  );
};

export default ChildVoting;
