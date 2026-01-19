/**
 * SubscribeTracker - App Entry Point
 * Navigation configuration only - all logic in modular files
 */
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Internal imports
import { colors } from './src/theme';
import { initData } from './src/data/repository';
import { useSettingsStore, useSubscriptionStore } from './src/state';
import {
  requestNotificationPermission,
  scheduleAllReminders,
  addNotificationResponseListener,
  loadInterstitialAd,
} from './src/services';
import {
  HomeScreen,
  InsightsScreen,
  BudgetScreen,
  CalendarScreen,
  SettingsScreen,
  AddSubscriptionScreen,
  SubscriptionDetailsScreen,
  PaywallScreen,
  EmailAccountsScreen,
  AddEmailAccountScreen,
  ScanProgressScreen,
  ScanResultsScreen,
  OnboardingScreen,
} from './src/screens';

// Navigation setup
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom navigation theme
const NavigationTheme = {
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

// Tab navigator with all main screens
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'apps';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Insights') iconName = 'stats-chart';
          else if (route.name === 'Budget') iconName = 'wallet';
          else if (route.name === 'Calendar') iconName = 'calendar';
          else if (route.name === 'Settings') iconName = 'settings';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Main App component
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const hasSeenOnboarding = useSettingsStore((state) => state.hasSeenOnboarding);
  const notificationsEnabled = useSettingsStore((state) => state.app.notificationsEnabled);
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  useEffect(() => {
    const prepare = async () => {
      await initData();
      
      // Request notification permission and schedule reminders
      const hasPermission = await requestNotificationPermission();
      if (hasPermission && notificationsEnabled) {
        await scheduleAllReminders(subscriptions);
      }
      
      // Preload interstitial ad for Standard users
      loadInterstitialAd();
      
      // Small delay to ensure store is hydrated
      setTimeout(() => setIsReady(true), 100);
    };
    prepare();
  }, []);

  // Reschedule reminders when subscriptions change
  useEffect(() => {
    if (isReady && notificationsEnabled) {
      scheduleAllReminders(subscriptions);
    }
  }, [subscriptions, notificationsEnabled, isReady]);

  // Handle notification tap - navigate to subscription details
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

  const showOnboarding = !hasSeenOnboarding();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <NavigationContainer ref={navigationRef} theme={NavigationTheme}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
            initialRouteName={showOnboarding ? 'Onboarding' : 'MainTabs'}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
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
              name="EmailAccounts"
              component={EmailAccountsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="AddEmailAccount"
              component={AddEmailAccountScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ScanProgress"
              component={ScanProgressScreen}
              options={{ animation: 'fade', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ScanResults"
              component={ScanResultsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
