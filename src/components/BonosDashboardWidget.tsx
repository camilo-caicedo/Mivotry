import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {
  CreditCard,
  Gift,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import { GastoItem } from '../services/api';
import {
  BudgetProgressBar,
  formatCOP,
  getBudgetColor,
} from './BudgetProgressBar';

export interface BonosDashboardWidgetProps {
  /** Datos de bonos provenientes del backend de Mivotry */
  bonosData?: {
    presupuestoTotal: number;
    gastos: GastoItem[];
  };
  /** Callback al presionar una categoría específica para ver detalle o registrar gasto */
  onPressCategory?: (gasto: GastoItem) => void;
  /** Callback para la acción rápida de recargar bonos ($1.600.000 mensual) */
  onRechargePress?: () => void;
  /** Callback opcional para registrar gasto rápido con tarjeta de bonos */
  onQuickExpensePress?: () => void;
  /** Estilos adicionales del contenedor de la tarjeta */
  style?: StyleProp<ViewStyle>;
}

interface CategoryVisualConfig {
  emoji: string;
  badgeLabel: string;
  accentColor: string;
  bgIconColor: string;
}

/**
 * Retorna la configuración visual temática para cada categoría de bonos
 */
export const getBonoCategoryConfig = (name: string): CategoryVisualConfig => {
  const lower = (name || '').toLowerCase();

  if (lower.includes('price') || lower.includes('smart')) {
    return {
      emoji: '🛒',
      badgeLabel: 'Pricesmart',
      accentColor: '#10B981',
      bgIconColor: 'rgba(16, 185, 129, 0.15)',
    };
  }

  if (
    lower.includes('verdura') ||
    lower.includes('fruta') ||
    lower.includes('fruver') ||
    lower.includes('mercado') ||
    lower.includes('demas') ||
    lower.includes('demás')
  ) {
    return {
      emoji: '🥬',
      badgeLabel: 'Fruver & Mercado',
      accentColor: '#34D399',
      bgIconColor: 'rgba(52, 211, 153, 0.15)',
    };
  }

  if (
    lower.includes('gato') ||
    lower.includes('gatos') ||
    lower.includes('mascota') ||
    lower.includes('michis') ||
    lower.includes('veterin')
  ) {
    return {
      emoji: '🐱',
      badgeLabel: 'Michis & Mascotas',
      accentColor: '#F472B6',
      bgIconColor: 'rgba(244, 114, 182, 0.15)',
    };
  }

  if (
    lower.includes('salida') ||
    lower.includes('restaurante') ||
    lower.includes('comida') ||
    lower.includes('almuerzo') ||
    lower.includes('cafe') ||
    lower.includes('café')
  ) {
    return {
      emoji: '🍽️',
      badgeLabel: 'Restaurantes & Ocio',
      accentColor: '#F59E0B',
      bgIconColor: 'rgba(245, 158, 11, 0.15)',
    };
  }

  return {
    emoji: '🎁',
    badgeLabel: 'Bono Alimento',
    accentColor: '#8B5CF6',
    bgIconColor: 'rgba(139, 92, 246, 0.15)',
  };
};

/** Categorías base por defecto si aún no han cargado los datos del backend */
const DEFAULT_BONOS_CATEGORIES: GastoItem[] = [
  { fila: 10, nombre: 'Pricesmart', presupuestoTotal: 700000, manejoActual: 700000 },
  { fila: 11, nombre: 'Verduras y demás', presupuestoTotal: 200000, manejoActual: 200000 },
  { fila: 12, nombre: 'Gatos', presupuestoTotal: 200000, manejoActual: 200000 },
  { fila: 13, nombre: 'Salidas 1', presupuestoTotal: 250000, manejoActual: 250000 },
];

export const BonosDashboardWidget: React.FC<BonosDashboardWidgetProps> = ({
  bonosData,
  onPressCategory,
  onRechargePress,
  onQuickExpensePress,
  style,
}) => {
  // Lista de rubros: usar datos reales de bonos o fallback estándar
  const categories: GastoItem[] =
    bonosData?.gastos && bonosData.gastos.length > 0
      ? bonosData.gastos
      : DEFAULT_BONOS_CATEGORIES;

  // Cupo total asignado (default: $1.600.000 COP)
  const presupuestoTotal =
    bonosData?.presupuestoTotal && bonosData.presupuestoTotal > 0
      ? bonosData.presupuestoTotal
      : 1600000;

  // Saldo total disponible de bonos (suma de manejoActual de las categorías de bonos)
  const totalDisponible = categories.reduce(
    (sum, item) => sum + (item.manejoActual ?? 0),
    0
  );

  const pctDisponible =
    presupuestoTotal > 0
      ? Math.max(0, Math.min(100, (totalDisponible / presupuestoTotal) * 100))
      : 0;

  const globalColor = getBudgetColor(totalDisponible, presupuestoTotal);
  const isGlobalOverspent = totalDisponible < 0;

  return (
    <View style={[styles.container, style]}>
      {/* GLOW DECORATIVO DE FONDO */}
      <View style={styles.glowViolet} pointerEvents="none" />
      <View style={styles.glowMint} pointerEvents="none" />

      {/* HEADER DE LA TARJETA */}
      <View style={styles.header}>
        <View style={styles.headerBadgeRow}>
          <View style={styles.badgeBonos}>
            <View style={styles.badgeIconWrapper}>
              <CreditCard size={13} color="#8B5CF6" />
            </View>
            <Text style={styles.badgeText}>Tarjeta de Bonos / Alimentación</Text>
          </View>

          <View style={styles.providerBadge}>
            <Gift size={11} color="#10B981" />
            <Text style={styles.providerBadgeText}>Sodexo • Pluxee</Text>
          </View>
        </View>

        {/* SALDO TOTAL DISPONIBLE */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceLabelRow}>
            <Text style={styles.balanceLabel}>Saldo Total Disponible</Text>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: globalColor },
                ]}
              />
              <Text style={[styles.statusText, { color: globalColor }]}>
                {isGlobalOverspent
                  ? 'Sobregirado'
                  : `${Math.round(pctDisponible)}% libre`}
              </Text>
            </View>
          </View>

          <View style={styles.balanceAmountRow}>
            <Text style={styles.balanceValue}>
              {formatCOP(totalDisponible)}
            </Text>
            <View style={styles.totalBudgetChip}>
              <Text style={styles.totalBudgetSubLabel}>Cupo asignado</Text>
              <Text style={styles.totalBudgetValue}>
                {formatCOP(presupuestoTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* BARRA DE PROGRESO GLOBAL DEL CUPO */}
        <View style={styles.globalProgressWrapper}>
          <BudgetProgressBar
            disponible={totalDisponible}
            presupuesto={presupuestoTotal}
            size="medium"
            showLabel={true}
            customLabel={`Cupo global: ${formatCOP(totalDisponible)}`}
          />
        </View>
      </View>

      {/* SEPARADOR SUTIL */}
      <View style={styles.divider} />

      {/* DESGLOSE DE CATEGORÍAS */}
      <View style={styles.breakdownSection}>
        <View style={styles.breakdownHeader}>
          <View style={styles.breakdownTitleRow}>
            <Sparkles size={14} color="#8B5CF6" />
            <Text style={styles.breakdownTitle}>Desglose de Categorías</Text>
          </View>
          <Text style={styles.breakdownSubtitle}>
            {categories.length} rubros activos
          </Text>
        </View>

        <View style={styles.categoryList}>
          {categories.map((item, index) => {
            const config = getBonoCategoryConfig(item.nombre);
            const categoryBalance = item.manejoActual ?? 0;
            const categoryBudget = item.presupuestoTotal ?? 0;
            const itemColor = getBudgetColor(categoryBalance, categoryBudget);
            const isOver = categoryBalance < 0;

            const pctCategory =
              categoryBudget > 0
                ? Math.max(
                    0,
                    Math.min(100, (categoryBalance / categoryBudget) * 100)
                  )
                : 0;

            return (
              <TouchableOpacity
                key={`bono-cat-${item.fila ?? index}-${item.nombre}`}
                activeOpacity={onPressCategory ? 0.7 : 1}
                disabled={!onPressCategory}
                onPress={() => onPressCategory && onPressCategory(item)}
                style={styles.categoryCard}
              >
                {/* FILA SUPERIOR: ICONO + NOMBRES + SALDO */}
                <View style={styles.categoryTopRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryIconBox,
                        {
                          backgroundColor: config.bgIconColor,
                          borderColor: `${config.accentColor}33`,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                    </View>

                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.categoryBudget}>
                        Presupuesto: {formatCOP(categoryBudget)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryRight}>
                    <Text style={[styles.categoryBalance, { color: itemColor }]}>
                      {formatCOP(categoryBalance)}
                    </Text>
                    <View style={styles.categoryBadgeRow}>
                      {isOver ? (
                        <View style={styles.overspentPill}>
                          <AlertTriangle size={10} color="#DC2626" />
                          <Text style={styles.overspentPillText}>Excedido</Text>
                        </View>
                      ) : (
                        <Text style={styles.categoryPctText}>
                          {Math.round(pctCategory)}% disp.
                        </Text>
                      )}
                      {Boolean(onPressCategory) && (
                        <ChevronRight size={14} color="#64748B" />
                      )}
                    </View>
                  </View>
                </View>

                {/* BARRA DE PROGRESO DE LA CATEGORÍA */}
                <View style={styles.categoryProgressBarWrapper}>
                  <BudgetProgressBar
                    disponible={categoryBalance}
                    presupuesto={categoryBudget}
                    size="small"
                    showLabel={false}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* BOTONES DE ACCIÓN RÁPIDA */}
      <View style={styles.actionsContainer}>
        {onRechargePress && (
          <TouchableOpacity
            style={styles.rechargeButton}
            onPress={onRechargePress}
            activeOpacity={0.8}
          >
            <RefreshCw size={15} color="#8B5CF6" />
            <Text style={styles.rechargeButtonText}>Recargar Bonos ($1.6M)</Text>
          </TouchableOpacity>
        )}

        {onQuickExpensePress && (
          <TouchableOpacity
            style={styles.expenseButton}
            onPress={onQuickExpensePress}
            activeOpacity={0.8}
          >
            <PlusCircle size={15} color="#10B981" />
            <Text style={styles.expenseButtonText}>Registrar Gasto</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#06181D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0F3741',
    padding: 18,
    marginVertical: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  glowViolet: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  glowMint: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  header: {
    marginBottom: 16,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeBonos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  badgeIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#DDD6FE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  providerBadgeText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '600',
  },
  balanceContainer: {
    marginBottom: 14,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  totalBudgetChip: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(15, 55, 65, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F3741',
  },
  totalBudgetSubLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalBudgetValue: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  globalProgressWrapper: {
    marginTop: 6,
    paddingTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  breakdownSection: {
    marginBottom: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  breakdownSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  categoryList: {
    gap: 10,
  },
  categoryCard: {
    backgroundColor: 'rgba(15, 55, 65, 0.45)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 55, 65, 0.8)',
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryBudget: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryBalance: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryPctText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  overspentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  overspentPillText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '700',
  },
  categoryProgressBarWrapper: {
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rechargeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  rechargeButtonText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  expenseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  expenseButtonText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default BonosDashboardWidget;
