/**
 * Shared domain types for Content entities.
 * Use these instead of `any` throughout the frontend.
 */

export type ContentType = 'video' | 'article' | 'image' | 'music';
export type StorageType = 'gaia' | 'ipfs';
export type TokenType = 'sip-009' | 'sip-010';

export interface TokenGatingConfig {
  enabled: boolean;
  tokenType: TokenType;
  tokenContract: string;
  minBalance: number;
}

/** Shape returned by the backend GET /api/content/:id endpoint */
export interface Content {
  _id?: string;
  contentId: number;
  title: string;
  description: string;
  contentType: ContentType;
  /** Alias used by some endpoints */
  type?: ContentType;
  price: number;
  creator: string;
  url?: string;
  purchases?: number;
  tokenGating?: TokenGatingConfig;
  tags?: string[];
  createdAt?: string | number;
}

/** Shape used when creating/uploading new content */
export interface ContentMetadata {
  title: string;
  description: string;
  contentType: ContentType;
  tags: string[];
  contentUrl: string;
  createdAt: number;
  creator: string;
  contentId: number;
}

/** Shape of an individual earning / export row */
export interface EarningRecord {
  contentId: string | number;
  title?: string;
  type?: string;
  amount: number;
  buyer?: string;
  date?: string;
  txId?: string;
}
