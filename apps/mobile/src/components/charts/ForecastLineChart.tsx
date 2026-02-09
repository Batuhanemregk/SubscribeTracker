/**
 * ForecastLineChart - Line chart for 6-month spending forecast
 * Uses react-native-gifted-charts
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../../theme';
import { t } from '../../i18n';

interface ForecastData {
  month: string;
  value: number;
}

interface ForecastLineChartProps {
  data: ForecastData[];
  title?: string;
}

export function ForecastLineChart({ data, title }: ForecastLineChartProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const chartWidth = Dimensions.get('window').width - 80;

  // Transform data for gifted-charts
  const lineData = data.map((item) => ({
    value: item.value,
    label: item.month,
    dataPointColor: colors.primary,
    dataPointText: `$${item.value.toFixed(0)}`,
  }));

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="trending-up" size={18} color={colors.primary} />
          <Text style={styles.title}>{title || t('insights.forecastTitle')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No forecast data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={18} color={colors.primary} />
        <Text style={styles.title}>{title || t('insights.forecastTitle')}</Text>
      </View>

      <LineChart
        data={lineData}
        width={chartWidth}
        height={150}
        spacing={chartWidth / (data.length + 1)}
        color={colors.primary}
        thickness={3}
        startFillColor={`${colors.primary}40`}
        endFillColor={`${colors.primary}05`}
        startOpacity={0.8}
        endOpacity={0.1}
        initialSpacing={20}
        yAxisTextStyle={styles.yAxisText}
        xAxisLabelTextStyle={styles.xAxisLabel}
        hideDataPoints={false}
        dataPointsColor={colors.primary}
        dataPointsRadius={5}
        curved
        areaChart
        noOfSections={4}
        yAxisColor="transparent"
        xAxisColor="transparent"
        rulesType="dashed"
        rulesColor={`${colors.textMuted}20`}
        isAnimated
        animationDuration={500}
        pointerConfig={{
          pointerStripHeight: 120,
          pointerStripColor: colors.primary,
          pointerStripWidth: 2,
          pointerColor: colors.primary,
          radius: 6,
          pointerLabelWidth: 80,
          pointerLabelHeight: 40,
          activatePointersOnLongPress: true,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: any) => {
            return (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>
                  ${items[0].value.toFixed(2)}
                </Text>
              </View>
            );
          },
        }}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Average</Text>
          <Text style={styles.summaryValue}>
            ${(data.reduce((a, b) => a + b.value, 0) / data.length).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Projected Total</Text>
          <Text style={styles.summaryValue}>
            ${data.reduce((a, b) => a + b.value, 0).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  yAxisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  xAxisLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  tooltip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
});
