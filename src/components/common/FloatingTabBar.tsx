import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  LayoutDashboard,
  Wallet,
  MessageSquare,
  TrendingUp,
  Settings,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { AnimatedPressable } from './AnimatedPressable';

export type TabKey = 'dashboard' | 'manejo' | 'chat' | 'bolsillos' | 'admin';

export interface TabItemConfig {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

export const TABS: TabItemConfig[] = [
  { key: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { key: 'manejo', label: 'Manejo', icon: Wallet },
  { key: 'chat', label: 'Asistente', icon: MessageSquare },
  { key: 'bolsillos', label: 'Bolsillos', icon: TrendingUp },
  { key: 'admin', label: 'Ajustes', icon: Settings },
];

export interface FloatingTabBarProps {
  /** Currently active tab key */
  activeTab: TabKey;
  /** Callback fired when user selects a tab */
  onTabChange: (tab: any) => void;
  /** Unread notification badge count on Chat / Asistente */
  chatBadge?: number;
  /** Custom container style override (e.g. adjust bottom offset or elevation) */
  style?: StyleProp<ViewStyle>;
}

interface TabButtonProps {
  tab: TabItemConfig;
  isActive: boolean;
  onPress: () => void;
  badgeCount?: number;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  onPress,
  badgeCount = 0,
}) => {
  const IconComponent = tab.icon;
  const activeSpring = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(activeSpring, {
      toValue: isActive ? 1 : 0,
      damping: theme.motion.spring.snappy.damping,
      stiffness: theme.motion.spring.snappy.stiffness,
      mass: theme.motion.spring.snappy.mass,
      useNativeDriver: true,
    }).start();
  }, [isActive, activeSpring]);

  const scaleTransform = activeSpring.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  return (
    <AnimatedPressable
      scale={0.92}
      onPress={onPress}
      style={[
        styles.tabItem,
        isActive && styles.tabItemActive,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <Animated.View
        style={[
          styles.tabContentWrap,
          { transform: [{ scale: scaleTransform }] },
        ]}
      >
        <View style={styles.iconWrapper}>
          <IconComponent
            size={19}
            color={isActive ? theme.colors.accentMint : theme.colors.textTertiary}
            strokeWidth={isActive ? 2.3 : 1.9}
          />
          {badgeCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            isActive ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </AnimatedPressable>
  );
};

/**
 * Modern floating glass pill navigation bar pinned at bottom:
 * - 5 Core tabs: Inicio, Manejo, Asistente, Bolsillos, Ajustes.
 * - Active glowing mint pill background with spring indicator.
 * - Chat unread badge counter.
 * - Double-bezel glass styling with ambient drop shadow.
 * - Auto-hides gracefully when software keyboard appears.
 */
export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  activeTab,
  onTabChange,
  chatBadge = 0,
  style,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY, opacity]);

  return (
    <Animated.View
      pointerEvents={isKeyboardVisible ? 'none' : 'auto'}
      style={[
        styles.floatingContainer,
        {
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
    >
      <View style={styles.glassPill}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isChat = tab.key === 'chat';

          return (
            <TabButton
              key={tab.key}
              tab={tab}
              isActive={isActive}
              onPress={() => onTabChange(tab.key)}
              badgeCount={isChat ? chatBadge : 0}
            />
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    zIndex: 50,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 26, 32, 0.94)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  tabContentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.accentMint,
  },
  tabLabelInactive: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textTertiary,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0C242C',
  },
  tabBadgeText: {
    fontFamily: theme.fonts.extraBold,
    color: '#060D0F',
    fontSize: 9,
    textAlign: 'center',
  },
});

export default FloatingTabBar;
