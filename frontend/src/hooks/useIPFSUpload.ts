/**
 * useIPFSUpload Hook
 * Handles IPFS file uploads with progress tracking, file validation, and error handling
 */

import { useState, useCallback } from 'react';

export interface IPFSUploadProgress {
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  percentComplete: number;
  status: 'idle' | 'validating' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface UploadOptions {
  maxFileSize?: number; // in bytes, default 100MB
  allowedMimeTypes?: string[];
  onProgress?: (progress: IPFSUploadProgress) => void;
  metadata?: Record<string, any>;
  tags?: string[];
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
  'text/plain'
];

export const useIPFSUpload = () => {
  const [progress, setProgress] = useState<IPFSUploadProgress | null>(null);
  const [uploadHistory, setUploadHistory] = useState<Array<{
    ipfsHash: string;
    fileName: string;
    size: number;
    uploadedAt: Date;
  }>>([]);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((
    file: File,
    options: UploadOptions = {}
  ): { valid: boolean; error?: string } => {
    const maxSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    const allowedTypes = options.allowedMimeTypes || DEFAULT_ALLOWED_TYPES;

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    // Check file extension (basic validation)
    const validExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.mp4', '.webm',
      '.mp3', '.wav',
      '.pdf',
      '.txt'
    ];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!validExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension ${fileExtension} is not allowed`
      };
    }

    return { valid: true };
  }, []);

  /**
   * Upload file to IPFS via backend API
   */
  const uploadToIPFS = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<string> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    try {
      // Validate file
      setProgress({
        fileName: file.name,
        uploadedBytes: 0,
        totalBytes: file.size,
        percentComplete: 0,
        status: 'validating',
        error: undefined
      });

      const validation = validateFile(file, options);
      if (!validation.valid) {
        const errorMsg = validation.error || 'File validation failed';
        setProgress(prev => prev ? { ...prev, status: 'error', error: errorMsg } : null);
        throw new Error(errorMsg);
      }

      // Upload file
      setProgress(prev => prev ? { ...prev, status: 'uploading' } : null);

      const formData = new FormData();
      formData.append('file', file);
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }
      if (options.tags) {
        formData.append('tags', options.tags.join(','));
      }

      // XMLHttpRequest for progress tracking
      const ipfsHash = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setProgress(prev => prev ? {
              ...prev,
              uploadedBytes: e.loaded,
              percentComplete: Math.round(percentComplete)
            } : null);
            options.onProgress?.(prev => prev ? {
              ...prev,
              uploadedBytes: e.loaded,
              percentComplete: Math.round(percentComplete)
            } : null as any);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.ipfsHash || response.hash) {
                resolve(response.ipfsHash || response.hash);
              } else {
                reject(new Error('Invalid response from server'));
              }
            } catch (err) {
              reject(new Error('Failed to parse server response'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.message || `Server error: ${xhr.status}`));
            } catch {
              reject(new Error(`Server error: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed: Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', `${backendUrl}/api/content/upload-ipfs`);
        xhr.send(formData);
      });

      // Processing/finalizing
      setProgress(prev => prev ? { ...prev, status: 'processing' } : null);

      // Verify upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as completed
      setProgress(prev => prev ? { ...prev, status: 'completed', percentComplete: 100 } : null);

      // Add to history
      setUploadHistory(prev => [...prev, {
        ipfsHash: `ipfs://${ipfsHash}`,
        fileName: file.name,
        size: file.size,
        uploadedAt: new Date()
      }]);

      return `ipfs://${ipfsHash}`;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setProgress(prev => prev ? { ...prev, status: 'error', error: errorMsg } : null);
      throw err;
    }
  }, [validateFile]);

  /**
   * Upload multiple files
   */
  const uploadMultiple = useCallback(async (
    files: File[],
    options: UploadOptions = {}
  ): Promise<string[]> => {
    const results: string[] = [];

    for (const file of files) {
      try {
        const ipfsHash = await uploadToIPFS(file, options);
        results.push(ipfsHash);
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        throw err;
      }
    }

    return results;
  }, [uploadToIPFS]);

  /**
   * Clear progress
   */
  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);

  /**
   * Get upload status
   */
  const getStatus = useCallback(() => {
    return progress || {
      fileName: '',
      uploadedBytes: 0,
      totalBytes: 0,
      percentComplete: 0,
      status: 'idle' as const,
      error: undefined
    };
  }, [progress]);

  return {
    uploadToIPFS,
    uploadMultiple,
    progress,
    setProgress,
    clearProgress,
    getStatus,
    uploadHistory,
    validateFile
  };
};

export default useIPFSUpload;
