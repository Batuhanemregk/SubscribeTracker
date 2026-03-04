/**
 * LifecycleTimeline - Vertical timeline of subscription lifecycle events
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { t } from '../i18n';
import type { LifecycleEvent, LifecycleEventType } from '../types';

const EVENT_COLORS: Record<LifecycleEventType, string> = {
  subscribed:    '#10B981',
  paused:        '#F59E0B',
  resumed:       '#3B82F6',
  price_changed: '#F97316',
  renewed:       '#8B5CF6',
  cancelled:     '#EF4444',
  rating_changed:'#A855F6',
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  events: LifecycleEvent[];
}

export function LifecycleTimeline({ events }: Props) {
  const { colors } = useTheme();

  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>
        {t('subscription.lifecycleEmpty')}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {/* Vertical line */}
      <View style={[styles.line, { backgroundColor: colors.border }]} />

      {sorted.map((event, index) => {
        const dotColor = EVENT_COLORS[event.type] ?? colors.textMuted;
        return (
          <View key={event.id} style={styles.row}>
            {/* Dot */}
            <View style={styles.dotWrap}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            </View>

            {/* Content */}
            <View style={[styles.content, index < sorted.length - 1 && styles.contentBorder, { borderBottomColor: colors.border }]}>
              <Text style={[styles.date, { color: colors.textMuted }]}>
                {formatDate(event.date)}
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>
                {t(`lifecycle.${event.type}`)}
              </Text>
              {event.details ? (
                <Text style={[styles.details, { color: colors.textSecondary }]}>
                  {event.details}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingLeft: 20,
  },
  line: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 6,
    width: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  dotWrap: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 14,
    alignSelf: 'flex-start',
    zIndex: 1,
    // Offset so the dot sits on the line (line starts at left:5, dot width 12 → shift left by (12-2)/2 = 5)
    marginLeft: -6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
  },
  contentBorder: {
    borderBottomWidth: 1,
  },
  date: {
    fontSize: 11,
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  details: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  empty: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
