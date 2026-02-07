'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useStorage } from '@/hooks/useStorage';
import { useAuth } from '@/contexts/AuthContext';
import { validateMetadata } from '@/utils/metadata';
import { usePayPerView } from '@/hooks/usePayPerView';

const UploadContent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentId, setContentId] = useState('');
  const [price, setPrice] = useState('');
  const [contentType, setContentType] = useState('video');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [storageType, setStorageType] = useState('gaia');
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [tokenType, setTokenType] = useState<'sip-009' | 'sip-010'>('sip-009');
  const [tokenContract, setTokenContract] = useState('');
  const [minBalance, setMinBalance] = useState('1');

  const { uploadToGaia, uploadToIPFS, uploadMetadata, uploading: storageUploading } = useStorage();
  const { addContent } = usePayPerView();
  const { stxAddress } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'idle' | 'storage' | 'metadata' | 'contract'>('idle');
  const [contractPending, setContractPending] = useState(false);

  const uploading = storageUploading || contractPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        alert("File size exceeds 10MB limit");
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !stxAddress) {
      alert("Please select a file and ensure you are connected");
      return;
    }

    try {
      setSuccess(false);
      setError(null);
      setUploadStep('storage');
      
      // Preliminary check
      if (!title || !contentId || !price) {
        setError("Please fill in all required fields");
        setUploadStep('idle');
        return;
      }

      let contentUrl = '';
      if (storageType === 'gaia') {
        contentUrl = await uploadToGaia(file);
      } else {
        contentUrl = await uploadToIPFS(file);
      }
      
      setUploadStep('metadata');
      const metadata = {
        title,
        description,
        contentType,
        tags: tags.split(',').map(t => t.trim()),
        contentUrl,
        createdAt: Date.now(),
        creator: stxAddress,
        contentId: parseInt(contentId)
      };

      const metadataUrl = await uploadMetadata(metadata, storageType as any);
      console.log("Metadata uploaded:", metadataUrl);

      // Call contract to register content
      setUploadStep('contract');
      setContractPending(true);
      const txId = await addContent(parseInt(contentId), parseInt(price), metadataUrl);
      
      // 4. Notify backend to store metadata and track transaction
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: parseInt(contentId),
            title,
            description,
            contentType,
            price: parseInt(price),
            creator: stxAddress,
            url: contentUrl,
            tokenGating: {
              enabled: isTokenGated,
              tokenType,
              tokenContract,
              minBalance: parseInt(minBalance)
            }
          })
        });
      } catch (backendErr) {
        console.error("Failed to notify backend:", backendErr);
      }

      setContractPending(false);
      setUploadStep('idle');
      
      setSuccess(true);
      // Reset form
      setTitle('');
      setDescription('');
      setContentId('');
      setPrice('');
      setTags('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setContractPending(false);
      setError(err.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4">Upload New Content</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Content Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Exclusive Video"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Numeric ID (for Contract)</label>
            <input
              type="number"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="1"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Tell your fans what this content is about..."
            rows={3}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="video">Video</option>
              <option value="article">Article</option>
              <option value="image">Image</option>
              <option value="music">Music</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (STX)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="10"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="crypto, web3, tutorial"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Storage Type</label>
            <select
              value={storageType}
              onChange={(e) => setStorageType(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="gaia">Gaia (Built-in)</option>
              <option value="ipfs">IPFS (Pinata)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Content File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-gray-800">Token Gating (Optional)</h4>
              <p className="text-xs text-gray-500">Require fans to hold specific tokens to access this content</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isTokenGated}
                onChange={(e) => setIsTokenGated(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {isTokenGated && (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Token Type</label>
                  <select
                    value={tokenType}
                    onChange={(e) => setTokenType(e.target.value as any)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="sip-009">SIP-009 (NFT)</option>
                    <option value="sip-010">SIP-010 (FT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Balance</label>
                  <input
                    type="number"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Token Contract Identifier</label>
                <input
                  type="text"
                  value={tokenContract}
                  onChange={(e) => setTokenContract(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="SP2KAF9...stacks-punks-v3::stacks-punks"
                  required={isTokenGated}
                />
                <p className="mt-1 text-xs text-gray-400">Format: [Principal].[ContractName]::[AssetName]</p>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading}
          className={`w-full ${uploading ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2`}
        >
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
          {uploading ? 'Publishing...' : 'Publish Content'}
        </button>

        {uploading && (
          <div className="bg-orange-50 p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2 text-sm text-orange-800">
              <div className={`w-3 h-3 rounded-full ${uploadStep === 'storage' ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
              <span>Uploading content to {storageType.toUpperCase()}...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-orange-800">
              <div className={`w-3 h-3 rounded-full ${uploadStep === 'metadata' ? 'bg-orange-500 animate-pulse' : (uploadStep === 'contract' ? 'bg-green-500' : 'bg-gray-300')}`} />
              <span>Saving metadata...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-orange-800">
              <div className={`w-3 h-3 rounded-full ${uploadStep === 'contract' ? 'bg-orange-500 animate-pulse' : 'bg-gray-300'}`} />
              <span>Waiting for blockchain confirmation...</span>
            </div>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 text-green-600 font-medium justify-center mt-2">
            <CheckCircle size={20} />
            <span>Content published successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 font-medium justify-center mt-2">
            <span className="bg-red-50 p-2 rounded-md w-full text-center">{error}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadContent;
