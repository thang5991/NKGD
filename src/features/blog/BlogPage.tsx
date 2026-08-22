import React, { useState, useMemo } from 'react';
import { useBlog } from '../../hooks/useBlog';
import { BlogList } from './BlogList';
import { BlogEditor } from './BlogEditor';
import { BlogView } from './BlogView';
import { BlogPostFormData } from '../../types/blog';
import { PlusCircle, BookOpen, ArrowLeft } from 'lucide-react';

export const BlogPage: React.FC = () => {
  const { posts, loading, savePostWithImages, removePost, loadPostImages } = useBlog();

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showMobilePane, setShowMobilePane] = useState(false);

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
    setIsEditing(false); // Default to clean view mode
    setSelectedPostId(id);
    setShowMobilePane(true);
  };

  const handleNewPost = () => {
    setIsCreatingNew(true);
    setIsEditing(true); // Edit mode for new post
    setSelectedPostId(null);
    setShowMobilePane(true);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isCreatingNew) {
      setIsCreatingNew(false);
      setIsEditing(false);
      if (posts.length > 0) {
        setSelectedPostId(posts[0].id);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = async (data: BlogPostFormData) => {
    const saved = await savePostWithImages(data);
    setIsCreatingNew(false);
    setIsEditing(false); // Switch to clean reading view after saving
    setSelectedPostId(saved.id);
  };

  const handleDelete = async (id: string) => {
    await removePost(id);
    setSelectedPostId(null);
    setIsCreatingNew(false);
    setIsEditing(false);
    setShowMobilePane(false);
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
          showMobilePane ? 'hidden lg:block' : 'block'
        }`}
      >
        <BlogList
          posts={posts}
          selectedPostId={activePost?.id || (isCreatingNew ? 'new' : null)}
          onSelectPost={handleSelectPost}
          onNewPost={handleNewPost}
        />
      </div>

      {/* Right Content Column (8 cols on lg): View vs Edit */}
      <div
        className={`lg:col-span-8 h-full flex flex-col ${
          !showMobilePane && posts.length > 0 ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Mobile Back Button */}
        <div className="lg:hidden mb-2">
          <button
            onClick={() => setShowMobilePane(false)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-text px-2 py-1 rounded bg-surface border border-line"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách</span>
          </button>
        </div>

        {isEditing ? (
          /* EDIT MODE: Only shown when creating new or clicking "Chỉnh sửa" */
          <div className="flex-1 overflow-y-auto">
            <BlogEditor
              post={isCreatingNew ? null : activePost}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              onDelete={handleDelete}
              loadImages={loadPostImages}
            />
          </div>
        ) : activePost ? (
          /* VIEW MODE: Clean, elegant reading mode without editor clutter */
          <div className="flex-1 overflow-y-auto">
            <BlogView
              post={activePost}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              onNewPost={handleNewPost}
              loadImages={loadPostImages}
            />
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 bg-surface border border-line rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">Chưa có bài viết nào</h3>
            <p className="text-xs text-muted max-w-sm mb-5 leading-relaxed">
              Tạo bài viết mới để lưu trữ phân tích kỹ thuật, chiến lược, nhật ký tâm lý và đính kèm hình ảnh biểu đồ trực tiếp vào nội dung.
            </p>
            <button
              onClick={handleNewPost}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg font-bold py-2.5 px-5 rounded-lg text-xs shadow-sm transition-all"
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
