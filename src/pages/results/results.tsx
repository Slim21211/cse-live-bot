import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTelegramUser } from '../../hooks/useTelegramUser';
import type {
  ChildContestSubmission,
  TeamContestSubmission,
  IndividualContestSubmission,
} from '../../types/database';
import FileRenderer from '../../components/fileRenderer/fileRenderer';
import ScrollToTopButton from '../../components/scrollToTopButton/scrollToTopButton';
import '../../styles/results.scss';

type ContestType = 'child' | 'team' | 'individual';

interface SubmissionWithStats {
  submission:
    | ChildContestSubmission
    | TeamContestSubmission
    | IndividualContestSubmission;
  average_rating: number;
  votes_count: number;
  place: number;
}

const Results = () => {
  const { user, isLoading: userLoading } = useTelegramUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<ContestType>('child');
  const [results, setResults] = useState<SubmissionWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Проверяем админа
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

  // Загружаем результаты
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);

      const tableName = `${activeTab}_contest`;
      const votesTable = `${activeTab}_votes`;

      // Получаем все активные работы
      const { data: submissions } = await supabase
        .from(tableName)
        .select('*')
        .eq('is_active', true);

      if (!submissions || submissions.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Получаем статистику голосов для каждой работы
      const submissionsWithStats: SubmissionWithStats[] = await Promise.all(
        submissions.map(async (submission) => {
          const { data: votes } = await supabase
            .from(votesTable)
            .select('rating')
            .eq('submission_id', submission.id);

          const votes_count = votes?.length || 0;
          const average_rating =
            votes && votes_count > 0
              ? votes.reduce((sum, v) => sum + v.rating, 0) / votes_count
              : 0;

          return {
            submission,
            average_rating,
            votes_count,
            place: 0, // Место будет установлено позже
          };
        })
      );

      // Сортируем по средней оценке
      submissionsWithStats.sort((a, b) => {
        if (b.average_rating !== a.average_rating) {
          return b.average_rating - a.average_rating;
        }
        // При равной оценке — по количеству голосов
        return b.votes_count - a.votes_count;
      });

      // Устанавливаем места
      submissionsWithStats.forEach((item, index) => {
        item.place = index + 1;
      });

      // Для детского конкурса берём только топ-10
      const finalResults =
        activeTab === 'child'
          ? submissionsWithStats.slice(0, 10)
          : submissionsWithStats;

      setResults(finalResults);
      setLoading(false);
    };

    fetchResults();
  }, [activeTab]);

  // Функция для получения класса медали
  const getMedalClass = (place: number): string => {
    if (place === 1) return 'gold';
    if (place === 2) return 'silver';
    if (place === 3) return 'bronze';
    return '';
  };

  // Функция для получения эмодзи медали
  const getMedalEmoji = (place: number): string => {
    if (place === 1) return '🥇';
    if (place === 2) return '🥈';
    if (place === 3) return '🥉';
    return '';
  };

  // Рендер информации о работе
  const renderSubmissionInfo = (item: SubmissionWithStats) => {
    const { submission } = item;

    if (activeTab === 'child') {
      const child = submission as ChildContestSubmission;
      return (
        <>
          <h3>{child.title}</h3>
          <p>
            <strong>Автор:</strong> {child.child_name}, {child.child_age} лет
          </p>
          <p>
            <strong>Родитель:</strong> {child.full_name}
          </p>
          <p>
            <strong>Город:</strong> {child.city}
          </p>
        </>
      );
    }

    if (activeTab === 'team') {
      const team = submission as TeamContestSubmission;
      return (
        <>
          <h3>{team.team_name}</h3>
          <p>
            <strong>Участники:</strong> {team.participants}
          </p>
          <p>
            <strong>Город:</strong> {team.city}
          </p>
        </>
      );
    }

    if (activeTab === 'individual') {
      const individual = submission as IndividualContestSubmission;
      return (
        <>
          <h3>{individual.title}</h3>
          <p>
            <strong>Автор:</strong> {individual.full_name}
          </p>
          <p>
            <strong>Город:</strong> {individual.city}
          </p>
        </>
      );
    }
  };

  if (userLoading) {
    return (
      <div className="results-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="results-container">
        <Link to="/" className="back-link">
          ← На главную
        </Link>
        <div className="no-access">
          <div className="icon">🔐</div>
          <h2>Доступ запрещён</h2>
          <p>Результаты будут доступны после завершения голосования.</p>
        </div>
      </div>
    );
  }

  const tabLabels: Record<ContestType, string> = {
    child: '🎄 Детский',
    team: '✨ Командный',
    individual: '⭐ Индивидуальный',
  };

  return (
    <div className="results-container">
      <Link to="/" className="back-link">
        ← На главную
      </Link>

      <div className="results-header">
        <h1>🏆 Результаты голосования</h1>
        <p className="subtitle">Победители новогодних конкурсов</p>

        <div className="results-tabs">
          {(Object.keys(tabLabels) as ContestType[]).map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка результатов...</div>
      ) : results.length === 0 ? (
        <div className="no-results">
          <p>Пока нет результатов голосования</p>
        </div>
      ) : (
        <div className="results-grid">
          {results.map((item) => (
            <div
              key={item.submission.id}
              className={`result-card ${getMedalClass(item.place)}`}
            >
              {/* Место */}
              <div className="place-badge">
                {getMedalEmoji(item.place) || `#${item.place}`}
              </div>

              {/* Медиа */}
              <div className="result-card-media">
                <FileRenderer
                  filePath={item.submission.file_url}
                  rotation={item.submission.rotation || 0}
                />
              </div>

              {/* Информация */}
              <div className="result-card-info">
                {renderSubmissionInfo(item)}
              </div>

              {/* Статистика */}
              <div className="result-card-stats">
                <div className="stat">
                  <span className="stat-label">Средняя оценка</span>
                  <span className="stat-value">
                    ⭐ {item.average_rating.toFixed(2)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Голосов</span>
                  <span className="stat-value">{item.votes_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
};

export default Results;
