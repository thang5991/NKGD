import React, { useState, useMemo } from 'react';
import { useBlog } from '../../hooks/useBlog';
import { BlogList } from './BlogList';
import { BlogEditor } from './BlogEditor';
import { BlogPostFormData } from '../../types/blog';
import { PlusCircle, BookOpen, ArrowLeft } from 'lucide-react';

export const BlogPage: React.FC = () => {
  const { posts, loading, savePostWithImages, removePost, loadPostImages } = useBlog();

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);

  // Active selected post
  const activePost = useMemo(() => {
    if (isCreatingNew) return null;
    if (!selectedPostId && posts.length > 0) {
      return posts[0];
    }
    return posts.find((p) => p.id === selectedPostId) || null;
  }, [posts, selectedPostId, isCreatingNew]);

  const handleSelectPost = (id: string) => {
    setIsCreatingNew(false);
    setSelectedPostId(id);
    setShowMobileEditor(true);
  };

  const handleNewPost = () => {
    setIsCreatingNew(true);
    setSelectedPostId(null);
    setShowMobileEditor(true);
  };

  const handleSave = async (data: BlogPostFormData) => {
    const saved = await savePostWithImages(data);
    setIsCreatingNew(false);
    setSelectedPostId(saved.id);
  };

  const handleDelete = async (id: string) => {
    await removePost(id);
    setSelectedPostId(null);
    setIsCreatingNew(false);
    setShowMobileEditor(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-xs">
        Đang tải danh sách bài viết...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] min-h-[620px]">
      {/* Left List Column (4 cols on lg) */}
      <div
        className={`lg:col-span-4 h-full ${
          showMobileEditor ? 'hidden lg:block' : 'block'
        }`}
      >
        <BlogList
          posts={posts}
          selectedPostId={activePost?.id || (isCreatingNew ? 'new' : null)}
          onSelectPost={handleSelectPost}
          onNewPost={handleNewPost}
        />
      </div>

      {/* Right Editor Column (8 cols on lg) */}
      <div
        className={`lg:col-span-8 h-full flex flex-col ${
          !showMobileEditor && posts.length > 0 ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Mobile Back Button */}
        <div className="lg:hidden mb-2">
          <button
            onClick={() => setShowMobileEditor(false)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-text px-2 py-1 rounded bg-surface border border-line"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách</span>
          </button>
        </div>

        {activePost || isCreatingNew ? (
          <div className="flex-1 overflow-y-auto">
            <BlogEditor
              post={isCreatingNew ? null : activePost}
              onSave={handleSave}
              onDelete={handleDelete}
              loadImages={loadPostImages}
            />
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 bg-surface border border-line rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">Chưa chọn bài viết</h3>
            <p className="text-xs text-muted max-w-sm mb-5 leading-relaxed">
              Tạo bài viết mới để lưu trữ phân tích kỹ thuật, chiến lược, nhật ký tâm lý và đính kèm hình ảnh biểu đồ.
            </p>
            <button
              onClick={handleNewPost}
              className="flex items-center gap-2 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-2.5 px-5 rounded-lg text-xs shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo bài viết mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
