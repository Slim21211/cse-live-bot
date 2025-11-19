import { ChangeEvent } from 'react';

interface FileUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
}

export default function FileUpload({
  file,
  onChange,
  disabled,
  accept = 'image/*,video/*,.pdf,.doc,.docx,.txt',
}: FileUploadProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onChange(selectedFile);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('document') || file.type.includes('text'))
      return '📝';
    return '📎';
  };

  return (
    <div className="file-upload">
      <div className="file-input-wrapper">
        <input
          type="file"
          id="file-input"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
        />
        <label htmlFor="file-input" className="file-input-button">
          {file ? 'Изменить файл' : '📎 Выберите файл'}
        </label>
      </div>

      {file && (
        <div className="file-preview">
          <div className="file-info">
            <span>{getFileIcon(file)}</span>
            <span>{file.name}</span>
            <span>({(file.size / 1024 / 1024).toFixed(2)} МБ)</span>
          </div>

          {file.type.startsWith('image/') && (
            <img src={URL.createObjectURL(file)} alt="Preview" />
          )}

          {file.type.startsWith('video/') && (
            <video controls src={URL.createObjectURL(file)} />
          )}
        </div>
      )}
    </div>
  );
}
