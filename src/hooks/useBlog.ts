import { useState, useEffect, useCallback } from 'react';
import { BlogPost, BlogPostFormData } from '../types/blog';
import { getAllBlogPosts, saveBlogPost, deleteBlogPost, getBlogPostById } from '../db/blogRepository';
import { getImagesByIds, saveImage, deleteImage } from '../db/imageRepository';
import { compressImageFile } from '../utils/imageCompressor';
import { ImageRecord } from '../types/trade';

export function useBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPosts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getAllBlogPosts();
      setPosts(list);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const savePostWithImages = async (formData: BlogPostFormData): Promise<BlogPost> => {
    const id = formData.id || `blog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const finalImageRefs: string[] = [];

    // Keep existing images
    if (formData.existingImages && formData.existingImages.length > 0) {
      for (const img of formData.existingImages) {
        finalImageRefs.push(img.id);
      }
    }

    // Process new images (compress and save blob)
    if (formData.newImages && formData.newImages.length > 0) {
      for (const file of formData.newImages) {
        const { blob, mimeType } = await compressImageFile(file);
        const imageId = `img-blog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const imageRecord: ImageRecord = {
          id: imageId,
          ownerType: 'blog',
          ownerId: id,
          name: file.name,
          mimeType,
          blob,
          createdAt: now,
        };
        await saveImage(imageRecord);
        finalImageRefs.push(imageId);
      }
    }

    // Clean up any removed images
    const oldPost = posts.find((p) => p.id === id);
    if (oldPost && oldPost.imageRefs) {
      const removedIds = oldPost.imageRefs.filter((oldId) => !finalImageRefs.includes(oldId));
      for (const remId of removedIds) {
        await deleteImage(remId);
      }
    }

    const postToSave: BlogPost = {
      id,
      title: formData.title.trim() || 'Không tiêu đề',
      type: formData.type,
      tags: formData.tags || [],
      content: formData.content,
      imageRefs: finalImageRefs,
      createdAt: oldPost?.createdAt || now,
      updatedAt: now,
    };

    await saveBlogPost(postToSave);
    await refreshPosts();
    return postToSave;
  };

  const removePost = async (id: string): Promise<void> => {
    await deleteBlogPost(id);
    await refreshPosts();
  };

  const loadPostImages = async (imageRefs: string[]): Promise<ImageRecord[]> => {
    return getImagesByIds(imageRefs);
  };

  const getPost = async (id: string): Promise<BlogPost | undefined> => {
    return getBlogPostById(id);
  };

  return {
    posts,
    loading,
    savePostWithImages,
    removePost,
    loadPostImages,
    getPost,
    refreshPosts,
  };
}
