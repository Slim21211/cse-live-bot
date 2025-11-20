import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChildContestSubmission } from '../../types/database';
import FileUpload from '../../components/fileUpload/fileUpload';
import '../../styles/form.scss';

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 МБ на часть
const BACKEND_URL = 'https://justify-grill-manor-adaptation.trycloudflare.com'; // Ваш сервер

// 🚀 НОВЫЕ КОНСТАНТЫ ДЛЯ УСТОЙЧИВОСТИ
const MAX_RETRIES = 10;
const GLOBAL_TIMEOUT_MS = 60000; // Общий лимит времени на загрузку части: 60 секунд
const FETCH_TIMEOUT_MS = 10000; // 10 секунд ожидания ответа

const Child = () => {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [childName, setChildName] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ user: string; log: string } | null>(
    null
  );
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // ⚠️ НОВОЕ: Стейт для индикации нестабильности сети
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

  const uploadFileMultipart = async (file: File, fileName: string) => {
    const fileSize = file.size;
    const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

    // 1. Начинаем multipart upload
    let startRes: Response;
    try {
      startRes = await fetch(`${BACKEND_URL}/upload-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, contentType: file.type }),
      });
    } catch (e) {
      throw {
        user: 'Не удалось установить соединение с сервером для начала загрузки. Проверьте интернет.',
        log: `Network error during upload-start: ${e}`,
      };
    }

    if (!startRes.ok) {
      const errorText = await startRes.text();
      throw {
        user: 'Ошибка при подготовке места для файла на сервере. Пожалуйста, попробуйте позже.',
        log: `Server error during upload-start: ${startRes.status} - ${errorText}`,
      };
    }

    const { uploadId, key } = await startRes.json();

    // 2. Загружаем каждую часть
    const parts: { PartNumber: number; ETag: string }[] = [];

    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;

      const url = `${BACKEND_URL}/upload-part?filename=${encodeURIComponent(
        key
      )}&uploadId=${uploadId}&partNumber=${partNumber}`;

      let attempt = 0;
      let success = false;
      let etag = '';
      const startTime = Date.now(); // Время начала загрузки части

      // 🚀 Цикл повторных попыток
      while (attempt < MAX_RETRIES && !success) {
        attempt++;
        const elapsedTime = Date.now() - startTime;

        // ⚠️ Проверка общего лимита времени (60 секунд)
        if (elapsedTime > GLOBAL_TIMEOUT_MS) {
          throw {
            user: 'Не удалось завершить загрузку файла из-за продолжительных проблем с соединением. Пожалуйста, проверьте стабильность интернета и повторите попытку.',
            log: `Part ${partNumber} failed: Global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded.`,
          };
        }

        try {
          const uploadRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk,
          });

          if (!uploadRes.ok) {
            if (uploadRes.status < 500) {
              const errorText = await uploadRes.text();
              throw {
                user: `Сервер вернул ошибку при загрузке части №${partNumber}. Загрузка остановлена.`,
                log: `Part ${partNumber} failed (status ${uploadRes.status}): ${errorText}`,
                fatal: true,
              };
            }
            throw new Error(`HTTP Error ${uploadRes.status}`);
          }

          const { etag: newEtag } = await uploadRes.json();
          etag = newEtag;
          success = true; // Успех!
          setIsRetrying(false); // Убираем предупреждение об ошибке
        } catch (error) {
          if ((error as any).fatal) throw error;

          if (attempt === 1) setIsRetrying(true); // Показываем предупреждение

          console.warn(
            `Часть ${partNumber}: Ошибка при попытке ${attempt}.`,
            error
          );

          if (attempt >= MAX_RETRIES) {
            // ⚠️ НОВЫЙ ТЕКСТ ОШИБКИ
            throw {
              user: 'Не удалось завершить загрузку из-за продолжительных проблем с соединением. Пожалуйста, проверьте стабильность интернета и повторите попытку.',
              log: `Part ${partNumber} failed after ${MAX_RETRIES} retries. Last error: ${error}`,
            };
          }

          // ⚠️ НОВАЯ ЛОГИКА ЗАДЕРЖКИ (Экспоненциальная с ограничением)
          const delay = Math.min(Math.pow(2, attempt) - 1, 60) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } // Конец цикла while

      parts.push({ PartNumber: partNumber, ETag: etag });
      setUploadProgress(Math.round((partNumber / numChunks) * 100));
    }

    // Сброс isRetrying, если вся загрузка завершилась успешно
    setIsRetrying(false);

    // 3. Завершаем multipart upload
    let completeRes: Response;
    try {
      completeRes = await fetch(`${BACKEND_URL}/upload-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: key, uploadId, parts }),
      });
    } catch (e) {
      throw {
        user: 'Загрузка частей завершена, но не удалось отправить команду на "сборку" файла. Проверьте интернет.',
        log: `Network error during upload-complete: ${e}`,
      };
    }

    if (!completeRes.ok) {
      const errorText = await completeRes.text();
      throw {
        user: 'Сервер не смог завершить сборку файла. Пожалуйста, попробуйте снова.',
        log: `Server error during upload-complete: ${completeRes.status} - ${errorText}`,
      };
    }

    const { publicUrl } = await completeRes.json();
    return publicUrl;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setIsRetrying(false); // Сброс при старте

    try {
      if (!file)
        throw { user: 'Пожалуйста, выберите файл', log: 'No file selected.' };

      const fileName = `child_${Date.now()}_${file.name}`;

      const publicUrl = await uploadFileMultipart(file, fileName);

      setUploadProgress(100);

      // Сохраняем в Supabase
      const submission: Omit<ChildContestSubmission, 'id' | 'created_at'> = {
        full_name: fullName,
        department,
        city,
        child_name: childName,
        title,
        file_url: publicUrl,
        telegram_user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
      };

      const { error: insertError } = await supabase
        .from('child_contest')
        .insert(submission);

      if (insertError) {
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
        setError({
          user: 'Произошла непредвиденная ошибка.',
          log: err.message,
        });
        console.error('Непредвиденная ошибка:', err.message);
      } else {
        setError({
          user: 'Произошла непредвиденная ошибка.',
          log: 'Unknown error type.',
        });
      }
    } finally {
      setLoading(false);
      setIsRetrying(false); // Сброс при завершении
    }
  };

  const isFormValid =
    fullName && department && city && childName && title && file;

  return (
    <div className="contest-form-container">
      <div className="contest-form-wrapper">
        <div className="contest-form-header">
          <h1>🎄 Детский новогодний конкурс</h1>
          <p className="subtitle">Заполните форму для участия</p>
        </div>

        <form onSubmit={handleSubmit} className="contest-form">
          {/* ... (поля формы без изменений) ... */}
          {/* ... (поля формы без изменений) ... */}

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

          {/* ⚠️ НОВОЕ: Уведомление о нестабильности соединения */}
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
