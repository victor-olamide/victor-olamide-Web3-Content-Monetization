'use client';

import { useEffect, useState } from 'react';
import { Loader2, PencilLine, Plus, UploadCloud, X } from 'lucide-react';
import { ContentItem, CreatorContentFormValues, CreatorContentType } from '@/utils/creatorApi';

const defaultValues: CreatorContentFormValues = {
  title: '',
  description: '',
  contentType: 'video',
  price: 0,
  existingUrl: '',
  file: null,
};

interface CreatorContentEditorProps {
  content?: ContentItem | null;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: CreatorContentFormValues, contentToEdit?: ContentItem | null) => Promise<boolean>;
}

const contentTypes: CreatorContentType[] = ['video', 'article', 'image', 'music'];

export function CreatorContentEditor({
  content,
  open,
  saving = false,
  onClose,
  onSubmit,
}: CreatorContentEditorProps) {
  const [values, setValues] = useState<CreatorContentFormValues>(defaultValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (content) {
      setLocalError(null);
      setValues({
        title: content.title,
        description: content.description,
        contentType: content.contentType,
        price: content.price,
        existingUrl: content.url || '',
        file: null,
      });
      return;
    }

    setValues(defaultValues);
    setLocalError(null);
  }, [content, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!values.title.trim()) {
      setLocalError('Title is required.');
      return;
    }

    if (values.price < 0) {
      setLocalError('Price must be zero or greater.');
      return;
    }

    if (!values.file && !values.existingUrl?.trim()) {
      setLocalError('Upload a file or provide an existing content URL.');
      return;
    }

    const success = await onSubmit(values, content);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Creator Workspace
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {content ? 'Edit content' : 'Upload new content'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                value={values.title}
                onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
                placeholder="Weekly alpha briefing"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Content type</span>
              <select
                value={values.contentType}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    contentType: event.target.value as CreatorContentType,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
              >
                {contentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Price (STX)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={(event) =>
                  setValues((current) => ({ ...current, price: Number(event.target.value) }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
                placeholder="Give your audience a quick preview of what they will unlock."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Existing content URL</span>
              <input
                value={values.existingUrl}
                onChange={(event) =>
                  setValues((current) => ({ ...current, existingUrl: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
                placeholder="https://ipfs.io/ipfs/..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Upload file</span>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <input
                  type="file"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                  className="w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-700"
                />
                <p className="mt-3 text-xs text-slate-500">
                  Upload replaces the URL field when both are provided.
                </p>
              </div>
            </label>
          </div>

          {localError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {localError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : content ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving...' : content ? 'Save changes' : 'Upload content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreatorContentEditorTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      <UploadCloud className="h-4 w-4" />
      Upload content
    </button>
  );
}
