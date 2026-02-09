'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Music,
  Video,
  File,
  X,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { useIPFSUpload, type IPFSUploadProgress } from '@/hooks/useIPFSUpload';
import { useAuth } from '@/contexts/AuthContext';
import { usePayPerView } from '@/hooks/usePayPerView';

interface ContentMetadata {
  title: string;
  description: string;
  contentType: 'video' | 'article' | 'image' | 'music' | 'document';
  price: number;
  tags: string[];
  tokenGated?: {
    enabled: boolean;
    tokenType: 'sip-009' | 'sip-010';
    tokenContract: string;
    minBalance: number;
  };
}

interface UploadedFile {
  file: File;
  preview: string | null;
  progress: number;
  ipfsHash: string | null;
  error: string | null;
}

const ContentUploadInterface: React.FC = () => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'video' | 'article' | 'image' | 'music' | 'document'>('video');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [tokenType, setTokenType] = useState<'sip-009' | 'sip-010'>('sip-009');
  const [tokenContract, setTokenContract] = useState('');
  const [minBalance, setMinBalance] = useState('1');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'validating' | 'uploading' | 'registering' | 'complete'>('idle');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { uploadToIPFS, progress: uploadProgress, validateFile } = useIPFSUpload();
  const { stxAddress } = useAuth();
  const { addContent } = usePayPerView();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragZoneRef = useRef<HTMLDivElement>(null);

  /**
   * Get icon for content type
   */
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} />;
      case 'music':
        return <Music size={16} />;
      case 'image':
        return <ImageIcon size={16} />;
      case 'document':
        return <File size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  /**
   * Handle file selection
   */
  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`);
        return;
      }

      // Create preview for images
      let preview: string | null = null;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview = e.target?.result as string;
          addFileToList(file, preview);
        };
        reader.readAsDataURL(file);
      } else {
        addFileToList(file, preview);
      }
    });
  };

  /**
   * Add file to upload list
   */
  const addFileToList = (file: File, preview: string | null = null) => {
    setSelectedFiles(prev => [...prev, {
      file,
      preview,
      progress: 0,
      ipfsHash: null,
      error: null
    }]);
  };

  /**
   * Remove file from list
   */
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  /**
   * Handle drag leave
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Upload all files
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stxAddress) {
      setError('Please connect your wallet');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (!title || !price) {
      setError('Please fill in title and price');
      return;
    }

    setUploading(true);
    setUploadStep('validating');
    setError(null);
    setSuccess(false);

    try {
      const uploadedHashes: string[] = [];

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const fileData = selectedFiles[i];
        setUploadStep('uploading');

        try {
          const ipfsHash = await uploadToIPFS(fileData.file, {
            metadata: {
              title,
              description,
              contentType,
              creator: stxAddress,
              uploadedAt: new Date().toISOString()
            },
            tags: tags.split(',').map(t => t.trim()).filter(t => t)
          });

          uploadedHashes.push(ipfsHash);
          
          // Update file progress
          setSelectedFiles(prev => {
            const updated = [...prev];
            updated[i].ipfsHash = ipfsHash;
            updated[i].progress = 100;
            return updated;
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Upload failed';
          setSelectedFiles(prev => {
            const updated = [...prev];
            updated[i].error = errorMsg;
            return updated;
          });
          throw err;
        }
      }

      // Register content on blockchain
      setUploadStep('registering');
      
      try {
        // For now, we'll just register the first file
        // In a production app, you might create a collection or batch
        const contentId = Math.floor(Math.random() * 1000000);
        const ipfsUrl = uploadedHashes[0];
        const priceSTX = parseInt(price);

        const txId = await addContent(contentId, priceSTX, ipfsUrl);

        // Notify backend to store metadata
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            title,
            description,
            contentType,
            price: priceSTX,
            creator: stxAddress,
            url: ipfsUrl,
            ipfsHashes: uploadedHashes,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
            tokenGating: isTokenGated ? {
              enabled: true,
              tokenType,
              tokenContract,
              minBalance: parseInt(minBalance)
            } : null,
            transactionId: txId
          })
        }).catch(err => console.error('Backend notification failed:', err));

        setUploadStep('complete');
        setSuccess(true);

        // Reset form
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setPrice('');
          setTags('');
          setSelectedFiles([]);
          setContentType('video');
          setIsTokenGated(false);
          setUploadStep('idle');
        }, 2000);
      } catch (blockchainErr) {
        const errorMsg = blockchainErr instanceof Error ? blockchainErr.message : 'Blockchain registration failed';
        setError(errorMsg);
        setUploadStep('idle');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      setUploadStep('idle');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Upload size={32} className="text-orange-500" />
            Upload Content to IPFS
          </h1>
          <p className="text-gray-600 mt-2">
            Publish your content directly to IPFS with real-time progress tracking
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Content Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Exclusive Content"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (STX) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="10"
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    required
                  />
                  <span className="absolute right-4 top-2.5 text-gray-500 text-sm">STX</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell your audience what this content is about..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content Type *
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                >
                  <option value="video">📹 Video</option>
                  <option value="music">🎵 Music</option>
                  <option value="image">🖼️ Image</option>
                  <option value="document">📄 Document</option>
                  <option value="article">📝 Article</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="crypto, web3, tutorial"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Upload Files</h2>
            
            {/* Drag and drop zone */}
            <div
              ref={dragZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 bg-gray-50 hover:border-orange-500 hover:bg-orange-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.txt"
              />
              
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} className="text-orange-500" />
                <p className="font-semibold text-gray-900">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-gray-600">
                  Supports: Images, Videos, Audio, PDF, Text (Max 100MB)
                </p>
              </div>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">
                  Selected Files ({selectedFiles.length})
                </h3>
                <div className="space-y-2">
                  {selectedFiles.map((fileData, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      {/* Preview or icon */}
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        {fileData.preview ? (
                          <img
                            src={fileData.preview}
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          getContentTypeIcon(contentType)
                        )}
                      </div>

                      {/* File info */}
                      <div className="flex-grow min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {fileData.file.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(fileData.file.size)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {fileData.ipfsHash ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={18} />
                            <span className="text-xs font-medium">Uploaded</span>
                          </div>
                        ) : fileData.error ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle size={18} />
                            <span className="text-xs font-medium">Failed</span>
                          </div>
                        ) : fileData.progress > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 transition-all"
                                style={{ width: `${fileData.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-6">
                              {fileData.progress}%
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Remove button */}
                      {!uploading && !fileData.ipfsHash && (
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-gray-200 rounded transition"
                        >
                          <X size={18} className="text-gray-600" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 font-semibold text-gray-900 hover:text-orange-500 transition"
            >
              {showAdvanced ? <EyeOff size={18} /> : <Eye size={18} />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Token Gating</h3>
                    <p className="text-sm text-gray-600">
                      Require fans to hold specific tokens to access this content
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTokenGated}
                      onChange={(e) => setIsTokenGated(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                  </label>
                </div>

                {isTokenGated && (
                  <div className="space-y-3 pt-3 border-t border-gray-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Token Type
                        </label>
                        <select
                          value={tokenType}
                          onChange={(e) => setTokenType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                        >
                          <option value="sip-009">SIP-009 (NFT)</option>
                          <option value="sip-010">SIP-010 (Fungible Token)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Balance
                        </label>
                        <input
                          type="number"
                          value={minBalance}
                          onChange={(e) => setMinBalance(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Token Contract Identifier
                      </label>
                      <input
                        type="text"
                        value={tokenContract}
                        onChange={(e) => setTokenContract(e.target.value)}
                        placeholder="SP2KAF9...stacks-punks::stacks-punks"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Format: [Principal].[ContractName]::[AssetName]
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Messages */}
          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 size={20} className="text-blue-600 animate-spin" />
                <span className="font-medium text-blue-900">
                  {uploadStep === 'validating' && 'Validating files...'}
                  {uploadStep === 'uploading' && 'Uploading to IPFS...'}
                  {uploadStep === 'registering' && 'Registering on blockchain...'}
                  {uploadStep === 'complete' && 'Completing upload...'}
                </span>
              </div>

              {uploadProgress && uploadProgress.status === 'uploading' && (
                <div className="space-y-2">
                  <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${uploadProgress.percentComplete}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-700">
                    {uploadProgress.percentComplete}% - {formatFileSize(uploadProgress.uploadedBytes)} / {formatFileSize(uploadProgress.totalBytes)}
                  </p>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Success!</p>
                <p className="text-sm text-green-800">
                  Your content has been uploaded and registered on the blockchain.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                uploading || selectedFiles.length === 0
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Publish to IPFS
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Upload History */}
      {/* This could be added as a separate component */}
    </div>
  );
};

export default ContentUploadInterface;
