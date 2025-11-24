import { useEffect } from 'react';
import styles from './lightbox.module.scss';

interface LightboxProps {
  imageUrl: string;
  rotation?: number; // 🆕
  onClose: () => void;
}

const Lightbox = ({ imageUrl, rotation = 0, onClose }: LightboxProps) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div className={styles.lightbox} onClick={onClose}>
      <button className={styles.closeButton} onClick={onClose}>
        ×
      </button>
      <img
        src={imageUrl}
        alt="Полноэкранный просмотр"
        className={styles.image}
        style={{ transform: `rotate(${rotation}deg)` }} // 🆕
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default Lightbox;
