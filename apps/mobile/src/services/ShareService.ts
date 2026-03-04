/**
 * Share Service - Format and share subscription info
 *
 * Provides text formatting and native Share API integration for
 * sharing individual subscriptions or the full list.
 */
import { Share } from 'react-native';
import type { Subscription } from '../types';
import { t } from '../i18n';

/**
 * Map billing cycle to a short per-period label (e.g. "/month")
 */
function getCycleLabel(cycle: string): string {
  switch (cycle) {
    case 'weekly':   return '/week';
    case 'monthly':  return t('share.perMonth');
    case 'quarterly': return '/quarter';
    case 'yearly':   return '/year';
    default:         return t('share.perMonth');
  }
}

/**
 * Format a currency amount with its symbol.
 * Mirrors the local helper in ExportService to avoid a circular dep on utils.
 */
function fmtCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', TRY: '₺',
    JPY: '¥', CAD: 'CA$', AUD: 'A$',
  };
  const sym = symbols[currency] ?? currency;
  return `${sym}${amount.toFixed(2)}`;
}

/**
 * Format a single subscription for sharing.
 *
 * Example output:
 * 📺 Netflix Premium
 * 💰 $22.99/month
 * 📅 Next billing: Mar 15, 2026
 *
 * Shared via Finify
 */
export function formatSubscriptionForShare(sub: Subscription, currency: string): string {
  const billingDate = new Date(sub.nextBillingDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const cycleLabel = getCycleLabel(sub.cycle);
  const amountStr = fmtCurrency(sub.amount, sub.currency || currency);
  const nextBillingLabel = t('share.nextBilling', { date: billingDate });

  const lines = [
    `📺 ${sub.name}`,
    `💰 ${amountStr}${cycleLabel}`,
    `📅 ${nextBillingLabel}`,
    '',
    t('share.sharedVia'),
  ];

  return lines.join('\n');
}

/**
 * Format the full subscription list for sharing.
 *
 * Example output:
 * 📊 My Subscriptions
 * ━━━━━━━━━━━━━━━━━━
 * 1. Netflix Premium — $22.99/mo
 * 2. Spotify Family — $16.99/mo
 * 3. iCloud+ — $2.99/mo
 * ━━━━━━━━━━━━━━━━━━
 * Total: $42.97/month
 *
 * Tracked with Finify
 */
export function formatSubscriptionListForShare(
  subscriptions: Subscription[],
  currency: string,
  monthlyTotal: number,
): string {
  const divider = '━━━━━━━━━━━━━━━━━━';
  const totalStr = fmtCurrency(monthlyTotal, currency);

  const itemLines = subscriptions.map((sub, idx) => {
    const amt = fmtCurrency(sub.amount, sub.currency || currency);
    const cycleShort = sub.cycle === 'monthly' ? '/mo'
      : sub.cycle === 'yearly' ? '/yr'
      : sub.cycle === 'weekly' ? '/wk'
      : '/qtr';
    return `${idx + 1}. ${sub.name} — ${amt}${cycleShort}`;
  });

  const lines = [
    `📊 ${t('share.mySubscriptions')}`,
    divider,
    ...itemLines,
    divider,
    `Total: ${totalStr}${t('share.perMonth')}`,
    '',
    t('share.trackedWith'),
  ];

  return lines.join('\n');
}

/**
 * Share a single subscription using the native Share sheet.
 */
export async function shareSubscription(sub: Subscription, currency: string): Promise<void> {
  const message = formatSubscriptionForShare(sub, currency);
  await Share.share({ message, title: sub.name });
}

/**
 * Share the full subscription list using the native Share sheet.
 */
export async function shareSubscriptionList(
  subs: Subscription[],
  currency: string,
  total: number,
): Promise<void> {
  const message = formatSubscriptionListForShare(subs, currency, total);
  await Share.share({ message, title: t('share.mySubscriptions') });
}
