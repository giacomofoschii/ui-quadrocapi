export type Card = {
  id: string;
  name: string;
  groupId: string | null;
  symbols: string[];
  px?: number;
  py?: number;
};

export type Group = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Board = {
  id: string;
  name: string;
  cards: Card[];
  groups: Group[];
  canvasData: string | null;
};
