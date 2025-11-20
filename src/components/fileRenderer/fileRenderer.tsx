import React from 'react';
import styles from './fileRenderer.module.scss';

interface FileRendererProps {
  filePath: string;
}

const FileRenderer: React.FC<FileRendererProps> = ({ filePath }) => {
  if (!filePath) {
    return <div className={styles.fallback}>Файл отсутствует</div>;
  }

  // filePath уже содержит полный URL от VK Cloud
  const url = filePath;

  // Определяем расширение файла
  const ext = (filePath.split('.').pop()?.split('?')[0] || '').toLowerCase();

  // === ВИДЕО ===
  if (['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv'].includes(ext)) {
    return (
      <video
        src={url}
        controls
        playsInline
        muted={false}
        preload="metadata"
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
      <div className={styles.fallback}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          📄 Открыть PDF
        </a>
      </div>
    );
  }

  // === ДОКУМЕНТЫ ===
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return (
      <div className={styles.fallback}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          📝 Скачать документ ({ext.toUpperCase()})
        </a>
      </div>
    );
  }

  // === ВСЁ ОСТАЛЬНОЕ ===
  return (
    <div className={styles.fallback}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        📎 Открыть файл ({ext.toUpperCase()})
      </a>
    </div>
  );
};

export default FileRenderer;
