import { ImageRecord } from './trade';

export type BlogType = 'journal' | 'analysis' | 'strategy' | 'lesson' | 'blog';

export interface BlogPost {
  id: string;
  title: string;
  type: BlogType;
  tags: string[];
  content: string;
  imageRefs: string[]; // List of ImageRecord IDs
  createdAt: string;
  updatedAt: string;
}

export type BlogPostFormData = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'imageRefs'> & {
  id?: string;
  imageRefs?: string[];
  newImages?: File[];
  existingImages?: ImageRecord[];
};
