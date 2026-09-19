import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Zap, Plus, Sparkles } from 'lucide-react-native';
import { QuickActionItem, quickActionsService } from '../services/quickActionsService';

export interface QuickActionsWidgetProps {
  /**
   * Lista de atajos. Si no se provee, el componente los cargará automáticamente
   * desde quickActionsService.
   */
  actions?: QuickActionItem[];
  /**
   * Callback invocado al presionar un atajo.
   */
  onSelectAction: (action: QuickActionItem) => void;
  /**
   * Callback invocado al presionar "+ Nuevo atajo".
   */
  onNewAction?: () => void;
  /**
   * Callback opcional tras recargar la lista de atajos.
   */
  onRefreshActions?: () => void;
}

export const formatCOP = (val: number = 0): string => {
  return '$' + Math.round(val).toLocaleString('es-CO');
};

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  actions: propActions,
  onSelectAction,
  onNewAction,
  onRefreshActions
}) => {
  const [internalActions, setInternalActions] = useState<QuickActionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!propActions);

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await quickActionsService.getQuickActions();
      setInternalActions(data);
      if (onRefreshActions) {
        onRefreshActions();
      }
    } catch (err) {
      console.error('[QuickActionsWidget] Error loading actions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propActions) {
      setInternalActions(propActions);
      setLoading(false);
    } else {
      loadActions();
    }
  }, [propActions]);

  const displayedActions = propActions || internalActions;

  return (
    <View style={styles.container}>
      {/* Header del Widget */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconBadge}>
            <Zap size={15} color="#10B981" />
          </View>
          <Text style={styles.title}>Atajos Rápidos</Text>
          <View style={styles.flashBadge}>
            <Sparkles size={11} color="#F59E0B" />
            <Text style={styles.flashBadgeText}>1-Tap</Text>
          </View>
        </View>

        {onNewAction && (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={onNewAction}
            activeOpacity={0.7}
          >
            <Plus size={14} color="#10B981" />
            <Text style={styles.headerAddText}>Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido / Scroll Horizontal */}
      {loading && displayedActions.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#10B981" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {displayedActions.map((action) => {
            const isNomina = action.cuenta === 'nomina';
            const accountBadgeBg = isNomina
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(139, 92, 246, 0.18)';
            const accountTextColor = isNomina ? '#10B981' : '#A78BFA';
            const accountLabel = isNomina ? 'Nómina' : 'Bonos';

            return (
              <TouchableOpacity
                key={action.id}
                style={styles.pillCard}
                onPress={() => onSelectAction(action)}
                activeOpacity={0.8}
              >
                {/* Emoji en Badge Redondeado */}
                <View style={[styles.emojiBadge, isNomina ? styles.emojiBadgeNomina : styles.emojiBadgeBonos]}>
                  <Text style={styles.emojiText}>{action.icono || '⚡'}</Text>
                </View>

                {/* Info del Atajo */}
                <View style={styles.cardInfo}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {action.titulo}
                    </Text>
                    <View style={[styles.accountBadge, { backgroundColor: accountBadgeBg }]}>
                      <Text style={[styles.accountBadgeText, { color: accountTextColor }]}>
                        {accountLabel}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardAmount}>
                    {formatCOP(action.monto)}
                  </Text>

                  <Text style={styles.cardCategory} numberOfLines={1}>
                    {action.categoria}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Botón "+ Nuevo atajo" al final de la lista */}
          {onNewAction && (
            <TouchableOpacity
              style={styles.addPillCard}
              onPress={onNewAction}
              activeOpacity={0.75}
            >
              <View style={styles.addIconCircle}>
                <Plus size={20} color="#10B981" />
              </View>
              <Text style={styles.addPillText}>+ Nuevo atajo</Text>
              <Text style={styles.addPillSub}>Personalizado</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  scrollContainer: {
    marginHorizontal: -16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: 0.2,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  flashBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  headerAddText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  loaderContainer: {
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3741',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 195,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiBadgeNomina: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  emojiBadgeBonos: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  emojiText: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
  },
  accountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  accountBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -0.2,
    marginVertical: 1,
  },
  cardCategory: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addPillCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 55, 65, 0.5)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 130,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  addIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  addPillSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});

export default QuickActionsWidget;
