/**
 * ServicePickerScreen - Browse and select from known subscription services
 * Features:
 * - Search bar for filtering
 * - Category tabs (Entertainment, Music, etc.)
 * - Grid of services with logos from Clearbit
 * - "Custom" option at bottom for manual entry
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme';
import { Header } from '../components';
import knownServices from '../data/known-services.json';
import { t } from '../i18n';

interface ServicePickerScreenProps {
  navigation: any;
}

interface Service {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  category: string;
  icon: string;
  color: string;
  plans?: Array<{ id: string; name: string; price: number; cycle: string }>;
}

const categories = ['All', ...knownServices.categories.map(c => c.name)];

export function ServicePickerScreen({ navigation }: ServicePickerScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    let services = knownServices.services as Service[];
    
    // Filter by category
    if (selectedCategory !== 'All') {
      services = services.filter(s => s.category === selectedCategory);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      services = services.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.domain.toLowerCase().includes(query)
      );
    }
    
    return services;
  }, [searchQuery, selectedCategory]);

  const handleSelectService = (service: Service) => {
    if (service.plans && service.plans.length > 0) {
      // Navigate to plan picker
      navigation.navigate('PlanPicker', { service });
    } else {
      // Navigate directly to add subscription with prefilled data
      navigation.navigate('AddSubscription', {
        prefillData: {
          name: service.name,
          iconKey: service.icon,
          colorKey: service.color,
          category: service.category,
          logoUrl: service.logoUrl,
        }
      });
    }
  };

  const handleCustomSubscription = () => {
    navigation.navigate('AddSubscription');
  };

  const handleLogoError = (serviceId: string) => {
    setLogoErrors(prev => new Set(prev).add(serviceId));
  };

  const renderCategoryTab = (category: string) => {
    const isSelected = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryTab, isSelected && styles.categoryTabSelected]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderServiceItem = ({ item }: { item: Service }) => {
    const showFallback = logoErrors.has(item.id) || !item.logoUrl;
    
    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => handleSelectService(item)}
        activeOpacity={0.7}
      >
        {/* Logo or Fallback */}
        <View style={[styles.logoContainer, { backgroundColor: `${item.color}20` }]}>
          {showFallback ? (
            <Text style={styles.emoji}>{item.icon}</Text>
          ) : (
            <Image
              source={{ uri: item.logoUrl }}
              style={styles.logo}
              onError={() => handleLogoError(item.id)}
            />
          )}
        </View>
        
        {/* Name */}
        <Text style={styles.serviceName} numberOfLines={1}>
          {item.name}
        </Text>
        
        {/* Plan count badge */}
        {item.plans && item.plans.length > 0 && (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{item.plans.length} plans</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Header title={t('servicePicker.title')} showBack />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('servicePicker.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          renderItem={({ item }) => renderCategoryTab(item)}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Services Grid */}
      <FlatList
        data={filteredServices}
        renderItem={renderServiceItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('servicePicker.noResults')}</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.customButton}
            onPress={handleCustomSubscription}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={styles.customButtonText}>{t('home.addSubscription')}</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFF',
  },
  grid: {
    padding: 16,
    paddingBottom: 100,
  },
  serviceCard: {
    flex: 1,
    maxWidth: '33.33%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  emoji: {
    fontSize: 32,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  planBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  planBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  customButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});
