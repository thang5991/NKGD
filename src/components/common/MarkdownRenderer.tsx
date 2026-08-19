import React, { useState } from 'react';
import { Lightbox } from './Lightbox';
import { CheckSquare, Square } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  if (!content || !content.trim()) {
    return <p className="text-muted italic text-xs">Chưa có nội dung...</p>;
  }

  // Parse markdown lines into structured elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = '';

  const renderInlineFormatted = (text: string): React.ReactNode => {
    // 1. Handle Inline Images: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imageRegex.exec(text)) !== null) {
      const altText = match[1] || 'Hình ảnh';
      const imgUrl = match[2].trim();
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(renderTextFormatting(text.substring(lastIndex, matchIndex)));
      }

      parts.push(
        <div key={`img-${matchIndex}`} className="my-3 block">
          <div
            onClick={() => setLightboxImage({ url: imgUrl, title: altText })}
            className="group relative inline-block max-w-full rounded-xl overflow-hidden border border-line bg-[#0c0e0c] cursor-zoom-in hover:border-accent transition-all shadow-md"
          >
            <img
              src={imgUrl}
              alt={altText}
              className="max-h-[500px] w-auto max-w-full object-contain rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
              loading="lazy"
              onError={(e) => {
                // Handle fallback if broken
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'p-4 text-xs text-loss bg-loss-soft/20 text-center';
                  fallback.innerText = `Không thể tải ảnh: ${altText}`;
                  parent.appendChild(fallback);
                }
              }}
            />
            {altText && altText !== 'Hình ảnh' && altText !== 'Biểu đồ' && (
              <span className="block px-3 py-1.5 text-[11px] text-muted text-center bg-surface-2/80 border-t border-line/50 truncate max-w-full">
                {altText}
              </span>
            )}
          </div>
        </div>
      );

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderTextFormatting(text.substring(lastIndex)));
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  const renderTextFormatting = (str: string): React.ReactNode => {
    // Replace **bold**, *italic*, `code`, ~~strike~~
    const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~)/g);

    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={i} className="font-bold text-text">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={i} className="italic text-muted-2">{token.slice(1, -1)}</em>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-surface-2 text-accent font-mono text-[11px] border border-line">
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith('~~') && token.endsWith('~~')) {
        return <del key={i} className="line-through text-muted">{token.slice(2, -2)}</del>;
      }
      return token;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-line bg-[#080908]">
            {codeBlockLang && (
              <div className="px-3 py-1 bg-surface-2/70 border-b border-line text-[10px] uppercase font-mono text-muted">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-3 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
              <code>{codeBlockBuffer.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} className="my-4 border-line" />);
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-text mt-5 mb-2 pb-1 border-b border-line tracking-tight">
          {renderInlineFormatted(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-text mt-4 mb-2 tracking-tight text-accent flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          {renderInlineFormatted(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-text mt-3 mb-1.5">
          {renderInlineFormatted(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Checklist item
    if (line.trim().startsWith('- [x] ') || line.trim().startsWith('- [ ] ')) {
      const isChecked = line.trim().startsWith('- [x] ');
      const taskText = line.trim().slice(6);
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 text-xs">
          {isChecked ? (
            <CheckSquare className="w-4 h-4 text-profit shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-muted shrink-0 mt-0.5" />
          )}
          <span className={isChecked ? 'line-through text-muted' : 'text-text'}>
            {renderInlineFormatted(taskText)}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-xs text-text my-0.5 leading-relaxed">
          {renderInlineFormatted(line.trim().slice(2))}
        </li>
      );
      continue;
    }

    // Numbered List
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5 text-xs text-text leading-relaxed">
          <span className="font-mono text-accent text-[11px] font-bold shrink-0">{numMatch[1]}.</span>
          <span>{renderInlineFormatted(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          className="my-2.5 pl-3.5 py-1.5 border-l-2 border-accent bg-accent-soft/30 text-xs text-muted-2 italic rounded-r-lg"
        >
          {renderInlineFormatted(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Standalone image on its own line
    if (line.trim().startsWith('![') && line.trim().includes('](')) {
      elements.push(
        <div key={i} className="my-2">
          {renderInlineFormatted(line)}
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Standard Paragraph (use div with text styling so embedded elements don't violate <p> DOM tree)
    elements.push(
      <div key={i} className="text-xs text-text leading-relaxed my-1">
        {renderInlineFormatted(line)}
      </div>
    );
  }

  return (
    <div className={`prose-dark space-y-1 ${className}`}>
      {elements}

      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || ''}
        title={lightboxImage?.title || 'Biểu đồ chi tiết'}
      />
    </div>
  );
};
