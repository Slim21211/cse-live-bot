import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { TeamContestSubmission } from '../../types/database';
import '../../styles/form.scss';
import FileUpload from '../../components/fileUpload/fileUpload';

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 МБ на часть
const BACKEND_URL = 'https://justify-grill-manor-adaptation.trycloudflare.com'; // Ваш сервер

// 🚀 КОНСТАНТЫ ДЛЯ УСТОЙЧИВОСТИ
const MAX_RETRIES = 10;
const GLOBAL_TIMEOUT_MS = 60000; // Общий лимит времени на загрузку части: 60 секунд
// ⚠️ 20 секунд для показа плашки
const WARNING_PENDING_MS = 10000;

const Team = () => {
  const [teamName, setTeamName] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [participants, setParticipants] = useState('');
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

  // 💡 Функция для обработки таймаута ожидания (ТОЛЬКО включает плашку)
  const handlePendingTimeout = () => {
    // ⭐️ ИСПРАВЛЕНО: Только включаем плашку. Прогресс-бар (setUploadProgress(1)) активируется отдельно, после upload-start.
    setIsRetrying(true);
  };

  const uploadFileMultipart = async (file: File, fileName: string) => {
    const fileSize = file.size;
    const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

    // 1. Начинаем multipart upload
    let startRes: Response;
    // ⚠️ ТАЙМЕР НА ПЕРВЫЙ ЗАПРОС
    let pendingTimerId = setTimeout(
      handlePendingTimeout,
      WARNING_PENDING_MS
    ) as unknown as number;

    try {
      startRes = await fetch(`${BACKEND_URL}/upload-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, contentType: file.type }),
      });
      clearTimeout(pendingTimerId);
      setIsRetrying(false); // Успех: убираем плашку
    } catch (e) {
      clearTimeout(pendingTimerId);
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
    // ⭐️ ИСПРАВЛЕНО: Устанавливаем 1% здесь, чтобы прогресс-бар появился.
    setUploadProgress(1);

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
      const startTime = Date.now();

      // 🚀 Цикл повторных попыток
      while (attempt < MAX_RETRIES && !success) {
        attempt++;
        const elapsedTime = Date.now() - startTime;

        // ⚠️ ТАЙМЕР НА ЗАГРУЗКУ ЧАСТИ
        pendingTimerId = setTimeout(
          handlePendingTimeout,
          WARNING_PENDING_MS
        ) as unknown as number;

        if (elapsedTime > GLOBAL_TIMEOUT_MS) {
          clearTimeout(pendingTimerId);
          throw {
            user: 'Не удалось завершить загрузку части файла из-за продолжительных проблем с соединением. Пожалуйста, проверьте стабильность интернета и повторите попытку.',
            log: `Part ${partNumber} failed: Global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded.`,
          };
        }

        try {
          const uploadRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk,
          });

          clearTimeout(pendingTimerId); // Успех: сбрасываем таймер

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
          success = true;
          setIsRetrying(false); // Сброс плашки при успешном ответе
        } catch (error) {
          clearTimeout(pendingTimerId); // Ошибка: сбрасываем таймер

          if ((error as any).fatal) throw error;

          // Активируем плашку, если это реальная ошибка (сеть оборвалась/сервер упал)
          if (attempt === 1) setIsRetrying(true);

          console.warn(
            `Часть ${partNumber}: Ошибка при попытке ${attempt}.`,
            error
          );

          if (attempt >= MAX_RETRIES) {
            throw {
              user: 'Не удалось завершить загрузку из-за продолжительных проблем с соединением. Пожалуйста, проверьте стабильность интернета и повторите попытку.',
              log: `Part ${partNumber} failed after ${MAX_RETRIES} retries. Last error: ${error}`,
            };
          }

          const delay = Math.min(Math.pow(2, attempt) - 1, 60) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } // Конец цикла while

      parts.push({ PartNumber: partNumber, ETag: etag });
      setUploadProgress(Math.round((partNumber / numChunks) * 100));
    }

    setIsRetrying(false);

    // 3. Завершаем multipart upload
    let completeRes: Response;
    // ⚠️ ТАЙМЕР НА ЗАВЕРШАЮЩИЙ ЗАПРОС
    pendingTimerId = setTimeout(
      handlePendingTimeout,
      WARNING_PENDING_MS
    ) as unknown as number;

    try {
      completeRes = await fetch(`${BACKEND_URL}/upload-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: key, uploadId, parts }),
      });
      clearTimeout(pendingTimerId);
      setIsRetrying(false);
    } catch (e) {
      clearTimeout(pendingTimerId);
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
    setIsRetrying(false);

    try {
      if (!file)
        throw { user: 'Пожалуйста, выберите файл', log: 'No file selected.' };

      const fileName = `team_${Date.now()}_${file.name}`;

      const publicUrl = await uploadFileMultipart(file, fileName);

      setUploadProgress(100);

      // Сохраняем в Supabase
      const submission: Omit<TeamContestSubmission, 'id' | 'created_at'> = {
        team_name: teamName,
        department,
        city,
        participants: participants,
        file_url: publicUrl,
        telegram_user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        is_active: true,
      };

      const { error: insertError } = await supabase
        .from('team_contest')
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
        // Обычная сетевая ошибка (Network Error)
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
  // ... (остальной код JSX без изменений)
  const isFormValid = teamName && department && city && participants && file;

  return (
    <div className="contest-form-container">
      <div className="contest-form-wrapper">
        <div className="contest-form-header">
          <h1>✨ Командный новогодний конкурс</h1>
          <p className="subtitle">Заполните форму для участия</p>
        </div>

        <form onSubmit={handleSubmit} className="contest-form">
          <div className="form-group">
            <label htmlFor="teamName">
              Название команды <span className="required">*</span>
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Новогодние Эльфы"
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
            <label htmlFor="participants">
              Участники команды (ФИО через запятую){' '}
              <span className="required">*</span>
            </label>
            <input
              id="participants"
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Иванов И.И., Петров П.П., Сидоров С.С."
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

          {/* ⚠️ Уведомление о нестабильности соединения */}
          {uploadProgress > 0 && uploadProgress < 100 && isRetrying && (
            <div className="warning-message">
              Слабое соединение с интернетом, время загрузки может увеличиться.
            </div>
          )}

          {/* ⚠️ Отображение пользовательской ошибки */}
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

export default Team;
