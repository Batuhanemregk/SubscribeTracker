/**
 * PlanPickerScreen - Select a plan for a known service
 * Shows service logo, name, and all available plans with prices
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme';
import { Header } from '../components';
import { useSettingsStore } from '../state';
import { getCurrencySymbol } from '../utils';
import { t } from '../i18n';

interface Plan {
  id: string;
  name: string;
  price: number;
  cycle: string;
}

interface Service {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  category: string;
  icon: string;
  color: string;
  plans: Plan[];
}

interface PlanPickerScreenProps {
  navigation?: any;
  route?: {
    params?: {
      service: Service;
    };
  };
}

export function PlanPickerScreen({ navigation: navProp, route }: PlanPickerScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // Get service from route params with guard
  const service = route?.params?.service;
  const navigation = navProp;
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [logoError, setLogoError] = useState(false);
  const { app } = useSettingsStore();
  const currencySymbol = getCurrencySymbol(app.currency);

  // Early return if no service (shouldn't happen in normal flow)
  if (!service) {
    navigation.goBack();
    return null;
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    if (!selectedPlan) return;
    
    navigation.navigate('AddSubscription', {
      prefillData: {
        name: service.name,
        amount: selectedPlan.price.toString(),
        cycle: selectedPlan.cycle,
        iconKey: service.icon,
        colorKey: service.color,
        category: service.category,
        logoUrl: service.logoUrl,
        planName: selectedPlan.name,
      }
    });
  };

  const handleCustomAmount = () => {
    navigation.navigate('AddSubscription', {
      prefillData: {
        name: service.name,
        iconKey: service.icon,
        colorKey: service.color,
        category: service.category,
        logoUrl: service.logoUrl,
      }
    });
  };

  const getCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return t('common.perMonth');
      case 'yearly': return t('common.perYear');
      case 'weekly': return '/week';
      case 'once': return ' one-time';
      default: return `/${cycle}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Header title={t('planPicker.title')} showBack />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Info */}
        <View style={styles.serviceInfo}>
          <View style={[styles.logoContainer, { backgroundColor: `${service.color}20` }]}>
            {logoError || !service.logoUrl ? (
              <Text style={styles.emoji}>{service.icon}</Text>
            ) : (
              <Image
                source={{ uri: service.logoUrl }}
                style={styles.logo}
                onError={() => setLogoError(true)}
              />
            )}
          </View>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceCategory}>{service.category}</Text>
        </View>

        {/* Plans List */}
        <Text style={styles.sectionTitle}>{t('planPicker.availablePlans')}</Text>
        
        {service.plans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                isSelected && { borderColor: service.color },
              ]}
              onPress={() => handleSelectPlan(plan)}
              activeOpacity={0.7}
            >
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  {currencySymbol}{plan.price.toFixed(2)}
                  <Text style={styles.planCycle}>{getCycleLabel(plan.cycle)}</Text>
                </Text>
              </View>
              
              <View style={[
                styles.radioOuter,
                isSelected && { borderColor: service.color },
              ]}>
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: service.color }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Custom Amount Option */}
        <TouchableOpacity
          style={styles.customOption}
          onPress={handleCustomAmount}
        >
          <Ionicons name="create-outline" size={20} color={colors.textMuted} />
          <Text style={styles.customOptionText}>{t('planPicker.customAmount')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: selectedPlan ? service.color : colors.textMuted },
          ]}
          onPress={handleContinue}
          disabled={!selectedPlan}
        >
          <Text style={styles.continueButtonText}>
            {selectedPlan 
              ? t('planPicker.continueWith', { plan: selectedPlan.name }) 
              : t('planPicker.selectPlan')}
          </Text>
        </TouchableOpacity>
      </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  serviceInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  emoji: {
    fontSize: 40,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  planCardSelected: {
    backgroundColor: colors.bgCard,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  planCycle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  customOptionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
