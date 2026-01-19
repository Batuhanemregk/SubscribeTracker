/**
 * ScanResultsScreen - Display detected subscription candidates
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Header, PrimaryButton, SecondaryButton } from '../components';
import { colors, borderRadius } from '../theme';
import { useSubscriptionStore, createSubscription, usePlanStore } from '../state';
import { showInterstitialAd } from '../services';
import type { DetectionCandidate, Subscription } from '../types';

// Mock detected candidates
const MOCK_CANDIDATES: DetectionCandidate[] = [
  {
    id: 'cand-1',
    merchantName: 'Netflix',
    merchantDomain: 'netflix.com',
    detectedAmount: 15.99,
    detectedCurrency: 'USD',
    detectedCycle: 'monthly',
    confidence: 0.95,
    evidenceSnippet: 'Your Netflix subscription renews on...',
    sourceEmailId: 'email-1',
    suggestedIcon: '🎬',
    suggestedColor: '#E50914',
    suggestedCategory: 'Entertainment',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cand-2',
    merchantName: 'Spotify Premium',
    merchantDomain: 'spotify.com',
    detectedAmount: 10.99,
    detectedCurrency: 'USD',
    detectedCycle: 'monthly',
    confidence: 0.92,
    evidenceSnippet: 'Thank you for your Spotify Premium payment...',
    sourceEmailId: 'email-2',
    suggestedIcon: '🎵',
    suggestedColor: '#1DB954',
    suggestedCategory: 'Music',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cand-3',
    merchantName: 'Adobe Creative Cloud',
    merchantDomain: 'adobe.com',
    detectedAmount: 54.99,
    detectedCurrency: 'USD',
    detectedCycle: 'monthly',
    confidence: 0.88,
    evidenceSnippet: 'Your Adobe Creative Cloud invoice for...',
    sourceEmailId: 'email-3',
    suggestedIcon: '🎨',
    suggestedColor: '#FF0000',
    suggestedCategory: 'Design',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let color = colors.emerald;
  let label = 'High';
  
  if (confidence < 0.6) {
    color = colors.red;
    label = 'Low';
  } else if (confidence < 0.85) {
    color = colors.amber;
    label = 'Medium';
  }

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.confidenceText, { color }]}>{percentage}% {label}</Text>
    </View>
  );
}

interface CandidateCardProps {
  candidate: DetectionCandidate;
  index: number;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}

function CandidateCard({ candidate, index, onApprove, onReject, onEdit }: CandidateCardProps) {
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.candidateCard}
    >
      <View style={styles.candidateHeader}>
        <View style={[styles.iconContainer, { backgroundColor: candidate.suggestedColor }]}>
          <Text style={styles.iconEmoji}>{candidate.suggestedIcon}</Text>
        </View>
        <View style={styles.candidateInfo}>
          <Text style={styles.merchantName}>{candidate.merchantName}</Text>
          <Text style={styles.merchantDomain}>{candidate.merchantDomain}</Text>
        </View>
        <ConfidenceBadge confidence={candidate.confidence} />
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
          <Text style={styles.detailValue}>${candidate.detectedAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
          <Text style={styles.detailValue}>{candidate.detectedCycle}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="folder-outline" size={16} color={colors.textMuted} />
          <Text style={styles.detailValue}>{candidate.suggestedCategory}</Text>
        </View>
      </View>

      {candidate.evidenceSnippet && (
        <View style={styles.evidenceContainer}>
          <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
          <Text style={styles.evidenceText} numberOfLines={2}>
            {candidate.evidenceSnippet}
          </Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
          <Ionicons name="close" size={18} color={colors.red} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
          <LinearGradient
            colors={[colors.emerald, '#059669']}
            style={styles.approveGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark" size={18} color={colors.text} />
            <Text style={styles.approveText}>Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function ScanResultsScreen({ navigation, route }: any) {
  const { candidatesCount } = route.params || { candidatesCount: 3 };
  const [candidates, setCandidates] = useState(MOCK_CANDIDATES.slice(0, candidatesCount));
  const { addSubscription } = useSubscriptionStore();

  const handleApprove = (candidate: DetectionCandidate) => {
    // Create subscription from candidate
    const now = new Date();
    const nextBilling = new Date(now.setMonth(now.getMonth() + 1));
    
    const newSub = createSubscription({
      name: candidate.merchantName,
      amount: candidate.detectedAmount,
      currency: candidate.detectedCurrency,
      cycle: candidate.detectedCycle,
      nextBillingDate: nextBilling.toISOString(),
      category: candidate.suggestedCategory,
      iconKey: candidate.suggestedIcon,
      colorKey: candidate.suggestedColor,
    });
    
    addSubscription(newSub);
    
    // Remove from candidates
    setCandidates(prev => prev.filter(c => c.id !== candidate.id));
    
    // Show toast
    Alert.alert('Added!', `${candidate.merchantName} added to your subscriptions.`);
  };

  const handleReject = (candidate: DetectionCandidate) => {
    setCandidates(prev => prev.filter(c => c.id !== candidate.id));
  };

  const handleEdit = (candidate: DetectionCandidate) => {
    // Navigate to add screen with pre-filled data
    navigation.navigate('AddSubscription', {
      prefill: {
        name: candidate.merchantName,
        amount: candidate.detectedAmount.toString(),
        cycle: candidate.detectedCycle,
        category: candidate.suggestedCategory,
        iconKey: candidate.suggestedIcon,
        colorKey: candidate.suggestedColor,
      },
    });
    // Remove from candidates
    setCandidates(prev => prev.filter(c => c.id !== candidate.id));
  };

  const handleApproveAll = () => {
    candidates.forEach(c => handleApprove(c));
    navigation.navigate('Home');
  };

  const handleDone = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title="Scan Results"
          subtitle={`${candidates.length} subscriptions detected`}
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={32} color={colors.emerald} />
          </View>
          <Text style={styles.successTitle}>Scan Complete!</Text>
          <Text style={styles.successSubtitle}>
            Review the detected subscriptions below
          </Text>
        </View>

        {/* Candidates List */}
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            index={index}
            onApprove={() => handleApprove(candidate)}
            onReject={() => handleReject(candidate)}
            onEdit={() => handleEdit(candidate)}
          />
        ))}

        {candidates.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color={colors.emerald} />
            <Text style={styles.emptyTitle}>All Done!</Text>
            <Text style={styles.emptySubtitle}>
              All detected subscriptions have been processed.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        {candidates.length > 0 ? (
          <>
            <SecondaryButton
              title="Skip All"
              onPress={handleDone}
              fullWidth={false}
              style={styles.skipButton}
            />
            <PrimaryButton
              title={`Add All (${candidates.length})`}
              onPress={handleApproveAll}
              fullWidth={false}
              style={styles.addAllButton}
            />
          </>
        ) : (
          <PrimaryButton
            title="Done"
            onPress={handleDone}
          />
        )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  successBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.emerald}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  candidateCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  candidateInfo: {
    flex: 1,
    marginLeft: 14,
  },
  merchantName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  merchantDomain: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  evidenceContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.lg,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  evidenceText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.red}15`,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  approveButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  approveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  approveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  addAllButton: {
    flex: 2,
  },
});
