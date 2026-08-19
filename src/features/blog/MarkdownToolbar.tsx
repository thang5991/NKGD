import React, { useRef } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string, defaultText?: string) => void;
  onInsertTemplate: () => void;
  onSelectImageFile?: (files: File[]) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  onInsert,
  onInsertTemplate,
  onSelectImageFile,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { label: 'In đậm', icon: Bold, before: '**', after: '**', text: 'Văn bản in đậm' },
    { label: 'In nghiêng', icon: Italic, before: '*', after: '*', text: 'Văn bản in nghiêng' },
    { label: 'Tiêu đề H2', icon: Heading2, before: '## ', after: '\n', text: 'Tiêu đề mục' },
    { label: 'Tiêu đề H3', icon: Heading3, before: '### ', after: '\n', text: 'Tiêu đề phụ' },
    { label: 'Danh sách', icon: List, before: '- ', after: '\n', text: 'Mục danh sách' },
    { label: 'Checklist', icon: CheckSquare, before: '- [ ] ', after: '\n', text: 'Nhiệm vụ' },
    { label: 'Trích dẫn', icon: Quote, before: '> ', after: '\n', text: 'Trích dẫn quan trọng' },
    { label: 'Khối mã', icon: Code, before: '```\n', after: '\n```\n', text: 'code / setup' },
    { label: 'Đường kẻ', icon: Minus, before: '\n---\n', after: '', text: '' },
  ];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onSelectImageFile) {
      onSelectImageFile(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-[#0c0e0c] border border-line">
      {tools.map((tool, idx) => {
        const Icon = tool.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(tool.before, tool.after, tool.text)}
            className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors text-xs font-semibold"
            title={tool.label}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}

      <div className="h-4 w-px bg-line mx-0.5" />

      {/* Insert Image button */}
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-2 text-muted hover:text-accent transition-colors text-xs font-semibold"
        title="Chèn hình ảnh tại vị trí con trỏ"
      >
        <ImageIcon className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px]">Chèn ảnh</span>
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Template button */}
      <button
        type="button"
        onClick={onInsertTemplate}
        className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold text-accent bg-accent-soft hover:bg-accent-soft/80 border border-accent-border transition-colors"
        title="Chèn khung nhật ký phân tích mẫu"
      >
        <Sparkles className="w-3 h-3" />
        <span>+ Mẫu phân tích</span>
      </button>
    </div>
  );
};
