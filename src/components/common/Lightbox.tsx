import React, { useEffect } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({ isOpen, onClose, imageUrl, title }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 max-w-5xl max-h-[92vh] w-full flex flex-col bg-surface border border-line-strong rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-2/70">
          <div className="flex items-center gap-2 text-xs text-muted">
            <ZoomIn className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium text-text">{title || 'Xem ảnh phóng to'}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={title || 'chart-image.jpg'}
              className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-3 transition-colors"
              title="Tải ảnh về máy"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-3 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-bg">
          <img
            src={imageUrl}
            alt={title || 'Full size'}
            className="max-w-full max-h-[80vh] object-contain rounded-md shadow-lg select-none"
          />
        </div>
      </div>
    </div>
  );
};
