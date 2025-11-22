import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTelegramUser } from '../../hooks/useTelegramUser';
import FileRenderer from '../../components/fileRenderer/fileRenderer';
import '../../styles/admin.scss';

type ContestType = 'child' | 'team' | 'individual';

interface Submission {
  id: string;
  title: string;
  full_name: string;
  department: string;
  city: string;
  child_name?: string;
  file_url: string;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const { user, isLoading: userLoading } = useTelegramUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<ContestType>('child');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingEnabled, setVotingEnabled] = useState<
    Record<ContestType, boolean>
  >({
    child: true,
    team: true,
    individual: true,
  });
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: string | null;
  }>({
    show: false,
    id: null,
  });

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

  // Загружаем данные
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setLoading(true);

      // Настройки голосования
      const { data: settings } = await supabase
        .from('contest_settings')
        .select('contest_type, voting_enabled');

      if (settings) {
        const enabled: Record<ContestType, boolean> = {
          child: true,
          team: true,
          individual: true,
        };
        settings.forEach((s) => {
          enabled[s.contest_type as ContestType] = s.voting_enabled;
        });
        setVotingEnabled(enabled);
      }

      // Работы
      const tableName = `${activeTab}_contest`;
      const { data: works } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      setSubmissions(works || []);
      setLoading(false);
    };

    fetchData();
  }, [isAdmin, activeTab]);

  const toggleVoting = async () => {
    const newValue = !votingEnabled[activeTab];

    const { error } = await supabase
      .from('contest_settings')
      .update({
        voting_enabled: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('contest_type', activeTab);

    if (!error) {
      setVotingEnabled((prev) => ({ ...prev, [activeTab]: newValue }));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id || !user) return;

    const tableName = `${activeTab}_contest`;

    console.log('Скрываем работу:', deleteModal.id, 'из таблицы:', tableName);

    const { data, error } = await supabase
      .from(tableName)
      .update({
        is_active: false,
        moderated_at: new Date().toISOString(),
        moderated_by: user.id,
      })
      .eq('id', deleteModal.id)
      .select(); // Добавляем select чтобы увидеть результат

    console.log('Результат update:', { data, error });

    if (error) {
      console.error('Ошибка при скрытии:', error);
      alert('Ошибка: ' + error.message);
    } else {
      // Обновляем локальный state только если update прошёл успешно
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === deleteModal.id ? { ...s, is_active: false } : s
        )
      );
    }

    setDeleteModal({ show: false, id: null });
  };

  const handleRestore = async (id: string) => {
    const tableName = `${activeTab}_contest`;

    const { error } = await supabase
      .from(tableName)
      .update({ is_active: true })
      .eq('id', id);

    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: true } : s))
      );
    }
  };

  if (userLoading) {
    return (
      <div className="admin-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="admin-container">
        <Link to="/" className="back-link">
          ← На главную
        </Link>
        <div className="no-access">
          <div className="icon">🔐</div>
          <h2>Доступ запрещён</h2>
          <p>У вас нет прав администратора.</p>
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
    <div className="admin-container">
      <Link to="/" className="back-link">
        ← На главную
      </Link>

      <div className="admin-header">
        <h1>🛠 Админ-панель</h1>

        <div className="admin-tabs">
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

      <div className="admin-controls">
        <div className="voting-toggle">
          <span>Голосование:</span>
          <button
            className={`toggle-button ${
              votingEnabled[activeTab] ? 'enabled' : 'disabled'
            }`}
            onClick={toggleVoting}
          >
            {votingEnabled[activeTab] ? '✓ Включено' : '✗ Выключено'}
          </button>
        </div>
        <span>Всего работ: {submissions.length}</span>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="admin-grid">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="admin-card"
              style={{ opacity: submission.is_active ? 1 : 0.5 }}
            >
              <div className="admin-card-media">
                <FileRenderer filePath={submission.file_url} />
              </div>

              <div className="admin-card-info">
                <h3>{submission.title}</h3>
                <p>
                  <strong>Автор:</strong> {submission.full_name}
                </p>
                {submission.child_name && (
                  <p>
                    <strong>Ребёнок:</strong> {submission.child_name}
                  </p>
                )}
                <p>
                  <strong>Подразделение:</strong> {submission.department}
                </p>
                <p>
                  <strong>Город:</strong> {submission.city}
                </p>
                <div className="admin-card-stats">
                  <span>
                    📅{' '}
                    {new Date(submission.created_at).toLocaleDateString('ru')}
                  </span>
                  <span>{submission.is_active ? '✓ Активна' : '✗ Скрыта'}</span>
                </div>
              </div>

              <div className="admin-card-actions">
                {submission.is_active ? (
                  <button
                    className="delete-button"
                    onClick={() =>
                      setDeleteModal({ show: true, id: submission.id })
                    }
                  >
                    🗑 Скрыть
                  </button>
                ) : (
                  <button
                    className="restore-button"
                    onClick={() => handleRestore(submission.id)}
                  >
                    ↩ Восстановить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteModal.show && (
        <div className="confirm-modal">
          <div className="confirm-modal-content">
            <h3>Скрыть работу?</h3>
            <p>
              Работа будет скрыта из голосования. Вы сможете восстановить её
              позже.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="cancel-button"
                onClick={() => setDeleteModal({ show: false, id: null })}
              >
                Отмена
              </button>
              <button className="confirm-delete-button" onClick={handleDelete}>
                Скрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
