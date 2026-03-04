/**
 * Export Service - CSV and PDF export for Pro users
 * 
 * Generates subscription data exports in CSV and PDF formats.
 * Uses expo-file-system for file handling and expo-sharing for sharing.
 */
import * as FileSystem from 'expo-file-system';
const { cacheDirectory, writeAsStringAsync, EncodingType } = FileSystem as any;
import * as Sharing from 'expo-sharing';
import type { Subscription } from '../types';
import { t } from '../i18n';
import { logger } from './LoggerService';

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  return `${symbols[currency] || currency}${amount.toFixed(2)}`;
}

/**
 * Format billing cycle
 */
function formatCycle(cycle: string): string {
  const cycles: Record<string, string> = {
    weekly: t('addSubscription.weekly'),
    monthly: t('addSubscription.monthly'),
    quarterly: t('addSubscription.quarterly'),
    yearly: t('addSubscription.yearly'),
  };
  return cycles[cycle] || cycle;
}

/**
 * Calculate monthly cost for comparison
 */
function getMonthlyEquivalent(amount: number, cycle: string): number {
  switch (cycle) {
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

/**
 * Generate CSV content from subscriptions
 */
export function generateCSV(subscriptions: Subscription[]): string {
  const headers = [
    'Name',
    'Amount',
    'Currency',
    'Billing Cycle',
    'Monthly Equivalent',
    'Next Billing Date',
    'Category',
    'Status',
    'Created At',
  ];

  const rows = subscriptions.map((sub) => {
    const monthly = getMonthlyEquivalent(sub.amount, sub.cycle);
    return [
      `"${sub.name}"`,
      sub.amount.toFixed(2),
      sub.currency,
      formatCycle(sub.cycle),
      monthly.toFixed(2),
      sub.nextBillingDate.split('T')[0],
      `"${sub.category}"`,
      sub.status,
      sub.createdAt.split('T')[0],
    ].join(',');
  });

  // Summary row
  const totalMonthly = subscriptions.reduce(
    (sum, sub) => sum + getMonthlyEquivalent(sub.amount, sub.cycle),
    0
  );
  const totalYearly = totalMonthly * 12;

  const summary = [
    '',
    'SUMMARY',
    `Total Subscriptions,${subscriptions.length}`,
    `Active,${subscriptions.filter((s) => s.status === 'active').length}`,
    `Monthly Total,${totalMonthly.toFixed(2)}`,
    `Yearly Total,${totalYearly.toFixed(2)}`,
  ];

  return [headers.join(','), ...rows, ...summary].join('\n');
}

/**
 * Generate PDF-ready HTML content from subscriptions
 */
export function generatePDFHtml(subscriptions: Subscription[]): string {
  const totalMonthly = subscriptions.reduce(
    (sum, sub) => sum + getMonthlyEquivalent(sub.amount, sub.cycle),
    0
  );
  const totalYearly = totalMonthly * 12;
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const mainCurrency = subscriptions.length > 0 ? subscriptions[0].currency : 'TRY';

  const tableRows = subscriptions
    .map(
      (sub) => `
      <tr>
        <td>${sub.name}</td>
        <td>${formatCurrency(sub.amount, sub.currency)}</td>
        <td>${formatCycle(sub.cycle)}</td>
        <td>${formatCurrency(getMonthlyEquivalent(sub.amount, sub.cycle), sub.currency)}</td>
        <td>${sub.nextBillingDate.split('T')[0]}</td>
        <td>${sub.category}</td>
        <td><span class="status ${sub.status}">${sub.status}</span></td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1a2e; }
    h1 { color: #6C5CE7; margin-bottom: 5px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .stat { background: #f8f9fa; border-radius: 12px; padding: 20px; flex: 1; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #6C5CE7; }
    .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #6C5CE7; color: white; padding: 12px; text-align: left; font-size: 13px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:nth-child(even) { background: #f9f9fb; }
    .status { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .status.active { background: #d4edda; color: #155724; }
    .status.paused { background: #fff3cd; color: #856404; }
    .status.cancelled { background: #f8d7da; color: #721c24; }
    .footer { margin-top: 30px; color: #aaa; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>Finify - Subscription Report</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  
  <div class="summary">
    <div class="stat">
      <div class="stat-value">${subscriptions.length}</div>
      <div class="stat-label">Total Subscriptions</div>
    </div>
    <div class="stat">
      <div class="stat-value">${activeCount}</div>
      <div class="stat-label">Active</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatCurrency(totalMonthly, mainCurrency)}</div>
      <div class="stat-label">Monthly Total</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatCurrency(totalYearly, mainCurrency)}</div>
      <div class="stat-label">Yearly Total</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Amount</th>
        <th>Cycle</th>
        <th>Monthly</th>
        <th>Next Billing</th>
        <th>Category</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    Finify - Subscription Tracker &bull; ${new Date().getFullYear()}
  </div>
</body>
</html>`;
}

/**
 * Export subscriptions as CSV file
 */
export async function exportToCSV(
  subscriptions: Subscription[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const csv = generateCSV(subscriptions);
    const fileName = `finify-subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${cacheDirectory}${fileName}`;

    await writeAsStringAsync(filePath, csv, {
      encoding: EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Subscriptions',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Export', 'CSV export failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export subscriptions as PDF (HTML → Print)
 */
export async function exportToPDF(
  subscriptions: Subscription[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = generatePDFHtml(subscriptions);
    const fileName = `finify-subscriptions-${new Date().toISOString().split('T')[0]}.html`;
    const filePath = `${cacheDirectory}${fileName}`;

    await writeAsStringAsync(filePath, html, {
      encoding: EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/html',
        dialogTitle: 'Export Subscriptions Report',
      });
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Export', 'PDF export failed:', error);
    return { success: false, error: error.message };
  }
}
