export type FolderProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  at: number;
};

export type Folder = {
  id: string;
  name: string;
  count: number;
  projects: FolderProject[];
};

export const FOLDER_NAME_MAX = 60;
