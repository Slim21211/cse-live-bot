import React, { useState } from 'react';
import Lightbox from '../lightbox/lightbox';
import styles from './fileRenderer.module.scss';

interface FileRendererProps {
  filePath: string;
  rotation?: number; // 🆕 Угол поворота
}

const FileRenderer: React.FC<FileRendererProps> = ({
  filePath,
  rotation = 0,
}) => {
  const [showLightbox, setShowLightbox] = useState(false);

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
        preload="metadata"
        className={styles.media}
        onClick={(e) => e.currentTarget.play().catch(() => {})}
      >
        <track kind="captions" />
        Ваш браузер не поддерживает видео.
      </video>
    );
  }

  // === ИЗОБРАЖЕНИЯ ===
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'].includes(ext)
  ) {
    return (
      <>
        <img
          src={url}
          alt="Работа"
          className={styles.media}
          loading="lazy"
          onClick={() => setShowLightbox(true)}
          style={{
            cursor: 'zoom-in',
            transform: `rotate(${rotation}deg)`, // 🆕 Применяем поворот
          }}
        />
        {showLightbox && (
          <Lightbox
            imageUrl={url}
            rotation={rotation} // 🆕 Передаём rotation в lightbox
            onClose={() => setShowLightbox(false)}
          />
        )}
      </>
    );
  }

  // Остальные типы файлов без изменений...
  // PDF, DOC, и т.д.

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
