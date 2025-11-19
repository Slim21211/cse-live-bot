import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { IndividualContestSubmission } from '../../types/database';
import '../../styles/form.scss';
import FileUpload from '../../components/fileUpload/fileUpload';

const Individual = () => {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setBackgroundColor('#FFFFFF');
      tg.setHeaderColor('#FFFFFF');
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!file) {
        throw new Error('Пожалуйста, выберите файл');
      }

      const fileName = `individual_${Date.now()}_${file.name}`;
      const { data: fileData, error: fileError } = await supabase.storage
        .from('contest-files')
        .upload(fileName, file);

      if (fileError) throw fileError;

      const submission: Omit<IndividualContestSubmission, 'id' | 'created_at'> =
        {
          full_name: fullName,
          department,
          city,
          title,
          file_url: fileData.path,
          telegram_user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        };

      const { error: insertError } = await supabase
        .from('individual_contest')
        .insert(submission);

      if (insertError) throw insertError;

      setSuccess(true);

      setTimeout(() => {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.close();
        }
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contest-form-container">
      <div className="contest-form-wrapper">
        <div className="contest-form-header">
          <h1>⭐ Индивидуальный новогодний конкурс</h1>
          <p className="subtitle">Заполните форму для участия</p>
        </div>

        <form onSubmit={handleSubmit} className="contest-form">
          <div className="form-group">
            <label htmlFor="fullName">
              ФИО <span className="required">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">
              Подразделение <span className="required">*</span>
            </label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Например: Отдел разработки"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">
              Город <span className="required">*</span>
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Москва"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="title">
              Название работы <span className="required">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Моя новогодняя работа"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>
              Файл работы <span className="required">*</span>
            </label>
            <FileUpload file={file} onChange={setFile} disabled={loading} />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              ✅ Заявка успешно отправлена! Окно закроется автоматически...
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="submit-button"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Отправка...
              </>
            ) : (
              'Отправить заявку'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Individual;
