import { supabase } from '../lib/supabase';

const BACKEND_URL = 'https://api.cse-contests.ru';
const CHUNK_SIZE = 8 * 1024 * 1024; // 8 МБ
const MAX_RETRIES = 10;
const WARNING_PENDING_MS = 15000;
const CHUNK_TIMEOUT_MS = 60000;

// 🆕 Интерфейс для логирования ошибок
export interface UploadDiagnostics {
  telegram_user_id?: number;
  file_name: string;
  file_size: number;
  file_type: string;
  error_stage:
    | 'upload-start'
    | 'upload-part'
    | 'upload-complete'
    | 'network'
    | 'supabase';
  error_message: string;
  failed_part?: number;
  total_parts?: number;
  retry_attempts?: number;
  time_elapsed_ms?: number;
  user_agent: string;
  connection_type?: string;
  connection_effective_type?: string;
}

// 🆕 Функция для логирования ошибок в Supabase
export const logUploadError = async (diagnostics: UploadDiagnostics) => {
  try {
    await supabase.from('upload_diagnostics').insert({
      ...diagnostics,
      created_at: new Date().toISOString(),
    });
    console.log('✅ Diagnostic logged to database');
  } catch (err) {
    console.error('❌ Failed to log diagnostic:', err);
  }
};

// 🆕 Получение информации о подключении
export const getConnectionInfo = () => {
  const nav = navigator as any;
  return {
    connection_type: nav.connection?.type || 'unknown',
    connection_effective_type: nav.connection?.effectiveType || 'unknown',
    user_agent: navigator.userAgent,
  };
};

// 🆕 Интерфейс для callbacks
interface UploadCallbacks {
  onProgress: (progress: number) => void;
  onRetrying: (isRetrying: boolean) => void;
}

// 🆕 Главная функция загрузки файла
export const uploadFileMultipart = async (
  file: File,
  fileName: string,
  callbacks: UploadCallbacks
): Promise<string> => {
  const fileSize = file.size;
  const numChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const startTime = Date.now();
  const connectionInfo = getConnectionInfo();
  const userId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;

  console.log('📊 Upload started:', {
    fileName,
    fileSize,
    numChunks,
    ...connectionInfo,
  });

  try {
    // 1. Начинаем multipart upload
    let startRes: Response;
    let pendingTimerId = setTimeout(
      () => callbacks.onRetrying(true),
      WARNING_PENDING_MS
    ) as unknown as number;

    try {
      console.log('🚀 Sending upload-start request...');
      startRes = await fetch(`${BACKEND_URL}/upload-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, contentType: file.type }),
      });
      clearTimeout(pendingTimerId);
      callbacks.onRetrying(false);
      console.log('✅ upload-start response:', startRes.status);
    } catch (e) {
      clearTimeout(pendingTimerId);
      const elapsed = Date.now() - startTime;
      console.error('❌ upload-start network error:', e);

      await logUploadError({
        telegram_user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: file.type,
        error_stage: 'network',
        error_message: `upload-start failed: ${e}`,
        time_elapsed_ms: elapsed,
        ...connectionInfo,
      });

      throw {
        user: 'Не удалось установить соединение с сервером для начала загрузки. Проверьте интернет.',
        log: `Network error during upload-start: ${e}`,
      };
    }

    if (!startRes.ok) {
      const errorText = await startRes.text();
      const elapsed = Date.now() - startTime;

      await logUploadError({
        telegram_user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: file.type,
        error_stage: 'upload-start',
        error_message: `HTTP ${startRes.status}: ${errorText}`,
        time_elapsed_ms: elapsed,
        ...connectionInfo,
      });

      throw {
        user: 'Ошибка при подготовке места для файла на сервере. Пожалуйста, попробуйте позже.',
        log: `Server error during upload-start: ${startRes.status} - ${errorText}`,
      };
    }

    const { uploadId, key } = await startRes.json();
    callbacks.onProgress(1);

    // 2. Загружаем каждую часть
    const parts: { PartNumber: number; ETag: string }[] = [];

    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;

      console.log(
        `📤 Uploading part ${partNumber}/${numChunks} (${chunk.size} bytes)...`
      );

      const url = `${BACKEND_URL}/upload-part?filename=${encodeURIComponent(
        key
      )}&uploadId=${uploadId}&partNumber=${partNumber}`;

      let attempt = 0;
      let success = false;
      let etag = '';

      while (attempt < MAX_RETRIES && !success) {
        attempt++;
        let controller = new AbortController(); // Создаем новый контроллер для каждого ретрая
        let timeoutId: number | undefined;

        // 1. Показываем предупреждение о плохом интернете через 10 секунд
        pendingTimerId = setTimeout(
          () => callbacks.onRetrying(true),
          WARNING_PENDING_MS
        ) as unknown as number;

        // 2. Устанавливаем принудительный таймаут на 60 секунд для fetch
        timeoutId = setTimeout(() => {
          controller.abort();
          console.warn(
            `Part ${partNumber}: CHUNK_TIMEOUT_MS exceeded. Aborting fetch.`
          );
        }, CHUNK_TIMEOUT_MS) as unknown as number;

        try {
          // Выполняем запрос с таймаутом
          const uploadRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk,
            signal: controller.signal, // Используем signal для принудительного прерывания
          });

          clearTimeout(pendingTimerId);
          clearTimeout(timeoutId); // Успех! Очищаем оба таймера

          if (!uploadRes.ok) {
            // Если ошибка < 500, считаем ее фатальной и прекращаем загрузку
            if (uploadRes.status < 500) {
              const errorText = await uploadRes.text();
              const elapsed = Date.now() - startTime;

              console.error(
                `❌ Part ${partNumber} failed with ${uploadRes.status}`
              );

              await logUploadError({
                telegram_user_id: userId,
                file_name: fileName,
                file_size: fileSize,
                file_type: file.type,
                error_stage: 'upload-part',
                error_message: `HTTP ${uploadRes.status}: ${errorText}`,
                failed_part: partNumber,
                total_parts: numChunks,
                retry_attempts: attempt,
                time_elapsed_ms: elapsed,
                ...connectionInfo,
              });

              throw {
                user: `Сервер вернул ошибку при загрузке части №${partNumber}. Загрузка остановлена.`,
                log: `Part ${partNumber} failed (status ${uploadRes.status}): ${errorText}`,
                fatal: true,
              };
            }
            // Для 5xx (ошибки сервера, которые могут быть временными) делаем ретрай
            throw new Error(`HTTP Error ${uploadRes.status}`);
          }

          const { etag: newEtag } = await uploadRes.json();
          etag = newEtag;
          success = true;
          callbacks.onRetrying(false);
          console.log(
            `✅ Part ${partNumber} uploaded successfully (attempt ${attempt})`
          );
        } catch (error) {
          clearTimeout(pendingTimerId);
          clearTimeout(timeoutId); // Очищаем таймеры при ошибке

          if ((error as any).fatal) throw error;

          // Проверяем, является ли ошибка таймаутом клиента (AbortError) или сетевой ошибкой
          const isRetryableError =
            (error as Error).name === 'AbortError' ||
            (error as Error).name === 'TypeError' ||
            (error as Error).name === 'Failed to fetch';

          if (isRetryableError || attempt === 1) callbacks.onRetrying(true);

          console.warn(
            `⚠️ Part ${partNumber} attempt ${attempt} failed:`,
            (error as Error).name === 'AbortError'
              ? 'Client timeout (60s limit)'
              : error
          );

          if (attempt >= MAX_RETRIES) {
            const elapsed = Date.now() - startTime;

            await logUploadError({
              telegram_user_id: userId,
              file_name: fileName,
              file_size: fileSize,
              file_type: file.type,
              error_stage: 'upload-part',
              error_message: `Max retries exceeded: ${error}`,
              failed_part: partNumber,
              total_parts: numChunks,
              retry_attempts: attempt,
              time_elapsed_ms: elapsed,
              ...connectionInfo,
            });

            throw {
              user: 'Не удалось завершить загрузку из-за продолжительных проблем с соединением. Пожалуйста, проверьте стабильность интернета и повторите попытку.',
              log: `Part ${partNumber} failed after ${MAX_RETRIES} retries. Last error: ${error}`,
            };
          }

          const delay = Math.min(Math.pow(2, attempt) - 1, 60) * 1000;
          console.log(`⏳ Retrying part ${partNumber} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      parts.push({ PartNumber: partNumber, ETag: etag });
      callbacks.onProgress(Math.round((partNumber / numChunks) * 100));
    }

    callbacks.onRetrying(false);

    // 3. Завершаем multipart upload
    let completeRes: Response;
    pendingTimerId = setTimeout(
      () => callbacks.onRetrying(true),
      WARNING_PENDING_MS
    ) as unknown as number;

    try {
      console.log('🏁 Sending upload-complete request...');
      completeRes = await fetch(`${BACKEND_URL}/upload-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: key, uploadId, parts }),
      });
      clearTimeout(pendingTimerId);
      callbacks.onRetrying(false);
      console.log('✅ upload-complete response:', completeRes.status);
    } catch (e) {
      clearTimeout(pendingTimerId);
      const elapsed = Date.now() - startTime;

      await logUploadError({
        telegram_user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: file.type,
        error_stage: 'network',
        error_message: `upload-complete failed: ${e}`,
        time_elapsed_ms: elapsed,
        ...connectionInfo,
      });

      throw {
        user: 'Загрузка частей завершена, но не удалось отправить команду на "сборку" файла. Проверьте интернет.',
        log: `Network error during upload-complete: ${e}`,
      };
    }

    if (!completeRes.ok) {
      const errorText = await completeRes.text();
      const elapsed = Date.now() - startTime;

      await logUploadError({
        telegram_user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: file.type,
        error_stage: 'upload-complete',
        error_message: `HTTP ${completeRes.status}: ${errorText}`,
        time_elapsed_ms: elapsed,
        ...connectionInfo,
      });

      throw {
        user: 'Сервер не смог завершить сборку файла. Пожалуйста, попробуйте снова.',
        log: `Server error during upload-complete: ${completeRes.status} - ${errorText}`,
      };
    }

    const { publicUrl } = await completeRes.json();
    const totalTime = Date.now() - startTime;
    console.log(`✅ Upload completed successfully in ${totalTime}ms`);
    return publicUrl;
  } catch (err) {
    throw err;
  }
};
