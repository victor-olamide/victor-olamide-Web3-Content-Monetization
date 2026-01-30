export interface ContentMetadata {
  title: string;
  description: string;
  contentType: string;
  contentUrl: string;
  thumbnailUrl?: string;
  createdAt: number;
  creator: string;
  contentId: number;
}

export const createMetadataBlob = (metadata: ContentMetadata) => {
  return new Blob([JSON.stringify(metadata)], { type: 'application/json' });
};

export const parseMetadata = (metadataString: string): ContentMetadata => {
  return JSON.parse(metadataString);
};
