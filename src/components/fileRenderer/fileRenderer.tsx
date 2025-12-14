import React, { useState, useRef } from 'react';
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
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    // Определяем MIME-type для source
    const getMimeType = (extension: string): string => {
      const mimeTypes: Record<string, string> = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm',
        ogg: 'video/ogg',
        avi: 'video/x-msvideo',
        mkv: 'video/x-matroska',
      };
      return mimeTypes[extension] || `video/${extension}`;
    };

    return (
      <div className={styles.mediaContainer}>
        {videoError && (
          <div className={styles.fallback}>
            <p>⚠️ Ошибка загрузки видео</p>
            <button
              onClick={() => {
                setVideoError(false);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: '#fe5000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}
        <video
          ref={videoRef}
          key={url} // Принудительный remount при смене URL
          controls
          playsInline
          preload="metadata"
          className={styles.media}
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('Video error:', e);
            setVideoError(true);
          }}
          onLoadedMetadata={() => {
            console.log('Video metadata loaded');
          }}
          style={{
            display: videoError ? 'none' : 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000',
          }}
        >
          <source src={url} type={getMimeType(ext)} />
          <track kind="captions" />
          Ваш браузер не поддерживает видео.
        </video>
      </div>
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
