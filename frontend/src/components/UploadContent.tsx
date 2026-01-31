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
  const { uploadToGaia, uploadToIPFS, uploadMetadata, uploading: storageUploading } = useStorage();
  const { addContent } = usePayPerView();
  const { stxAddress } = useAuth();
  const [success, setSuccess] = useState(false);
  const [contractPending, setContractPending] = useState(false);

  const uploading = storageUploading || contractPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      
      // Preliminary check
      if (!title || !contentId) {
        alert("Please fill in basic fields");
        return;
      }

      let contentUrl = '';
      if (storageType === 'gaia') {
        contentUrl = await uploadToGaia(file);
      } else {
        contentUrl = await uploadToIPFS(file);
      }
      
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
      setContractPending(true);
      await addContent(parseInt(contentId), parseInt(price), metadataUrl);
      setContractPending(false);
      
      setSuccess(true);
      // Reset form
      setTitle('');
      setDescription('');
      setContentId('');
      setPrice('');
      setTags('');
      setFile(null);
    } catch (err) {
      console.error(err);
      setContractPending(false);
      alert("Upload failed");
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
        <button
          type="submit"
          disabled={uploading}
          className={`w-full ${uploading ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2`}
        >
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
          {uploading ? 'Publishing...' : 'Publish Content'}
        </button>
        
        {success && (
          <div className="flex items-center gap-2 text-green-600 font-medium justify-center mt-2">
            <CheckCircle size={20} />
            <span>Content published successfully!</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadContent;
