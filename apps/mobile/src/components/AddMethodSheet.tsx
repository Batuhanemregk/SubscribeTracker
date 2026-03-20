/**
 * AddMethodSheet — Bottom sheet for choosing how to add a subscription
 * 
 * Options: Scan Statement (Pro) / Browse Services / Custom Entry
 * Shown when FAB is pressed on HomeScreen.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { usePlanStore } from '../state';
import { t } from '../i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddMethodSheetProps {
  visible: boolean;
  onClose: () => void;
  onScan: () => void;
  onBrowse: () => void;
  onCustom: () => void;
}

interface MethodOption {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isPro?: boolean;
}

export function AddMethodSheet({ visible, onClose, onScan, onBrowse, onCustom }: AddMethodSheetProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { isPro } = usePlanStore();

  const options: MethodOption[] = [
    {
      icon: 'document-text',
      iconColor: colors.primary,
      title: t('addMethod.scanStatement'),
      subtitle: t('addMethod.scanSubtitle'),
      onPress: onScan,
      isPro: !isPro(),
    },
    {
      icon: 'search',
      iconColor: colors.emerald,
      title: t('addMethod.browseServices'),
      subtitle: t('addMethod.browseSubtitle'),
      onPress: onBrowse,
    },
    {
      icon: 'create',
      iconColor: colors.amber,
      title: t('addMethod.customEntry'),
      subtitle: t('addMethod.customSubtitle'),
      onPress: onCustom,
    },
  ];

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(200)}
        style={styles.sheet}
      >
        <View style={[styles.sheetContent, { backgroundColor: colors.bgCard }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('addMethod.title')}
          </Text>

          {/* Options */}
          {options.map((option, index) => (
            <Animated.View key={option.icon} entering={FadeInDown.delay(50 + index * 60).duration(250)}>
              <TouchableOpacity
                style={[styles.option, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => { onClose(); option.onPress(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${option.iconColor}15` }]}>
                  <Ionicons name={option.icon as any} size={24} color={option.iconColor} />
                </View>
                <View style={styles.optionText}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
                    {option.isPro && (
                      <View style={[styles.proBadge, { backgroundColor: `${colors.primary}20` }]}>
                        <Text style={[styles.proBadgeText, { color: colors.primary }]}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    {option.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    paddingBottom: 40,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
