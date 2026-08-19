import { dbGet, dbGetAll, dbPut, dbDelete, STORES } from './indexedDb';
import { BlogPost } from '../types/blog';
import { deleteImagesByOwner } from './imageRepository';

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await dbGetAll<BlogPost>(STORES.blog);
  return posts.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

export async function getBlogPostById(id: string): Promise<BlogPost | undefined> {
  return dbGet<BlogPost>(STORES.blog, id);
}

export async function saveBlogPost(post: BlogPost): Promise<void> {
  await dbPut(STORES.blog, post);
}

export async function deleteBlogPost(id: string): Promise<void> {
  await dbDelete(STORES.blog, id);
  // Auto clean associated blog images
  await deleteImagesByOwner('blog', id);
}
