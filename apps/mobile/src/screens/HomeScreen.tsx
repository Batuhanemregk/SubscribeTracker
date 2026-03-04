/**
 * HomeScreen - Main dashboard
 * Uses Zustand stores and new component library
 */
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Header,
  GradientStatCard,
  FAB,
  PremiumSubscriptionCard,
  BannerAd,
  CompactSubscriptionCard,
} from '../components';
import { AddMethodSheet } from '../components/AddMethodSheet';
import { ScanBanner } from '../components/ScanBanner';
import { useTheme } from '../theme';
import { useSubscriptionStore, useSettingsStore, usePlanStore, useCurrencyStore } from '../state';
import {
  formatCurrency,
  findNextUpcomingPayment,
  formatBillingDate,
  advanceToNextBillingDate,
} from '../utils';
import { SEED_SUBSCRIPTIONS } from '../data/seed';
import type { Subscription } from '../types';
import { t } from '../i18n';

interface HomeScreenProps {
  navigation: any;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.goodMorning');
  if (hour < 18) return t('home.goodAfternoon');
  return t('home.goodEvening');
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors } = useTheme();
  const {
    subscriptions,
    setSubscriptions,
    deleteSubscription,
    pauseSubscription,
    calculateMonthlyTotalConverted,
    calculateYearlyTotalConverted,
    getActiveSubscriptions,
  } = useSubscriptionStore();
  const { app, setDataSeeded } = useSettingsStore();
  const { isPro } = usePlanStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Track all swipeable refs and currently open card
  const swipeableRefs = useRef<{ [key: string]: any }>({});
  const currentlyOpenRef = useRef<string | null>(null);

  // Close all swipeable cards except the one being opened
  const closeOtherCards = useCallback((openingId: string) => {
    if (currentlyOpenRef.current && currentlyOpenRef.current !== openingId) {
      swipeableRefs.current[currentlyOpenRef.current]?.close();
    }
    currentlyOpenRef.current = openingId;
  }, []);

  // Close all open cards (for tap outside)
  const closeAllCards = useCallback(() => {
    if (currentlyOpenRef.current) {
      swipeableRefs.current[currentlyOpenRef.current]?.close();
      currentlyOpenRef.current = null;
    }
  }, []);

  // Seed data only on first-ever app launch, never again
  useEffect(() => {
    if (!app.dataSeeded && subscriptions.length === 0) {
      setSubscriptions(SEED_SUBSCRIPTIONS);
      setDataSeeded(true);
    } else if (!app.dataSeeded) {
      // Subscriptions already exist (e.g. from persist), just mark as seeded
      setDataSeeded(true);
    }
  }, []);

  const activeSubs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotalConverted(convert, currency);
  const yearlyTotal = calculateYearlyTotalConverted(convert, currency);

  // Sort subscriptions by next billing date ASC (AC-DB-07)
  const sortedSubs = useMemo(() => {
    return [...activeSubs].sort((a, b) => {
      const aDate = advanceToNextBillingDate(a.nextBillingDate, a.cycle, a.customDays).getTime();
      const bDate = advanceToNextBillingDate(b.nextBillingDate, b.cycle, b.customDays).getTime();
      return aDate - bDate;
    });
  }, [activeSubs]);

  // Find next upcoming payment (AC-DB-03)
  const nextUpcoming = useMemo(() => findNextUpcomingPayment(subscriptions), [subscriptions]);

  // Count upcoming (next 7 days)
  const upcomingCount = activeSubs.filter((sub) => {
    const daysUntil = Math.ceil(
      (new Date(sub.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return daysUntil <= 7 && daysUntil >= 0;
  }).length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  const handlePressSubscription = (sub: Subscription) => {
    navigation.navigate('SubscriptionDetails', { subscriptionId: sub.id });
  };

  const handleEditSubscription = (sub: Subscription) => {
    navigation.navigate('AddSubscription', {
      subscriptionId: sub.id,
      editMode: true,
    });
  };

  const handleDeleteSubscription = (sub: Subscription) => {
    deleteSubscription(sub.id);
  };

  const handleAddSubscription = () => {
    setShowAddSheet(true);
  };

  const handleScanStatement = () => {
    if (isPro()) {
      navigation.navigate('BankStatementScan');
    } else {
      navigation.navigate('Paywall');
    }
  };

  const handleBrowseServices = () => {
    navigation.navigate('ServicePicker');
  };

  const handleCustomEntry = () => {
    navigation.navigate('AddSubscription');
  };

  const renderSubscriptionItem = ({ item, index }: { item: Subscription; index: number }) => (
    <PremiumSubscriptionCard
      item={item}
      index={index}
      onPress={() => handlePressSubscription(item)}
      onEdit={() => handleEditSubscription(item)}
      onDelete={() => handleDeleteSubscription(item)}
      onPause={() => pauseSubscription(item.id)}
      onSwipeOpen={() => closeOtherCards(item.id)}
      swipeableRef={(ref: any) => {
        swipeableRefs.current[item.id] = ref;
      }}
    />
  );

  const greeting = useMemo(() => getGreeting(), []);

  // Build upcoming text (AC-DB-03)
  const upcomingText = useMemo(() => {
    if (!nextUpcoming) return t('home.noUpcoming');
    const { subscription: upSub, daysUntil } = nextUpcoming;
    const amountStr = formatCurrency(upSub.amount, upSub.currency || currency);
    if (daysUntil <= 0) return t('home.upcomingToday', { amount: amountStr, name: upSub.name });
    return t('home.upcoming', { amount: amountStr, days: daysUntil, name: upSub.name });
  }, [nextUpcoming, currency]);

  const renderHeader = () => (
    <>
      {/* Hero Summary Card — TOTAL MONTHLY SPEND (AC-DB-02, AC-DB-03) */}
      <View
        testID="dashboard-summary-card"
        style={[styles.heroCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      >
        <Text style={[styles.heroLabel, { color: colors.textMuted }]}>
          {t('home.totalMonthlySpend')}
        </Text>
        <Text testID="dashboard-total-monthly" style={[styles.heroAmount, { color: colors.text }]}>
          {formatCurrency(monthlyTotal, currency)}
        </Text>
        <Text testID="dashboard-upcoming" style={[styles.heroUpcoming, { color: colors.primary }]}>
          {upcomingText}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <GradientStatCard
          icon="calendar-outline"
          iconColor={colors.primary}
          label={t('home.yearly')}
          value={formatCurrency(yearlyTotal, currency)}
          delay={0}
        />
        <GradientStatCard
          icon="apps-outline"
          iconColor={colors.pink}
          label={t('home.active')}
          value={activeSubs.length.toString()}
          delay={0}
        />
      </View>

      {/* Scan Banner */}
      <ScanBanner onScanPress={handleScanStatement} />

      {/* Section Title with count (AC-DB-04) */}
      <View style={styles.sectionHeader}>
        <Text
          testID="dashboard-subscription-count"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          {t('home.subscriptionCount', { count: sortedSubs.length })}
        </Text>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            {viewMode === 'list' ? t('home.seeAll') : t('home.listView')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmpty = () => (
    <View testID="dashboard-empty" style={styles.emptyContainer}>
      {/* Hero Icon */}
      <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="document-text" size={48} color={colors.primary} />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('home.noSubscriptions')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t('home.noSubscriptionsMessage')}
      </Text>

      {/* Primary CTA — Scan */}
      <TouchableOpacity
        testID="dashboard-scan-btn"
        style={[styles.emptyScanBtn, { backgroundColor: colors.primary }]}
        onPress={handleScanStatement}
        activeOpacity={0.85}
      >
        <Ionicons name="document-text" size={20} color="#fff" />
        <Text style={styles.emptyScanBtnText}>{t('home.scanStatement')}</Text>
      </TouchableOpacity>

      {/* Secondary link — Manual */}
      <TouchableOpacity
        testID="dashboard-manual-btn"
        onPress={handleBrowseServices}
        style={styles.emptyManualBtn}
      >
        <Text style={[styles.emptyManualText, { color: colors.primary }]}>
          {t('home.enterManually')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View testID="dashboard-screen" style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Header
          title={greeting}
          rightAction={
            <TouchableOpacity
              testID="dashboard-settings-btn"
              style={[styles.notificationButton, { backgroundColor: colors.bgCard }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Subscription List (sorted by next_billing_date ASC — AC-DB-07) */}
      {viewMode === 'grid' ? (
        <FlatList
          testID="dashboard-list"
          key="grid"
          data={sortedSubs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CompactSubscriptionCard item={item} onPress={() => handlePressSubscription(item)} />
          )}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, { paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeAllCards}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          testID="dashboard-list"
          key="list"
          data={sortedSubs}
          keyExtractor={(item) => item.id}
          renderItem={renderSubscriptionItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeAllCards}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Banner Ad for Standard Users */}
      <BannerAd />

      {/* FAB (AC-DB-06) */}
      <FAB testID="dashboard-fab" icon="add" onPress={handleAddSubscription} />

      {/* Add Method Sheet */}
      <AddMethodSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onScan={handleScanStatement}
        onBrowse={handleBrowseServices}
        onCustom={handleCustomEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroUpcoming: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
  },
  emptyScanBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyManualBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  emptyManualText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
