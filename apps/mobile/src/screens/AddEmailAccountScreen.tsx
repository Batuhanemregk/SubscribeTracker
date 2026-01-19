/**
 * AddEmailAccountScreen - Connect a new email account with real OAuth
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Header } from '../components';
import { colors, borderRadius } from '../theme';
import { useAccountStore, usePlanStore } from '../state';
import { authenticate, type OAuthProvider } from '../services';
import type { EmailProvider } from '../types';

const PROVIDERS = [
  {
    id: 'gmail' as EmailProvider,
    name: 'Gmail',
    icon: 'logo-google',
    color: '#EA4335',
    description: 'Connect your Google account',
  },
  {
    id: 'outlook' as EmailProvider,
    name: 'Outlook',
    icon: 'logo-microsoft',
    color: '#0078D4',
    description: 'Connect your Microsoft account',
  },
];

interface ProviderCardProps {
  provider: typeof PROVIDERS[0];
  index: number;
  onPress: () => void;
  isLoading: boolean;
  selectedProvider: EmailProvider | null;
}

function ProviderCard({ provider, index, onPress, isLoading, selectedProvider }: ProviderCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    opacity.value = withDelay(index * 100, withSpring(1));
    scale.value = withDelay(index * 100, withSpring(1, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const isSelected = selectedProvider === provider.id;
  const isLoadingThis = isLoading && isSelected;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.providerCard, isSelected && styles.providerCardSelected]}
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <View style={[styles.providerIcon, { backgroundColor: `${provider.color}20` }]}>
          {isLoadingThis ? (
            <ActivityIndicator color={provider.color} />
          ) : (
            <Ionicons name={provider.icon as any} size={28} color={provider.color} />
          )}
        </View>
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerDescription}>{provider.description}</Text>
        </View>
        <Ionicons 
          name={isSelected ? 'checkmark-circle' : 'chevron-forward'} 
          size={24} 
          color={isSelected ? colors.emerald : colors.textMuted} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function AddEmailAccountScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const { addAccount } = useAccountStore();
  const { isPro } = usePlanStore();

  const handleSelectProvider = async (provider: EmailProvider) => {
    setSelectedProvider(provider);
    setIsLoading(true);

    try {
      // Real OAuth flow
      const oauthProvider: OAuthProvider = provider === 'gmail' ? 'gmail' : 'outlook';
      const result = await authenticate(oauthProvider);

      if (result.success && result.email) {
        // Add account to store
        addAccount({
          provider,
          email: result.email,
          displayName: result.email.split('@')[0],
          avatarUrl: null,
          status: 'active',
        });

        Alert.alert(
          'Account Connected! 🎉',
          `${PROVIDERS.find(p => p.id === provider)?.name} account connected successfully.`,
          [
            {
              text: 'Scan Now',
              onPress: () => {
                navigation.goBack();
                setTimeout(() => {
                  navigation.navigate('ScanProgress');
                }, 300);
              },
            },
            {
              text: 'Later',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // User cancelled or auth failed
        if (result.error && result.error !== 'User cancelled') {
          Alert.alert('Connection Failed', result.error || 'Please try again later.');
        }
      }
    } catch (error) {
      console.error('OAuth error:', error);
      Alert.alert('Connection Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedProvider(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title="Connect Email"
          subtitle="Select your email provider"
          showBack
        />
      </View>

      <View style={styles.content}>
        {/* Provider List */}
        <View style={styles.providerList}>
          {PROVIDERS.map((provider, index) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              index={index}
              onPress={() => handleSelectProvider(provider.id)}
              isLoading={isLoading}
              selectedProvider={selectedProvider}
            />
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={20} color={colors.emerald} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Privacy First</Text>
            <Text style={styles.infoDescription}>
              We only read email metadata to detect subscriptions. 
              {isPro() ? ' Pro users get full body parsing for better detection.' : ''}
            </Text>
          </View>
        </View>

        {/* Apple Mail Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={18} color={colors.amber} />
          <Text style={styles.noticeText}>
            Apple Mail is not supported. Connect Gmail or Outlook instead.
          </Text>
        </View>

        {/* Permissions Info */}
        <Text style={styles.permissionsTitle}>Permissions Requested</Text>
        <View style={styles.permissionsList}>
          <View style={styles.permissionItem}>
            <Ionicons name="checkmark" size={16} color={colors.emerald} />
            <Text style={styles.permissionText}>Read email metadata (sender, subject, date)</Text>
          </View>
          {isPro() && (
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark" size={16} color={colors.emerald} />
              <Text style={styles.permissionText}>Read email body content (Pro)</Text>
            </View>
          )}
          <View style={styles.permissionItem}>
            <Ionicons name="close" size={16} color={colors.red} />
            <Text style={styles.permissionText}>We never store full email content</Text>
          </View>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  providerList: {
    marginBottom: 24,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  providerCardSelected: {
    borderColor: colors.emerald,
    backgroundColor: `${colors.emerald}10`,
  },
  providerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.emerald}15`,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${colors.emerald}30`,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.amber}15`,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 24,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permissionsList: {
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 10,
  },
});
