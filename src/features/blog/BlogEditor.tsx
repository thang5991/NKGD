import React, { useState, useEffect, useRef } from 'react';
import { BlogPost, BlogPostFormData, BlogType } from '../../types/blog';
import { ImageRecord } from '../../types/trade';
import { MarkdownToolbar } from './MarkdownToolbar';
import { Lightbox } from '../../components/common/Lightbox';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import {
  Save,
  Trash2,
  Plus,
  X,
  Image as ImageIcon,
  Check,
  Clock,
} from 'lucide-react';

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: (data: BlogPostFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loadImages: (refs: string[]) => Promise<ImageRecord[]>;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
  post,
  onSave,
  onDelete,
  loadImages,
}) => {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<BlogType>('journal');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');

  const [existingImages, setExistingImages] = useState<ImageRecord[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<{ id: string; url: string; name: string }[]>([]);

  const [isSaved, setIsSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editor state when active post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setType(post.type || 'journal');
      setTagsInput((post.tags || []).join(', '));
      setContent(post.content || '');
      setIsSaved(true);

      // Load post images
      if (post.imageRefs && post.imageRefs.length > 0) {
        loadImages(post.imageRefs).then((imgs) => setExistingImages(imgs));
      } else {
        setExistingImages([]);
      }
      setNewImageFiles([]);
      setNewImagePreviews([]);
    } else {
      // New post template
      setTitle('');
      setType('journal');
      setTagsInput('');
      setContent('');
      setIsSaved(false);
      setExistingImages([]);
      setNewImageFiles([]);
      setNewImagePreviews([]);
    }
  }, [post, loadImages]);

  // Track modification
  const handleModify = () => {
    if (isSaved) setIsSaved(false);
  };

  // Word count & Char count
  const wordCount = React.useMemo(() => {
    const text = content.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [content]);

  const charCount = content.length;

  // Insert markdown helpers
  const handleInsertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end) || defaultText;
    const replacement = before + selected + after;

    setContent(val.substring(0, start) + replacement + val.substring(end));
    handleModify();

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  };

  const handleInsertTemplate = () => {
    const tpl = `## 1. Bối cảnh & Cấu trúc Thị trường
- Khung thời gian: H4 / H1 / M15
- Xu hướng chính: Bullish / Bearish
- Vùng cản / FVG quan trọng:

## 2. Kế hoạch & Setup Giao dịch
- [ ] Quét thanh khoản (Liquidity Sweep)
- [ ] Xác nhận tín hiệu vào lệnh (CHoCH / Engulfing)
- [ ] Điểm Stop Loss & Take Profit an toàn

## 3. Quản trị Cảm xúc & Bài học
- Tâm lý trước khi bấm lệnh:
- Điều cần cải thiện cho lệnh kế tiếp:`;

    setContent((prev) => (prev ? `${prev}\n\n${tpl}` : tpl));
    handleModify();
  };

  // Image handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => {
      if (!f.type.startsWith('image/')) {
        showToast(`Tệp ${f.name} không phải là hình ảnh`, 'warn');
        return false;
      }
      if (f.size > 12 * 1024 * 1024) {
        showToast(`Tệp ${f.name} vượt quá 12MB`, 'warn');
        return false;
      }
      return true;
    });

    const previews = valid.map((f) => ({
      id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));

    setNewImageFiles((prev) => [...prev, ...valid]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
    handleModify();
  };

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    handleModify();
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newImagePreviews[index].url);
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    handleModify();
  };

  // Clipboard Paste Support (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
      showToast(`Đã dán ${files.length} hình ảnh vào bài viết.`, 'info');
    }
  };

  // Drag & Drop image files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      showToast('Vui lòng nhập tiêu đề bài viết', 'error');
      return;
    }

    try {
      setSaving(true);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await onSave({
        id: post?.id,
        title: title.trim(),
        type,
        tags,
        content,
        existingImages,
        newImages: newImageFiles,
      });

      setIsSaved(true);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      showToast('Đã lưu bài viết thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể lưu bài viết', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      <div
        className="flex flex-col h-full bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4"
        onPaste={handlePaste}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Editor Topbar: Title input + Save/Delete buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line pb-3">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleModify();
            }}
            placeholder="Tiêu đề bài viết, phân tích hoặc nhật ký..."
            className="w-full text-lg sm:text-xl font-bold text-text bg-transparent border-0 border-b border-transparent focus:border-accent outline-none px-1 py-1 tracking-tight placeholder:text-muted-2"
          />

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Save Status Badge */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted mr-1">
              {isSaved ? (
                <span className="text-profit flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã lưu
                </span>
              ) : (
                <span className="text-amber flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Chưa lưu
                </span>
              )}
            </div>

            {post && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xóa bài viết "${post.title}"? Tất cả ảnh liên quan cũng sẽ bị xóa.`)) {
                    onDelete(post.id);
                  }
                }}
                className="p-2 text-muted hover:text-loss rounded-lg hover:bg-surface-2 border border-line transition-colors"
                title="Xóa bài viết"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="flex items-center gap-1.5 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-2 px-4 rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu bài (Ctrl+S)'}</span>
            </button>
          </div>
        </div>

        {/* Metadata Controls: Type + Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
              Loại bài viết
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as BlogType);
                handleModify();
              }}
              className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-1.5 text-xs text-text outline-none font-medium"
            >
              <option value="journal">Nhật ký (Journal)</option>
              <option value="analysis">Phân tích (Analysis)</option>
              <option value="strategy">Chiến lược (Strategy)</option>
              <option value="lesson">Bài học (Lesson)</option>
              <option value="blog">Blog / Bài viết tự do</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
              Tags phân loại (phân tách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => {
                setTagsInput(e.target.value);
                handleModify();
              }}
              placeholder="EURUSD, SMC, TâmLý, FVG, TinTức..."
              className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-1.5 text-xs text-text outline-none"
            />
          </div>
        </div>

        {/* Markdown Toolbar */}
        <MarkdownToolbar
          onInsert={handleInsertMarkdown}
          onInsertTemplate={handleInsertTemplate}
        />

        {/* Textarea Content */}
        <div className="flex-1 min-h-[300px] flex flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleModify();
            }}
            placeholder="Viết nội dung bài viết, phân tích kỹ thuật hoặc đúc kết bài học tại đây... (Hỗ trợ định dạng Markdown và Paste ảnh Ctrl+V)"
            className="flex-1 w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-xl p-4 text-xs text-text font-mono leading-relaxed outline-none resize-y min-h-[340px]"
          />
        </div>

        {/* Attached Images Section */}
        <div className="border-t border-line pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text block">Hình ảnh đính kèm ({existingImages.length + newImagePreviews.length})</span>
              <span className="text-[10px] text-muted">
                Ảnh được nén và lưu dạng Blob. Có thể kéo thả hoặc Paste (Ctrl+V) trực tiếp.
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-line text-text transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm ảnh
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {existingImages.map((img) => (
              <div
                key={img.id}
                onClick={() => {
                  setLightboxUrl(img.dataUrl || '');
                  setLightboxTitle(img.name);
                }}
                className="relative group rounded-lg overflow-hidden border border-line bg-bg aspect-video cursor-zoom-in hover:border-accent transition-all shadow-sm"
              >
                <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExistingImage(img.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded bg-black/80 text-loss hover:text-white transition-colors"
                  title="Xóa ảnh này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {newImagePreviews.map((prev, idx) => (
              <div
                key={prev.id}
                onClick={() => {
                  setLightboxUrl(prev.url);
                  setLightboxTitle(prev.name);
                }}
                className="relative group rounded-lg overflow-hidden border border-accent/40 bg-bg aspect-video cursor-zoom-in shadow-sm"
              >
                <img src={prev.url} alt={prev.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 bg-accent text-bg font-bold text-[9px] px-1 rounded">Mới</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNewImage(idx);
                  }}
                  className="absolute top-1 right-1 p-1 rounded bg-black/80 text-loss hover:text-white transition-colors"
                  title="Xóa ảnh này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {existingImages.length === 0 && newImagePreviews.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="col-span-full border border-dashed border-line rounded-lg p-3 text-center cursor-pointer hover:border-line-strong transition-colors flex items-center justify-center gap-2 text-xs text-muted"
              >
                <ImageIcon className="w-4 h-4 text-accent" />
                <span>Bấm để đính kèm ảnh biểu đồ hoặc nhấn Ctrl+V để dán trực tiếp</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer info: Word count & Updated date */}
        <div className="flex items-center justify-between text-[11px] text-muted-2 border-t border-line pt-2.5">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-text font-mono">{wordCount}</strong> từ
            </span>
            <span>·</span>
            <span>
              <strong className="text-text font-mono">{charCount}</strong> ký tự
            </span>
          </div>

          {post?.updatedAt && (
            <div>
              Cập nhật lần cuối: {formatDateTime(post.updatedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for zooming blog image */}
      <Lightbox
        isOpen={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        imageUrl={lightboxUrl || ''}
        title={lightboxTitle}
      />
    </>
  );
};
