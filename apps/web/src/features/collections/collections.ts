export type CollectionCard = {
  id: string;
  name: string;
  count: number;
  covers: string[];
};

export type MyCollection = {
  id: string;
  name: string;
  count: number;
  has: boolean;
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
};
