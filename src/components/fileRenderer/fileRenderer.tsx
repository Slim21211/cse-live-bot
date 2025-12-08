import React, { useState } from 'react';
import Lightbox from '../lightbox/lightbox';
import styles from './fileRenderer.module.scss';

interface FileRendererProps {
  filePath: string;
  rotation?: number;
}

const FileRenderer: React.FC<FileRendererProps> = ({
  filePath,
  rotation = 0,
}) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  if (!filePath) {
    return <div className={styles.fallback}>Файл отсутствует</div>;
  }

  const url = filePath;
  const ext = (filePath.split('.').pop()?.split('?')[0] || '').toLowerCase();

  // === АУДИО (MP3, WAV, AAC, OGG Audio) ===
  if (['mp3', 'wav', 'aac', 'oga'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>🎧</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Аудиозапись</span>
          <audio
            src={url}
            controls
            preload="metadata"
            className={styles.audioPlayer}
          >
            Ваш браузер не поддерживает аудио.
          </audio>
        </div>
      </div>
    );
  }

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
        <div className={styles.mediaContainer}>
          {imageLoading && !imageError && (
            <div className={styles.loader}>
              <div className={styles.spinner}></div>
              <span>Загрузка изображения...</span>
            </div>
          )}
          {imageError && (
            <div className={styles.fallback}>
              <span>⚠️ Не удалось загрузить изображение</span>
            </div>
          )}
          <img
            src={url}
            alt="Работа"
            className={`${styles.media} ${imageLoading ? styles.hidden : ''}`}
            loading="lazy"
            onClick={() => !imageLoading && setShowLightbox(true)}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            style={{
              cursor: imageLoading ? 'default' : 'zoom-in',
              transform: `rotate(${rotation}deg)`,
            }}
          />
        </div>
        {showLightbox && !imageError && (
          <Lightbox
            imageUrl={url}
            rotation={rotation}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </>
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

  // === DOC, DOCX, TXT, RTF ===
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

  // === PPT, PPTX ===
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

  // === XLS, XLSX, CSV ===
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

  // === ZIP, RAR, 7Z, TAR, GZ ===
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

  // === Другие файлы ===
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
