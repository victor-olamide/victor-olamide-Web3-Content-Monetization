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
      // Simulate IPFS upload
      console.log(`Uploading ${file.name} to IPFS...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockCid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
      const mockUrl = `ipfs://${mockCid}`;
      setLastUploadedUrl(mockUrl);
      setUploading(false);
      return mockUrl;
    } catch (err) {
      console.error("IPFS upload failed:", err);
      setUploading(false);
      throw err;
    }
  };

  return { uploadToGaia, uploadToIPFS, uploading, lastUploadedUrl };
};
