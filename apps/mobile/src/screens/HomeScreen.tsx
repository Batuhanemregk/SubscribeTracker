/**
 * HomeScreen - Main dashboard
 * Uses Zustand stores and new component library
 */
import React, { useEffect, useCallback, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Header,
  GradientStatCard,
  FAB,
  PremiumSubscriptionCard,
  BannerAd,
  CompactSubscriptionCard,
} from "../components";
import { AddMethodSheet } from "../components/AddMethodSheet";
import { ScanBanner } from "../components/ScanBanner";
import { SubscriptionFilterSheet } from "../components/SubscriptionFilterSheet";
import { useTheme } from "../theme";
import { useSubscriptionStore, useSettingsStore, usePlanStore, useCurrencyStore } from "../state";
import { FREE_SUBSCRIPTION_LIMIT } from "../state/stores/planStore";
import { formatCurrency, filterAndSortSubscriptions, type SubscriptionSortKey } from "../utils";
import { SEED_SUBSCRIPTIONS } from "../data/seed";
import type { Subscription, BillingCycle } from "../types";
import { t } from "../i18n";

// Cycle filter order — only those present in the user's list are shown.
const CYCLE_ORDER: BillingCycle[] = ['monthly', 'yearly', 'weekly', 'quarterly'];

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

  // Subscription list filters (search stays inline & pinned; the rest live in the sheet)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCycles, setSelectedCycles] = useState<BillingCycle[]>([]);
  const [sortBy, setSortBy] = useState<SubscriptionSortKey>('soonest');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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
    if (!app.dataSeeded) {
      // Demo subscriptions are for development/screenshots only — real users
      // start with an empty list.
      if (__DEV__ && subscriptions.length === 0) {
        setSubscriptions(SEED_SUBSCRIPTIONS);
      }
      setDataSeeded(true);
    }
  }, []);

  const activeSubs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotalConverted(convert, currency);
  const yearlyTotal = calculateYearlyTotalConverted(convert, currency);

  // Count upcoming (next 7 days)
  const upcomingCount = activeSubs.filter((sub) => {
    const daysUntil = Math.ceil(
      (new Date(sub.nextBillingDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    return daysUntil <= 7 && daysUntil >= 0;
  }).length;

  // Derive filter options from the user's data, plus the filtered/sorted list.
  const availableCategories = useMemo(
    () => Array.from(new Set(activeSubs.map((s) => s.category))).sort(),
    [activeSubs],
  );
  const availableCycles = useMemo(
    () => CYCLE_ORDER.filter((c) => activeSubs.some((s) => s.cycle === c)),
    [activeSubs],
  );
  const visibleSubs = useMemo(
    () =>
      filterAndSortSubscriptions(
        activeSubs,
        { query: searchQuery, categories: selectedCategories, cycles: selectedCycles, sortBy },
        convert,
        currency,
      ),
    [activeSubs, searchQuery, selectedCategories, selectedCycles, sortBy, convert, currency],
  );
  // Search is always visible, so it is not counted in the sheet's badge.
  const activeFilterCount =
    selectedCategories.length + selectedCycles.length + (sortBy !== 'soonest' ? 1 : 0);

  const toggleCategory = (c: string) =>
    setSelectedCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleCycle = (c: BillingCycle) =>
    setSelectedCycles((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCycles([]);
    setSortBy('soonest');
  };
  const clearAll = () => {
    clearFilters();
    setSearchQuery('');
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  const handlePressSubscription = (sub: Subscription) => {
    navigation.navigate("SubscriptionDetails", { subscriptionId: sub.id });
  };

  const handleEditSubscription = (sub: Subscription) => {
    navigation.navigate("AddSubscription", {
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

  // Standard (free) users can track up to FREE_SUBSCRIPTION_LIMIT subscriptions;
  // adding beyond that routes to the paywall (Premium is unlimited).
  const promptIfAtFreeLimit = (): boolean => {
    if (!isPro() && getActiveSubscriptions().length >= FREE_SUBSCRIPTION_LIMIT) {
      Alert.alert(
        t('paywall.limitReachedTitle'),
        t('paywall.limitReachedBody', { limit: FREE_SUBSCRIPTION_LIMIT }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.upgradeToPro'), onPress: () => navigation.navigate('Paywall') },
        ]
      );
      return true;
    }
    return false;
  };

  const handleBrowseServices = () => {
    if (promptIfAtFreeLimit()) return;
    navigation.navigate('ServicePicker');
  };

  const handleCustomEntry = () => {
    if (promptIfAtFreeLimit()) return;
    navigation.navigate('AddSubscription');
  };

  const renderSubscriptionItem = ({
    item,
    index,
  }: {
    item: Subscription;
    index: number;
  }) => (
    <PremiumSubscriptionCard
      item={item}
      index={index}
      onPress={() => handlePressSubscription(item)}
      onEdit={() => handleEditSubscription(item)}
      onDelete={() => handleDeleteSubscription(item)}
      onSwipeOpen={() => closeOtherCards(item.id)}
      swipeableRef={(ref: any) => { swipeableRefs.current[item.id] = ref; }}
    />
  );

  const greeting = useMemo(() => getGreeting(), []);

  const renderHeader = () => (
    <>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <GradientStatCard
          icon="cash-outline"
          iconColor={colors.emerald}
          label={t('home.monthly')}
          value={formatCurrency(monthlyTotal, currency)}
          delay={0}
        />
        <GradientStatCard
          icon="calendar-outline"
          iconColor={colors.primary}
          label={t('home.yearly')}
          value={formatCurrency(yearlyTotal, currency)}
          delay={0}
        />
      </View>

      <View style={styles.statsRow}>
        <GradientStatCard
          icon="apps-outline"
          iconColor={colors.pink}
          label={t('home.active')}
          value={activeSubs.length.toString()}
          delay={0}
        />
        <GradientStatCard
          icon="notifications-outline"
          iconColor={colors.amber}
          label={t('home.thisWeek')}
          value={upcomingCount.toString()}
          delay={0}
        />
      </View>

      {/* Scan Banner */}
      <ScanBanner onScanPress={handleScanStatement} />

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.yourSubscriptions')}</Text>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          style={styles.viewToggle}
        >
          <Ionicons
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={15}
            color={colors.primary}
          />
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            {viewMode === 'list' ? t('home.gridView') : t('home.listView')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmpty = () => {
    // Have subscriptions, but the active filter/search matched none.
    if (activeSubs.length > 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="search" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('home.noResultsTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('home.noResultsBody')}
          </Text>
          <TouchableOpacity onPress={clearAll} style={styles.emptyManualBtn}>
            <Text style={[styles.emptyManualText, { color: colors.primary }]}>
              {t('home.noResultsClear')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
    <View style={styles.emptyContainer}>
      {/* Hero Icon */}
      <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}15` }]}> 
        <Ionicons name="document-text" size={48} color={colors.primary} />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('home.findSubscriptions')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t('home.findSubtitle')}
      </Text>

      {/* Primary CTA — Scan */}
      <TouchableOpacity
        style={[styles.emptyScanBtn, { backgroundColor: colors.primary }]}
        onPress={handleScanStatement}
        activeOpacity={0.85}
      >
        <Ionicons name="document-text" size={20} color="#fff" />
        <Text style={styles.emptyScanBtnText}>{t('home.scanStatement')}</Text>
      </TouchableOpacity>

      {/* Secondary link — Manual */}
      <TouchableOpacity onPress={handleBrowseServices} style={styles.emptyManualBtn}>
        <Text style={[styles.emptyManualText, { color: colors.primary }]}>
          {t('home.enterManually')}
        </Text>
      </TouchableOpacity>
    </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Header
          title={greeting}
          rightAction={
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.bgCard }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Pinned search + filter (only when the user has subscriptions) */}
      {activeSubs.length > 0 && (
        <View style={styles.filterRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.bgCard, borderColor: activeFilterCount > 0 ? colors.primary : colors.border },
            ]}
            onPress={() => setShowFilterSheet(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount > 0 ? colors.primary : colors.text}
            />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Subscription List */}
      {viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={visibleSubs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CompactSubscriptionCard
              item={item}
              onPress={() => handlePressSubscription(item)}
            />
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
          key="list"
          data={visibleSubs}
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

      {/* FAB */}
      <FAB icon="add" onPress={handleAddSubscription} />

      {/* Add Method Sheet */}
      <AddMethodSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onScan={handleScanStatement}
        onBrowse={handleBrowseServices}
        onCustom={handleCustomEntry}
      />

      {/* Filter & Sort Sheet */}
      <SubscriptionFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        availableCategories={availableCategories}
        availableCycles={availableCycles}
        selectedCategories={selectedCategories}
        selectedCycles={selectedCycles}
        sortBy={sortBy}
        resultCount={visibleSubs.length}
        onToggleCategory={toggleCategory}
        onToggleCycle={toggleCycle}
        onSelectSort={setSortBy}
        onClear={clearFilters}
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "500",
  },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
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
