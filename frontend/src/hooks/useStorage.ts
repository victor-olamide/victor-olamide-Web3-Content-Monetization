import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useStorage = () => {
  const { userData } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);

  const uploadToGaia = async (file: File) => {
    setUploading(true);
    try {
      // In a real Stacks app:
      // const storage = new Storage({ userSession });
      // const url = await storage.putFile(file.name, file);
      
      // Simulate Gaia upload
      console.log(`Uploading ${file.name} to Gaia...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockUrl = `https://gaia.stacks.co/${userData?.profile?.stxAddress?.mainnet}/${file.name}`;
      setLastUploadedUrl(mockUrl);
      setUploading(false);
      return mockUrl;
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
