import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChildContestSubmission } from '../../types/database';
import FileUpload from '../../components/fileUpload/fileUpload';
import {
  uploadFileMultipart,
  logUploadError,
  getConnectionInfo,
} from '../../utils/uploadUtils';
import '../../styles/form.scss';

const Child = () => {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ user: string; log: string } | null>(
    null
  );
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

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
    setUploadProgress(0);
    setIsRetrying(false);

    try {
      if (!file)
        throw { user: 'Пожалуйста, выберите файл', log: 'No file selected.' };

      const fileName = `child_${Date.now()}_${file.name}`;

      // Используем вынесенную функцию загрузки
      const publicUrl = await uploadFileMultipart(file, fileName, {
        onProgress: setUploadProgress,
        onRetrying: setIsRetrying,
      });

      setUploadProgress(100);

      // Сохраняем в Supabase
      const submission: Omit<ChildContestSubmission, 'id' | 'created_at'> = {
        full_name: fullName,
        department,
        city,
        child_name: childName,
        child_age: childAge as number,
        title,
        file_url: publicUrl,
        telegram_user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        is_active: true,
      };

      const { error: insertError } = await supabase
        .from('child_contest')
        .insert(submission);

      if (insertError) {
        const connectionInfo = getConnectionInfo();

        await logUploadError({
          telegram_user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
          file_name: fileName,
          file_size: file.size,
          file_type: file.type,
          error_stage: 'supabase',
          error_message: insertError.message,
          ...connectionInfo,
        });

        throw {
          user: 'Ошибка сохранения данных в базу. Возможно, неверный формат одного из полей.',
          log: `Supabase Insert Error: ${insertError.message}`,
        };
      }

      setSuccess(true);

      setTimeout(() => {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.close();
        }
      }, 2000);
    } catch (err) {
      const customError = err as any;
      if (customError.user && customError.log) {
        setError({ user: customError.user, log: customError.log });
        console.error('Техническая ошибка:', customError.log);
      } else if (err instanceof Error) {
        if (customError.name === 'TypeError') {
          setError({
            user: 'Не удалось установить соединение с сервером. Пожалуйста, проверьте интернет.',
            log: `Initial network error: ${customError.name} - ${customError.message}`,
          });
        } else {
          setError({
            user: 'Произошла непредвиденная ошибка.',
            log: err.message,
          });
        }
        console.error('Непредвиденная ошибка:', err.message);
      } else {
        setError({
          user: 'Произошла непредвиденная ошибка.',
          log: 'Unknown error type.',
        });
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const isFormValid =
    fullName && department && city && childName && childAge && title && file;

  return (
    <div className="contest-form-container">
      <div className="contest-form-wrapper">
        <div className="contest-form-header">
          <h1>🎄 Детский новогодний конкурс</h1>
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
              placeholder="Отдел обучения и развития"
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
            <label htmlFor="childName">
              Имя ребенка <span className="required">*</span>
            </label>
            <input
              id="childName"
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Маша"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="childAge">
              Возраст ребенка <span className="required">*</span>
            </label>
            <input
              id="childAge"
              type="number"
              inputMode="numeric"
              min="1"
              value={childAge}
              onChange={(e) => setChildAge(Number(e.target.value) || '')}
              placeholder="5"
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
              placeholder="Зимняя сказка"
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

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && isRetrying && (
            <div className="warning-message">
              Слабое соединение с интернетом, время загрузки может увеличиться.
            </div>
          )}

          {error && <div className="error-message">{error.user}</div>}

          {success && (
            <div className="success-message">
              ✅ Заявка успешно отправлена! Окно закроется автоматически...
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
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

export default Child;
