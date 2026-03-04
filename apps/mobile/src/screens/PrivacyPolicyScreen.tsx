/* eslint-disable react/no-unescaped-entities */
/**
 * Privacy Policy Screen
 * Required for App Store and Google Play submission
 */
import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Header } from '../components';
import { useTheme, type ThemeColors } from '../theme';
import { t } from '../i18n';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <Header title={t('privacy.title')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: February 7, 2026</Text>

        <Text style={styles.heading}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to Finify ("we", "us", "our"). We are committed to protecting your personal 
          information and your right to privacy. This Privacy Policy explains how we collect, use, 
          and protect your information when you use our mobile application.
        </Text>

        <Text style={styles.heading}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          Finify is designed with a privacy-first approach. We minimize data collection and 
          never store raw document content.
        </Text>
        <Text style={styles.subheading}>Information you provide:</Text>
        <Text style={styles.bullet}>• Subscription details you manually enter (name, amount, billing cycle)</Text>
        <Text style={styles.bullet}>• Account preferences and settings</Text>
        <Text style={styles.bullet}>• Google account connection for cloud sync (securely stored)</Text>

        <Text style={styles.subheading}>Information we derive from bank statements:</Text>
        <Text style={styles.bullet}>• Merchant name, subscription amount, and billing cycle</Text>
        <Text style={styles.bullet}>• Confidence scores for detected subscriptions</Text>

        <Text style={styles.subheading}>Information we never collect or store:</Text>
        <Text style={styles.bullet}>• Raw bank statement documents or their full content</Text>
        <Text style={styles.bullet}>• Full account numbers or personal identifiers</Text>
        <Text style={styles.bullet}>• Names, phone numbers, or physical addresses</Text>
        <Text style={styles.bullet}>• Order IDs or transaction details beyond subscription amounts</Text>

        <Text style={styles.heading}>3. How We Use Your Information</Text>
        <Text style={styles.bullet}>• To display and manage your subscription tracking</Text>
        <Text style={styles.bullet}>• To send billing reminders (with your permission)</Text>
        <Text style={styles.bullet}>• To provide spending insights and budget tracking</Text>
        <Text style={styles.bullet}>• To sync data across devices (Pro feature, optional)</Text>

        <Text style={styles.heading}>4. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your data is primarily stored locally on your device. If you enable cloud sync (Pro feature), 
          data is encrypted and stored securely using Supabase with row-level security.
          OAuth tokens are stored using platform-secure storage (iOS Keychain / Android Keystore).
          We never store secrets in our codebase.
        </Text>

        <Text style={styles.heading}>5. Bank Statement Analysis</Text>
        <Text style={styles.paragraph}>
          If you upload a bank statement for scanning, the document is processed ephemerally 
          in a serverless function and immediately discarded. We only store the extracted 
          subscription records, never the raw document data. No account tokens or email 
          content is accessed.
        </Text>

        <Text style={styles.heading}>6. Third-Party Services</Text>
        <Text style={styles.bullet}>• Google AdMob (non-Pro users): Displays ads, subject to Google's privacy policy</Text>
        <Text style={styles.bullet}>• RevenueCat: Manages subscriptions, no personal data shared</Text>
        <Text style={styles.bullet}>• Supabase: Cloud database (Pro sync only), encrypted at rest</Text>

        <Text style={styles.heading}>7. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bullet}>• Access all data we store about you</Text>
        <Text style={styles.bullet}>• Delete your account and all associated data</Text>
        <Text style={styles.bullet}>• Export your data in CSV or PDF format</Text>
        <Text style={styles.bullet}>• Opt out of notifications</Text>

        <Text style={styles.heading}>8. Data Deletion</Text>
        <Text style={styles.paragraph}>
          You can delete all your data through Settings → Delete Account. This permanently removes 
          all data from your device, our servers, caches, and job queues. This action cannot be undone.
        </Text>

        <Text style={styles.heading}>9. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Finify is not intended for children under 13. We do not knowingly collect information 
          from children under 13.
        </Text>

        <Text style={styles.heading}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes 
          by updating the "Last Updated" date at the top of this policy.
        </Text>

        <Text style={styles.heading}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at:
          {'\n'}support@finify.app
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 24,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 24,
    paddingLeft: 8,
  },
});
