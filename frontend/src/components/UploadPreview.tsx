import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface UploadPreviewProps {
  contentId: number;
  contentTitle: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UploadProgress {
  [key: string]: number;
}

/**
 * UploadPreview Component
 * Allows creators to upload thumbnails and trailers for content preview
 */
export const UploadPreview: React.FC<UploadPreviewProps> = ({
  contentId,
  contentTitle,
  onSuccess,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'thumbnail' | 'trailer' | 'metadata'>('thumbnail');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [trailer, setTrailer] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [trailerDuration, setTrailerDuration] = useState('');
  const [thumbnailQuality, setThumbnailQuality] = useState('high');
  const [trailerQuality, setTrailerQuality] = useState('720p');

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be smaller than 10MB');
      return;
    }

    setThumbnail(file);
    setError(null);
  };

  const handleTrailerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      setError('Video file must be smaller than 500MB');
      return;
    }

    setTrailer(file);
    setError(null);
  };

  const uploadThumbnail = async () => {
    if (!thumbnail) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('thumbnail', thumbnail);
      formData.append('quality', thumbnailQuality);

      const response = await fetch(`/api/preview/${contentId}/thumbnail`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload thumbnail');
      }

      setSuccess(true);
      setThumbnail(null);
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const uploadTrailer = async () => {
    if (!trailer) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('trailer', trailer);
      formData.append('duration', trailerDuration || '0');
      formData.append('quality', trailerQuality);

      const response = await fetch(`/api/preview/${contentId}/trailer`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload trailer');
      }

      setSuccess(true);
      setTrailer(null);
      setTrailerDuration('');
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const updateMetadata = async () => {
    try {
      setUploading(true);
      setError(null);

      const response = await fetch(`/api/preview/${contentId}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewText,
          previewImageUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update metadata');
      }

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Update failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Upload Preview Content</h2>
        <p className="text-gray-600">Content: {contentTitle}</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-semibold">✓ Upload successful!</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        {(['thumbnail', 'trailer', 'metadata'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Thumbnail Tab */}
      {activeTab === 'thumbnail' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Thumbnail Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="hidden"
                id="thumbnail-input"
              />
              <label
                htmlFor="thumbnail-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="font-semibold text-gray-700">
                  {thumbnail ? thumbnail.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
          </div>

          {thumbnail && (
            <div className="flex items-center gap-2">
              <img
                src={URL.createObjectURL(thumbnail)}
                alt="Thumbnail preview"
                className="h-20 w-20 object-cover rounded"
              />
              <div className="flex-1">
                <p className="font-semibold">{thumbnail.name}</p>
                <p className="text-sm text-gray-500">
                  {(thumbnail.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setThumbnail(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">Quality</label>
            <select
              value={thumbnailQuality}
              onChange={(e) => setThumbnailQuality(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low (240p)</option>
              <option value="medium">Medium (480p)</option>
              <option value="high">High (1080p)</option>
              <option value="ultra">Ultra (2K/4K)</option>
            </select>
          </div>

          <button
            onClick={uploadThumbnail}
            disabled={!thumbnail || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Thumbnail'}
          </button>
        </div>
      )}

      {/* Trailer Tab */}
      {activeTab === 'trailer' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Trailer Video</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleTrailerSelect}
                className="hidden"
                id="trailer-input"
              />
              <label
                htmlFor="trailer-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="font-semibold text-gray-700">
                  {trailer ? trailer.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">MP4, WebM up to 500MB</p>
              </label>
            </div>
          </div>

          {trailer && (
            <div className="flex items-center gap-2">
              <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                <p className="text-xs font-semibold text-gray-600">VIDEO</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{trailer.name}</p>
                <p className="text-sm text-gray-500">
                  {(trailer.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setTrailer(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Duration (seconds)</label>
              <input
                type="number"
                value={trailerDuration}
                onChange={(e) => setTrailerDuration(e.target.value)}
                placeholder="e.g., 60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Quality</label>
              <select
                value={trailerQuality}
                onChange={(e) => setTrailerQuality(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="360p">360p</option>
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>
          </div>

          <button
            onClick={uploadTrailer}
            disabled={!trailer || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Trailer'}
          </button>
        </div>
      )}

      {/* Metadata Tab */}
      {activeTab === 'metadata' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Preview Text</label>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Write a compelling preview description for your content..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Max 500 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Preview Image URL</label>
            <input
              type="url"
              value={previewImageUrl}
              onChange={(e) => setPreviewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {previewImageUrl && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-h-40 rounded"
                onError={() => setError('Failed to load preview image')}
              />
            </div>
          )}

          <button
            onClick={updateMetadata}
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {uploading ? 'Saving...' : 'Save Metadata'}
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPreview;
