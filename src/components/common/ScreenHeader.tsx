import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  ArrowLeftRight,
  History,
  Inbox,
  PieChart,
  RefreshCw,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { AnimatedPressable } from './AnimatedPressable';

export interface ScreenHeaderProps {
  /** Callback when PieChart button is pressed */
  onCharts?: () => void;
  /** Callback when ArrowLeftRight transfer/add money button is pressed */
  onTransfer?: () => void;
  /** Callback when History button is pressed */
  onHistory?: () => void;
  /** Callback when RefreshCw button is pressed */
  onRefresh?: () => void;
  /** Callback when Inbox button is pressed */
  onInbox?: () => void;
  /** Total unread notifications count for badge display */
  unreadInboxCount?: number;
  /** Whether a data refresh is actively ongoing (activates spinning animation) */
  refreshing?: boolean;
  /** Optional custom logo image source */
  logoSource?: ImageSourcePropType;
  /** Optional container style override */
  style?: StyleProp<ViewStyle>;
}

/**
 * ScreenHeader provides a detached, premium navigation header:
 * - Left: Brand icon, bold app title, and "Control Financiero" with glowing mint live status indicator.
 * - Right: Tactile action cluster with spring-scaled AnimatedPressables,
 *   active spinning RefreshCw indicator, and amber badge count on Inbox.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  onCharts,
  onTransfer,
  onHistory,
  onRefresh,
  onInbox,
  unreadInboxCount = 0,
  refreshing = false,
  logoSource = require('../../../assets/icon.png'),
  style,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loopAnimation: Animated.CompositeAnimation | null = null;

    if (refreshing) {
      spinAnim.setValue(0);
      loopAnimation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopAnimation.start();
    } else {
      spinAnim.stopAnimation();
      Animated.timing(spinAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (loopAnimation) {
        loopAnimation.stop();
      }
    };
  }, [refreshing, spinAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.headerContainer, style]}>
      {/* Brand Identity / Left Section */}
      <View style={styles.brandSection}>
        <Image
          source={logoSource}
          style={styles.logoImage}
          resizeMode="cover"
        />
        <View style={styles.brandMeta}>
          <Text style={styles.titleText}>Mivotry</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDotWrapper}>
              <View style={styles.statusDot} />
            </View>
            <Text style={styles.subtitleText}>Control Financiero</Text>
          </View>
        </View>
      </View>

      {/* Action Cluster / Right Section */}
      <View style={styles.actionCluster}>
        {/* Charts Button */}
        <AnimatedPressable
          style={styles.iconCircleButton}
          onPress={onCharts}
          accessibilityLabel="Gráficos de gastos"
        >
          <PieChart
            size={18}
            color={theme.colors.accentMint}
            strokeWidth={2.2}
          />
        </AnimatedPressable>

        {/* Transfer / Inyectar Button */}
        <AnimatedPressable
          style={styles.iconCircleButton}
          onPress={onTransfer}
          accessibilityLabel="Transferir o agregar dinero"
        >
          <ArrowLeftRight
            size={18}
            color={theme.colors.accentMint}
            strokeWidth={2.2}
          />
        </AnimatedPressable>

        {/* Transaction History Button */}
        <AnimatedPressable
          style={styles.iconCircleButton}
          onPress={onHistory}
          accessibilityLabel="Historial de transacciones"
        >
          <History
            size={18}
            color={theme.colors.textSecondary}
            strokeWidth={2}
          />
        </AnimatedPressable>

        {/* Refresh Button with Spinner */}
        <AnimatedPressable
          style={styles.iconCircleButton}
          onPress={onRefresh}
          disabled={refreshing}
          accessibilityLabel="Actualizar información"
        >
          <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
            <RefreshCw
              size={18}
              color={refreshing ? theme.colors.accentMint : theme.colors.textSecondary}
              strokeWidth={2}
            />
          </Animated.View>
        </AnimatedPressable>

        {/* Inbox Notifications with Badge */}
        <AnimatedPressable
          style={styles.iconCircleButton}
          onPress={onInbox}
          accessibilityLabel="Buzón de notificaciones"
        >
          <Inbox
            size={18}
            color={theme.colors.textSecondary}
            strokeWidth={2}
          />
          {unreadInboxCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadInboxCount > 99 ? '99+' : unreadInboxCount}
              </Text>
            </View>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, // 16px
    paddingTop: theme.spacing.md, // 12px
    paddingBottom: theme.spacing.md, // 12px
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandMeta: {
    justifyContent: 'center',
  },
  titleText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDotWrapper: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  subtitleText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  actionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0C242C', // theme.colors.surface2
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B', // theme.colors.accentGold
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#060D0F', // matches obsidian canvas background
  },
  notificationBadgeText: {
    color: '#060D0F',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default ScreenHeader;
