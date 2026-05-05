import React, { useEffect } from 'react';
import { useRateLimit } from '../hooks/useRateLimit';
import {
  getTierDisplayName,
  getTierColor,
  getStatusLabel,
  formatNumber,
  formatRetryAfter,
  calculateUsagePercentage,
  getStatusColor
} from '../utils/rateLimitUtils';

/**
 * RateLimitStatus Component
 * 
 * Displays the current user's rate limit status including tier,
 * usage, remaining requests, and upgrade suggestions.
 * 
 * @module components/RateLimitStatus
 */

interface RateLimitStatusProps {
  /** Whether to show detailed breakdown */
  detailed?: boolean;
  /** Whether to show tier comparison */
  showTierComparison?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Compact display mode */
  compact?: boolean;
  /** Endpoint to check limits for */
  endpoint?: string;
}

export const RateLimitStatus: React.FC<RateLimitStatusProps> = ({
  detailed = false,
  showTierComparison = false,
  className = '',
  compact = false,
  endpoint = '/api'
}) => {
  const {
    status,
    tiers,
    loading,
    error,
    isRateLimited,
    retryAfter,
    retryAfterFormatted,
    currentTier,
    usagePercentage,
    statusColor,
    refresh,
    fetchTiers
  } = useRateLimit({ endpoint });

  useEffect(() => {
    if (showTierComparison) {
      fetchTiers();
    }
  }, [showTierComparison, fetchTiers]);

  if (loading && !status) {
    return (
      <div className={`rate-limit-status ${className}`} style={styles.container}>
        <div style={styles.loading}>Loading rate limit status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rate-limit-status ${className}`} style={styles.container}>
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (isRateLimited) {
    return (
      <div className={`rate-limit-status ${className}`} style={{ ...styles.container, ...styles.rateLimited }}>
        <div style={styles.rateLimitedHeader}>
          <span style={styles.rateLimitedIcon}>🚫</span>
          <span style={styles.rateLimitedTitle}>Rate Limited</span>
        </div>
        <p style={styles.rateLimitedMessage}>
          You have exceeded your rate limit. Please wait {retryAfterFormatted || 'a moment'} before making more requests.
        </p>
        {retryAfter && (
          <div style={styles.retryInfo}>
            <span>Retry after: </span>
            <strong>{formatRetryAfter(retryAfter)}</strong>
          </div>
        )}
        <button onClick={refresh} style={styles.refreshButton}>
          Check Again
        </button>
      </div>
    );
  }

  if (!status) return null;

  if (compact) {
    return (
      <div className={`rate-limit-status compact ${className}`} style={styles.compactContainer}>
        <span
          style={{
            ...styles.tierBadge,
            backgroundColor: getTierColor(currentTier || 'free')
          }}
        >
          {getTierDisplayName(currentTier || 'free')}
        </span>
        <span style={styles.compactUsage}>
          <span style={{ color: statusColor }}>{usagePercentage}%</span> used
        </span>
        <span style={styles.compactRemaining}>
          {formatNumber(status.remaining?.window || 0)} remaining
        </span>
      </div>
    );
  }

  return (
    <div className={`rate-limit-status ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Rate Limit Status</h3>
        <span
          style={{
            ...styles.tierBadge,
            backgroundColor: getTierColor(currentTier || 'free')
          }}
        >
          {getTierDisplayName(currentTier || 'free')} Tier
        </span>
      </div>

      {/* Usage Bar */}
      <div style={styles.usageSection}>
        <div style={styles.usageHeader}>
          <span>Window Usage</span>
          <span style={{ color: statusColor, fontWeight: 'bold' }}>
            {getStatusLabel(usagePercentage)}
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${Math.min(100, usagePercentage)}%`,
              backgroundColor: statusColor
            }}
          />
        </div>
        <div style={styles.usageDetails}>
          <span>
            {formatNumber((status.limits?.maxRequests || 0) - (status.remaining?.window || 0))} /{' '}
            {formatNumber(status.limits?.maxRequests || 0)} requests
          </span>
          <span>{usagePercentage}%</span>
        </div>
      </div>

      {/* Remaining Requests */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatNumber(status.remaining?.window || 0)}</div>
          <div style={styles.statLabel}>Window Remaining</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatNumber(status.remaining?.daily || 0)}</div>
          <div style={styles.statLabel}>Daily Remaining</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatNumber(status.remaining?.burst || 0)}</div>
          <div style={styles.statLabel}>Burst Remaining</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatNumber(status.remaining?.concurrent || 0)}</div>
          <div style={styles.statLabel}>Concurrent Slots</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {detailed && (
        <div style={styles.detailedSection}>
          <h4 style={styles.sectionTitle}>Tier Limits</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Limit Type</th>
                <th style={styles.th}>Limit</th>
                <th style={styles.th}>Used</th>
                <th style={styles.th}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>Window (15min)</td>
                <td style={styles.td}>{formatNumber(status.limits?.maxRequests || 0)}</td>
                <td style={styles.td}>
                  {formatNumber((status.limits?.maxRequests || 0) - (status.remaining?.window || 0))}
                </td>
                <td style={styles.td}>{formatNumber(status.remaining?.window || 0)}</td>
              </tr>
              <tr>
                <td style={styles.td}>Burst (1min)</td>
                <td style={styles.td}>{formatNumber(status.limits?.burstLimit || 0)}</td>
                <td style={styles.td}>
                  {formatNumber((status.limits?.burstLimit || 0) - (status.remaining?.burst || 0))}
                </td>
                <td style={styles.td}>{formatNumber(status.remaining?.burst || 0)}</td>
              </tr>
              <tr>
                <td style={styles.td}>Daily</td>
                <td style={styles.td}>{formatNumber(status.limits?.dailyLimit || 0)}</td>
                <td style={styles.td}>
                  {formatNumber((status.limits?.dailyLimit || 0) - (status.remaining?.daily || 0))}
                </td>
                <td style={styles.td}>{formatNumber(status.remaining?.daily || 0)}</td>
              </tr>
              <tr>
                <td style={styles.td}>Concurrent</td>
                <td style={styles.td}>{formatNumber(status.limits?.concurrentLimit || 0)}</td>
                <td style={styles.td}>
                  {formatNumber((status.limits?.concurrentLimit || 0) - (status.remaining?.concurrent || 0))}
                </td>
                <td style={styles.td}>{formatNumber(status.remaining?.concurrent || 0)}</td>
              </tr>
            </tbody>
          </table>

          {status.violations > 0 && (
            <div style={styles.violationWarning}>
              <span>⚠️ {status.violations} rate limit violation(s) recorded</span>
              {status.lastViolationAt && (
                <span style={styles.violationDate}>
                  Last: {new Date(status.lastViolationAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tier Comparison */}
      {showTierComparison && tiers.length > 0 && (
        <div style={styles.tierSection}>
          <h4 style={styles.sectionTitle}>Available Tiers</h4>
          <div style={styles.tierGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  ...styles.tierCard,
                  borderColor: tier.name === currentTier ? getTierColor(tier.name) : '#e0e0e0',
                  borderWidth: tier.name === currentTier ? 2 : 1
                }}
              >
                <div style={styles.tierCardHeader}>
                  <span
                    style={{
                      ...styles.tierBadge,
                      backgroundColor: getTierColor(tier.name),
                      fontSize: '0.75rem'
                    }}
                  >
                    {getTierDisplayName(tier.name)}
                  </span>
                  {tier.name === currentTier && (
                    <span style={styles.currentBadge}>Current</span>
                  )}
                </div>
                <div style={styles.tierCardBody}>
                  <div>{formatNumber(tier.maxRequests)} req/{tier.windowFormatted}</div>
                  <div>{formatNumber(tier.dailyLimit)} req/day</div>
                  <div>{formatNumber(tier.burstLimit)} burst/{tier.burstWindowFormatted}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div style={styles.footer}>
        <button onClick={refresh} style={styles.refreshButton} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  compactContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    borderRadius: '4px',
    backgroundColor: '#f8f9fa',
    fontSize: '0.875rem'
  },
  loading: {
    textAlign: 'center' as const,
    color: '#6c757d',
    padding: '20px'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#dc3545',
    padding: '12px'
  },
  errorIcon: { fontSize: '1.2rem' },
  rateLimited: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5'
  },
  rateLimitedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  rateLimitedIcon: { fontSize: '1.5rem' },
  rateLimitedTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#dc3545'
  },
  rateLimitedMessage: {
    color: '#721c24',
    marginBottom: '12px'
  },
  retryInfo: {
    padding: '8px 12px',
    backgroundColor: '#f8d7da',
    borderRadius: '4px',
    marginBottom: '12px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 600
  },
  tierBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 500
  },
  usageSection: { marginBottom: '20px' },
  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '0.9rem'
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  usageDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '0.8rem',
    color: '#6c757d'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  statCard: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    textAlign: 'center' as const
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#212529'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#6c757d',
    marginTop: '4px'
  },
  compactUsage: { color: '#6c757d' },
  compactRemaining: { color: '#495057' },
  detailedSection: { marginBottom: '20px' },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#495057'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.85rem'
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #dee2e6',
    color: '#495057',
    fontWeight: 600
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #dee2e6'
  },
  violationWarning: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: '0.85rem',
    color: '#856404'
  },
  violationDate: {
    fontSize: '0.8rem',
    color: '#997404'
  },
  tierSection: { marginBottom: '20px' },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  tierCard: {
    padding: '12px',
    borderRadius: '6px',
    borderStyle: 'solid',
    borderColor: '#e0e0e0'
  },
  tierCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  currentBadge: {
    fontSize: '0.7rem',
    color: '#28a745',
    fontWeight: 'bold'
  },
  tierCardBody: {
    fontSize: '0.8rem',
    color: '#495057',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem'
  }
};

export default RateLimitStatus;
