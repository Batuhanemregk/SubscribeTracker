/**
 * SubscriptionDetailsScreen - View subscription details
 * Uses new component library and Zustand stores
 */
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Header, GradientHeroCard, GradientStatCard, PrimaryButton, SecondaryButton, LifecycleTimeline, AlternativeSuggestionCard, CancellationGuide } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore } from '../state';
import { formatCurrency, getCurrencySymbol, calculateValueScore, getValueLabel, getValueColor, toMonthlyAmount, type AlternativeSuggestion } from '../utils';
import type { Subscription } from '../types';
import { t, getLocale } from '../i18n';
import knownServicesData from '../data/known-services.json';
import { getServiceCatalog, checkPriceChanges, type PriceChangeAlert } from '../services/CatalogService';
import { shareSubscription } from '../services/ShareService';

interface KnownServiceAlternative {
  name: string;
  price: number;
  currency: string;
  cycle: string;
  note: string;
}

interface KnownService {
  id: string;
  name: string;
  cancelUrl?: string;
  cancelSteps?: string[];
  cancelDifficulty?: 'easy' | 'medium' | 'hard';
  alternatives?: KnownServiceAlternative[];
  [key: string]: unknown;
}

const knownServices: KnownService[] = (knownServicesData as { services: KnownService[] }).services;

interface SubscriptionDetailsScreenProps {
  navigation: any;
  route: any;
}

// Payment history item - no animation (animations only on HomeScreen)
function PaymentHistoryItem({ date, amount, currency }: { date: string; amount: number; currency: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyDot}>
        <View style={styles.dotInner} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDate}>{date}</Text>
        <Text style={styles.historyStatus}>{t('subscription.completed')}</Text>
      </View>
      <Text style={styles.historyAmount}>{formatCurrency(amount, currency)}</Text>
    </View>
  );
}

export function SubscriptionDetailsScreen({ navigation, route }: SubscriptionDetailsScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptionId } = route.params;
  const { getSubscriptionById, deleteSubscription, pauseSubscription, resumeSubscription, updateUsageRating, logUsage, updateSubscription, updateNotes } = useSubscriptionStore();
  const { app, defaultReminderDays } = useSettingsStore();
  const dateLocale = getLocale() === 'tr' ? 'tr-TR' : 'en-US';
  const sub = getSubscriptionById(subscriptionId);
  const [priceAlert, setPriceAlert] = useState<PriceChangeAlert | null>(null);
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesText, setNotesText] = useState(sub?.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const notesAutoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sub) return;
    getServiceCatalog().then((catalog) => {
      const alerts = checkPriceChanges([sub], catalog);
      setPriceAlert(alerts.length > 0 ? alerts[0] : null);
    }).catch(() => {
      // silently ignore catalog fetch failures
    });
  }, [sub?.id, sub?.amount]);

  const subCurrency = sub?.currency || 'TRY';
  const monthlyAmt = !sub ? 0
    : sub.cycle === 'monthly' ? sub.amount
    : sub.cycle === 'weekly' ? sub.amount * 4.33
    : sub.cycle === 'quarterly' ? sub.amount / 3
    : sub.amount / 12;
  const yearlyAmt = monthlyAmt * 12;
  const daysUntil = !sub ? 0 : Math.ceil(
    (new Date(sub.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Generate realistic payment history based on creation date and billing cycle
  const paymentHistory = useMemo(() => {
    if (!sub) return [];
    const history: { date: string; amount: number }[] = [];
    const created = new Date(sub.createdAt);
    const now = new Date();
    const cycleMonths = sub.cycle === 'weekly' ? 0.25
      : sub.cycle === 'monthly' ? 1
      : sub.cycle === 'quarterly' ? 3
      : 12;

    let payDate = new Date(created);
    while (payDate <= now && history.length < 12) {
      history.push({
        date: payDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: sub.amount,
      });
      payDate = new Date(payDate);
      payDate.setMonth(payDate.getMonth() + cycleMonths);
    }
    return history.reverse(); // newest first
  }, [sub?.createdAt, sub?.amount, sub?.cycle, dateLocale]);

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

  const knownService = useMemo(() => {
    if (!sub) return null;
    const nameLower = sub.name.toLowerCase();
    return knownServices.find(
      (s) => s.name.toLowerCase() === nameLower || nameLower.includes(s.name.toLowerCase())
    ) ?? null;
  }, [sub?.name]);

  // Compute cheaper alternatives for this specific subscription
  const alternatives = useMemo<AlternativeSuggestion[]>(() => {
    if (!sub || !knownService?.alternatives) return [];
    const result: AlternativeSuggestion[] = [];
    for (const alt of knownService.alternatives) {
      const altMonthlyPrice = alt.cycle === 'yearly' ? alt.price / 12 : alt.price;
      if (altMonthlyPrice >= monthlyAmt) continue;
      result.push({
        currentService: sub.name,
        currentPrice: monthlyAmt,
        alternativeName: alt.name,
        alternativePrice: altMonthlyPrice,
        savings: monthlyAmt - altMonthlyPrice,
        note: alt.note,
        currency: sub.currency || alt.currency || 'USD',
      });
    }
    return result.sort((a, b) => b.savings - a.savings);
  }, [knownService, monthlyAmt, sub?.name, sub?.currency]);

  const saveNotes = useCallback((text: string) => {
    if (!sub) return;
    updateNotes(sub.id, text);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1500);
  }, [sub?.id, updateNotes]);

  if (!sub) {
    return (
      <View style={styles.container}>
        <Header title={t('subscription.details')} showBack />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('subscription.notFound')}</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(t('subscription.deleteConfirmTitle'), t('subscription.deleteConfirmMessage', { name: sub.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteSubscription(sub.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate('AddSubscription', { subscriptionId: sub.id, editMode: true });
  };

  const handleShare = () => {
    shareSubscription(sub, subCurrency).catch(() => {
      // user dismissed share sheet — no action needed
    });
  };

  const handlePause = () => {
    if (sub.status === 'paused') {
      resumeSubscription(sub.id);
    } else {
      Alert.alert(
        t('subscription.pauseConfirmTitle'),
        t('subscription.pauseConfirmMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('subscription.pause'), onPress: () => pauseSubscription(sub.id) },
        ]
      );
    }
  };

  const handleNotesBlur = () => {
    if (notesAutoSaveTimer.current) clearTimeout(notesAutoSaveTimer.current);
    saveNotes(notesText);
  };

  const handleNotesChange = (text: string) => {
    if (text.length > 500) return;
    setNotesText(text);
    setNotesSaved(false);
    if (notesAutoSaveTimer.current) clearTimeout(notesAutoSaveTimer.current);
    notesAutoSaveTimer.current = setTimeout(() => saveNotes(text), 2000);
  };

  const handleQuickSuggestion = (suggestion: string) => {
    const current = notesText.trim();
    const newText = current ? `${current}\n${suggestion}` : suggestion;
    if (newText.length > 500) return;
    setNotesText(newText);
    if (notesAutoSaveTimer.current) clearTimeout(notesAutoSaveTimer.current);
    notesAutoSaveTimer.current = setTimeout(() => saveNotes(newText), 2000);
  };

  const QUICK_SUGGESTIONS = [
    t('notes.quickCancel'),
    t('notes.quickShared'),
    t('notes.quickWork'),
    t('notes.quickCheck'),
    t('notes.quickPrice'),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title={t('subscription.details')}
          showBack
          rightAction={
            <TouchableOpacity onPress={handleDelete} accessibilityLabel="Delete subscription" accessibilityRole="button">
              <Ionicons name="trash-outline" size={22} color={colors.textMuted} importantForAccessibility="no" />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Paused Status Badge */}
        {sub.status === 'paused' && (
          <View style={styles.pausedStatusBanner}>
            <Ionicons name="pause-circle" size={16} color={colors.amber} />
            <Text style={styles.pausedStatusText}>{t('subscription.pausedLabel')}</Text>
            <Text style={styles.pausedStatusSubtext}>— {t('subscription.pauseConfirmMessage')}</Text>
          </View>
        )}

        {/* Price Change Banner */}
        {priceAlert && (
          <View style={styles.priceChangeBanner}>
            <View style={styles.priceChangeIconWrap}>
              <Ionicons
                name={priceAlert.type === 'price_increase' ? 'trending-up' : 'trending-down'}
                size={18}
                color={colors.amber}
              />
            </View>
            <View style={styles.priceChangeContent}>
              <Text style={styles.priceChangeTitle}>{t('subscription.priceChanged')}</Text>
              <Text style={styles.priceChangeBody}>
                {t('subscription.catalogPrice', {
                  price: formatCurrency(priceAlert.newPrice, priceAlert.currency),
                })}
              </Text>
              <Text style={styles.priceChangeCompare}>
                {formatCurrency(priceAlert.oldPrice, priceAlert.currency)}
                {' → '}
                {formatCurrency(priceAlert.newPrice, priceAlert.currency)}
              </Text>
            </View>
          </View>
        )}

        {/* Hero Card */}
        <GradientHeroCard
          icon={sub.iconKey}
          logoUrl={sub.logoUrl || undefined}
          name={sub.name}
          amount={sub.amount}
          currency={subCurrency}
          cycle={sub.cycle}
          category={sub.category}
          colorKey={sub.colorKey}
          style={styles.heroCard}
        />

        {/* Cost Stats */}
        <View style={styles.statsRow}>
          <GradientStatCard
            icon="cash-outline"
            iconColor={colors.emerald}
            label={t('subscription.monthlyCost')}
            value={formatCurrency(monthlyAmt, subCurrency)}
            delay={0}
          />
          <GradientStatCard
            icon="trending-up"
            iconColor={colors.primary}
            label={t('subscription.yearlyCost')}
            value={formatCurrency(yearlyAmt, subCurrency)}
            delay={0}
          />
        </View>

        {/* Billing Card */}
        <View style={styles.billingCard}>
          <View style={styles.billingIcon}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </View>
          <View style={styles.billingInfo}>
            <Text style={styles.billingTitle}>{t('subscription.nextBilling')}</Text>
            <Text style={styles.billingDate}>
              {new Date(sub.nextBillingDate).toLocaleDateString(dateLocale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <View style={styles.billingRemaining}>
              <Ionicons name="time-outline" size={14} color={colors.emerald} />
              <Text style={styles.billingDays}>{daysUntil} {t('subscription.daysRemaining')}</Text>
            </View>
          </View>
        </View>

        {/* Reminder Settings */}
        {(() => {
          const REMINDER_OPTIONS = [7, 3, 1, 0];
          const activeReminders = sub.customReminderDays != null ? sub.customReminderDays : defaultReminderDays;
          const isCustom = sub.customReminderDays != null;

          const toggleReminderDay = (day: number) => {
            const current = sub.customReminderDays != null ? sub.customReminderDays : [...defaultReminderDays];
            const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => b - a);
            updateSubscription(sub.id, { customReminderDays: next });
          };

          const clearCustomReminders = () => {
            updateSubscription(sub.id, { customReminderDays: null });
          };

          const dayLabel = (day: number) => {
            if (day === 7) return t('smartNotifications.days7');
            if (day === 3) return t('smartNotifications.days3');
            if (day === 1) return t('smartNotifications.days1');
            return t('smartNotifications.days0');
          };

          return (
            <View style={styles.reminderCard}>
              <Pressable style={styles.reminderHeader} onPress={() => setReminderExpanded(e => !e)}>
                <View style={styles.reminderHeaderLeft}>
                  <View style={styles.reminderIconWrap}>
                    <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.reminderTitle}>{t('smartNotifications.sectionTitle')}</Text>
                    <Text style={styles.reminderSubtitle}>
                      {activeReminders.length === 0
                        ? t('smartNotifications.noReminders')
                        : activeReminders.map(d => d === 0 ? t('smartNotifications.days0') : `${d}d`).join(', ')}
                    </Text>
                  </View>
                </View>
                <Ionicons name={reminderExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Pressable>
              {reminderExpanded && (
                <View style={styles.reminderBody}>
                  <Text style={styles.reminderCustomize}>{t('smartNotifications.customize')}</Text>
                  <View style={styles.reminderChips}>
                    {REMINDER_OPTIONS.map(day => {
                      const selected = activeReminders.includes(day);
                      return (
                        <Pressable
                          key={day}
                          style={[styles.reminderChip, selected && styles.reminderChipActive]}
                          onPress={() => toggleReminderDay(day)}
                        >
                          <Text style={[styles.reminderChipText, selected && styles.reminderChipTextActive]}>
                            {dayLabel(day)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {isCustom && (
                    <Pressable style={styles.useDefaultBtn} onPress={clearCustomReminders}>
                      <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                      <Text style={styles.useDefaultText}>{t('smartNotifications.useDefault')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })()}

        {/* Notes Section */}
        <View style={styles.notesCard}>
          <Pressable style={styles.notesHeader} onPress={() => setNotesExpanded(e => !e)}>
            <View style={styles.notesHeaderLeft}>
              <View style={styles.notesIconWrap}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notesTitle}>{t('notes.title')}</Text>
                {!notesExpanded && (
                  <Text style={styles.notesPreview} numberOfLines={1}>
                    {notesText.trim() || t('notes.placeholder')}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name={notesExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>

          {notesExpanded && (
            <View style={styles.notesBody}>
              <TextInput
                style={styles.notesInput}
                value={notesText}
                onChangeText={handleNotesChange}
                onBlur={handleNotesBlur}
                placeholder={t('notes.placeholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel={`Notes for ${sub.name}`}
              />
              <View style={styles.notesFooter}>
                <Text style={styles.notesCharCount}>{t('notes.maxLength', { count: notesText.length })}</Text>
                {notesSaved && (
                  <Text style={styles.notesSaved}>{t('notes.saved')}</Text>
                )}
              </View>
              <View style={styles.quickSuggestionsRow}>
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    style={styles.quickChip}
                    onPress={() => handleQuickSuggestion(suggestion)}
                  >
                    <Text style={styles.quickChipText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <SecondaryButton
            title={t('common.edit')}
            onPress={handleEdit}
            style={styles.actionButton}
            accessibilityLabel="Edit subscription"
          />
          <TouchableOpacity
            style={[styles.pauseButton, { backgroundColor: `${colors.primary}20` }]}
            onPress={handleShare}
            activeOpacity={0.8}
            accessibilityLabel="Share subscription"
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={18} color={colors.primary} importantForAccessibility="no" />
            <Text style={[styles.pauseButtonText, { color: colors.primary }]}>
              {t('share.shareSubscription')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pauseButton,
              { backgroundColor: sub.status === 'paused' ? `${colors.emerald}20` : `${colors.amber}20` },
            ]}
            onPress={handlePause}
            activeOpacity={0.8}
            accessibilityLabel={sub.status === 'paused' ? 'Resume subscription' : 'Pause subscription'}
            accessibilityRole="button"
          >
            <Ionicons
              name={sub.status === 'paused' ? 'play-circle-outline' : 'pause-circle-outline'}
              size={18}
              color={sub.status === 'paused' ? colors.emerald : colors.amber}
              importantForAccessibility="no"
            />
            <Text style={[
              styles.pauseButtonText,
              { color: sub.status === 'paused' ? colors.emerald : colors.amber },
            ]}>
              {sub.status === 'paused' ? t('subscription.resume') : t('subscription.pause')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Usage & Value Section */}
        {(() => {
          const USAGE_EMOJIS = ['😫', '😕', '😐', '🙂', '😍'];
          const monthlyAmt2 = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
          const valueScore = calculateValueScore(sub.usageRating, monthlyAmt2);
          const valueLabel = getValueLabel(valueScore);
          const valueColor = getValueColor(valueScore);

          const lastUsedText = (() => {
            if (!sub.lastUsedAt) return t('usageScore.neverUsed');
            const diffMs = Date.now() - new Date(sub.lastUsedAt).getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return t('usageScore.today');
            return t('usageScore.daysAgo', { days: diffDays });
          })();

          return (
            <View style={styles.usageCard}>
              <Text style={styles.usageSectionTitle} accessibilityRole="header">{t('usageScore.sectionTitle')}</Text>

              {/* Rating Picker */}
              <Text style={styles.usageRateLabel}>{t('usageScore.rateUsage')}</Text>
              <View style={styles.emojiRow} accessibilityRole="radiogroup">
                {USAGE_EMOJIS.map((emoji, idx) => {
                  const ratingVal = idx + 1;
                  const isSelected = sub.usageRating === ratingVal;
                  return (
                    <TouchableOpacity
                      key={ratingVal}
                      style={[styles.emojiBtn, isSelected && styles.emojiBtnSelected]}
                      onPress={() => updateUsageRating(sub.id, ratingVal)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Rate usage: ${ratingVal} out of 5`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Text style={[styles.emojiText, !isSelected && styles.emojiTextUnselected]} importantForAccessibility="no">
                        {emoji}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Value Score Badge */}
              {sub.usageRating !== undefined && (
                <View style={styles.valueBadgeRow}>
                  <Text style={styles.valueScoreLabel}>{t('usageScore.valueScore')}</Text>
                  <View
                    style={[styles.valueBadge, { backgroundColor: `${valueColor}20`, borderColor: `${valueColor}50` }]}
                    accessibilityLabel={`Value score: ${t(`usageScore.${valueLabel}`)}`}
                    accessibilityRole="text"
                  >
                    <Text style={[styles.valueBadgeText, { color: valueColor }]}>
                      {t(`usageScore.${valueLabel}`)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Log Usage Button */}
              <TouchableOpacity
                style={styles.logUsageBtn}
                onPress={() => logUsage(sub.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.emerald} />
                <Text style={styles.logUsageBtnText}>{t('usageScore.logUsage')}</Text>
              </TouchableOpacity>

              {/* Last Used */}
              <View style={styles.lastUsedRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.lastUsedText}>
                  {t('usageScore.lastUsed')}: {lastUsedText}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Payment History */}
        <Text style={styles.sectionTitle} accessibilityRole="header">{t('subscription.paymentHistory')}</Text>
        <View style={styles.historyCard}>
          {paymentHistory.map((payment, index) => (
            <PaymentHistoryItem
              key={index}
              date={payment.date}
              amount={payment.amount}
              currency={subCurrency}
            />
          ))}
        </View>

        {/* Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{t('subscription.statistics')}</Text>
          <View style={styles.statsRowItem}>
            <Text style={styles.statsLabel}>{t('subscription.totalPaid')}</Text>
            <Text style={styles.statsValue}>{formatCurrency(totalPaid, subCurrency)}</Text>
          </View>
          <View style={styles.statsRowItem}>
            <Text style={styles.statsLabel}>{t('subscription.memberSince')}</Text>
            <Text style={styles.statsValue}>
              {new Date(sub.createdAt).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })}
            </Text>
          </View>
          {sub.paymentMethod ? (
            <View style={[styles.statsRowItem, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="card-outline" size={14} color={colors.primary} />
                <Text style={styles.statsLabel}>{t('subscription.paymentMethod')}</Text>
              </View>
              <Text style={styles.statsValue}>{sub.paymentMethod}</Text>
            </View>
          ) : null}
        </View>

        {/* Lifecycle Timeline */}
        <View style={styles.lifecycleCard}>
          <Text style={styles.sectionTitle}>{t('subscription.lifecycle')}</Text>
          <LifecycleTimeline events={sub.lifecycle || []} />
        </View>

        {/* How to Cancel — Interactive Guide */}
        {knownService?.cancelSteps && knownService.cancelSteps.length > 0 ? (
          <CancellationGuide
            serviceName={sub.name}
            steps={knownService.cancelSteps}
            cancelUrl={knownService.cancelUrl}
            cancelDifficulty={knownService.cancelDifficulty}
          />
        ) : (
          <View style={styles.cancelCard}>
            <View style={styles.cancelHeader}>
              <View style={styles.cancelIconWrap}>
                <Ionicons name="close-circle-outline" size={20} color={colors.red} />
              </View>
              <Text style={styles.cancelTitle}>{t('subscription.howToCancel')}</Text>
            </View>
            <Text style={styles.noCancelGuide}>{t('subscription.noCancelGuide')}</Text>
          </View>
        )}

        {/* Cheaper Alternatives */}
        {alternatives.length > 0 && (
          <View style={styles.alternativesCard}>
            <View style={styles.alternativesHeader}>
              <View style={styles.alternativesIconWrap}>
                <Ionicons name="cash-outline" size={20} color={colors.emerald} />
              </View>
              <Text style={styles.alternativesTitle}>{t('alternatives.alternatives')}</Text>
            </View>
            {alternatives.map((alt) => (
              <AlternativeSuggestionCard
                key={`${alt.currentService}|${alt.alternativeName}`}
                suggestion={alt}
              />
            ))}
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityLabel="Delete subscription"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={colors.red} importantForAccessibility="no" />
          <Text style={styles.deleteText}>{t('subscription.deleteConfirmTitle')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  heroCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  billingCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  billingInfo: {
    flex: 1,
  },
  billingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  billingDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  billingRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  billingDays: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
  },
  pausedStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.amber}15`,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${colors.amber}30`,
    flexWrap: 'wrap',
  },
  priceChangeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: `${colors.amber}15`,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${colors.amber}40`,
  },
  priceChangeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.amber}25`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  priceChangeContent: {
    flex: 1,
  },
  priceChangeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.amber,
    marginBottom: 2,
  },
  priceChangeBody: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  priceChangeCompare: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pausedStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.amber,
  },
  pausedStatusSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  pauseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.emerald}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyStatus: {
    fontSize: 12,
    color: colors.emerald,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  statsRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsLabel: {
    fontSize: 14,
    color: colors.primary,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
  },
  lifecycleCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.red}30`,
  },
  cancelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cancelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.red}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cancelStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  cancelStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.red}20`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  cancelStepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
  },
  cancelStepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cancelPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.red,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelPageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.bg,
  },
  noCancelGuide: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // Alternatives section
  alternativesCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.emerald}30`,
  },
  alternativesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  alternativesIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.emerald}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alternativesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  // Usage & Value styles
  usageCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 14,
  },
  usageRateLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  emojiBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: `${colors.border}`,
  },
  emojiBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  emojiText: {
    fontSize: 24,
  },
  emojiTextUnselected: {
    opacity: 0.5,
  },
  valueBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  valueScoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  valueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  valueBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logUsageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${colors.emerald}15`,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${colors.emerald}30`,
    marginBottom: 10,
  },
  logUsageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.emerald,
  },
  lastUsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastUsedText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // Notes styles
  notesCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  notesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notesIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  notesPreview: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  notesBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  notesInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 90,
    lineHeight: 20,
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  notesCharCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notesSaved: {
    fontSize: 11,
    color: colors.emerald,
    fontWeight: '600',
  },
  quickSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}10`,
  },
  quickChipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  // Reminder Settings styles
  reminderCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  reminderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reminderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  reminderBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  reminderCustomize: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  reminderChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  reminderChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  reminderChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reminderChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  useDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}15`,
  },
  useDefaultText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
});
