/**
 * Terms of Service Screen
 * Required for App Store and Google Play submission
 */
import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Header } from '../components';
import { useTheme, type ThemeColors } from '../theme';
import { t } from '../i18n';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <Header title={t('terms.title')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: February 7, 2026</Text>

        <Text style={styles.heading}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, or using Finify ("the App"), you agree to be bound by these 
          Terms of Service. If you do not agree to these terms, do not use the App.
        </Text>

        <Text style={styles.heading}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Finify is a subscription and expense tracking application that helps users monitor 
          recurring payments, manage budgets, and gain insights into their spending habits. 
          The App offers both free (Standard) and paid (Pro) tiers.
        </Text>

        <Text style={styles.heading}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          You may use the App without creating an account. Certain features (cloud sync) 
          require signing in with Google. You are responsible for maintaining the security 
          of your connected accounts.
        </Text>

        <Text style={styles.heading}>4. Subscriptions and Payments</Text>
        <Text style={styles.paragraph}>
          Pro features are available through auto-renewable subscriptions managed by Apple's 
          App Store or Google Play Store. Subscription pricing is displayed in the App before 
          purchase. Subscriptions automatically renew unless cancelled at least 24 hours before 
          the end of the current period. You can manage and cancel subscriptions through your 
          device's subscription settings.
        </Text>

        <Text style={styles.heading}>5. Free Trial</Text>
        <Text style={styles.paragraph}>
          If offered, free trial periods automatically convert to paid subscriptions unless 
          cancelled before the trial ends. Only one free trial per Apple ID or Google account.
        </Text>

        <Text style={styles.heading}>6. Accuracy of Information</Text>
        <Text style={styles.paragraph}>
          Finify provides subscription detection and spending tracking as a convenience tool. 
          We do not guarantee the accuracy of detected subscriptions, amounts, or billing dates. 
          Always verify important financial information with your service providers or bank statements.
        </Text>

        <Text style={styles.heading}>7. Document Scanning</Text>
        <Text style={styles.paragraph}>
          By uploading bank statements, you grant Finify permission to process these documents 
          solely for subscription detection purposes. We process data ephemerally and store only 
          derived subscription records, never raw content.
        </Text>

        <Text style={styles.heading}>8. Prohibited Uses</Text>
        <Text style={styles.paragraph}>You agree not to:</Text>
        <Text style={styles.bullet}>• Reverse engineer, decompile, or disassemble the App</Text>
        <Text style={styles.bullet}>• Use the App for any illegal purpose</Text>
        <Text style={styles.bullet}>• Attempt to gain unauthorized access to our systems</Text>
        <Text style={styles.bullet}>• Share your account access with others</Text>

        <Text style={styles.heading}>9. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The App, including all content, features, and functionality, is owned by Finify and 
          is protected by copyright, trademark, and other intellectual property laws.
        </Text>

        <Text style={styles.heading}>10. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          Finify is provided "as is" without warranties of any kind. We shall not be liable for 
          any indirect, incidental, special, or consequential damages arising from your use of the 
          App, including but not limited to missed payments, incorrect subscription detection, 
          or financial losses.
        </Text>

        <Text style={styles.heading}>11. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to terminate or suspend access to the App at our discretion. 
          You may stop using the App at any time. Upon termination, your right to use the App 
          ceases immediately.
        </Text>

        <Text style={styles.heading}>12. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. Continued use of the App after 
          changes constitutes acceptance of the modified Terms.
        </Text>

        <Text style={styles.heading}>13. Contact</Text>
        <Text style={styles.paragraph}>
          For questions about these Terms, contact us at:
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
