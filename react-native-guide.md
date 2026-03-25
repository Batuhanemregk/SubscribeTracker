# React Native Premium Card Animations Guide

Bu döküman, web'deki premium kart animasyonlarının React Native'de nasıl implemente edileceğini göstermektedir.

## 📦 Gerekli Paketler

```bash
npm install react-native-reanimated react-native-gesture-handler
npm install react-native-linear-gradient
```

### iOS için ek kurulum:
```bash
cd ios && pod install
```

### babel.config.js'e ekleyin:
```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

---

## 🎯 1. Subscription Card (Press Scale + Parallax + Shimmer + Shadow)

```tsx
import React from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

export function SubscriptionCard() {
  const pressed = useSharedValue(0);
  const shimmerPosition = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  // Shimmer animation (sürekli döngü)
  React.useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      false
    );
  }, []);

  // Parallax gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Kart merkezinden uzaklığa göre rotate hesapla
      const centerX = width * 0.45;
      const centerY = 100;
      
      rotateY.value = ((e.x - centerX) / centerX) * 8;
      rotateX.value = ((centerY - e.y) / centerY) * 8;
    })
    .onEnd(() => {
      rotateX.value = withSpring(0);
      rotateY.value = withSpring(0);
    });

  // Press animation
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.97]);
    const shadowOpacity = interpolate(pressed.value, [0, 1], [0.3, 0.15]);
    
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale },
      ],
      shadowOpacity,
    };
  });

  // Shimmer animation
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerPosition.value,
      [0, 1],
      [-width, width * 2]
    );
    
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Pressable
        onPressIn={() => {
          pressed.value = withSpring(1);
        }}
        onPressOut={() => {
          pressed.value = withSpring(0);
        }}
      >
        <Animated.View style={[styles.card, animatedStyle]}>
          <LinearGradient
            colors={['#a855f7', '#9333ea', '#7e22ce']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Shimmer overlay */}
            <Animated.View style={[styles.shimmer, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>👑</Text>
                </View>
                <View>
                  <Text style={styles.title}>Premium Plan</Text>
                  <Text style={styles.subtitle}>YEARLY</Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.price}>$99</Text>
                <Text style={styles.period}>/year</Text>
              </View>

              <View style={styles.features}>
                {['Unlimited access', 'Priority support', 'Advanced analytics'].map((feature, i) => (
                  <View key={i} style={styles.feature}>
                    <View style={styles.checkIcon}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.button}>
                <LinearGradient
                  colors={['#a855f7', '#7e22ce']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Upgrade Now</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 24,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '50%',
  },
  shimmerGradient: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  period: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  features: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  checkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 🔄 2. Product Card (3D Flip + Glassmorphism)

```tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur'; // yarn add @react-native-community/blur

export function ProductCard() {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotation = useSharedValue(0);

  const flipCard = () => {
    rotation.value = withSpring(isFlipped ? 0 : 180, {
      damping: 15,
      stiffness: 100,
    });
    setIsFlipped(!isFlipped);
  };

  // Front side animation
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    const opacity = interpolate(rotation.value, [0, 90, 180], [1, 0, 0]);

    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden',
    };
  });

  // Back side animation
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    const opacity = interpolate(rotation.value, [0, 90, 180], [0, 0, 1]);

    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <Pressable onPress={flipCard}>
      <View style={styles.container}>
        {/* Front Side */}
        <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
          <LinearGradient
            colors={['#06b6d4', '#3b82f6', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          >
            <BlurView
              style={styles.blurContainer}
              blurType="light"
              blurAmount={10}
              reducedTransparencyFallbackColor="rgba(255,255,255,0.1)"
            >
              <View style={styles.productContent}>
                <View style={styles.rating}>
                  <Text style={styles.star}>⭐</Text>
                  <Text style={styles.ratingText}>4.9</Text>
                  <Text style={styles.ratingCount}>(234)</Text>
                </View>

                <View style={styles.productImage}>
                  <Text style={styles.emoji}>🎧</Text>
                </View>

                <Text style={styles.productTitle}>Premium Headphones</Text>
                <Text style={styles.productDesc}>
                  Wireless noise cancellation
                </Text>

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.productPrice}>$299</Text>
                    <Text style={styles.oldPrice}>$399</Text>
                  </View>
                  <View style={styles.detailsButton}>
                    <Text style={styles.detailsText}>Details</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </LinearGradient>
        </Animated.View>

        {/* Back Side */}
        <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
          <View style={styles.backContent}>
            <Text style={styles.backTitle}>Specifications</Text>
            
            {[
              { label: 'Battery Life', value: '30 hours' },
              { label: 'Bluetooth', value: '5.0' },
              { label: 'Noise Cancellation', value: 'Active ANC' },
            ].map((spec, i) => (
              <View key={i} style={styles.specRow}>
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}

            <Pressable style={styles.addButton}>
              <LinearGradient
                colors={['#06b6d4', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Text style={styles.addButtonText}>Add to Cart - $299</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardBack: {
    backgroundColor: '#1a1a24',
    padding: 24,
  },
  gradientBg: {
    flex: 1,
  },
  blurContainer: {
    flex: 1,
    padding: 24,
  },
  productContent: {
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  star: {
    fontSize: 16,
  },
  ratingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  productImage: {
    width: 128,
    height: 128,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 16,
  },
  emoji: {
    fontSize: 64,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  productDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  oldPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
  },
  detailsButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  detailsText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  backContent: {
    flex: 1,
  },
  backTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  specLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  addButton: {
    marginTop: 'auto',
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 📊 3. Stats Card (Stagger Animation)

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const StatItem = ({ icon, label, value, delay }: any) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1));
    translateY.value = withDelay(delay, withSpring(0));
    scale.value = withDelay(delay, withSpring(1, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.statItem, animatedStyle]}>
      <View style={styles.statIcon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.changeContainer}>
        <Text style={styles.changeText}>↗ +12.5%</Text>
      </View>
    </Animated.View>
  );
};

export function StatsCard() {
  const stats = [
    { icon: '👥', label: 'Active Users', value: '24.5K' },
    { icon: '💰', label: 'Revenue', value: '$89K' },
    { icon: '📈', label: 'Engagement', value: '94%' },
    { icon: '🚀', label: 'Growth', value: '156%' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Analytics Overview</Text>
          <Text style={styles.subtitle}>Last 30 days performance</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {stats.map((stat, index) => (
          <StatItem
            key={index}
            {...stat}
            delay={index * 100}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a24',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
});
```

---

## 🔔 4. Notification Card (Spring + Swipe to Delete)

```tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const NotificationItem = ({ notification, onRemove }: any) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      translateX.value = Math.max(0, event.translationX);
    },
    onEnd: (event) => {
      if (event.translationX > 100) {
        // Swipe to delete
        translateX.value = withSpring(400);
        opacity.value = withSpring(0, {}, () => {
          runOnJS(onRemove)(notification.id);
        });
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.notification, animatedStyle]}>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{notification.time}</Text>
        </View>
        <Pressable style={styles.deleteButton}>
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
};

export function NotificationCard() {
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Payment Successful', message: 'Premium subscription active', time: '2m ago' },
    { id: 2, title: 'New Feature', message: 'AI-powered analytics available', time: '1h ago' },
    { id: 3, title: 'Weekly Report', message: 'Performance summary ready', time: '3h ago' },
  ]);

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
            {notifications.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifications.length}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>{notifications.length} unread</Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a24',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  list: {
    gap: 12,
  },
  notification: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: 'white',
    fontSize: 18,
  },
});
```

---

## 🎨 Önemli Farklar ve İpuçları

### 1. **Reanimated vs Framer Motion**
- Web'de `motion/react` kullanırken, React Native'de `react-native-reanimated` kullanılır
- `useSharedValue` ve `useAnimatedStyle` hook'ları temel yapı taşlarıdır
- Animasyonlar UI thread'de çalışır (60fps garantili)

### 2. **Gesture Handling**
- Web'deki mouse events yerine `react-native-gesture-handler` kullanılır
- `PanGestureHandler`, `TapGestureHandler` gibi handler'lar vardır
- `runOnJS` ile JS thread'e callback gönderilebilir

### 3. **Glassmorphism**
- Web'deki `backdrop-filter` yerine `@react-native-community/blur` kullanılır
- iOS ve Android için farklı blur implementasyonları vardır
- `BlurView` component'i ile gerçekleştirilir

### 4. **Shadow & Elevation**
- iOS: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`
- Android: `elevation` property'si kullanılır
- Platform-specific shadow stilleri gerekebilir

### 5. **Haptic Feedback**
```tsx
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

// Kullanım
ReactNativeHapticFeedback.trigger("impactLight");
ReactNativeHapticFeedback.trigger("impactMedium");
ReactNativeHapticFeedback.trigger("impactHeavy");
```

### 6. **Performance İpuçları**
- `useNativeDriver: true` kullanın (transform ve opacity için)
- Karmaşık hesaplamalar için `worklet` kullanın
- `runOnJS` sadece gerektiğinde kullanın
- Hermes engine'i aktif edin

---

## 📱 Platform-Specific Stilleme

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
});
```

---

## 🚀 Başlarken

```bash
# Yeni React Native projesi
npx react-native init PremiumCards

# Bağımlılıkları yükle
cd PremiumCards
npm install react-native-reanimated react-native-gesture-handler
npm install react-native-linear-gradient
npm install @react-native-community/blur
npm install react-native-haptic-feedback

# iOS için
cd ios && pod install && cd ..

# Çalıştır
npm run ios
# veya
npm run android
```

---

## 💡 Sonuç

Bu guide ile web'deki premium card animasyonlarını React Native'e kolayca taşıyabilirsiniz. Her efekt mobil cihazlarda smooth 60fps performans için optimize edilmiştir.

**Önemli:** Her zaman gerçek cihazda test edin, emülatörler bazı animasyonları yavaş gösterebilir!
