/**
 * User Profile Data Export Utilities
 * Provides functionality to export user profile and purchase data in various formats
 */

interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeProfile: boolean;
  includePurchases: boolean;
  includePurchaseStats: boolean;
}

/**
 * Export profile data as JSON
 */
export const exportProfileAsJson = async (profileData: any) => {
  const dataStr = JSON.stringify(profileData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(dataBlob, `profile_${new Date().getTime()}.json`);
};

/**
 * Export purchases as CSV
 */
export const exportPurchasesAsCsv = async (purchases: any[]) => {
  if (purchases.length === 0) {
    alert('No purchases to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Content Title',
    'Content Type',
    'Creator Address',
    'Purchase Price',
    'Purchase Date',
    'Transaction Status',
    'Views',
    'Completion %',
    'Rating',
    'Review',
    'Is Favorite',
    'Refunded'
  ];

  // Map purchase data to CSV rows
  const rows = purchases.map((purchase) => [
    purchase.contentTitle,
    purchase.contentType,
    purchase.creatorAddress,
    purchase.purchasePrice,
    new Date(purchase.purchaseDate).toLocaleDateString(),
    purchase.transactionStatus,
    purchase.engagement?.viewCount || 0,
    purchase.engagement?.completionPercentage || 0,
    purchase.rating?.score || 'N/A',
    (purchase.rating?.review || '').replace(/"/g, '""'), // Escape quotes
    purchase.isFavorite ? 'Yes' : 'No',
    purchase.refundInfo?.refunded ? 'Yes' : 'No'
  ]);

  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
        .join(',')
    )
  ].join('\n');

  const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(csvBlob, `purchases_${new Date().getTime()}.csv`);
};

/**
 * Export purchases as JSON
 */
export const exportPurchasesAsJson = async (purchases: any[]) => {
  const dataStr = JSON.stringify(purchases, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(dataBlob, `purchases_${new Date().getTime()}.json`);
};

/**
 * Export complete user data archive
 */
export const exportCompleteDataArchive = async (
  profileData: any,
  purchaseData: any[],
  purchaseStats: any
) => {
  const archive = {
    exportDate: new Date().toISOString(),
    profile: profileData,
    purchases: purchaseData,
    stats: purchaseStats,
    metadata: {
      totalPurchases: purchaseData.length,
      totalSpent: purchaseStats.totalSpent,
      profileCompleteness: profileData.profileCompleteness
    }
  };

  const dataStr = JSON.stringify(archive, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(dataBlob, `data_export_${new Date().getTime()}.json`);
};

/**
 * Generate HTML report for profile data
 */
export const generateProfileReport = (profileData: any, purchaseStats: any): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profile Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 800px; margin: 40px auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; margin-bottom: 10px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; font-size: 1.2em; }
        .section { margin-bottom: 30px; }
        .field { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #3498db; }
        .field-label { font-weight: bold; color: #2c3e50; }
        .field-value { color: #555; margin-top: 5px; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
        .stat-box { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
        .stat-label { font-size: 0.9em; color: #555; margin-top: 5px; }
        .social-links { display: flex; gap: 10px; margin-top: 10px; }
        .social-link { padding: 8px 12px; background: #3498db; color: white; border-radius: 3px; text-decoration: none; font-size: 0.9em; }
        footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>User Profile Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>

        <div class="section">
          <h2>Profile Information</h2>
          
          <div class="field">
            <div class="field-label">Display Name</div>
            <div class="field-value">${profileData.displayName || 'Not set'}</div>
          </div>

          <div class="field">
            <div class="field-label">Username</div>
            <div class="field-value">@${profileData.username || 'Not set'}</div>
          </div>

          <div class="field">
            <div class="field-label">Wallet Address</div>
            <div class="field-value">${profileData.address}</div>
          </div>

          <div class="field">
            <div class="field-label">Bio</div>
            <div class="field-value">${profileData.bio || 'Not provided'}</div>
          </div>

          ${
            profileData.socialLinks && Object.values(profileData.socialLinks).some((v) => !!v)
              ? `
          <div class="field">
            <div class="field-label">Social Links</div>
            <div class="social-links">
              ${profileData.socialLinks.twitter ? `<a href="https://twitter.com/${profileData.socialLinks.twitter}" class="social-link" target="_blank">Twitter</a>` : ''}
              ${profileData.socialLinks.github ? `<a href="https://github.com/${profileData.socialLinks.github}" class="social-link" target="_blank">GitHub</a>` : ''}
              ${profileData.socialLinks.discord ? `<span class="social-link">Discord: ${profileData.socialLinks.discord}</span>` : ''}
              ${profileData.socialLinks.website ? `<a href="${profileData.socialLinks.website}" class="social-link" target="_blank">Website</a>` : ''}
            </div>
          </div>
              `
              : ''
          }
        </div>

        <div class="section">
          <h2>Profile Statistics</h2>
          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-number">${profileData.profileCompleteness || 0}%</div>
              <div class="stat-label">Profile Complete</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${purchaseStats?.totalPurchases || 0}</div>
              <div class="stat-label">Total Purchases</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">$${(purchaseStats?.totalSpent || 0).toFixed(2)}</div>
              <div class="stat-label">Total Spent</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${purchaseStats?.favoriteCount || 0}</div>
              <div class="stat-label">Favorites</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Account Settings</h2>
          ${
            profileData.settings
              ? `
          <div class="field">
            <div class="field-label">Language</div>
            <div class="field-value">${profileData.settings.language || 'English'}</div>
          </div>
          <div class="field">
            <div class="field-label">Theme</div>
            <div class="field-value">${profileData.settings.theme || 'Light'}</div>
          </div>
          <div class="field">
            <div class="field-label">Currency</div>
            <div class="field-value">${profileData.settings.currency || 'USD'}</div>
          </div>
          <div class="field">
            <div class="field-label">Timezone</div>
            <div class="field-value">${profileData.settings.timezone || 'UTC'}</div>
          </div>
              `
              : '<p>No settings configured</p>'
          }
        </div>

        <footer>
          <p>This report contains your personal profile information. Please keep it secure and confidential.</p>
        </footer>
      </div>
    </body>
    </html>
  `;
};

/**
 * Download file helper
 */
const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Export data in specified format
 */
export const exportUserData = async (options: ExportOptions, data: any) => {
  try {
    switch (options.format) {
      case 'json': {
        if (options.includeProfile && options.includePurchases) {
          await exportCompleteDataArchive(
            data.profile,
            data.purchases,
            data.stats
          );
        } else if (options.includePurchases) {
          await exportPurchasesAsJson(data.purchases);
        } else {
          await exportProfileAsJson(data.profile);
        }
        break;
      }

      case 'csv': {
        if (options.includePurchases) {
          await exportPurchasesAsCsv(data.purchases);
        } else {
          alert('CSV export is only available for purchase data');
        }
        break;
      }

      case 'pdf': {
        if (options.includeProfile) {
          const htmlContent = generateProfileReport(data.profile, data.stats);
          const printWindow = window.open('', '', 'height=600,width=800');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.print();
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

export const profileExportUtils = {
  exportProfileAsJson,
  exportPurchasesAsCsv,
  exportPurchasesAsJson,
  exportCompleteDataArchive,
  generateProfileReport,
  exportUserData
};

export default profileExportUtils;
