/**
 * Transaction Export Utilities
 * Functions to export transaction data in multiple formats
 */

export interface Transaction {
  _id: string;
  userAddress: string;
  transactionType: string;
  amount: number;
  amountUsd: number;
  txHash: string;
  status: string;
  description: string;
  category: string;
  createdAt: string;
  blockHeight: number;
  confirmations: number;
  taxRelevant?: boolean;
}

/**
 * Export transactions as JSON
 */
export function exportAsJSON(
  transactions: Transaction[],
  filename: string = 'transactions.json'
): void {
  const data = {
    exportDate: new Date().toISOString(),
    transactionCount: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    transactions
  };

  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

/**
 * Export transactions as CSV
 */
export function exportAsCSV(
  transactions: Transaction[],
  filename: string = 'transactions.csv'
): void {
  const headers = [
    'Date',
    'Type',
    'Amount (STX)',
    'Amount (USD)',
    'Status',
    'Description',
    'Category',
    'Transaction Hash',
    'Block Height',
    'Confirmations'
  ];

  const rows = transactions.map((t) => [
    new Date(t.createdAt).toISOString(),
    t.transactionType,
    t.amount.toFixed(2),
    t.amountUsd.toFixed(2),
    t.status,
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    t.txHash,
    t.blockHeight,
    t.confirmations
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export transactions as CSV for tax reporting
 */
export function exportForTaxReportingCSV(
  transactions: Transaction[],
  filename: string = 'tax-report.csv'
): void {
  const headers = [
    'Date',
    'Type',
    'Amount (STX)',
    'Amount (USD)',
    'Description',
    'Category',
    'Tax Relevant'
  ];

  const rows = transactions
    .filter((t) => t.taxRelevant || ['income', 'fee', 'reward'].includes(t.category))
    .map((t) => [
      new Date(t.createdAt).toLocaleDateString('en-US'),
      t.transactionType,
      t.amount.toFixed(2),
      t.amountUsd.toFixed(2),
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.taxRelevant ? 'Yes' : 'No'
    ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export transactions as HTML report
 */
export function exportAsHTML(
  transactions: Transaction[],
  filename: string = 'transactions-report.html'
): void {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalUsd = transactions.reduce((sum, t) => sum + t.amountUsd, 0);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f3f4f6;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 40px;
        }
        
        .header {
            margin-bottom: 40px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #6b7280;
            font-size: 14px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .summary-card.income {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        
        .summary-card.expense {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        
        .summary-card label {
            display: block;
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 8px;
        }
        
        .summary-card .value {
            font-size: 24px;
            font-weight: bold;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        
        table thead {
            background-color: #f3f4f6;
            border-bottom: 2px solid #d1d5db;
        }
        
        table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #1f2937;
            font-size: 13px;
        }
        
        table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
            font-size: 13px;
        }
        
        table tbody tr:hover {
            background-color: #f9fafb;
        }
        
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status.confirmed {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .status.pending {
            background-color: #fef3c7;
            color: #78350f;
        }
        
        .status.failed {
            background-color: #fee2e2;
            color: #7f1d1d;
        }
        
        .footer {
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Transaction Report</h1>
            <p>Generated on ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <label>Total Transactions</label>
                <div class="value">${transactions.length}</div>
            </div>
            <div class="summary-card income">
                <label>Total Amount (STX)</label>
                <div class="value">${totalAmount.toFixed(2)}</div>
            </div>
            <div class="summary-card expense">
                <label>Total Amount (USD)</label>
                <div class="value">$${totalUsd.toFixed(2)}</div>
            </div>
            <div class="summary-card">
                <label>Average Transaction</label>
                <div class="value">${transactions.length > 0 ? (totalAmount / transactions.length).toFixed(2) : 0} STX</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount (STX)</th>
                    <th>Amount (USD)</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                ${transactions
                  .map(
                    (t) => `
                    <tr>
                        <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                        <td>${t.transactionType}</td>
                        <td>${t.amount.toFixed(2)}</td>
                        <td>$${t.amountUsd.toFixed(2)}</td>
                        <td><span class="status ${t.status}">${t.status}</span></td>
                        <td>${t.description}</td>
                        <td>${t.category}</td>
                    </tr>
                    `
                  )
                  .join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>This is an automatically generated report. Please verify all amounts before use for tax purposes.</p>
        </div>
    </div>
</body>
</html>
  `.trim();

  downloadFile(html, filename, 'text/html;charset=utf-8;');
}

/**
 * Helper function to download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  exportAsJSON,
  exportAsCSV,
  exportForTaxReportingCSV,
  exportAsHTML
};
