import React, { useState, useEffect, useRef } from 'react';
import { BlogPost, BlogPostFormData, BlogType } from '../../types/blog';
import { ImageRecord } from '../../types/trade';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
import { Lightbox } from '../../components/common/Lightbox';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import { compressImageFile } from '../../utils/imageCompressor';
import { blobToDataUrl, saveImage, deleteImage } from '../../db/imageRepository';
import {
  Save,
  Trash2,
  Plus,
  X,
  Image as ImageIcon,
  Check,
  Clock,
  ArrowLeft,
  Loader2,
  Eye,
  Edit3,
  Columns,
} from 'lucide-react';

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: (data: BlogPostFormData) => Promise<void>;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  loadImages: (refs: string[]) => Promise<ImageRecord[]>;
}

type EditorTab = 'edit' | 'preview' | 'split';

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
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');

  const [existingImages, setExistingImages] = useState<ImageRecord[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [isSaved, setIsSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastCursorPosRef = useRef<number>(0);

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
    } else {
      // New post template
      setTitle('');
      setType('journal');
      setTagsInput('');
      setContent('');
      setIsSaved(false);
      setExistingImages([]);
    }
  }, [post, loadImages]);

  // Track modification
  const handleModify = () => {
    if (isSaved) setIsSaved(false);
  };

  // Remember cursor position on blur or keyup/click
  const updateCursorPos = () => {
    if (textareaRef.current) {
      lastCursorPosRef.current = textareaRef.current.selectionStart || 0;
    }
  };

  // Word count & Char count
  const wordCount = React.useMemo(() => {
    const text = content.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [content]);

  const charCount = content.length;

  // Helper: insert text at textarea cursor position
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart !== undefined ? textarea.selectionStart : lastCursorPosRef.current;
      const end = textarea.selectionEnd !== undefined ? textarea.selectionEnd : start;
      const val = textarea.value;

      const newContent = val.substring(0, start) + textToInsert + val.substring(end);
      setContent(newContent);
      handleModify();

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + textToInsert.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        lastCursorPosRef.current = newPos;
      });
    } else {
      setContent((prev) => prev + textToInsert);
      handleModify();
    }
  };

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
      lastCursorPosRef.current = textarea.selectionEnd;
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

    insertTextAtCursor(`\n\n${tpl}\n\n`);
  };

  // Process, save to disk immediately, and insert image tag at cursor
  const processAndInsertImages = async (files: File[]) => {
    if (!files || files.length === 0) return;

    try {
      setIsUploadingImage(true);
      const newImagesList: ImageRecord[] = [];
      let allTagsToInsert = '';

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          showToast(`Tệp ${file.name} không phải là hình ảnh`, 'warn');
          continue;
        }

        // 1. Compress image
        const { blob, mimeType } = await compressImageFile(file, 1920, 0.85);
        const dataUrl = await blobToDataUrl(blob);

        // 2. Generate permanent image ID
        const imageId = `img-blog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Biểu đồ phân tích';

        const imageRecord: ImageRecord = {
          id: imageId,
          ownerType: 'blog',
          ownerId: post?.id || 'blog-temp',
          name: file.name,
          mimeType,
          blob,
          dataUrl,
          createdAt: new Date().toISOString(),
        };

        // 3. Save directly to local disk API
        await saveImage(imageRecord);
        newImagesList.push(imageRecord);

        // 4. Create markdown tag with permanent URL
        const permUrl = `/api/images/${imageId}`;
        allTagsToInsert += `\n\n![${cleanName}](${permUrl})\n\n`;
      }

      if (newImagesList.length > 0) {
        setExistingImages((prev) => [...prev, ...newImagesList]);
        insertTextAtCursor(allTagsToInsert);
        showToast(`Đã lưu và chèn ${newImagesList.length} ảnh vào nội dung!`, 'success');
      }
    } catch (err) {
      console.error('Lỗi khi chèn ảnh:', err);
      showToast('Không thể lưu ảnh vào ổ cứng', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processAndInsertImages(Array.from(e.target.files));
    e.target.value = '';
  };

  // Clipboard Paste (Ctrl+V) anywhere on the editor / textarea
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

  const removeExistingImage = async (id: string) => {
    try {
      await deleteImage(id);
      setExistingImages((prev) => prev.filter((img) => img.id !== id));
      handleModify();
      showToast('Đã xóa ảnh khỏi ổ cứng', 'info');
    } catch (err) {
      console.error('Lỗi xóa ảnh:', err);
    }
  };

  // Re-insert image tag at cursor when clicking an existing thumbnail
  const reinsertImageAtCursor = (img: ImageRecord) => {
    const cleanName = img.name.replace(/\.[^/.]+$/, '').trim() || 'Biểu đồ';
    const tag = `\n\n![${cleanName}](/api/images/${img.id})\n\n`;
    insertTextAtCursor(tag);
    showToast(`Đã chèn lại thẻ ảnh vào vị trí con trỏ!`, 'info');
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
        newImages: [],
      });

      setIsSaved(true);
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
            {/* Uploading / Save Status Badge */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted mr-1">
              {isUploadingImage ? (
                <span className="text-accent flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu ảnh...
                </span>
              ) : isSaved ? (
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
              disabled={saving || isUploadingImage}
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

        {/* View Mode Switcher: Soạn thảo / Xem trước / Song song */}
        <div className="flex items-center justify-between border-b border-line pb-2">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0c0e0c] border border-line">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'edit'
                  ? 'bg-surface-2 text-accent shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Soạn thảo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'preview'
                  ? 'bg-surface-2 text-accent shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'split'
                  ? 'bg-surface-2 text-accent shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Song song</span>
            </button>
          </div>

          <div className="text-[11px] text-muted">
            Nhấn <kbd className="px-1.5 py-0.5 bg-surface-2 rounded border border-line text-accent font-mono">Ctrl+V</kbd> để dán ảnh trực tiếp vào bài
          </div>
        </div>

        {/* Markdown Toolbar with Image Picker (only when in edit or split mode) */}
        {activeTab !== 'preview' && (
          <MarkdownToolbar
            onInsert={handleInsertMarkdown}
            onInsertTemplate={handleInsertTemplate}
            onSelectImageFile={processAndInsertImages}
          />
        )}

        {/* Textarea Content & Live Preview Pane */}
        <div className="flex-1 min-h-[340px] flex flex-col">
          {activeTab === 'edit' && (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                handleModify();
              }}
              onKeyUp={updateCursorPos}
              onClick={updateCursorPos}
              onBlur={updateCursorPos}
              placeholder="Viết nội dung bài viết, phân tích kỹ thuật hoặc đúc kết bài học tại đây... (Đặt con trỏ chuột ở bất kỳ đâu rồi nhấn Ctrl+V để dán và chèn ảnh ngay tại vị trí đó)"
              className="flex-1 w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-xl p-4 text-xs text-text font-mono leading-relaxed outline-none resize-y min-h-[340px]"
            />
          )}

          {activeTab === 'preview' && (
            <div className="flex-1 w-full bg-[#0c0e0c] border border-line rounded-xl p-6 overflow-y-auto min-h-[340px]">
              <MarkdownRenderer content={content} />
            </div>
          )}

          {activeTab === 'split' && (
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-[340px]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  handleModify();
                }}
                onKeyUp={updateCursorPos}
                onClick={updateCursorPos}
                onBlur={updateCursorPos}
                placeholder="Nội dung markdown..."
                className="w-full h-full bg-[#0c0e0c] border border-line focus:border-accent rounded-xl p-4 text-xs text-text font-mono leading-relaxed outline-none resize-none"
              />
              <div className="w-full h-full bg-[#0c0e0c] border border-line rounded-xl p-4 overflow-y-auto">
                <MarkdownRenderer content={content} />
              </div>
            </div>
          )}
        </div>

        {/* Attached Images & Quick Re-insert Strip */}
        <div className="border-t border-line pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text block">
                Hình ảnh đã lưu ({existingImages.length}) — Bấm vào ảnh để chèn lại thẻ ảnh vào vị trí con trỏ chuột
              </span>
              <span className="text-[10px] text-muted">
                Dán ảnh (Ctrl+V) hoặc bấm "Thêm ảnh" để tải và chèn trực tiếp vào vị trí con trỏ trong văn bản.
              </span>
            </div>

            <button
              type="button"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-line text-text transition-colors disabled:opacity-50"
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
                onClick={() => reinsertImageAtCursor(img)}
                className="relative group rounded-lg overflow-hidden border border-line bg-bg aspect-video cursor-pointer hover:border-accent transition-all shadow-sm"
                title="Bấm để chèn lại thẻ ảnh này vào vị trí con trỏ chuột trong bài viết"
              >
                <img
                  src={img.dataUrl || `/api/images/${img.id}`}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to direct API if dataUrl failed
                    e.currentTarget.src = `/api/images/${img.id}`;
                  }}
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-accent p-0.5 text-center font-bold truncate">
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

            {existingImages.length === 0 && (
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
        title="Biểu đồ chi tiết"
      />
    </>
  );
};
