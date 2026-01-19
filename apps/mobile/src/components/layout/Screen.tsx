/**
 * Screen - Safe area wrapper with consistent styling
 */
import React from 'react';
import { View, StyleSheet, StatusBar, ScrollView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scrollable = true, padding = true, style }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingHorizontal: padding ? 16 : 0,
    },
    style,
  ];

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[containerStyle, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={containerStyle}>{children}</View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
