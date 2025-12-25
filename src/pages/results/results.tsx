import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
  weighted_score: number;
  votes_count: number;
  effective_weight: number;
  total_votes: number;
  place: number;
}

const plural = (
  number: number,
  one: string,
  few: string,
  many: string
): string => {
  const mod10 = number % 10;
  const mod100 = number % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
};

const Results = () => {
  const [activeTab, setActiveTab] = useState<ContestType>('child');
  const [results, setResults] = useState<SubmissionWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Загружаем результаты
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);

      const tableName = `${activeTab}_contest`;
      const votesTable = `${activeTab}_votes`;

      // SQL запрос для взвешенного подсчета
      const { data: weightedResults, error } = await supabase.rpc(
        'get_weighted_results',
        {
          p_contest_type: activeTab,
        }
      );

      if (error || !weightedResults) {
        console.error('Error fetching weighted results:', error);

        // Fallback на старый метод если функция не работает
        const { data: submissions } = await supabase
          .from(tableName)
          .select('*')
          .eq('is_active', true);

        if (!submissions || submissions.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        const submissionsWithStats: SubmissionWithStats[] = await Promise.all(
          submissions.map(async (submission) => {
            const { data: votes } = await supabase
              .from(votesTable)
              .select('rating')
              .eq('submission_id', submission.id);

            const votes_count = votes?.length || 0;
            const weighted_score =
              votes && votes_count > 0
                ? votes.reduce((sum, v) => sum + v.rating, 0) / votes_count
                : 0;

            const { data: uniqueVoters } = await supabase
              .from(votesTable)
              .select('telegram_user_id')
              .eq('submission_id', submission.id);

            const total_votes = uniqueVoters
              ? new Set(uniqueVoters.map((v: any) => v.telegram_user_id)).size
              : 0;

            return {
              submission,
              weighted_score,
              votes_count,
              effective_weight: votes_count,
              total_votes,
              place: 0,
            };
          })
        );

        submissionsWithStats.sort(
          (a, b) => b.weighted_score - a.weighted_score
        );
        submissionsWithStats.forEach((item, index) => {
          item.place = index + 1;
        });

        const limits: Record<ContestType, number | undefined> = {
          child: 7,
          individual: undefined, // 🆕 Показываем все
          team: undefined, // 🆕 Показываем все
        };

        const finalResults = limits[activeTab]
          ? submissionsWithStats.slice(0, limits[activeTab])
          : submissionsWithStats;

        setResults(finalResults);
        setLoading(false);
        return;
      }

      // Обрабатываем результаты из RPC функции
      const resultsWithSubmissions: SubmissionWithStats[] = await Promise.all(
        weightedResults.map(async (result: any) => {
          const { data: submission } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', result.submission_id)
            .single();

          return {
            submission: submission!,
            weighted_score: result.weighted_score,
            votes_count: result.votes,
            effective_weight: result.effective_weight,
            total_votes: result.total_votes,
            place: 0,
          };
        })
      );

      // Устанавливаем места
      resultsWithSubmissions.forEach((item, index) => {
        item.place = index + 1;
      });

      // 🆕 Ограничения по количеству работ
      const limits: Record<ContestType, number | undefined> = {
        child: 7, // Топ-7 в детском
        individual: undefined, // Все работы
        team: undefined, // Все работы
      };

      const finalResults = limits[activeTab]
        ? resultsWithSubmissions.slice(0, limits[activeTab])
        : resultsWithSubmissions;

      setResults(finalResults);
      setLoading(false);
    };

    fetchResults();
  }, [activeTab]);

  // 🆕 Функция для получения класса медали (только золото для 1 места)
  const getMedalClass = (place: number): string => {
    if (place === 1) return 'gold';
    return '';
  };

  // 🆕 Функция для получения badge (медаль, подарок или номер)
  const getPlaceBadge = (place: number, contestType: ContestType): string => {
    // Первое место — всегда золотая медаль
    if (place === 1) return '🥇';

    // Детский конкурс: 2-7 место = подарок
    if (contestType === 'child' && place >= 2 && place <= 7) {
      return '🎁';
    }

    // Индивидуальный и командный: 2-4 место = подарок
    if (
      (contestType === 'individual' || contestType === 'team') &&
      place >= 2 &&
      place <= 4
    ) {
      return '🎁';
    }

    // Остальные — просто номер места
    return `#${place}`;
  };

  // Рендер информации о работе
  const renderSubmissionInfo = (item: SubmissionWithStats) => {
    const { submission } = item;

    if (activeTab === 'child') {
      const child = submission as ChildContestSubmission;
      const ageWord = plural(child.child_age, 'год', 'года', 'лет');

      return (
        <>
          <h3>{child.title}</h3>
          <p>
            <strong>Автор:</strong> {child.child_name}, {child.child_age}{' '}
            {ageWord}
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

  const tabLabels: Record<ContestType, string> = {
    child: '🎄 Детский',
    team: '✨ Командный',
    individual: '⭐ Индивидуальный',
  };

  return (
    <div className="results-container">
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
              {/* 🆕 Место (медаль, подарок или номер) */}
              <div className="place-badge">
                {getPlaceBadge(item.place, activeTab)}
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
                  <span className="stat-label">Итоговый результат</span>
                  <span className="stat-value">
                    ⭐ {item.weighted_score.toFixed(3)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Всего голосов</span>
                  <span className="stat-value">{item.total_votes}</span>
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
