/**
 * HomeScreen - Main dashboard
 * Uses Zustand stores and new component library
 */
import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Header,
  GradientStatCard,
  EmptyState,
  FAB,
  PremiumSubscriptionCard,
  BannerAd,
} from "../components";
import { colors } from "../theme";
import { useSubscriptionStore } from "../state";
import { SEED_SUBSCRIPTIONS } from "../data/seed";
import type { Subscription } from "../types";

interface HomeScreenProps {
  navigation: any;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    subscriptions,
    setSubscriptions,
    deleteSubscription,
    calculateMonthlyTotal,
    calculateYearlyTotal,
    getActiveSubscriptions,
  } = useSubscriptionStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Seed data on first load if empty
  useEffect(() => {
    if (subscriptions.length === 0) {
      setSubscriptions(SEED_SUBSCRIPTIONS);
    }
  }, []);

  const activeSubs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotal();
  const yearlyTotal = calculateYearlyTotal();

  // Count upcoming (next 7 days)
  const upcomingCount = activeSubs.filter((sub) => {
    const daysUntil = Math.ceil(
      (new Date(sub.nextBillingDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    return daysUntil <= 7 && daysUntil >= 0;
  }).length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh
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
    navigation.navigate("AddSubscription");
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
    />
  );

  const renderHeader = () => (
    <>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <GradientStatCard
          icon="cash-outline"
          iconColor={colors.emerald}
          label="Monthly"
          value={`$${monthlyTotal.toFixed(2)}`}
          delay={0}
        />
        <GradientStatCard
          icon="calendar-outline"
          iconColor={colors.primary}
          label="Yearly"
          value={`$${yearlyTotal.toFixed(2)}`}
          delay={100}
        />
      </View>

      <View style={styles.statsRow}>
        <GradientStatCard
          icon="apps-outline"
          iconColor={colors.pink}
          label="Active"
          value={activeSubs.length.toString()}
          delay={200}
        />
        <GradientStatCard
          icon="notifications-outline"
          iconColor={colors.amber}
          label="This Week"
          value={upcomingCount.toString()}
          delay={300}
        />
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Subscriptions</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="apps-outline"
      title="No subscriptions yet"
      subtitle="Add your first subscription to start tracking your expenses"
      primaryAction={{
        title: "Add subscription",
        onPress: handleAddSubscription,
      }}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Header
          icon="wallet-outline"
          iconColor={colors.primary}
          title="SubscribeTracker"
          subtitle="Manage your subscriptions"
          rightAction={
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Subscription List */}
      <FlatList
        data={activeSubs}
        keyExtractor={(item) => item.id}
        renderItem={renderSubscriptionItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Banner Ad for Standard Users */}
      <BannerAd />

      {/* FAB */}
      <FAB icon="add" onPress={handleAddSubscription} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
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
    color: colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    justifyContent: "center",
    alignItems: "center",
  },
});
