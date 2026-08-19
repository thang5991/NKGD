import React, { useState, useEffect } from 'react';
import { BlogPost, BlogType } from '../../types/blog';
import { ImageRecord } from '../../types/trade';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
import { Lightbox } from '../../components/common/Lightbox';
import { formatDateTime } from '../../utils/formatters';
import {
  Edit3,
  Trash2,
  PlusCircle,
  Calendar,
  Clock,
  BookOpen,
  Tag,
} from 'lucide-react';

interface BlogViewProps {
  post: BlogPost;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onNewPost: () => void;
  loadImages: (refs: string[]) => Promise<ImageRecord[]>;
}

const TYPE_CONFIG: Record<BlogType, { label: string; color: string; bg: string }> = {
  journal: { label: 'Nhật ký (Journal)', color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50' },
  analysis: { label: 'Phân tích (Analysis)', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50' },
  strategy: { label: 'Chiến lược (Strategy)', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50' },
  lesson: { label: 'Bài học (Lesson)', color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50' },
  blog: { label: 'Blog tự do', color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50' },
};

export const BlogView: React.FC<BlogViewProps> = ({
  post,
  onEdit,
  onDelete,
  onNewPost,
  loadImages,
}) => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (post.imageRefs && post.imageRefs.length > 0) {
      loadImages(post.imageRefs).then((imgs) => setImages(imgs));
    } else {
      setImages([]);
    }
  }, [post, loadImages]);

  const typeInfo = TYPE_CONFIG[post.type] || TYPE_CONFIG.journal;

  // Word count & Read time
  const wordCount = React.useMemo(() => {
    const text = (post.content || '').trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [post.content]);

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col h-full bg-surface border border-line rounded-xl p-6 sm:p-8 shadow-sm overflow-y-auto space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        {/* Type pill & Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${typeInfo.bg} ${typeInfo.color}`}>
            {typeInfo.label}
          </span>

          <div className="flex items-center gap-1.5 text-xs text-muted font-medium ml-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDateTime(post.updatedAt || post.createdAt)}</span>
          </div>

          <span className="text-muted text-xs">·</span>

          <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>~{readTimeMinutes} phút đọc ({wordCount} từ)</span>
          </div>
        </div>

        {/* Action Buttons: Edit, Delete, New Post */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={onNewPost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-line text-text transition-colors"
            title="Tạo bài viết mới"
          >
            <PlusCircle className="w-3.5 h-3.5 text-accent" />
            <span>Viết bài mới</span>
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-1.5 px-4 rounded-lg text-xs shadow-sm transition-all"
            title="Chỉnh sửa nội dung bài viết"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm(`Xóa bài viết "${post.title}"? Tất cả hình ảnh liên quan cũng sẽ bị xóa khỏi ổ cứng.`)) {
                onDelete(post.id);
              }
            }}
            className="p-1.5 text-muted hover:text-loss rounded-lg hover:bg-surface-2 border border-line transition-colors"
            title="Xóa bài viết này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title & Tags */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight leading-tight">
          {post.title}
        </h1>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((t, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#111411] border border-line text-muted-2"
              >
                <Tag className="w-3 h-3 text-accent" />
                <span>#{t}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Formatted Article Body */}
      <div className="pt-2 border-t border-line/60">
        <MarkdownRenderer content={post.content} />
      </div>

      {/* Attached Images Gallery at bottom */}
      {images.length > 0 && (
        <div className="border-t border-line pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-text">Bộ sưu tập Biểu đồ & Hình ảnh ({images.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => setLightboxImage({ url: img.dataUrl || '', title: img.name })}
                className="group relative rounded-xl overflow-hidden border border-line bg-[#0a0c0a] aspect-video cursor-zoom-in hover:border-accent transition-all shadow-sm"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm text-[10px] text-muted p-1 text-center truncate">
                  {img.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zoom Lightbox */}
      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || ''}
        title={lightboxImage?.title || 'Biểu đồ chi tiết'}
      />
    </div>
  );
};
