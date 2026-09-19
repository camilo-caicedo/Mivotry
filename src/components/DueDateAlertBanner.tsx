import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import {
  AlertTriangle,
  Clock,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react-native';
import { DashboardResponse } from '../services/api';
import {
  DueDateAlertItem,
  getDueDatesSummary,
  formatBadgeCountdown
} from '../services/dueDatesService';

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DueDateAlertBannerProps {
  dashboardData: DashboardResponse | null;
  onPressItem?: (item: DueDateAlertItem) => void;
}

export const DueDateAlertBanner: React.FC<DueDateAlertBannerProps> = ({
  dashboardData,
  onPressItem
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!dashboardData) {
    return null;
  }

  const items = getDueDatesSummary(dashboardData);
  const urgentItems = items.filter(item => item.urgencia === 'urgente');
  const proximoItems = items.filter(item => item.urgencia === 'proximo');
  const alDiaItems = items.filter(item => item.urgencia === 'al_dia');

  const hasUrgent = urgentItems.length > 0;
  const hasProximo = proximoItems.length > 0;

  // Determinar si hay algo en estado crítico (<= 2 días o vencido)
  const isCritical = urgentItems.some(item => item.diasRestantes <= 2);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const formatCOP = (val?: number) => {
    if (!val || val <= 0) return '';
    return '$' + Math.round(val).toLocaleString('es-CO');
  };

  // CASO 1: Sin alertas urgentes -> Banner/Pill verde compacto
  if (!hasUrgent) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.greenPill}
          activeOpacity={0.8}
          onPress={toggleExpand}
        >
          <View style={styles.greenPillContent}>
            <ShieldCheck size={18} color="#10B981" />
            <Text style={styles.greenPillText}>
              Todos los pagos y cortes al día
            </Text>
          </View>
          <View style={styles.greenPillRight}>
            {hasProximo && (
              <View style={styles.proximoMiniTag}>
                <Text style={styles.proximoMiniTagText}>
                  {proximoItems.length} próx.
                </Text>
              </View>
            )}
            {expanded ? (
              <ChevronUp size={16} color="#10B981" />
            ) : (
              <ChevronDown size={16} color="#10B981" />
            )}
          </View>
        </TouchableOpacity>

        {/* Desglose desplegable cuando está al día */}
        {expanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.sectionHeaderTitle}>Fechas y Cortes Monitoreados</Text>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                activeOpacity={onPressItem ? 0.7 : 1}
                onPress={() => onPressItem?.(item)}
              >
                <View style={styles.itemIconWrap}>
                  {item.tipo === 'tarjeta' ? (
                    <CreditCard size={15} color="#10B981" />
                  ) : (
                    <Calendar size={15} color="#10B981" />
                  )}
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.fechaTexto}</Text>
                </View>
                <View style={styles.itemRightWrap}>
                  {item.monto && item.monto > 0 ? (
                    <Text style={styles.itemAmount}>{formatCOP(item.monto)}</Text>
                  ) : null}
                  <View style={styles.statusBadgeGreen}>
                    <CheckCircle2 size={11} color="#10B981" style={{ marginRight: 3 }} />
                    <Text style={styles.statusBadgeGreenText}>
                      {item.estado === 'Pagado' ? 'Pagado' : `${item.diasRestantes}d`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  // CASO 2: Hay compromisos urgentes (<= 5 días o vencidos)
  const headerColor = isCritical ? '#EF4444' : '#F59E0B';
  const headerBgColor = isCritical
    ? 'rgba(239, 68, 68, 0.12)'
    : 'rgba(245, 158, 11, 0.12)';
  const borderColor = isCritical
    ? 'rgba(239, 68, 68, 0.35)'
    : 'rgba(245, 158, 11, 0.35)';

  return (
    <View style={[styles.container, styles.urgentCard, { borderColor }]}>
      {/* CABECERA PRINCIPAL CON ICONO Y RESUMEN */}
      <TouchableOpacity
        style={styles.cardHeader}
        activeOpacity={0.8}
        onPress={toggleExpand}
      >
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIconWrap, { backgroundColor: headerBgColor }]}>
            {isCritical ? (
              <AlertTriangle size={18} color={headerColor} />
            ) : (
              <Clock size={18} color={headerColor} />
            )}
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.urgentTitle, { color: headerColor }]}>
              {isCritical ? '¡Atención Inmediata!' : 'Vencimientos Próximos'}
            </Text>
            <Text style={styles.urgentSubtitle}>
              {urgentItems.length} {urgentItems.length === 1 ? 'compromiso requiere' : 'compromisos requieren'} atención en los próximos 5 días
            </Text>
          </View>
        </View>

        <View style={styles.expandButton}>
          <Text style={[styles.expandButtonText, { color: headerColor }]}>
            {expanded ? 'Menos' : 'Ver'}
          </Text>
          {expanded ? (
            <ChevronUp size={16} color={headerColor} />
          ) : (
            <ChevronDown size={16} color={headerColor} />
          )}
        </View>
      </TouchableOpacity>

      {/* CHIPS DE CUENTA REGRESIVA (e.g. "Corte Infinity en 3 días", "SOAT pendiente") */}
      <View style={styles.badgesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesScrollContent}
        >
          {urgentItems.map(item => {
            const badgeText = formatBadgeCountdown(item);
            const isItemCritical = item.diasRestantes <= 2;
            const badgeColor = isItemCritical ? '#EF4444' : '#F59E0B';
            const badgeBg = isItemCritical
              ? 'rgba(239, 68, 68, 0.16)'
              : 'rgba(245, 158, 11, 0.16)';

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.countdownBadge,
                  { backgroundColor: badgeBg, borderColor: badgeColor }
                ]}
                activeOpacity={onPressItem ? 0.7 : 1}
                onPress={() => onPressItem?.(item)}
              >
                {item.tipo === 'tarjeta' ? (
                  <CreditCard size={13} color={badgeColor} style={styles.badgeIcon} />
                ) : (
                  <Calendar size={13} color={badgeColor} style={styles.badgeIcon} />
                )}
                <Text style={[styles.countdownBadgeText, { color: badgeColor }]}>
                  {badgeText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* DETALLES COMPLETOS DESPLEGABLES */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* SECCIÓN URGENTES */}
          <Text style={[styles.sectionGroupTitle, { color: headerColor }]}>
            URGENTES (0 A 5 DÍAS)
          </Text>
          {urgentItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemRow,
                styles.itemRowUrgent,
                { borderColor: item.diasRestantes <= 2 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)' }
              ]}
              activeOpacity={onPressItem ? 0.7 : 1}
              onPress={() => onPressItem?.(item)}
            >
              <View style={[styles.itemIconWrap, { backgroundColor: headerBgColor }]}>
                {item.tipo === 'tarjeta' ? (
                  <CreditCard size={15} color={headerColor} />
                ) : (
                  <AlertCircle size={15} color={headerColor} />
                )}
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.fechaTexto}</Text>
              </View>
              <View style={styles.itemRightWrap}>
                {item.monto && item.monto > 0 ? (
                  <Text style={[styles.itemAmount, { color: headerColor }]}>
                    {formatCOP(item.monto)}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.statusBadgeUrgent,
                    {
                      backgroundColor: item.diasRestantes <= 2
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)'
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeUrgentText,
                      { color: item.diasRestantes <= 2 ? '#EF4444' : '#F59E0B' }
                    ]}
                  >
                    {item.diasRestantes <= 0 ? '¡Hoy!' : `${item.diasRestantes} días`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* SECCIÓN PRÓXIMOS */}
          {proximoItems.length > 0 && (
            <>
              <Text style={[styles.sectionGroupTitle, { color: '#38BDF8', marginTop: 14 }]}>
                PRÓXIMOS (6 A 12 DÍAS)
              </Text>
              {proximoItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRow}
                  activeOpacity={onPressItem ? 0.7 : 1}
                  onPress={() => onPressItem?.(item)}
                >
                  <View style={[styles.itemIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                    {item.tipo === 'tarjeta' ? (
                      <CreditCard size={15} color="#38BDF8" />
                    ) : (
                      <Calendar size={15} color="#38BDF8" />
                    )}
                  </View>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.fechaTexto}</Text>
                  </View>
                  <View style={styles.itemRightWrap}>
                    {item.monto && item.monto > 0 ? (
                      <Text style={styles.itemAmount}>{formatCOP(item.monto)}</Text>
                    ) : null}
                    <View style={styles.statusBadgeProximo}>
                      <Text style={styles.statusBadgeProximoText}>
                        {item.diasRestantes} días
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* SECCIÓN AL DÍA */}
          {alDiaItems.length > 0 && (
            <>
              <Text style={[styles.sectionGroupTitle, { color: '#10B981', marginTop: 14 }]}>
                AL DÍA (&gt; 12 DÍAS O PAGADOS)
              </Text>
              {alDiaItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRow}
                  activeOpacity={onPressItem ? 0.7 : 1}
                  onPress={() => onPressItem?.(item)}
                >
                  <View style={styles.itemIconWrap}>
                    {item.tipo === 'tarjeta' ? (
                      <CreditCard size={15} color="#10B981" />
                    ) : (
                      <CheckCircle2 size={15} color="#10B981" />
                    )}
                  </View>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.fechaTexto}</Text>
                  </View>
                  <View style={styles.itemRightWrap}>
                    {item.monto && item.monto > 0 ? (
                      <Text style={styles.itemAmount}>{formatCOP(item.monto)}</Text>
                    ) : null}
                    <View style={styles.statusBadgeGreen}>
                      <Text style={styles.statusBadgeGreenText}>
                        {item.estado === 'Pagado' ? 'Pagado' : `${item.diasRestantes}d`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 14
  },
  // PILL VERDE COMPACTO (TODO AL DÍA)
  greenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F3741',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  greenPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  greenPillText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  greenPillRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  proximoMiniTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10
  },
  proximoMiniTagText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700'
  },

  // CARD URGENTE (AMBER / RED)
  urgentCard: {
    backgroundColor: '#0F3741',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTextGroup: {
    flex: 1
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  urgentSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '700'
  },

  // BADGES DE CUENTA REGRESIVA
  badgesWrapper: {
    marginTop: 10
  },
  badgesScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1
  },
  badgeIcon: {
    marginRight: 5
  },
  countdownBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },

  // SECCIÓN EXPANDIDA
  expandedContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)'
  },
  sectionHeaderTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  sectionGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 43, 51, 0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6
  },
  itemRowUrgent: {
    borderWidth: 1
  },
  itemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  itemTextWrap: {
    flex: 1
  },
  itemTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600'
  },
  itemSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1
  },
  itemRightWrap: {
    alignItems: 'flex-end',
    gap: 3
  },
  itemAmount: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700'
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeGreenText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700'
  },
  statusBadgeUrgent: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeUrgentText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusBadgeProximo: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeProximoText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700'
  }
});
