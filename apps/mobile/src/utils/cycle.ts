import type { BillingCycle } from '../types';
import { t } from '../i18n';

/**
 * Short price-period suffix for a billing cycle, e.g. "/wk", "/mo", "/qtr", "/yr".
 *
 * Cards previously used a binary `cycle === 'monthly' ? '/mo' : '/yr'` check, which
 * wrongly labelled weekly and quarterly subscriptions as "/yr". Use this everywhere
 * a per-cycle price suffix is shown so all four cycles render correctly.
 */
export function cyclePeriodShort(cycle: BillingCycle): string {
  switch (cycle) {
    case 'weekly':
      return t('subscription.perWeekShort');
    case 'quarterly':
      return t('subscription.perQuarterShort');
    case 'yearly':
      return t('common.perYear');
    case 'monthly':
    default:
      return t('common.perMonth');
  }
}
