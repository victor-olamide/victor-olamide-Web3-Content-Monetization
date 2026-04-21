'use client';

import React, { useState } from 'react';
import { Trash2, Edit, Eye } from 'lucide-react';
import Link from 'next/link';
import { ContentItem } from '@/utils/creatorApi';

interface CreatorContentTableProps {
  content: ContentItem[];
  loading?: boolean;
  onDelete?: (contentId: number) => Promise<boolean>;
  onEdit?: (content: ContentItem) => void;
}

/**
 * Component to display creator's content in a table
 */
export function CreatorContentTable({
  content,
  loading = false,
  onDelete,
  onEdit
}: CreatorContentTableProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (contentId: number) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;

    setDeletingId(contentId);
    setDeleteError(null);

    try {
      if (onDelete) {
        const success = await onDelete(contentId);
        if (!success) {
          setDeleteError('Failed to delete content');
        }
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting content');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        <p className="mt-4 text-gray-600">Loading content...</p>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
          <Eye className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
        <p className="text-gray-600 mb-6">You haven't uploaded any content yet.</p>
        <Link
          href="/dashboard/creator/upload"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Upload Content
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Purchases
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {content.map((item) => (
              <tr key={item.contentId} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-500">ID: {item.contentId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {item.contentType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.price} STX
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {item.views || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {item.purchases || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                  {(item.revenue || 0).toFixed(2)} STX
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <Link
                      href={`/content/${item.contentId}`}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                      title="View content"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => onEdit && onEdit(item)}
                      className="text-amber-600 hover:text-amber-900 inline-flex items-center gap-1"
                      title="Edit content"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.contentId)}
                      disabled={deletingId === item.contentId}
                      className="text-red-600 hover:text-red-900 inline-flex items-center gap-1 disabled:opacity-50"
                      title="Delete content"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteError && (
        <div className="bg-red-50 border-t border-red-200 px-6 py-4 text-sm text-red-700">
          {deleteError}
        </div>
      )}
    </div>
  );
}
