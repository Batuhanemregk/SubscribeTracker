/**
 * CategoryManagementScreen - Create, edit, and delete subscription categories
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput as RNTextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components';
import { useTheme, type ThemeColors } from '../theme';
import { useSettingsStore, useSubscriptionStore } from '../state';
import type { CustomCategory } from '../state/stores/settingsStore';
import { generateId } from '../state';
import { t } from '../i18n';

const PRESET_COLORS = [
  '#E50914', '#1DB954', '#4285F4', '#FF6B00',
  '#9146FF', '#00C853', '#FF9800', '#E91E63',
  '#6B7280', '#1A1A2E', '#00BCD4', '#FFEB3B',
];

const PRESET_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'tv-outline',
  'musical-notes-outline',
  'cloud-outline',
  'construct-outline',
  'game-controller-outline',
  'fitness-outline',
  'newspaper-outline',
  'school-outline',
  'cart-outline',
  'ellipsis-horizontal-outline',
  'home-outline',
  'car-outline',
  'restaurant-outline',
  'medkit-outline',
  'airplane-outline',
  'book-outline',
  'camera-outline',
  'briefcase-outline',
  'phone-portrait-outline',
  'star-outline',
];

interface CategoryModalState {
  visible: boolean;
  editingId: string | null;
  name: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const INITIAL_MODAL: CategoryModalState = {
  visible: false,
  editingId: null,
  name: '',
  color: '#4285F4',
  icon: 'ellipsis-horizontal-outline',
};

export function CategoryManagementScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { customCategories, addCustomCategory, updateCustomCategory, deleteCategory } = useSettingsStore();
  const { subscriptions, updateSubscription } = useSubscriptionStore();

  const [modal, setModal] = useState<CategoryModalState>(INITIAL_MODAL);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sub of subscriptions) {
      const cat = sub.category?.toLowerCase();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [subscriptions]);

  const getSubCount = (category: CustomCategory) => {
    // Match by id or by name (case-insensitive) for legacy subscriptions
    const byId = categoryCounts[category.id] || 0;
    const byName = categoryCounts[category.name.toLowerCase()] || 0;
    return Math.max(byId, byName);
  };

  const openAddModal = () => {
    setModal({ ...INITIAL_MODAL, visible: true });
  };

  const openEditModal = (category: CustomCategory) => {
    setModal({
      visible: true,
      editingId: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon as keyof typeof Ionicons.glyphMap,
    });
  };

  const closeModal = () => {
    setModal(INITIAL_MODAL);
  };

  const handleSave = () => {
    const trimmedName = modal.name.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), t('categories.categoryName'));
      return;
    }

    if (modal.editingId) {
      updateCustomCategory(modal.editingId, {
        name: trimmedName,
        color: modal.color,
        icon: modal.icon,
      });
    } else {
      addCustomCategory({
        id: generateId(),
        name: trimmedName,
        color: modal.color,
        icon: modal.icon,
        isDefault: false,
      });
    }
    closeModal();
  };

  const handleDelete = (category: CustomCategory) => {
    const count = getSubCount(category);
    Alert.alert(
      t('categories.delete'),
      t('categories.deleteConfirm', { name: category.name, count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // Move subscriptions using this category to 'other'
            for (const sub of subscriptions) {
              const subCat = sub.category?.toLowerCase();
              if (subCat === category.id || subCat === category.name.toLowerCase()) {
                updateSubscription(sub.id, { category: 'other' });
              }
            }
            deleteCategory(category.id);
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }: { item: CustomCategory }) => {
    const count = getSubCount(item);
    return (
      <View style={styles.categoryRow}>
        <View style={[styles.colorCircle, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.categoryInfo}>
          <View style={styles.categoryNameRow}>
            <Text style={styles.categoryName}>{item.name}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>{t('categories.defaultBadge')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.categoryCount}>
            {t('categories.subscriptionCount', { count })}
          </Text>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {!item.isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title={t('categories.title')}
          showBack
          rightAction={
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          }
        />
      </View>

      <FlatList
        data={customCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modal.editingId ? t('categories.editCategory') : t('categories.addCategory')}
            </Text>

            {/* Name Input */}
            <Text style={styles.fieldLabel}>{t('categories.categoryName')}</Text>
            <RNTextInput
              value={modal.name}
              onChangeText={(text) => setModal((prev) => ({ ...prev, name: text }))}
              placeholder={t('categories.categoryName')}
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              autoFocus
            />

            {/* Color Picker */}
            <Text style={styles.fieldLabel}>{t('categories.chooseColor')}</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    modal.color === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setModal((prev) => ({ ...prev, color }))}
                >
                  {modal.color === color && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon Picker */}
            <Text style={styles.fieldLabel}>{t('categories.chooseIcon')}</Text>
            <ScrollView
              style={styles.iconPickerScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.iconGrid}>
                {PRESET_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconCell,
                      modal.icon === icon && {
                        backgroundColor: modal.color,
                        borderColor: modal.color,
                      },
                    ]}
                    onPress={() => setModal((prev) => ({ ...prev, icon }))}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={modal.icon === icon ? '#FFFFFF' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: modal.color }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{t('categories.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 50,
    },
    addButton: {
      padding: 4,
    },
    list: {
      padding: 16,
      paddingBottom: 40,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    colorCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    defaultBadge: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    defaultBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    categoryCount: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryActions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
    },
    separator: {
      height: 8,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 16,
    },
    textInput: {
      color: colors.text,
      backgroundColor: `${colors.text}08`,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      borderWidth: 1,
      borderColor: `${colors.text}15`,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorSwatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorSwatchSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    iconPickerScroll: {
      maxHeight: 160,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconCell: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${colors.text}08`,
      borderWidth: 1,
      borderColor: `${colors.text}15`,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: `${colors.text}10`,
    },
    cancelBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
