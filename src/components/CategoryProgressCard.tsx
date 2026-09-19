import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { GastoItem } from '../services/api';
import {
  BudgetProgressBar,
  ProgressBarSize,
  formatCOP,
  getBudgetColor,
} from './BudgetProgressBar';

export interface CategoryVisual {
  emoji: string;
  accentColor: string;
  bgColor: string;
}

/**
 * Determina el emoji y paleta visual sugerida según el nombre del rubro
 */
export const getCategoryVisuals = (name: string): CategoryVisual => {
  const lower = (name || '').toLowerCase();

  if (
    lower.includes('salida') ||
    lower.includes('restaurante') ||
    lower.includes('ocio') ||
    lower.includes('comida fuera') ||
    lower.includes('bar') ||
    lower.includes('cafe') ||
    lower.includes('café')
  ) {
    return { emoji: '🍽️', accentColor: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
  }
  if (
    lower.includes('gasolina') ||
    lower.includes('combustible') ||
    lower.includes('carro') ||
    lower.includes('auto') ||
    lower.includes('peaje') ||
    lower.includes('transporte')
  ) {
    return { emoji: '⛽', accentColor: '#38BDF8', bgColor: 'rgba(56, 189, 248, 0.15)' };
  }
  if (lower.includes('pricesmart')) {
    return { emoji: '🛒', accentColor: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
  }
  if (
    lower.includes('verdura') ||
    lower.includes('fruta') ||
    lower.includes('fruver') ||
    lower.includes('mercado') ||
    lower.includes('super')
  ) {
    return { emoji: '🥦', accentColor: '#4ADE80', bgColor: 'rgba(74, 222, 128, 0.15)' };
  }
  if (
    lower.includes('gato') ||
    lower.includes('gatos') ||
    lower.includes('mascota') ||
    lower.includes('perro') ||
    lower.includes('pelusa') ||
    lower.includes('veterin')
  ) {
    return { emoji: '🐱', accentColor: '#F472B6', bgColor: 'rgba(244, 114, 182, 0.15)' };
  }
  if (
    lower.includes('celular') ||
    lower.includes('claro') ||
    lower.includes('tigo') ||
    lower.includes('movistar') ||
    lower.includes('teléfono') ||
    lower.includes('telefono')
  ) {
    return { emoji: '📱', accentColor: '#60A5FA', bgColor: 'rgba(96, 165, 250, 0.15)' };
  }
  if (
    lower.includes('administra') ||
    lower.includes('arriendo') ||
    lower.includes('alquiler') ||
    lower.includes('apto') ||
    lower.includes('casa') ||
    lower.includes('hogar')
  ) {
    return { emoji: '🏢', accentColor: '#818CF8', bgColor: 'rgba(129, 140, 248, 0.15)' };
  }
  if (
    lower.includes('servicio') ||
    lower.includes('luz') ||
    lower.includes('agua') ||
    lower.includes('gas') ||
    lower.includes('enel') ||
    lower.includes('epm')
  ) {
    return { emoji: '💡', accentColor: '#FBBF24', bgColor: 'rgba(251, 191, 36, 0.15)' };
  }
  if (
    lower.includes('streaming') ||
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('disney') ||
    lower.includes('tv')
  ) {
    return { emoji: '📺', accentColor: '#A78BFA', bgColor: 'rgba(167, 139, 250, 0.15)' };
  }
  if (
    lower.includes('tarjeta') ||
    lower.includes('deuda') ||
    lower.includes('credito') ||
    lower.includes('crédito') ||
    lower.includes('banco')
  ) {
    return { emoji: '💳', accentColor: '#F87171', bgColor: 'rgba(248, 113, 113, 0.15)' };
  }
  if (
    lower.includes('salud') ||
    lower.includes('medico') ||
    lower.includes('médico') ||
    lower.includes('farmacia') ||
    lower.includes('drogueria') ||
    lower.includes('eps')
  ) {
    return { emoji: '💊', accentColor: '#FB7185', bgColor: 'rgba(251, 113, 133, 0.15)' };
  }
  if (
    lower.includes('seguro') ||
    lower.includes('soat') ||
    lower.includes('poliza')
  ) {
    return { emoji: '🛡️', accentColor: '#2DD4BF', bgColor: 'rgba(45, 212, 191, 0.15)' };
  }
  if (
    lower.includes('ahorro') ||
    lower.includes('bolsillo') ||
    lower.includes('invers')
  ) {
    return { emoji: '🌱', accentColor: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
  }
  if (
    lower.includes('ropa') ||
    lower.includes('vestuario') ||
    lower.includes('calzado')
  ) {
    return { emoji: '👕', accentColor: '#C084FC', bgColor: 'rgba(192, 132, 252, 0.15)' };
  }

  return { emoji: '🏷️', accentColor: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.15)' };
};

export interface CategoryProgressCardProps {
  /** Objeto GastoItem proveniente de Mivotry API */
  item?: GastoItem;
  /** Alias para item */
  gasto?: GastoItem;
  /** Nombre de categoría directo (si no se proporciona item) */
  nombre?: string;
  /** Saldo disponible en Manejo directo (si no se proporciona item) */
  disponible?: number;
  /** Presupuesto total directo (si no se proporciona item) */
  presupuesto?: number;
  /** Icono personalizado (componente ReactNode o emoji string) */
  icon?: React.ReactNode | string;
  /** Callback al tocar la tarjeta */
  onPress?: () => void;
  /** Callback alternativo que recibe el item */
  onPressItem?: (item: GastoItem) => void;
  /** Mostrar u ocultar etiquetas de la barra de progreso (default: true) */
  showProgressBarLabel?: boolean;
  /** Tamaño de la barra de progreso (default: 'small') */
  progressBarSize?: ProgressBarSize;
  /** Deshabilitar interacción táctil */
  disabled?: boolean;
  /** Estilo de tarjeta adicional */
  style?: StyleProp<ViewStyle>;
}

export const CategoryProgressCard: React.FC<CategoryProgressCardProps> = ({
  item,
  gasto,
  nombre,
  disponible,
  presupuesto,
  icon,
  onPress,
  onPressItem,
  showProgressBarLabel = true,
  progressBarSize = 'small',
  disabled = false,
  style,
}) => {
  const currentItem = item || gasto;
  const categoryName = currentItem?.nombre ?? nombre ?? 'Categoría';
  const balance = currentItem ? currentItem.manejoActual : (disponible ?? 0);
  const budget = currentItem ? currentItem.presupuestoTotal : (presupuesto ?? 0);

  const visuals = getCategoryVisuals(categoryName);
  const statusColor = getBudgetColor(balance, budget);
  const isOverspent = balance < 0;
  const isCompletedOrDepleted = balance === 0;

  const handlePress = () => {
    if (disabled) return;
    if (onPress) {
      onPress();
    } else if (onPressItem && currentItem) {
      onPressItem(currentItem);
    }
  };

  const isInteractive = Boolean(onPress || onPressItem) && !disabled;

  return (
    <TouchableOpacity
      activeOpacity={isInteractive ? 0.7 : 1}
      disabled={!isInteractive}
      onPress={handlePress}
      style={[styles.card, style]}
    >
      {/* FILA SUPERIOR: Icono + Nombre y Presupuesto (Izq) | Saldo y Estado (Der) */}
      <View style={styles.headerRow}>
        <View style={styles.categoryLeft}>
          <View style={[styles.iconBox, { backgroundColor: visuals.bgColor }]}>
            {typeof icon === 'string' ? (
              <Text style={styles.iconEmoji}>{icon}</Text>
            ) : icon ? (
              icon
            ) : (
              <Text style={styles.iconEmoji}>{visuals.emoji}</Text>
            )}
          </View>
          <View style={styles.categoryTitles}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {categoryName}
            </Text>
            <Text style={styles.budgetAmount}>
              Presupuestado: {formatCOP(budget)}
            </Text>
          </View>
        </View>

        <View style={styles.balanceRight}>
          <Text style={[styles.balanceValue, { color: statusColor }]}>
            {formatCOP(balance)}
          </Text>

          {/* Badge de Estado */}
          {isOverspent ? (
            <View style={styles.badgeOverspent}>
              <AlertTriangle size={11} color="#DC2626" />
              <Text style={styles.badgeTextOverspent}>Sobregiro</Text>
            </View>
          ) : isCompletedOrDepleted ? (
            <View style={styles.badgeCompleted}>
              <CheckCircle2 size={11} color="#10B981" />
              <Text style={styles.badgeTextCompleted}>Al día / Pagado</Text>
            </View>
          ) : (
            <View style={[styles.badgeActive, { borderColor: `${statusColor}40` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.badgeTextActive, { color: statusColor }]}>
                Disponible
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* BARRA DE PROGRESO EMBEBIDA */}
      <View style={styles.progressContainer}>
        <BudgetProgressBar
          disponible={balance}
          presupuesto={budget}
          size={progressBarSize}
          showLabel={showProgressBarLabel}
        />
      </View>

      {/* PIE DE TARJETA: Indicador táctil para registrar gasto */}
      {isInteractive && (
        <View style={styles.footerRow}>
          <Text style={styles.tapHint}>Toca para registrar gasto</Text>
          <ChevronRight size={13} color="#64748B" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F3741',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconEmoji: {
    fontSize: 18,
  },
  categoryTitles: {
    flex: 1,
  },
  categoryName: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  budgetAmount: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeOverspent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  badgeTextOverspent: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTextCompleted: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  badgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeTextActive: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  tapHint: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default CategoryProgressCard;
