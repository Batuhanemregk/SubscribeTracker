/**
 * Finify - App Entry Point
 * Navigation configuration only - all logic in modular files
 */
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, ActivityIndicator, View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// Internal imports
import { ThemeProvider, useTheme } from './src/theme';
import { AnimatedTabScreen, ErrorBoundary } from './src/components';
import { initData } from './src/data/repository';
import { useSettingsStore, useSubscriptionStore, useCurrencyStore, usePlanStore, migrateSubscriptionIds } from './src/state';
import { t, initLocaleFromSettings } from './src/i18n';
import {
  requestNotificationPermission,
  scheduleAllReminders,
  addNotificationResponseListener,
  loadInterstitialAd,
  initAdManager,
  authenticateWithBiometrics,
  initPurchases,
  checkProStatus,
  checkCatalogUpdate,
  initRatingTracking,
} from './src/services';
import {
  HomeScreen,
  InsightsScreen,
  BudgetScreen,
  CalendarScreen,
  TimelineScreen,
  SettingsScreen,
  AddSubscriptionScreen,
  SubscriptionDetailsScreen,
  PaywallScreen,
  OnboardingScreen,
  ServicePickerScreen,
  PlanPickerScreen,
  BankStatementScanScreen,
  PrivacyPolicyScreen,
  TermsOfServiceScreen,
  ScreenshotImportScreen,
  BubbleViewScreen,
  MonthlyReportScreen,
  CategoryManagementScreen,
} from './src/screens';

// Navigation setup
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab route → icon + i18n key mapping
const TAB_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
  Home: { icon: 'home', labelKey: 'tabs.home' },
  Timeline: { icon: 'time', labelKey: 'tabs.timeline' },
  Insights: { icon: 'stats-chart', labelKey: 'tabs.insights' },
  Budget: { icon: 'wallet', labelKey: 'tabs.budget' },
  Settings: { icon: 'settings', labelKey: 'tabs.settings' },
};

// Premium floating glass tab bar
function MainTabs() {
  const { colors, isDark } = useTheme();

  // Wrap screens with fade animation
  const AnimatedHome = (props: any) => (<AnimatedTabScreen><HomeScreen {...props} /></AnimatedTabScreen>);
  const AnimatedTimeline = (props: any) => (<AnimatedTabScreen><TimelineScreen {...props} /></AnimatedTabScreen>);
  const AnimatedInsights = (props: any) => (<AnimatedTabScreen><InsightsScreen {...props} /></AnimatedTabScreen>);
  const AnimatedBudget = (props: any) => (<AnimatedTabScreen><BudgetScreen {...props} /></AnimatedTabScreen>);
  const AnimatedSettings = (props: any) => (<AnimatedTabScreen><SettingsScreen {...props} /></AnimatedTabScreen>);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name] || { icon: 'apps' as any, labelKey: route.name };
        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute' as const,
            bottom: Platform.OS === 'ios' ? 24 : 16,
            left: 20,
            right: 20,
            height: 64,
            borderRadius: 24,
            borderTopWidth: 0,
            backgroundColor: isDark ? 'rgba(26, 26, 36, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            paddingBottom: 0,
            paddingTop: 0,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.4 : 0.12,
                shadowRadius: 24,
              },
              android: {
                elevation: 12,
              },
            }),
          },
          tabBarBackground: () => (
            Platform.OS === 'ios' ? (
              <BlurView
                intensity={isDark ? 60 : 80}
                tint={isDark ? 'dark' : 'light'}
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: 24,
                  overflow: 'hidden',
                }}
              />
            ) : null
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabel: t(config.labelKey),
          tabBarAccessibilityLabel: route.name,
          tabBarTestID: `tab-${route.name.toLowerCase()}`,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600' as const,
            marginTop: -4,
            marginBottom: Platform.OS === 'ios' ? 10 : 10,
          },
          tabBarIconStyle: {
            marginTop: Platform.OS === 'ios' ? 10 : 6,
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name={config.icon} size={22} color={color} />
          ),
        };
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tab.Screen name="Home" component={AnimatedHome} />
      <Tab.Screen name="Timeline" component={AnimatedTimeline} />
      <Tab.Screen name="Insights" component={AnimatedInsights} />
      <Tab.Screen name="Budget" component={AnimatedBudget} />
      <Tab.Screen name="Settings" component={AnimatedSettings} />
    </Tab.Navigator>
  );
}

// Inner app component that uses theme context
function AppContent() {
  const { colors, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const hasSeenOnboarding = useSettingsStore((state) => state.hasSeenOnboarding);
  const notificationsEnabled = useSettingsStore((state) => state.app.notificationsEnabled);
  const biometricLockEnabled = useSettingsStore((state) => state.app.biometricLockEnabled);
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  // Dynamic navigation theme
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.bgCard,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  useEffect(() => {
    const prepare = async () => {
      await initData();

      // Migrate non-UUID subscription IDs to proper UUIDs (one-time migration)
      const subStore = useSubscriptionStore.getState();
      const migrationResult = migrateSubscriptionIds({
        subscriptions: subStore.subscriptions,
        paymentHistory: subStore.paymentHistory,
      });
      if (migrationResult.migrated) {
        useSubscriptionStore.setState({
          subscriptions: migrationResult.subscriptions,
          paymentHistory: migrationResult.paymentHistory,
        });
      }

      // Initialize locale from saved language preference
      const savedLanguage = useSettingsStore.getState().app.language;
      initLocaleFromSettings(savedLanguage || 'system');
      
      const hasPermission = await requestNotificationPermission();
      if (hasPermission && notificationsEnabled) {
        await scheduleAllReminders(subscriptions, undefined, useSettingsStore.getState().app.currency);
      }
      
      loadInterstitialAd();
      await initAdManager();

      await initPurchases();
      initRatingTracking().catch(() => {});

      // Sync pro status with RevenueCat entitlements
      try {
        const isRevenueCatPro = await checkProStatus();
        const localPro = usePlanStore.getState().isPro();
        if (isRevenueCatPro && !localPro) {
          usePlanStore.getState().upgradeToPro();
          console.log('[App] Pro status synced: upgraded from RevenueCat');
        } else if (!isRevenueCatPro && localPro) {
          usePlanStore.getState().downgradeToStandard();
          console.log('[App] Pro status synced: downgraded (subscription expired)');
        }
      } catch (e) {
        console.warn('[App] Pro status sync failed:', e);
      }

      // Fetch exchange rates in background
      useCurrencyStore.getState().fetchRates();

      // Check for service catalog updates in background
      checkCatalogUpdate().catch(() => {});
      
      setTimeout(async () => {
        setIsReady(true);
        const biometricEnabled = useSettingsStore.getState().app.biometricLockEnabled;
        if (biometricEnabled) {
          const success = await authenticateWithBiometrics();
          setIsLocked(!success);
        } else {
          setIsLocked(false);
        }
      }, 100);
    };
    prepare();
  }, []);

  useEffect(() => {
    if (isReady && notificationsEnabled) {
      scheduleAllReminders(subscriptions, undefined, useSettingsStore.getState().app.currency);
    }
  }, [subscriptions, notificationsEnabled, isReady]);

  useEffect(() => {
    const subscription = addNotificationResponseListener((subscriptionId) => {
      if (navigationRef.current) {
        navigationRef.current.navigate('SubscriptionDetails', { subscriptionId });
      }
    });
    return () => subscription.remove();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isLocked && biometricLockEnabled) {
    const handleUnlock = async () => {
      const success = await authenticateWithBiometrics();
      setIsLocked(!success);
    };

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 40 }}>
        <Ionicons name="lock-closed" size={48} color={colors.primary} style={{ marginBottom: 24 }} />
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 12 }}>
          App Locked
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
          Authenticate to unlock Finify
        </Text>
        <TouchableOpacity 
          onPress={handleUnlock}
          style={{ 
            backgroundColor: colors.primary, 
            paddingHorizontal: 32, paddingVertical: 14, 
            borderRadius: 16 
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Unlock with Biometrics
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showOnboarding = !hasSeenOnboarding();

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.bg} 
      />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
            contentStyle: { backgroundColor: colors.bg },
          }}
          initialRouteName={showOnboarding ? 'Onboarding' : 'MainTabs'}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="SubscriptionDetails"
            component={SubscriptionDetailsScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="AddSubscription"
            component={AddSubscriptionScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="ServicePicker"
            component={ServicePickerScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="PlanPicker"
            component={PlanPickerScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BankStatementScan"
            component={BankStatementScanScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="TermsOfService"
            component={TermsOfServiceScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ScreenshotImport"
            component={ScreenshotImportScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="BubbleView"
            component={BubbleViewScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MonthlyReport"
            component={MonthlyReportScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CategoryManagement"
            component={CategoryManagementScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

// Root App - wraps everything with ThemeProvider
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
