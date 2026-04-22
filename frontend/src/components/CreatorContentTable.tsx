'use client';

import { Edit, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ContentItem } from '@/utils/creatorApi';

interface CreatorContentTableProps {
  content: ContentItem[];
  loading?: boolean;
  deletingId?: number | null;
  onDelete?: (contentId: number) => Promise<boolean>;
  onEdit?: (content: ContentItem) => void;
  onUpload?: () => void;
}

function formatDate(value?: string) {
  if (!value) {
    return 'Recently';
  }

  return new Date(value).toLocaleDateString();
}

export function CreatorContentTable({
  content,
  loading = false,
  deletingId = null,
  onDelete,
  onEdit,
  onUpload,
}: CreatorContentTableProps) {
  const handleDelete = async (contentId: number) => {
    if (!window.confirm('Delete this content and remove it from your creator dashboard?')) {
      return;
    }

    await onDelete?.(contentId);
  };

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-20 rounded-3xl bg-slate-100" />
          <div className="h-20 rounded-3xl bg-slate-100" />
          <div className="h-20 rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-14 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Content Library
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">No uploads yet</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          Start your creator dashboard with a first release so revenue, subscribers, and analytics
          have something to track.
        </p>
        {onUpload ? (
          <button
            type="button"
            onClick={onUpload}
            className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Upload your first piece
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[880px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <th className="px-6 py-4">Content</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Views</th>
              <th className="px-6 py-4">Purchases</th>
              <th className="px-6 py-4">Revenue</th>
              <th className="px-6 py-4">Updated</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {content.map((item) => (
              <tr key={item.contentId} className="align-top text-sm text-slate-700 transition hover:bg-slate-50">
                <td className="px-6 py-5">
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">ID {item.contentId}</div>
                  <div className="mt-2 max-w-sm text-sm text-slate-600">{item.description}</div>
                </td>
                <td className="px-6 py-5">
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium capitalize text-cyan-700">
                    {item.contentType}
                  </span>
                </td>
                <td className="px-6 py-5 font-medium text-slate-900">{item.price.toFixed(2)} STX</td>
                <td className="px-6 py-5">{item.views}</td>
                <td className="px-6 py-5">{item.purchases}</td>
                <td className="px-6 py-5 font-medium text-emerald-600">{item.revenue.toFixed(2)} STX</td>
                <td className="px-6 py-5 text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/content/${item.contentId}`}
                      className="inline-flex rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                      title="View content"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onEdit?.(item)}
                      className="inline-flex rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      title="Edit content"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.contentId)}
                      disabled={deletingId === item.contentId}
                      className="inline-flex rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      title={deletingId === item.contentId ? 'Deleting content' : 'Delete content'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 p-4 lg:hidden">
        {content.map((item) => (
          <article key={item.contentId} className="rounded-[1.5rem] border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm capitalize text-cyan-700">{item.contentType}</p>
              </div>
              <span className="text-sm font-medium text-emerald-600">{item.revenue.toFixed(2)} STX</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Price</p>
                <p className="mt-2 font-semibold text-slate-900">{item.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Views</p>
                <p className="mt-2 font-semibold text-slate-900">{item.views}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sales</p>
                <p className="mt-2 font-semibold text-slate-900">{item.purchases}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-slate-500">Updated {formatDate(item.updatedAt || item.createdAt)}</p>
              <div className="flex items-center gap-2">
                <Link href={`/content/${item.contentId}`} className="rounded-full border border-slate-200 p-2 text-slate-600">
                  <Eye className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => onEdit?.(item)} className="rounded-full border border-slate-200 p-2 text-slate-600">
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.contentId)}
                  disabled={deletingId === item.contentId}
                  className="rounded-full border border-slate-200 p-2 text-slate-600 disabled:opacity-50"
                  title={deletingId === item.contentId ? 'Deleting content' : 'Delete content'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
