import { useState, useEffect, useCallback } from 'react';
import { BlogPost, BlogPostFormData } from '../types/blog';
import { getAllBlogPosts, saveBlogPost, deleteBlogPost, getBlogPostById } from '../db/blogRepository';
import { getImagesByIds, saveImage, deleteImage, getImageById } from '../db/imageRepository';
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

    const imageRefSet = new Set<string>();

    // 1. Keep existing images passed in formData
    if (formData.existingImages && formData.existingImages.length > 0) {
      for (const img of formData.existingImages) {
        imageRefSet.add(img.id);
      }
    }

    // 2. Automatically extract image IDs embedded in markdown content: /api/images/(id)
    const inlineImageRegex = /\/api\/images\/([a-zA-Z0-9_-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = inlineImageRegex.exec(formData.content || '')) !== null) {
      if (match[1]) {
        imageRefSet.add(match[1]);
      }
    }

    // 3. Process any new file uploads if passed
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
        imageRefSet.add(imageId);
      }
    }

    const finalImageRefs = Array.from(imageRefSet);

    // 4. Update ownerId for all images referenced by this post
    for (const imgId of finalImageRefs) {
      const img = await getImageById(imgId);
      if (img && img.ownerId !== id) {
        img.ownerId = id;
        await saveImage(img);
      }
    }

    // 5. Clean up deleted images that were previously in old post
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
    // Delete all associated images
    const postToDelete = posts.find((p) => p.id === id);
    if (postToDelete && postToDelete.imageRefs) {
      for (const imgId of postToDelete.imageRefs) {
        await deleteImage(imgId);
      }
    }
    await deleteBlogPost(id);
    await refreshPosts();
  };

  const loadPostImages = async (imageRefs: string[]): Promise<ImageRecord[]> => {
    if (!imageRefs || imageRefs.length === 0) return [];
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
