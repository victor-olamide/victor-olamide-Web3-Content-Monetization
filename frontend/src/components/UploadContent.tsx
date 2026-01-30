'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { useStorage } from '@/hooks/useStorage';

const UploadContent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [contentId, setContentId] = useState('');
  const [price, setPrice] = useState('');
  const [contentType, setContentType] = useState('video');
  const [file, setFile] = useState<File | null>(null);
  const [storageType, setStorageType] = useState('gaia');
  const { uploadToGaia, uploadToIPFS, uploading, lastUploadedUrl } = useStorage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file first");
      return;
    }

    try {
      let url = '';
      if (storageType === 'gaia') {
        url = await uploadToGaia(file);
      } else {
        url = await uploadToIPFS(file);
      }
      
      console.log("Uploaded successfully:", url);
      // Proceed to register content on contract/backend
    } catch (err) {
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
        </div>
        <button
          type="submit"
          className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded hover:bg-orange-600 transition flex items-center justify-center gap-2"
        >
          <Upload size={20} />
          Publish Content
        </button>
      </form>
    </div>
  );
};

export default UploadContent;
