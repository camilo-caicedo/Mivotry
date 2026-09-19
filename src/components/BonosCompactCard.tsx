import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { CreditCard, ChevronRight } from 'lucide-react-native';
import { GastoItem } from '../services/api';
import { BudgetProgressBar, formatCOP } from './BudgetProgressBar';

export interface BonosCompactCardProps {
  bonosData?: {
    presupuestoTotal: number;
    gastos: GastoItem[];
  };
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Categorías base por defecto si aún no han cargado los datos del backend */
const DEFAULT_BONOS_CATEGORIES: GastoItem[] = [
  { fila: 10, nombre: 'Pricesmart', presupuestoTotal: 700000, manejoActual: 700000 },
  { fila: 11, nombre: 'Verduras y demás', presupuestoTotal: 200000, manejoActual: 200000 },
  { fila: 12, nombre: 'Gatos', presupuestoTotal: 200000, manejoActual: 200000 },
  { fila: 13, nombre: 'Salidas 1', presupuestoTotal: 250000, manejoActual: 250000 },
];

export const BonosCompactCard: React.FC<BonosCompactCardProps> = ({
  bonosData,
  onPress,
  style,
}) => {
  const categories: GastoItem[] =
    bonosData?.gastos && bonosData.gastos.length > 0
      ? bonosData.gastos
      : DEFAULT_BONOS_CATEGORIES;

  const presupuestoTotal =
    bonosData?.presupuestoTotal && bonosData.presupuestoTotal > 0
      ? bonosData.presupuestoTotal
      : 1600000;

  const totalDisponible = categories.reduce(
    (sum, item) => sum + (item.manejoActual ?? 0),
    0
  );

  const porcentajeRestante =
    presupuestoTotal > 0
      ? Math.max(0, Math.round((totalDisponible / presupuestoTotal) * 100))
      : 0;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* HEADER: Icono + Título + Badge 'Ver desglose >' */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <CreditCard size={16} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.title}>Tarjeta de Bonos / Alimentación</Text>
            <Text style={styles.subtitle}>Sodexo • Pluxee (Cupo mensual)</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Ver desglose</Text>
          <ChevronRight size={12} color="#A78BFA" style={styles.badgeChevron} />
        </View>
      </View>

      {/* FILA DE MONTOS: Saldo grande + Cupo presupuestado + % restante */}
      <View style={styles.amountsRow}>
        <View>
          <Text style={styles.amountBig}>{formatCOP(totalDisponible)}</Text>
          <Text style={styles.amountSub}>
            de {formatCOP(presupuestoTotal)} presupuestados
          </Text>
        </View>
        <View style={styles.percentCircle}>
          <Text style={styles.percentText}>{porcentajeRestante}%</Text>
          <Text style={styles.percentLabel}>restante</Text>
        </View>
      </View>

      {/* BARRA DE PROGRESO DE CONSUMO DEL CUPO TOTAL */}
      <BudgetProgressBar
        disponible={totalDisponible}
        presupuesto={presupuestoTotal}
        size="medium"
        showLabel={false}
        style={styles.progressBar}
      />

      {/* FOOTER HINT INTERACTIVO */}
      <Text style={styles.tipText}>
        💡 Toca esta tarjeta para ver el desglose de Pricesmart, Verduras, Gatos y Salidas
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F3741',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeChevron: {
    marginLeft: 2,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  amountBig: {
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: '800',
  },
  amountSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  percentCircle: {
    alignItems: 'flex-end',
  },
  percentText: {
    color: '#A78BFA',
    fontSize: 18,
    fontWeight: '700',
  },
  percentLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  progressBar: {
    marginTop: 10,
    marginBottom: 6,
  },
  tipText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    marginTop: 10,
    lineHeight: 14,
  },
});

export default BonosCompactCard;
