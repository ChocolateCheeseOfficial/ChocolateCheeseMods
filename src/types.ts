export interface ModFile {
  path: string;
  content: string;
}

export interface GeneratedMod {
  id?: number;
  name: string;
  description: string;
  category?: string;
  files: ModFile[];
  author?: string;
  created_at?: string;
}

export interface Rating {
  id: number;
  mod_id: number;
  rating: number;
  comment: string;
  user: string;
  created_at: string;
}

export type View = 'forge' | 'community' | 'tutorial' | 'editor' | 'auth' | 'history' | 'admin' | 'banned_mods' | 'profile' | 'messages' | 'wizard' | 'tester';
