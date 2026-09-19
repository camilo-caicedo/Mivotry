import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Sparkles,
} from 'lucide-react-native';
import { CategoryProgressCard } from '../components/CategoryProgressCard';
import { BudgetProgressBar, formatCOP } from '../components/BudgetProgressBar';
import { DashboardResponse, GastoItem } from '../services/api';
import { theme } from '../theme';

export interface ManejoScreenProps {
  dashboardData: DashboardResponse | null;
  activeAccount: 'nomina' | 'bonos';
  setActiveAccount: (a: 'nomina' | 'bonos') => void;
  onCategoryPress: (gasto: GastoItem, cuenta: 'nomina' | 'bonos') => void;
  onRecargarBonos?: () => void;
  onTransferPress?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollable?: boolean;
}

/** Haptic feedback wrapper with platform safety */
const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(style).catch(() => {});
    } catch {
      // Haptics unavailable on current device/environment
    }
  }
};

export const ManejoScreen: React.FC<ManejoScreenProps> = ({
  dashboardData,
  activeAccount,
  setActiveAccount,
  onCategoryPress,
  onRecargarBonos,
  onTransferPress,
  refreshing = false,
  onRefresh,
  scrollable = true,
}) => {
  // Lista de rubros según la cuenta activa
  const rawGastos: GastoItem[] = useMemo(() => {
    if (activeAccount === 'nomina') {
      return dashboardData?.nomina?.gastos || [];
    }
    // Filtrar posible fila de encabezado 'Bonos' (fila 23)
    const bonosGastos = dashboardData?.bonos?.gastos || [];
    return bonosGastos.filter(
      item => (item.nombre || '').trim().toLowerCase() !== 'bonos' && item.fila !== 23
    );
  }, [dashboardData, activeAccount]);

  // Cálculos de saldo presupuestado vs disponible
  const accountSummary = useMemo(() => {
    if (activeAccount === 'nomina') {
      const presupuestado =
        dashboardData?.nomina?.gastos?.reduce(
          (sum, g) => sum + (g.presupuestoTotal || 0),
          0
        ) || 9900000;
      const disponible =
        dashboardData?.nomina?.totalManejoF21 ??
        dashboardData?.nomina?.gastos?.reduce(
          (sum, g) => sum + (g.manejoActual || 0),
          0
        ) ??
        0;
      const pct =
        presupuestado > 0 ? Math.min(100, Math.round((disponible / presupuestado) * 100)) : 0;
      return { presupuestado, disponible, pct };
    } else {
      const presupuestado = dashboardData?.bonos?.presupuestoTotal || 1600000;
      const disponible = rawGastos.reduce((sum, g) => sum + (g.manejoActual || 0), 0);
      const pct =
        presupuestado > 0 ? Math.min(100, Math.round((disponible / presupuestado) * 100)) : 0;
      return { presupuestado, disponible, pct };
    }
  }, [dashboardData, activeAccount, rawGastos]);

  const content = (
    <View style={styles.container}>
      {/* 1. CONTROL SEGMENTADO: NÓMINA VS BONOS */}
      <View style={styles.accountSelectorRow}>
        <TouchableOpacity
          style={[
            styles.accountTabBtn,
            activeAccount === 'nomina' && styles.accountTabBtnActive,
          ]}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            setActiveAccount('nomina');
          }}
        >
          <Wallet
            size={14}
            color={activeAccount === 'nomina' ? theme.colors.accentMint : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.accountTabText,
              activeAccount === 'nomina' && styles.accountTabTextActive,
            ]}
          >
            Sueldo Nómina
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.accountTabBtn,
            activeAccount === 'bonos' && styles.accountTabBtnActive,
          ]}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            setActiveAccount('bonos');
          }}
        >
          <CreditCard
            size={14}
            color={activeAccount === 'bonos' ? theme.colors.accentMint : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.accountTabText,
              activeAccount === 'bonos' && styles.accountTabTextActive,
            ]}
          >
            Tarjeta Bonos ($1.6M)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. RESUMEN DE SALDO DE LA CUENTA */}
      <View style={styles.balanceSummaryCard}>
        <View style={styles.balanceHeaderRow}>
          <Text style={styles.balanceHeaderLabel}>
            {activeAccount === 'nomina' ? 'Disponible en Nómina' : 'Disponible en Bonos'}
          </Text>
          <View style={styles.balanceAccountBadge}>
            <Text style={styles.balanceAccountBadgeText}>
              {accountSummary.pct}% remanente
            </Text>
          </View>
        </View>

        <Text style={styles.balanceAmount}>{formatCOP(accountSummary.disponible)}</Text>

        <View style={styles.balanceSubRow}>
          <Text style={styles.balanceSubText}>
            Presupuesto base: {formatCOP(accountSummary.presupuestado)}
          </Text>
          <Text style={styles.balanceSubHighlight}>
            Gastado: {formatCOP(accountSummary.presupuestado - accountSummary.disponible)}
          </Text>
        </View>

        <BudgetProgressBar
          disponible={accountSummary.disponible}
          presupuesto={accountSummary.presupuestado}
          size="medium"
          showLabel={false}
          style={{ marginTop: 10 }}
        />
      </View>

      {/* ACCIÓN RÁPIDA: TRANSFERIR O MOVER DINERO */}
      {onTransferPress && (
        <TouchableOpacity
          style={styles.transferManejoBannerBtn}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            onTransferPress();
          }}
        >
          <ArrowLeftRight size={15} color={theme.colors.accentMint} />
          <Text style={styles.transferManejoBannerBtnText}>
            Añadir fondos o mover dinero entre rubros
          </Text>
        </TouchableOpacity>
      )}

      {/* 3. BANNER DE RECARGA PEOPLEPASS PAYCASH (DÍA 15) */}
      {activeAccount === 'bonos' && (
        <View style={styles.peoplepassBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} color={theme.colors.accentMint} />
              <Text style={styles.peoplepassTitle}>Peoplepass Paycash</Text>
            </View>
            <Text style={styles.peoplepassDesc}>
              Recarga mensual de $1.600.000 cada día 15
            </Text>
          </View>
          <TouchableOpacity
            style={styles.recargarBonosBtn}
            activeOpacity={0.85}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              onRecargarBonos?.();
            }}
          >
            <Text style={styles.recargarBonosBtnText}>Recargar $1.6M</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. LISTA DE CATEGORÍAS */}
      <Text style={styles.sectionSubtitle}>
        Toca cualquier rubro para registrar un gasto o marcar su pago:
      </Text>

      <View style={styles.categoryList}>
        {rawGastos.map((gasto, idx) => (
          <CategoryProgressCard
            key={gasto.fila ? `gasto-${gasto.fila}` : `gasto-idx-${idx}`}
            item={gasto}
            onPress={() => {
              triggerHaptic();
              onCategoryPress(gasto, activeAccount);
            }}
          />
        ))}
      </View>
    </View>
  );

  if (!scrollable) {
    return content;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accentMint}
            colors={[theme.colors.accentMint]}
          />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  container: {
    padding: theme.spacing.lg,
  },

  // CONTROL SEGMENTADO
  accountSelectorRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 4,
  },
  accountTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
  },
  accountTabBtnActive: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  accountTabText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.semiBold,
  },
  accountTabTextActive: {
    color: theme.colors.accentMint,
    fontWeight: theme.fontWeights.bold,
  },

  // RESUMEN DE SALDO
  balanceSummaryCard: {
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceHeaderLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
  balanceAccountBadge: {
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  balanceAccountBadgeText: {
    color: theme.colors.accentMint,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  balanceAmount: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.hero,
    fontWeight: theme.fontWeights.heavy,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: 6,
  },
  balanceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceSubText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },
  balanceSubHighlight: {
    color: theme.colors.textTertiary,
    fontSize: theme.fontSizes.xs,
  },

  // BANNER DE TRANSFERENCIA
  transferManejoBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentMintMuted,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
  },
  transferManejoBannerBtnText: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },

  // BANNER PEOPLEPASS
  peoplepassBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  peoplepassTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
  },
  peoplepassDesc: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 2,
  },
  recargarBonosBtn: {
    backgroundColor: theme.colors.accentMint,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  recargarBonosBtnText: {
    color: '#06181D',
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },

  // LISTA DE CATEGORÍAS
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginBottom: theme.spacing.md,
  },
  categoryList: {
    gap: 10,
  },
});
