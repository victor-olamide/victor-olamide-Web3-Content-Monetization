/**
 * EncryptedContentAccess Component
 * Display encrypted content with access verification and decryption
 */

import React, { useEffect, useState } from 'react';
import useEncryption from '../hooks/useEncryption';
import { formatExpirationDate, getAccessStatusColor, getAccessStatusText } from '../utils/encryptionUtils';

interface EncryptedContentAccessProps {
  contentId: string;
  contentType: 'video' | 'audio' | 'document' | 'image' | 'other';
  title?: string;
  description?: string;
  fallbackContent?: React.ReactNode;
  onAccessGranted?: (contentUrl: string) => void;
  onAccessDenied?: () => void;
  autoDecrypt?: boolean;
  showStatus?: boolean;
  showActions?: boolean;
}

/**
 * Component for displaying encrypted content with access verification
 */
export const EncryptedContentAccess: React.FC<EncryptedContentAccessProps> = ({
  contentId,
  contentType,
  title,
  description,
  fallbackContent,
  onAccessGranted,
  onAccessDenied,
  autoDecrypt = true,
  showStatus = true,
  showActions = true
}) => {
  const { contentState, decryptContent, checkStatus, revokeAccess, extendAccess } = useEncryption(contentId);
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [extensionDays, setExtensionDays] = useState(7);

  /**
   * Auto-decrypt on mount if enabled
   */
  useEffect(() => {
    if (autoDecrypt && contentId && !contentState.isDecrypted && !contentState.isLoading) {
      decryptContent(contentId).catch(() => {
        // Error is handled in hook and notification
      });
    }
  }, [autoDecrypt, contentId]);

  /**
   * Callback when access is granted
   */
  useEffect(() => {
    if (contentState.isDecrypted && contentState.contentUrl && onAccessGranted) {
      onAccessGranted(contentState.contentUrl);
    }
  }, [contentState.isDecrypted, contentState.contentUrl, onAccessGranted]);

  /**
   * Callback when access is denied
   */
  useEffect(() => {
    if (
      !contentState.isDecrypted &&
      !contentState.isLoading &&
      contentState.error &&
      contentState.accessStatus &&
      onAccessDenied
    ) {
      onAccessDenied();
    }
  }, [contentState.isDecrypted, contentState.isLoading, contentState.error, contentState.accessStatus, onAccessDenied]);

  /**
   * Render content based on type
   */
  const renderContent = () => {
    if (!contentState.contentUrl) {
      return null;
    }

    switch (contentType) {
      case 'video':
        return (
          <video
            controls
            className="w-full h-auto rounded-lg"
            src={contentState.contentUrl}
          >
            Your browser does not support the video tag.
          </video>
        );

      case 'audio':
        return (
          <audio
            controls
            className="w-full"
            src={contentState.contentUrl}
          >
            Your browser does not support the audio tag.
          </audio>
        );

      case 'image':
        return (
          <img
            src={contentState.contentUrl}
            alt={title || 'Encrypted content'}
            className="w-full h-auto rounded-lg"
          />
        );

      case 'document':
        return (
          <iframe
            src={contentState.contentUrl}
            className="w-full h-96 rounded-lg border border-gray-300"
            title={title || 'Encrypted document'}
          />
        );

      default:
        return (
          <a
            href={contentState.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download Content
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        );
    }
  };

  /**
   * Render access status badge
   */
  const renderStatusBadge = () => {
    if (!contentState.accessStatus || !showStatus) {
      return null;
    }

    const { isActive, isExpired, isRevoked, expiresAt } = contentState.accessStatus;
    const statusText = getAccessStatusText(isActive, isExpired, isRevoked);
    const color = getAccessStatusColor(isActive, isExpired);

    const colorClasses: Record<string, string> = {
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClasses[color]}`}>
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${color === 'green' ? 'bg-green-600' : color === 'red' ? 'bg-red-600' : 'bg-gray-600'}`} />
        {statusText}
      </div>
    );
  };

  /**
   * Render loading state
   */
  if (contentState.isLoading && !contentState.isDecrypted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-gray-600 text-center">Verifying access and decrypting content...</p>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (!contentState.isDecrypted && contentState.error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-start gap-4">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-700 mb-4">{contentState.error}</p>
            {fallbackContent && (
              <div className="mt-4 p-4 bg-white rounded border border-red-300">
                {fallbackContent}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render success state
   */
  return (
    <div className="space-y-4">
      {/* Title and description */}
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
          {description && <p className="text-gray-600 mt-2">{description}</p>}
        </div>
      )}

      {/* Status badge */}
      {renderStatusBadge()}

      {/* Content */}
      {contentState.isDecrypted && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      )}

      {/* Expiration info and actions */}
      {contentState.accessStatus && showActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-700">
              <p className="font-medium">
                {formatExpirationDate(contentState.accessStatus.expiresAt)}
              </p>
              <p className="text-gray-600">
                Access attempts: {contentState.accessAttempts || 0}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {contentState.accessStatus.isActive && !contentState.accessStatus.isExpired && (
              <>
                <button
                  onClick={() => setShowExtendForm(!showExtendForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Extend Access
                </button>

                <button
                  onClick={() => revokeAccess(contentId)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Revoke Access
                </button>
              </>
            )}

            {!contentState.accessStatus.isActive || contentState.accessStatus.isExpired ? (
              <button
                onClick={() => decryptContent(contentId)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Renew Access
              </button>
            ) : null}
          </div>

          {/* Extend access form */}
          {showExtendForm && (
            <div className="mt-4 p-4 bg-white rounded border border-blue-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extend for how many days?
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    extendAccess(contentId, extensionDays);
                    setShowExtendForm(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Extend
                </button>
                <button
                  onClick={() => setShowExtendForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EncryptedContentAccess;
