'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export type ReportReason =
  | 'copyright'
  | 'offensive'
  | 'spam'
  | 'misleading'
  | 'adult'
  | 'harassment'
  | 'other';

interface ContentReportProps {
  contentId: string | number;
  creatorId: string;
  contentTitle: string;
  onReportSuccess?: () => void;
  onReportError?: (error: string) => void;
  className?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'copyright',
    label: 'Copyright Infringement',
    description: 'This content violates copyright or intellectual property rights',
  },
  {
    value: 'offensive',
    label: 'Offensive Content',
    description: 'Content is offensive, hateful, or discriminatory',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'This is spam or promotional content',
  },
  {
    value: 'misleading',
    label: 'Misleading Information',
    description: 'Content contains false or misleading information',
  },
  {
    value: 'adult',
    label: 'Adult Content',
    description: 'Content contains explicit adult material',
  },
  {
    value: 'harassment',
    label: 'Harassment or Abuse',
    description: 'Content contains harassment or abusive behavior',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Report for another reason',
  },
];

export const ContentReportModal: React.FC<ContentReportProps> = ({
  contentId,
  creatorId,
  contentTitle,
  onReportSuccess,
  onReportError,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmitReport = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedReason) {
        toast({
          title: 'Error',
          description: 'Please select a report reason',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch('/api/content/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            creatorId,
            reason: selectedReason,
            description: description.trim(),
            timestamp: new Date().toISOString(),
            reportedBy: 'user', // Would come from auth context
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit report');
        }

        setSubmitted(true);
        toast({
          title: 'Report Submitted',
          description: 'Thank you for reporting this content. Our team will review it shortly.',
          variant: 'success',
        });

        if (onReportSuccess) {
          onReportSuccess();
        }

        // Auto-close after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to submit report';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        if (onReportError) {
          onReportError(errorMessage);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedReason, description, contentId, creatorId, toast, onReportSuccess, onReportError]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedReason(null);
    setDescription('');
    setSubmitted(false);
  }, []);

  return (
    <>
      {/* Report Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ${className}`}
      >
        <AlertCircle className="w-4 h-4" />
        Report
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Modal Container */}
          <div
            className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Report Content
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {submitted ? (
                // Success State
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Report Submitted
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Thank you for helping us keep our platform safe. Our moderation team will
                    review your report shortly.
                  </p>
                </div>
              ) : (
                // Form State
                <form onSubmit={handleSubmitReport} className="space-y-6">
                  {/* Content Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">You&apos;re reporting</p>
                    <p className="font-medium text-gray-900 truncate">{contentTitle}</p>
                  </div>

                  {/* Reason Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Reason for Report *
                    </label>
                    <div className="space-y-3">
                      {REPORT_REASONS.map((reason) => (
                        <label
                          key={reason.value}
                          className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={reason.value}
                            checked={selectedReason === reason.value}
                            onChange={(e) =>
                              setSelectedReason(e.target.value as ReportReason)
                            }
                            className="mt-1 w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {reason.label}
                            </p>
                            <p className="text-sm text-gray-600">
                              {reason.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide any additional information that might help us review this report..."
                      maxLength={1000}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {description.length}/1000
                    </p>
                  </div>

                  {/* Privacy Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Privacy Notice:</span> Your report is anonymous.
                      We only use the information you provide to help us improve content safety.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedReason}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentReportModal;
