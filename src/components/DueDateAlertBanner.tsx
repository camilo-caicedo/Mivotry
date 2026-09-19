import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Modal,
  Pressable
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
  AlertCircle,
  BellOff,
  RotateCcw,
  X
} from 'lucide-react-native';
import { DashboardResponse } from '../services/api';
import {
  DueDateAlertItem,
  getDueDatesSummary,
  formatBadgeCountdown,
  snoozeAlerts,
  getSnoozedUntil,
  clearSnoozedAlerts,
  formatSnoozeDate
} from '../services/dueDatesService';

interface DueDateAlertBannerProps {
  dashboardData: DashboardResponse | null;
  onPressItem?: (item: DueDateAlertItem) => void;
}

export const DueDateAlertBanner: React.FC<DueDateAlertBannerProps> = ({
  dashboardData,
  onPressItem
}) => {
  const [expanded, setExpanded] = useState(false);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [completelyHidden, setCompletelyHidden] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSnoozedUntil().then(ts => {
      if (mounted && ts && Date.now() < ts) {
        setSnoozedUntil(ts);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  const isSnoozed = (snoozedUntil !== null && Date.now() < snoozedUntil) || sessionDismissed;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleSnooze = async (days: number) => {
    setSnoozeModalVisible(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (days <= 0) {
      setSessionDismissed(true);
      setCompletelyHidden(true);
    } else {
      const until = await snoozeAlerts(days);
      setSnoozedUntil(until);
      setSessionDismissed(true);
    }
  };

  const handleReactivate = async () => {
    await clearSnoozedAlerts();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSnoozedUntil(null);
    setSessionDismissed(false);
    setCompletelyHidden(false);
  };

  const formatCOP = (val?: number) => {
    if (!val || val <= 0) return '';
    return '$' + Math.round(val).toLocaleString('es-CO');
  };

  const renderSnoozeModal = () => (
    <Modal
      visible={snoozeModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setSnoozeModalVisible(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setSnoozeModalVisible(false)}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrap}>
              <BellOff size={20} color="#F59E0B" />
            </View>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Posponer Recordatorio</Text>
              <Text style={styles.modalSubtitle}>
                Elige cuándo deseas volver a ver estas alertas:
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSnoozeModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleSnooze(1)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Clock size={16} color="#38BDF8" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Dejar pasar por hoy</Text>
                <Text style={styles.optionDesc}>Silenciar por 24 horas (recordar mañana)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleSnooze(2)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Calendar size={16} color="#10B981" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Recordar en 2 días</Text>
                <Text style={styles.optionDesc}>Silenciar alertas por 48 horas</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleSnooze(3)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Calendar size={16} color="#F59E0B" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Recordar en 3 días</Text>
                <Text style={styles.optionDesc}>Silenciar alertas por 3 días</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleSnooze(5)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Calendar size={16} color="#EC4899" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Recordar en 5 días</Text>
                <Text style={styles.optionDesc}>Silenciar alertas por 5 días</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleSnooze(15)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <ShieldCheck size={16} color="#A855F7" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Ocultar por 15 días</Text>
                <Text style={styles.optionDesc}>Silenciar hasta el próximo ciclo de corte</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={() => handleSnooze(0)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                <X size={16} color="#94A3B8" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Ocultar de inmediato</Text>
                <Text style={styles.optionDesc}>Liberar espacio por esta sesión (0 espacio)</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setSnoozeModalVisible(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // Si el usuario decidió ocultar completamente, no ocupa nada de espacio
  if (completelyHidden) {
    return renderSnoozeModal();
  }

  // CASO A: Alerta silenciada / pospuesta -> Barra ultra delgada que libera espacio
  if (isSnoozed && hasUrgent) {
    return (
      <View style={styles.container}>
        <View style={styles.snoozedPill}>
          <TouchableOpacity
            style={styles.snoozedPillLeft}
            onPress={() => setSnoozeModalVisible(true)}
            activeOpacity={0.8}
          >
            <BellOff size={13} color="#94A3B8" />
            <Text style={styles.snoozedPillText} numberOfLines={1}>
              {snoozedUntil
                ? `Pausado hasta el ${formatSnoozeDate(snoozedUntil)}`
                : 'Alerta silenciada por hoy'}
            </Text>
          </TouchableOpacity>

          <View style={styles.snoozedPillRight}>
            <TouchableOpacity
              style={styles.reactivateBtn}
              onPress={handleReactivate}
              activeOpacity={0.7}
            >
              <RotateCcw size={11} color="#10B981" />
              <Text style={styles.reactivateBtnText}>Ver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeMiniBtn}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCompletelyHidden(true);
              }}
              activeOpacity={0.7}
            >
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
        {renderSnoozeModal()}
      </View>
    );
  }

  // CASO B: Sin alertas urgentes -> Pill verde compacto
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
            <TouchableOpacity
              style={styles.closeGreenPillBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCompletelyHidden(true);
              }}
              activeOpacity={0.7}
            >
              <X size={13} color="#059669" />
            </TouchableOpacity>
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
        {renderSnoozeModal()}
      </View>
    );
  }

  // CASO C: Hay compromisos urgentes (<= 5 días o vencidos)
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
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.headerTitleRow}
          activeOpacity={0.8}
          onPress={toggleExpand}
        >
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
              {urgentItems.length} {urgentItems.length === 1 ? 'compromiso requiere' : 'compromisos requieren'} atención en ≤ 5 días
            </Text>
          </View>
        </TouchableOpacity>

        {/* BOTÓN DE POSPONER Y TOGGLE EXPANDIR */}
        <View style={styles.headerActionsRight}>
          <TouchableOpacity
            style={[styles.snoozeBadgeBtn, { borderColor: headerColor, backgroundColor: headerBgColor }]}
            onPress={() => setSnoozeModalVisible(true)}
            activeOpacity={0.7}
          >
            <BellOff size={11} color={headerColor} />
            <Text style={[styles.snoozeBadgeBtnText, { color: headerColor }]}>
              Posponer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandButton}
            onPress={toggleExpand}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandButtonText, { color: headerColor }]}>
              {expanded ? 'Menos' : 'Ver'}
            </Text>
            {expanded ? (
              <ChevronUp size={15} color={headerColor} />
            ) : (
              <ChevronDown size={15} color={headerColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CHIPS DE CUENTA REGRESIVA */}
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
                AL DÍA (MÁS DE 12 DÍAS O PAGADOS)
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

          {/* BOTÓN FOOTER PARA POSPONER O DEJAR PASAR */}
          <TouchableOpacity
            style={styles.snoozeFooterButton}
            onPress={() => setSnoozeModalVisible(true)}
            activeOpacity={0.8}
          >
            <BellOff size={14} color="#94A3B8" />
            <Text style={styles.snoozeFooterButtonText}>
              Dejar pasar o recordar en X días...
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {renderSnoozeModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },

  // PILL CUANDO ESTÁ SILENCIADO (ULTRA DELGADO, LIBERA ESPACIO)
  snoozedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 55, 65, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  snoozedPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1
  },
  snoozedPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500'
  },
  snoozedPillRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  reactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  reactivateBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700'
  },
  closeMiniBtn: {
    padding: 2
  },

  // PILL VERDE COMPACTO (TODO AL DÍA)
  greenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.22)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
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
  closeGreenPillBtn: {
    padding: 2,
    marginLeft: 2
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
    gap: 9,
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
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  snoozeBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1
  },
  snoozeBadgeBtnText: {
    fontSize: 11,
    fontWeight: '700'
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 2
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

  // CONTENIDO EXPANDIBLE
  expandedContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)'
  },
  sectionHeaderTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase'
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
  },
  snoozeFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  snoozeFooterButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },

  // MODAL DE SNOOZE / RECORDAR EN X DÍAS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0B2B33',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  modalTitleWrap: {
    flex: 1
  },
  modalTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700'
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 4
  },
  optionsList: {
    backgroundColor: '#06181D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginBottom: 14
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  optionTextWrap: {
    flex: 1
  },
  optionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600'
  },
  optionDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600'
  }
});
