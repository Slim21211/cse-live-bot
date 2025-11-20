import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChildContestSubmission } from '../../types/database';
import FileUpload from '../../components/fileUpload/fileUpload';
import '../../styles/form.scss';

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 МБ на часть
const BACKEND_URL =
  'https://symptoms-significant-pee-elderly.trycloudflare.com'; // Ваш сервер

const Child = () => {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [childName, setChildName] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

    console.log(
      `Начало загрузки: ${file.name} ${(fileSize / 1024 / 1024).toFixed(2)} МБ`
    );
    console.log(
      `Файл разбит на ${numChunks} частей по ${(
        CHUNK_SIZE /
        1024 /
        1024
      ).toFixed(1)} МБ`
    );

    // 1. Начинаем multipart upload
    const startRes = await fetch(`${BACKEND_URL}/upload-start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: fileName, contentType: file.type }),
    });

    if (!startRes.ok) {
      throw new Error('Не удалось начать загрузку');
    }

    // Получаем uploadId и key (имя файла)
    const { uploadId, key } = await startRes.json();
    console.log('Multipart upload начат');

    // 2. Загружаем каждую часть
    const parts: { PartNumber: number; ETag: string }[] = [];

    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end); // Сырая двоичная часть
      const partNumber = i + 1;

      console.log(`Загрузка части ${partNumber}/${numChunks}...`);

      // 🚀 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Отправка сырых данных и параметров в URL
      const url = `${BACKEND_URL}/upload-part?filename=${encodeURIComponent(
        key // Используем 'key' из ответа S3 для гарантии
      )}&uploadId=${uploadId}&partNumber=${partNumber}`;

      const uploadRes = await fetch(url, {
        method: 'POST',
        // Указываем Content-Type для сырых двоичных данных
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk, // Отправляем сырой Chunk без Base64 и JSON
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        console.error('Ошибка загрузки части:', errorData);
        throw new Error(`Не удалось загрузить часть ${partNumber}`);
      }

      // Ожидаем ETag в нижнем регистре (etag) от сервера
      const { etag } = await uploadRes.json();
      parts.push({ PartNumber: partNumber, ETag: etag });

      // Обновляем прогресс
      setUploadProgress(Math.round((partNumber / numChunks) * 100));
    }

    console.log('Все части загружены, завершаем...');

    // 3. Завершаем multipart upload
    const completeRes = await fetch(`${BACKEND_URL}/upload-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Используем key, полученный при старте
      body: JSON.stringify({ filename: key, uploadId, parts }),
    });

    if (!completeRes.ok) {
      const errorData = await completeRes.json();
      console.error('Ошибка завершения:', errorData);
      throw new Error('Не удалось завершить загрузку');
    }

    const { publicUrl } = await completeRes.json();
    console.log('Файл успешно загружен в VK Cloud');

    return publicUrl;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);

    try {
      if (!file) throw new Error('Пожалуйста, выберите файл');

      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.log(`Начало загрузки файла: ${file.name}, ${fileSizeMB} МБ`);

      const fileName = `child_${Date.now()}_${file.name}`;

      // Загружаем файл
      const publicUrl = await uploadFileMultipart(file, fileName);

      console.log('Файл загружен:', publicUrl);
      setUploadProgress(100);

      // Сохраняем в Supabase
      console.log('Сохранение в БД...');
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

      if (insertError) throw insertError;

      console.log('Успешно сохранено в БД!');
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

export default Child;
