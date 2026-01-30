import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Storage } from '@stacks/storage';

export const useStorage = () => {
  const { userSession } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);

  const uploadToGaia = async (file: File) => {
    setUploading(true);
    try {
      const storage = new Storage({ userSession });
      const fileName = `${Date.now()}-${file.name}`;
      const url = await storage.putFile(fileName, file, {
        encrypt: false,
        contentType: file.type
      });
      
      setLastUploadedUrl(url);
      setUploading(false);
      return url;
    } catch (err) {
      console.error("Gaia upload failed:", err);
      setUploading(false);
      throw err;
    }
  };

  const uploadToIPFS = async (file: File) => {
    setUploading(true);
    try {
      // In a real app, you would send to your backend which uploads to IPFS
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/upload-ipfs`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      const url = data.ipfsUrl;
      
      setLastUploadedUrl(url);
      setUploading(false);
      return url;
    } catch (err) {
      console.error("IPFS upload failed:", err);
      setUploading(false);
      throw err;
    }
  };

  const uploadMetadata = async (metadata: any, type: 'gaia' | 'ipfs' = 'gaia') => {
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const file = new File([blob], `metadata-${metadata.contentId}.json`, { type: 'application/json' });
    
    if (type === 'gaia') {
      return uploadToGaia(file);
    } else {
      return uploadToIPFS(file);
    }
  };

  return { uploadToGaia, uploadToIPFS, uploadMetadata, uploading, lastUploadedUrl };
};
