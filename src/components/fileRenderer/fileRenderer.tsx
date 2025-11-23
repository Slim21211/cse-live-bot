import React from 'react';
import styles from './fileRenderer.module.scss';

interface FileRendererProps {
  filePath: string;
}

const FileRenderer: React.FC<FileRendererProps> = ({ filePath }) => {
  if (!filePath) {
    return <div className={styles.fallback}>Файл отсутствует</div>;
  }

  const url = filePath;
  const ext = (filePath.split('.').pop()?.split('?')[0] || '').toLowerCase();

  // === ВИДЕО ===
  if (['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv'].includes(ext)) {
    return (
      <video
        src={url}
        controls
        playsInline
        muted={false}
        preload="auto"
        poster=""
        className={styles.media}
        onClick={(e) => e.currentTarget.play().catch(() => {})}
      >
        <track kind="captions" />
        Ваш браузер не поддерживает видео.
        <a href={url} target="_blank" rel="noopener noreferrer">
          Скачать видео
        </a>
      </video>
    );
  }

  // === ИЗОБРАЖЕНИЯ ===
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'].includes(ext)
  ) {
    return (
      <img src={url} alt="Работа" className={styles.media} loading="lazy" />
    );
  }

  // === PDF ===
  if (ext === 'pdf') {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📄</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>PDF документ</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Открыть файл
          </a>
        </div>
      </div>
    );
  }

  // === ТЕКСТОВЫЕ ДОКУМЕНТЫ ===
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📝</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>
            {ext.toUpperCase()} документ
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать файл
          </a>
        </div>
      </div>
    );
  }

  // === ПРЕЗЕНТАЦИИ ===
  if (['ppt', 'pptx'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📊</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Презентация</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать файл
          </a>
        </div>
      </div>
    );
  }

  // === ТАБЛИЦЫ ===
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📈</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Таблица</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать файл
          </a>
        </div>
      </div>
    );
  }

  // === АРХИВЫ ===
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📦</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Архив</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать архив
          </a>
        </div>
      </div>
    );
  }

  // === ВСЁ ОСТАЛЬНОЕ ===
  return (
    <div className={styles.documentPreview}>
      <div className={styles.documentIcon}>📎</div>
      <div className={styles.documentInfo}>
        <span className={styles.documentType}>{ext.toUpperCase()} файл</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.documentLink}
        >
          Открыть файл
        </a>
      </div>
    </div>
  );
};

export default FileRenderer;
