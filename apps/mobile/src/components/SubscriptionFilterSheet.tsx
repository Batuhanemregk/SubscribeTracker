/**
 * SubscriptionFilterSheet — Bottom sheet for filtering & sorting the Home list
 *
 * Holds the category + billing-cycle filters and the sort selector so the Home
 * header stays uncluttered (search lives inline on Home). Filters apply live as
 * the user toggles; the footer just shows the resulting count and closes.
 * Mirrors AddMethodSheet's Modal + backdrop + slide-up pattern.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import type { BillingCycle } from '../types';
import type { SubscriptionSortKey } from '../utils';
import { t } from '../i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SORT_OPTIONS: { key: SubscriptionSortKey; labelKey: string; icon: string }[] = [
  { key: 'soonest', labelKey: 'home.sortSoonest', icon: 'time-outline' },
  { key: 'name', labelKey: 'home.sortName', icon: 'text-outline' },
  { key: 'priceDesc', labelKey: 'home.sortPriceDesc', icon: 'trending-down-outline' },
];

// Map a billing cycle to its existing AddSubscription i18n label.
function cycleLabel(cycle: BillingCycle): string {
  return t(`addSubscription.${cycle}`, { defaultValue: cycle });
}

interface SubscriptionFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  availableCategories: string[];
  availableCycles: BillingCycle[];
  selectedCategories: string[];
  selectedCycles: BillingCycle[];
  sortBy: SubscriptionSortKey;
  resultCount: number;
  onToggleCategory: (category: string) => void;
  onToggleCycle: (cycle: BillingCycle) => void;
  onSelectSort: (sort: SubscriptionSortKey) => void;
  onClear: () => void;
}

// Chip layout is theme-independent (colors are applied inline), so it lives at
// module scope — the per-theme createStyles() below is only for the sheet body.
const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

function Chip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        chipStyles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? `${colors.primary}18` : 'transparent',
        },
      ]}
    >
      <Text style={[chipStyles.chipText, { color: selected ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SubscriptionFilterSheet({
  visible,
  onClose,
  availableCategories,
  availableCycles,
  selectedCategories,
  selectedCycles,
  sortBy,
  resultCount,
  onToggleCategory,
  onToggleCycle,
  onSelectSort,
  onClear,
}: SubscriptionFilterSheetProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const hasActive =
    selectedCategories.length > 0 || selectedCycles.length > 0 || sortBy !== 'soonest';

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(200)}
        style={styles.sheet}
      >
        <View style={[styles.sheetContent, { backgroundColor: colors.bgCard }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{t('home.filterTitle')}</Text>
            {hasActive && (
              <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.clearText, { color: colors.primary }]}>
                  {t('home.filterClear')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Category */}
            {availableCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {t('home.filterCategory')}
                </Text>
                <View style={styles.chipWrap}>
                  {availableCategories.map((c) => (
                    <Chip
                      key={c}
                      label={t(`categories.${c}`, { defaultValue: c })}
                      selected={selectedCategories.includes(c)}
                      onPress={() => onToggleCategory(c)}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Billing cycle */}
            {availableCycles.length > 1 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {t('home.filterCycle')}
                </Text>
                <View style={styles.chipWrap}>
                  {availableCycles.map((c) => (
                    <Chip
                      key={c}
                      label={cycleLabel(c)}
                      selected={selectedCycles.includes(c)}
                      onPress={() => onToggleCycle(c)}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Sort */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {t('home.filterSortBy')}
              </Text>
              {SORT_OPTIONS.map((opt) => {
                const selected = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.sortRow, { borderColor: colors.border }]}
                    onPress={() => onSelectSort(opt.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sortLabel,
                        { color: selected ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity
            style={[styles.showButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.showButtonText}>
              {t('home.filterShowResults', { count: resultCount })}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    sheetContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 16,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    clearText: {
      fontSize: 15,
      fontWeight: '600',
    },
    section: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      marginBottom: 8,
    },
    sortLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    showButton: {
      marginTop: 4,
      paddingVertical: 16,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    showButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
