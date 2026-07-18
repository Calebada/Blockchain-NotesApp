export type Note = {
  author: string;
  content: string;
  securedAt?: string;
};

export type BlockfrostProvider = {
  name: string;
  network: string;
  configured: boolean;
  storage?: {
    name: string;
    table?: string;
    configured: boolean;
  };
};

export type CardanoBlock = {
  hash: string;
  height: number;
  slot: number;
  epoch: number;
  txCount: number;
  time: string;
};

export type NoteAnchor = {
  provider: string;
  network: string;
  blockHash: string;
  blockHeight: number;
  slot: number;
  epoch: number;
  txCount: number;
  blockTime: string;
};

export type ChainBlock = {
  index: number;
  timestamp: string;
  note: Note;
  previousHash: string;
  hash: string;
  anchor: NoteAnchor;
};

export type ChainResponse = {
  valid: boolean;
  length: number;
  provider: BlockfrostProvider;
  latestBlock: CardanoBlock;
  chain: ChainBlock[];
};
