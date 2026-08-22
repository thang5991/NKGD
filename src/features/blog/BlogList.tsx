import React, { useState, useMemo } from 'react';
import { BlogPost, BlogType } from '../../types/blog';
import { formatDate } from '../../utils/formatters';
import { Search, Plus, Image as ImageIcon } from 'lucide-react';

interface BlogListProps {
  posts: BlogPost[];
  selectedPostId: string | null;
  onSelectPost: (id: string) => void;
  onNewPost: () => void;
}

export const typeLabelMap: Record<BlogType, string> = {
  journal: 'Nhật ký',
  analysis: 'Phân tích',
  strategy: 'Chiến lược',
  lesson: 'Bài học',
  blog: 'Blog',
};

export const BlogList: React.FC<BlogListProps> = ({
  posts,
  selectedPostId,
  onSelectPost,
  onNewPost,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const types: { id: string; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'journal', label: 'Nhật ký' },
    { id: 'analysis', label: 'Phân tích' },
    { id: 'strategy', label: 'Chiến lược' },
    { id: 'lesson', label: 'Bài học' },
    { id: 'blog', label: 'Blog' },
  ];

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));

      const matchType = selectedType === 'all' || p.type === selectedType;

      return matchSearch && matchType;
    });
  }, [posts, searchTerm, selectedType]);

  return (
    <div className="flex flex-col h-full bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
      {/* Header with Title & + New Button */}
      <div className="p-3.5 border-b border-line bg-surface-2/40 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text tracking-tight">Blog & Ghi chú</h3>
          <p className="text-[10px] text-muted">{posts.length} bài viết đã lưu</p>
        </div>

        <button
          onClick={onNewPost}
          className="flex items-center gap-1 bg-accent hover:bg-accent-hover text-bg font-bold py-1.5 px-3 rounded-lg text-xs shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Bài mới</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-line space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tiêu đề, tag, nội dung..."
            className="w-full bg-bg-soft border border-line focus:border-accent rounded-lg pl-8 pr-3 py-1.5 text-xs text-text outline-none"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex flex-wrap gap-1">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                selectedType === t.id
                  ? 'bg-accent-soft text-accent border border-accent-border font-bold'
                  : 'bg-bg-soft text-muted hover:text-text border border-line/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Post Items Scroll */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredPosts.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            {posts.length === 0
              ? 'Chưa có bài viết nào. Hãy tạo bài viết đầu tiên!'
              : 'Không tìm thấy bài viết phù hợp.'}
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isSelected = post.id === selectedPostId;
            const snippet = post.content.replace(/#|\*|`|\[|\]/g, '').trim().slice(0, 95);

            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-surface-2 border-accent/60 shadow-md ring-1 ring-accent/30'
                    : 'bg-bg-soft hover:bg-surface-2/60 border-line'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-text line-clamp-1 leading-snug">
                    {post.title || 'Không tiêu đề'}
                  </h4>
                </div>

                <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">
                  {snippet || 'Nội dung trống...'}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-surface-3 text-muted-2 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-[9px] text-muted-2">+{post.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Footer meta */}
                <div className="flex items-center justify-between text-[10px] text-muted-2 mt-2.5 pt-2 border-t border-line/50">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-soft text-accent border border-accent-border/50">
                    {typeLabelMap[post.type] || 'Nhật ký'}
                  </span>

                  <div className="flex items-center gap-2">
                    {post.imageRefs && post.imageRefs.length > 0 && (
                      <span className="flex items-center gap-0.5 text-muted">
                        <ImageIcon className="w-3 h-3 text-accent" />
                        {post.imageRefs.length}
                      </span>
                    )}
                    <span>{formatDate(post.updatedAt || post.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
