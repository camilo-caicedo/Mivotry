import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export type ProgressBarSize = 'small' | 'medium' | 'large';

export interface BudgetProgressBarProps {
  /** Saldo disponible o remanente actual en Manejo */
  disponible: number;
  /** Presupuesto total asignado o base mensual/quincenal */
  presupuesto: number;
  /** Tamaño de la barra (default: 'small') */
  size?: ProgressBarSize;
  /** Mostrar u ocultar texto de porcentaje / estado (default: true) */
  showLabel?: boolean;
  /** Texto personalizado para la etiqueta izquierda */
  customLabel?: string;
  /** Estilo contenedor */
  style?: StyleProp<ViewStyle>;
}

/**
 * Retorna el color del estado de presupuesto:
 * - > 35% restante: #10B981 (Mint green - saludable)
 * - 15% - 35% restante: #F59E0B (Amber gold - advertencia)
 * - < 15% restante: #EF4444 (Red - urgente / agotado)
 * - Sobregiro (< 0): #DC2626 (Bright red - sobregirado)
 */
export const getBudgetColor = (disponible: number, presupuesto: number): string => {
  if (disponible < 0) {
    return '#DC2626'; // Overspent: Bright red
  }
  if (presupuesto <= 0) {
    return disponible > 0 ? '#10B981' : '#EF4444';
  }
  const pct = (disponible / presupuesto) * 100;
  if (pct > 35) {
    return '#10B981'; // Mint green - healthy
  }
  if (pct >= 15) {
    return '#F59E0B'; // Amber gold - warning
  }
  return '#EF4444'; // Red - urgent / depleted
};

/**
 * Formateador de moneda para Pesos Colombianos (COP)
 */
export const formatCOP = (val: number = 0): string => {
  const isNeg = val < 0;
  const absVal = Math.abs(Math.round(val));
  return `${isNeg ? '-$' : '$'}${absVal.toLocaleString('es-CO')}`;
};

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  disponible,
  presupuesto,
  size = 'small',
  showLabel = true,
  customLabel,
  style,
}) => {
  const isOverspent = disponible < 0;

  // pctRemaining = Math.max(0, Math.min(100, (disponible / presupuesto) * 100))
  const pctRemaining = presupuesto > 0
    ? Math.max(0, Math.min(100, (disponible / presupuesto) * 100))
    : (disponible > 0 ? 100 : 0);

  const barColor = getBudgetColor(disponible, presupuesto);

  // Dimensiones según el tamaño
  const sizeConfig = {
    small: { trackHeight: 6, fontSize: 11, labelMargin: 4 },
    medium: { trackHeight: 9, fontSize: 12, labelMargin: 6 },
    large: { trackHeight: 14, fontSize: 13, labelMargin: 8 },
  }[size];

  // Si está sobregirado, la barra se llena al 100% en rojo intenso como indicador de alerta
  const fillWidth = isOverspent ? 100 : pctRemaining;

  // Texto de estado
  const renderStatusLabel = () => {
    if (customLabel) return customLabel;
    if (isOverspent) return '⚠️ Sobregirado';
    if (disponible === 0) return 'Agotado (0%)';
    return `${Math.round(pctRemaining)}% restante`;
  };

  const renderSecondaryLabel = () => {
    if (isOverspent) {
      return `Excedido ${formatCOP(disponible)}`;
    }
    return `${Math.round(100 - pctRemaining)}% gastado`;
  };

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={[styles.labelRow, { marginBottom: sizeConfig.labelMargin }]}>
          <Text
            style={[
              styles.labelText,
              { fontSize: sizeConfig.fontSize, color: barColor },
            ]}
          >
            {renderStatusLabel()}
          </Text>
          <Text
            style={[
              styles.secondaryText,
              { fontSize: sizeConfig.fontSize },
              isOverspent && { color: '#DC2626', fontWeight: '700' },
            ]}
          >
            {renderSecondaryLabel()}
          </Text>
        </View>
      )}

      {/* Pista de progreso (subtle background track rgba(255, 255, 255, 0.08)) */}
      <View
        style={[
          styles.track,
          {
            height: sizeConfig.trackHeight,
            borderRadius: sizeConfig.trackHeight / 2,
          },
          isOverspent && styles.trackOverspent,
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${fillWidth}%`,
              backgroundColor: barColor,
              borderRadius: sizeConfig.trackHeight / 2,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryText: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  track: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  trackOverspent: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  fill: {
    height: '100%',
  },
});

export default BudgetProgressBar;
