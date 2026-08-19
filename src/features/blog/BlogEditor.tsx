import React, { useState, useEffect, useRef } from 'react';
import { BlogPost, BlogPostFormData, BlogType } from '../../types/blog';
import { ImageRecord } from '../../types/trade';
import { MarkdownToolbar } from './MarkdownToolbar';
import { Lightbox } from '../../components/common/Lightbox';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import { compressImageFile } from '../../utils/imageCompressor';
import {
  Save,
  Trash2,
  Plus,
  X,
  Image as ImageIcon,
  Check,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: (data: BlogPostFormData) => Promise<void>;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  loadImages: (refs: string[]) => Promise<ImageRecord[]>;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
  post,
  onSave,
  onCancel,
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
  const [lightboxTitle] = useState('Hình ảnh');

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

  // Insert markdown helpers at cursor position
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

  // Process and insert image files directly at cursor position
  const processAndInsertImages = async (files: File[]) => {
    const validFiles: File[] = [];
    const newPreviews: { id: string; url: string; name: string }[] = [];
    let markdownImageTags = '';

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast(`Tệp ${file.name} không phải là hình ảnh`, 'warn');
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast(`Tệp ${file.name} vượt quá dung lượng 15MB`, 'warn');
        continue;
      }

      try {
        const compressed = await compressImageFile(file, 1920, 0.85);
        const previewUrl = URL.createObjectURL(compressed.blob);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Biểu đồ phân tích';

        const previewItem = {
          id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          url: previewUrl,
          name: file.name,
        };

        validFiles.push(file);
        newPreviews.push(previewItem);

        // Markdown tag pointing to blob/preview URL
        markdownImageTags += `\n\n![${cleanName}](${previewUrl})\n\n`;
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }

    if (validFiles.length > 0) {
      setNewImageFiles((prev) => [...prev, ...validFiles]);
      setNewImagePreviews((prev) => [...prev, ...newPreviews]);

      // Insert at textarea cursor position
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        const updatedContent = val.substring(0, start) + markdownImageTags + val.substring(end);
        setContent(updatedContent);
        handleModify();

        requestAnimationFrame(() => {
          textarea.focus();
          const newPos = start + markdownImageTags.length;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        });
      } else {
        setContent((prev) => prev + markdownImageTags);
        handleModify();
      }

      showToast(`Đã chèn ${validFiles.length} ảnh vào đúng vị trí con trỏ!`, 'success');
    }
  };

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processAndInsertImages(Array.from(e.target.files));
    e.target.value = '';
  };

  // Clipboard Paste (Ctrl+V) handler
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
      processAndInsertImages(files);
    }
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndInsertImages(Array.from(e.dataTransfer.files));
    }
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

  // Insert existing image link into markdown at cursor
  const insertImageTagAtCursor = (imgName: string, imgUrl: string) => {
    const tag = `\n\n![${imgName}](${imgUrl})\n\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      setContent(val.substring(0, start) + tag + val.substring(end));
      handleModify();
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = start + tag.length;
        textarea.selectionEnd = start + tag.length;
      });
      showToast(`Đã chèn ảnh vào nội dung!`, 'info');
    } else {
      setContent((prev) => prev + tag);
      handleModify();
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
        className="flex flex-col h-full bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4 overflow-y-auto"
        onPaste={handlePaste}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Editor Topbar: Title input + Save/Cancel/Delete buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-line text-muted hover:text-text transition-colors"
              title="Quay lại chế độ xem bài viết"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
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
          </div>

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

            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-text rounded-lg hover:bg-surface-2 transition-colors border border-line"
            >
              Hủy / Xem bài
            </button>

            {post && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Xóa bài viết "${post.title}"? Tất cả ảnh liên quan cũng sẽ bị xóa khỏi ổ cứng.`)) {
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
              className="flex items-center gap-1.5 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-1.5 px-4 rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
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

        {/* Markdown Toolbar with Image Picker */}
        <MarkdownToolbar
          onInsert={handleInsertMarkdown}
          onInsertTemplate={handleInsertTemplate}
          onSelectImageFile={processAndInsertImages}
        />

        {/* Textarea Content with Cursor-based Image Paste */}
        <div className="flex-1 min-h-[300px] flex flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleModify();
            }}
            placeholder="Viết nội dung bài viết, phân tích kỹ thuật hoặc đúc kết bài học tại đây... (Nhấn Ctrl+V ở bất kỳ đâu để dán và chèn ảnh trực tiếp tại vị trí con trỏ chuột)"
            className="flex-1 w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-xl p-4 text-xs text-text font-mono leading-relaxed outline-none resize-y min-h-[320px]"
          />
        </div>

        {/* Attached Images & Quick Insert Strip */}
        <div className="border-t border-line pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text block">
                Hình ảnh ({existingImages.length + newImagePreviews.length}) — Bấm vào ảnh để chèn lại thẻ ảnh vào nội dung
              </span>
              <span className="text-[10px] text-muted">
                Dán ảnh (Ctrl+V) hoặc kéo thả để chèn vào vị trí con trỏ chuột trong văn bản.
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
                onClick={() => insertImageTagAtCursor(img.name, img.dataUrl || `/api/images/${img.id}`)}
                className="relative group rounded-lg overflow-hidden border border-line bg-bg aspect-video cursor-pointer hover:border-accent transition-all shadow-sm"
                title="Bấm để chèn thẻ ảnh này vào vị trí con trỏ trong nội dung"
              >
                <img src={img.dataUrl || `/api/images/${img.id}`} alt={img.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-muted p-0.5 text-center truncate">
                  + Chèn vào bài
                </span>
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
                onClick={() => insertImageTagAtCursor(prev.name, prev.url)}
                className="relative group rounded-lg overflow-hidden border border-accent/40 bg-bg aspect-video cursor-pointer shadow-sm"
                title="Bấm để chèn thẻ ảnh này vào vị trí con trỏ trong nội dung"
              >
                <img src={prev.url} alt={prev.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-accent text-bg font-bold text-[9px] p-0.5 text-center truncate">
                  + Chèn vào bài
                </span>
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
                <span>Bấm để chèn ảnh vào văn bản hoặc nhấn Ctrl+V bất kỳ đâu để dán trực tiếp</span>
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
