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
  Bell,
  ArrowRight,
  Utensils,
  TrendingUp,
  CreditCard,
  Tv,
  Calendar,
  ShieldCheck,
  Plus,
  Clock,
} from 'lucide-react-native';
import { DueDateAlertBanner } from '../components/DueDateAlertBanner';
import { QuickActionsWidget } from '../components/QuickActionsWidget';
import { BonosCompactCard } from '../components/BonosCompactCard';
import { BudgetProgressBar, formatCOP } from '../components/BudgetProgressBar';
import { DashboardResponse, GastoItem } from '../services/api';
import { QuickActionItem } from '../services/quickActionsService';
import { theme } from '../theme';

export interface DashboardScreenProps {
  dashboardData: DashboardResponse | null;
  activeQuincena: 15 | 30;
  setActiveQuincena: (q: 15 | 30) => void;
  onCargarQuincena: (q: 15 | 30) => void;
  onOpenInbox: () => void;
  onOpenSalidas: () => void;
  onOpenBonos: () => void;
  onOpenPrima: () => void;
  onSelectQuickAction: (action: QuickActionItem) => void;
  onNewQuickAction: () => void;
  onExpenseCategoryPress: (gasto: GastoItem, cuenta: 'nomina' | 'bonos') => void;
  totalManejoActual?: number;
  porcentajeManejo?: number;
  salidasManejo?: number;
  salidasPresupuestoQ?: number;
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

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  dashboardData,
  activeQuincena,
  setActiveQuincena,
  onCargarQuincena,
  onOpenInbox,
  onOpenSalidas,
  onOpenBonos,
  onOpenPrima,
  onSelectQuickAction,
  onNewQuickAction,
  onExpenseCategoryPress,
  totalManejoActual: totalManejoActualProp,
  porcentajeManejo: porcentajeManejoProp,
  salidasManejo: salidasManejoProp,
  salidasPresupuestoQ: salidasPresupuestoQProp,
  refreshing = false,
  onRefresh,
  scrollable = true,
}) => {
  // 1. Cálculos de nómina y saldo disponible vivo
  const nominaGastos = dashboardData?.nomina?.gastos || [];
  const totalPresupuestadoQ = useMemo(() => {
    return nominaGastos.reduce((acc, item) => {
      return acc + (activeQuincena === 15 ? (item.q15 || 0) : (item.q30 || 0));
    }, 0);
  }, [nominaGastos, activeQuincena]);

  const calculatedTotalManejo =
    dashboardData?.nomina?.totalManejoF21 ??
    nominaGastos.reduce((acc, item) => acc + (item.manejoActual || 0), 0);

  const effectiveTotalManejo = totalManejoActualProp ?? calculatedTotalManejo;

  const effectivePorcentajeManejo =
    porcentajeManejoProp ??
    (totalPresupuestadoQ > 0
      ? Math.min(100, Math.round((effectiveTotalManejo / totalPresupuestadoQ) * 100))
      : 0);

  // 2. Burn-rate sugerido diario
  const burnRateInfo = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    let daysRemaining = 1;

    if (activeQuincena === 15) {
      if (currentDay <= 15) {
        daysRemaining = Math.max(1, 15 - currentDay + 1);
      } else {
        daysRemaining = 15;
      }
    } else {
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(30, lastDayOfMonth);
      if (currentDay > 15 && currentDay <= targetDay) {
        daysRemaining = Math.max(1, targetDay - currentDay + 1);
      } else {
        daysRemaining = 15;
      }
    }

    const burnRate = Math.max(0, Math.round(effectiveTotalManejo / daysRemaining));
    return {
      daysRemaining,
      burnRate,
      targetDayStr: activeQuincena === 15 ? '15' : '30',
    };
  }, [activeQuincena, effectiveTotalManejo]);

  // 3. Rubro Salidas (Gastos variables quincenales)
  const itemSalidas = nominaGastos.find(g =>
    (g.nombre || '').toLowerCase().includes('salida')
  );
  const effectiveSalidasManejo = salidasManejoProp ?? (itemSalidas?.manejoActual ?? 240000);
  const effectiveSalidasPresupuestoQ =
    salidasPresupuestoQProp ??
    ((activeQuincena === 15 ? itemSalidas?.q15 : itemSalidas?.q30) ?? 300000);
  const salidasPorcentaje =
    effectiveSalidasPresupuestoQ > 0
      ? Math.min(
          100,
          Math.round((effectiveSalidasManejo / effectiveSalidasPresupuestoQ) * 100)
        )
      : 0;

  // 4. Bolsillos & Rendimientos (H25:I32)
  const bolsillosData = dashboardData?.bolsillos;
  const totalCompletoI30 =
    bolsillosData?.totalCompleto ?? bolsillosData?.totalRendimientos ?? 7800000;
  const totalDeudasI31 = bolsillosData?.totalDeudas ?? 0;
  const totalAhorrosI32 = bolsillosData?.totalAhorros ?? 7800000;

  const cuotasOccidenteVal = bolsillosData?.cuotasOccidente ?? 0;
  const cuotaAdicionalOccVal = bolsillosData?.cuotaAdicionalOcc ?? 0;
  const bolsilloVal = bolsillosData?.bolsillo ?? 0;
  const inversionesVal = bolsillosData?.items
    ? (bolsillosData.inversiones ?? 6800000)
    : (bolsillosData?.inversiones && bolsillosData.inversiones > 0
        ? bolsillosData.inversiones
        : 6800000);
  const pagosAnualesVal = bolsillosData?.items
    ? (bolsillosData.pagosAnuales ?? 1000000)
    : (bolsillosData?.pagosAnuales === 6800000
        ? 1000000
        : (bolsillosData?.pagosAnuales ?? 1000000));

  // 5. Pagos Anuales & Primas Semestrales (K25:O29)
  const pagosAnualesList = dashboardData?.pagosAnuales || [];
  const obligacionesAnualesSinPredial = pagosAnualesList.filter(
    p => !(p.concepto || '').toLowerCase().includes('predial')
  );
  const totalCostoAnual =
    obligacionesAnualesSinPredial.reduce((acc, p) => acc + (p.costoEstimado || 0), 0) || 1570000;
  const totalAhorradoAnual =
    obligacionesAnualesSinPredial.reduce((acc, p) => acc + (p.ahorrado || 0), 0) + pagosAnualesVal;
  const pctCubiertoAnual =
    totalCostoAnual > 0
      ? Math.min(100, Math.round((totalAhorradoAnual / totalCostoAnual) * 100))
      : 0;
  const proximoPagoPendiente = obligacionesAnualesSinPredial.find(
    p => (p.estado || '').toLowerCase() !== 'pagado'
  );

  const content = (
    <View style={styles.container}>
      {/* 1. BANNER DE NOTIFICACIONES PENDIENTES */}
      {(dashboardData?.totalNotificacionesPendientes || 0) > 0 && (
        <TouchableOpacity
          style={styles.pendingInboxBanner}
          activeOpacity={0.85}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            onOpenInbox();
          }}
        >
          <View style={styles.pendingInboxLeft}>
            <View style={styles.pendingInboxIconBox}>
              <Bell size={16} color="#06181D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingInboxTitle}>
                Tienes {dashboardData?.totalNotificacionesPendientes}{' '}
                {dashboardData?.totalNotificacionesPendientes === 1
                  ? 'gasto pendiente'
                  : 'gastos pendientes'}
              </Text>
              <Text style={styles.pendingInboxSubtitle}>
                Notificaciones bancarias esperando tu aprobación
              </Text>
            </View>
          </View>
          <View style={styles.pendingInboxBtn}>
            <Text style={styles.pendingInboxBtnText}>Aprobar</Text>
            <ArrowRight size={13} color={theme.colors.accentMint} />
          </View>
        </TouchableOpacity>
      )}

      {/* 2. ALERTA INTELIGENTE DE CORTES Y VENCIMIENTOS */}
      {dashboardData && <DueDateAlertBanner dashboardData={dashboardData} />}

      {/* 3. HERO CARD (DISPONIBLE EN MANEJO) */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>Disponible en Manejo (Te queda)</Text>
          <View style={styles.chipTag}>
            <Text style={styles.chipText}>Quincena {activeQuincena}</Text>
          </View>
        </View>

        {/* CIFRA GIGANTE: SALDO DISPONIBLE VIVO */}
        <Text style={styles.heroAmount}>{formatCOP(effectiveTotalManejo)}</Text>

        {/* BURN-RATE BADGE */}
        <View style={styles.burnRateBadge}>
          <Clock size={13} color={theme.colors.accentMint} />
          <Text style={styles.burnRateText}>
            Gasto diario sugerido:{' '}
            <Text style={styles.burnRateHighlight}>
              {formatCOP(burnRateInfo.burnRate)} COP/día
            </Text>{' '}
            hasta el {burnRateInfo.targetDayStr}
          </Text>
        </View>

        {/* BARRA DE PROGRESO EMBEBIDA & BASE QUINCENAL */}
        <View style={styles.progressSection}>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressLabel}>
              Base Q{activeQuincena}: {formatCOP(4950000)}
            </Text>
            <Text style={styles.progressValue}>
              {effectivePorcentajeManejo}% disponible
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.max(5, Math.min(100, effectivePorcentajeManejo))}%`,
                  backgroundColor:
                    effectivePorcentajeManejo > 40
                      ? theme.colors.accentMint
                      : effectivePorcentajeManejo > 15
                      ? theme.colors.accentGold
                      : theme.colors.accentRose,
                },
              ]}
            />
          </View>
        </View>

        {/* BOTONES RÁPIDOS DE QUINCENA + CARGAR Q */}
        <View style={styles.heroActionsRow}>
          <TouchableOpacity
            style={[
              styles.quincenaToggleBtn,
              activeQuincena === 15 && styles.quincenaToggleBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              triggerHaptic();
              setActiveQuincena(15);
            }}
          >
            <Text
              style={[
                styles.quincenaToggleText,
                activeQuincena === 15 && styles.quincenaToggleTextActive,
              ]}
            >
              Día 15
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quincenaToggleBtn,
              activeQuincena === 30 && styles.quincenaToggleBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              triggerHaptic();
              setActiveQuincena(30);
            }}
          >
            <Text
              style={[
                styles.quincenaToggleText,
                activeQuincena === 30 && styles.quincenaToggleTextActive,
              ]}
            >
              Día 30
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cargarBtn}
            activeOpacity={0.85}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              onCargarQuincena(activeQuincena);
            }}
          >
            <Text style={styles.cargarBtnText}>Cargar Q{activeQuincena}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. ATAJOS RÁPIDOS (1-TAP QUICK ACTIONS RIBBON) */}
      <QuickActionsWidget
        onSelectAction={action => {
          triggerHaptic();
          onSelectQuickAction(action);
        }}
        onNewAction={() => {
          triggerHaptic();
          onNewQuickAction();
        }}
      />

      {/* 5. FONDO DE SALIDAS & OCIO CARD */}
      <TouchableOpacity
        style={styles.salidasCard}
        activeOpacity={0.85}
        onPress={() => {
          triggerHaptic();
          onOpenSalidas();
        }}
      >
        <View style={styles.salidasHeader}>
          <View style={styles.salidasHeaderLeft}>
            <View style={styles.salidasIconBadge}>
              <Utensils size={16} color={theme.colors.accentMint} />
            </View>
            <View>
              <Text style={styles.salidasTitle}>Fondo de Salidas & Ocio</Text>
              <Text style={styles.salidasSubtitle}>Gastos variables quincenales</Text>
            </View>
          </View>
          <View style={styles.salidasDisponibleBadge}>
            <Text style={styles.salidasDisponibleBadgeText}>Ver análisis ›</Text>
          </View>
        </View>

        <View style={styles.salidasAmountsRow}>
          <View>
            <Text style={styles.salidasAmountBig}>{formatCOP(effectiveSalidasManejo)}</Text>
            <Text style={styles.salidasAmountSub}>
              de {formatCOP(effectiveSalidasPresupuestoQ)} presupuestados (Q{activeQuincena})
            </Text>
          </View>
          <View style={styles.salidasPercentCircle}>
            <Text style={styles.salidasPercentText}>{salidasPorcentaje}%</Text>
            <Text style={styles.salidasPercentLabel}>restante</Text>
          </View>
        </View>

        {/* BARRA DE CONSUMO DE SALIDAS */}
        <BudgetProgressBar
          disponible={effectiveSalidasManejo}
          presupuesto={effectiveSalidasPresupuestoQ}
          size="medium"
          showLabel={false}
          style={{ marginTop: 10, marginBottom: 6 }}
        />

        <Text style={styles.salidasTipText}>
          💡 Toca para ver en qué gastas más por quincena, mes o 3 meses
        </Text>
      </TouchableOpacity>

      {/* 6. TARJETA COMPACTA DE BONOS */}
      <BonosCompactCard
        bonosData={dashboardData?.bonos}
        onPress={() => {
          triggerHaptic();
          onOpenBonos();
        }}
      />

      {/* 7. TARJETAS DE CRÉDITO & CRÉDITOS PRINCIPALES */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Créditos & Tarjetas de Crédito</Text>
            <Text style={styles.cardDesc}>Obligaciones bancarias principales</Text>
          </View>
          <CreditCard size={18} color={theme.colors.textMuted} />
        </View>

        {/* CRÉDITO OCCIDENTE */}
        <View style={styles.debtRow}>
          <View>
            <Text style={styles.debtName}>Crédito Occidente</Text>
            <Text style={styles.debtMeta}>
              Corte: Día {dashboardData?.deudas?.creditoOccidente?.fechaPago || '15'}
            </Text>
          </View>
          <Text style={styles.debtAmount}>
            {formatCOP(dashboardData?.deudas?.creditoOccidente?.saldo || 170588000)}
          </Text>
        </View>

        <View style={styles.debtDivider} />

        {/* CRÉDITO HIPOTECARIO APTO */}
        <View style={styles.debtRow}>
          <View>
            <Text style={styles.debtName}>Crédito Hipotecario Apto</Text>
            <Text style={styles.debtMeta}>
              Corte: Día {dashboardData?.deudas?.creditoApto?.fechaPago || '30'}
            </Text>
          </View>
          <Text style={styles.debtAmount}>
            {formatCOP(dashboardData?.deudas?.creditoApto?.saldo || 75300000)}
          </Text>
        </View>

        <View style={styles.debtDivider} />

        {/* TARJETAS DE CRÉDITO TOTAL */}
        <View style={styles.debtRow}>
          <View>
            <Text style={styles.debtName}>Tarjetas de Crédito</Text>
            <Text style={styles.debtMeta}>
              {dashboardData?.deudas?.tarjetasDetalle &&
              dashboardData.deudas.tarjetasDetalle.length > 0
                ? `${dashboardData.deudas.tarjetasDetalle.length} tarjetas registradas`
                : 'Infinity (15) / Rappi (30) / Scotia (30)'}
            </Text>
          </View>
          <Text
            style={[
              styles.debtAmount,
              {
                color:
                  (dashboardData?.deudas?.totalDeudaTarjetas || 0) > 0
                    ? theme.colors.accentRose
                    : theme.colors.accentMint,
              },
            ]}
          >
            {formatCOP(dashboardData?.deudas?.totalDeudaTarjetas || 0)}
          </Text>
        </View>

        {/* DESGLOSE INDIVIDUAL DE CADA TARJETA */}
        {dashboardData?.deudas?.tarjetasDetalle &&
          dashboardData.deudas.tarjetasDetalle.length > 0 && (
            <View style={styles.tcDetalleList}>
              {dashboardData.deudas.tarjetasDetalle.map((tc, idx) => (
                <View key={idx} style={styles.tcDetalleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.tcDetalleName}>{tc.nombre}</Text>
                    <View style={styles.tcCorteBadge}>
                      <Text style={styles.tcCorteBadgeText}>
                        Día {tc.fechaPago || '15'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.tcDetalleVal,
                      {
                        color:
                          tc.saldo > 0
                            ? theme.colors.accentGold
                            : theme.colors.accentMint,
                      },
                    ]}
                  >
                    {formatCOP(tc.saldo)}
                  </Text>
                </View>
              ))}
            </View>
          )}
      </View>

      {/* 8. BOLSILLOS Y AHORROS CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Bolsillos y Ahorros</Text>
            <Text style={styles.cardDesc}>
              Total General Bolsillo (I:30): {formatCOP(totalCompletoI30)}
            </Text>
          </View>
          <TrendingUp size={18} color={theme.colors.accentGold} />
        </View>

        {/* MÉTRICAS PRINCIPALES */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Bolsillo (I:30)</Text>
            <Text style={[styles.metricValue, { color: theme.colors.accentGold }]}>
              {formatCOP(totalCompletoI30)}
            </Text>
            <Text style={styles.metricSub}>
              Ahorros: {formatCOP(totalAhorrosI32)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Fondo Ocasional (F:20)</Text>
            <Text style={[styles.metricValue, { color: theme.colors.accentMint }]}>
              {formatCOP(dashboardData?.nomina?.fondoOcasional || 0)}
            </Text>
            <Text style={styles.metricSub}>Vacaciones / Extras</Text>
          </View>
        </View>

        <View style={styles.debtDivider} />

        {/* DETALLE DE RUBROS DE AHORRO */}
        <View style={styles.debtRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>Bolsillo disponible inmediato</Text>
            <Text style={styles.debtMeta}>Fila 27 • Saldo líquido para imprevistos</Text>
          </View>
          <Text
            style={[
              styles.debtAmount,
              { color: bolsilloVal > 0 ? theme.colors.accentMint : theme.colors.textSecondary },
            ]}
          >
            {formatCOP(bolsilloVal)}
          </Text>
        </View>

        <View style={styles.debtDivider} />

        <View style={styles.debtRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>Bolsillo inversiones</Text>
            <Text style={styles.debtMeta}>Fila 28 • Capital base a largo plazo</Text>
          </View>
          <Text style={[styles.debtAmount, { color: theme.colors.accentGold }]}>
            {formatCOP(inversionesVal)}
          </Text>
        </View>

        <View style={styles.debtDivider} />

        <View style={styles.debtRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>Ahorro pagos anuales</Text>
            <Text style={styles.debtMeta}>
              Fila 29 • SOAT, Tecno, Impuestos • Predial vía Cesantías
            </Text>
          </View>
          <Text style={[styles.debtAmount, { color: theme.colors.accentMint }]}>
            {formatCOP(pagosAnualesVal)}
          </Text>
        </View>
      </View>

      {/* 8. DETALLE DE DEUDAS CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Detalle de Deudas (I:31)</Text>
            <Text style={styles.cardDesc}>
              Subtotal en bolsillo: {formatCOP(totalDeudasI31)}
            </Text>
          </View>
          <CreditCard size={18} color={theme.colors.textMuted} />
        </View>

        <View style={styles.debtRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>Cuotas Occidente</Text>
            <Text style={styles.debtMeta}>Fila 25 • Control de cuota fija en bolsillo</Text>
          </View>
          <Text
            style={[
              styles.debtAmount,
              { color: cuotasOccidenteVal > 0 ? theme.colors.accentRose : theme.colors.textSecondary },
            ]}
          >
            {formatCOP(cuotasOccidenteVal)}
          </Text>
        </View>

        <View style={styles.debtDivider} />

        <View style={styles.debtRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>Cuota adicional occ</Text>
            <Text style={styles.debtMeta}>Fila 26 • Abono o cuota adicional programada</Text>
          </View>
          <Text
            style={[
              styles.debtAmount,
              { color: cuotaAdicionalOccVal > 0 ? theme.colors.accentRose : theme.colors.textSecondary },
            ]}
          >
            {formatCOP(cuotaAdicionalOccVal)}
          </Text>
        </View>
      </View>

      {/* 9. PAGOS ANUALES & PRIMAS CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Pagos Anuales & Primas</Text>
            <Text style={styles.cardDesc}>Fondeo con primas semestrales (I:29)</Text>
          </View>
          <ShieldCheck size={18} color={theme.colors.accentMint} />
        </View>

        {/* FONDO DE PRIMAS BANNER */}
        <View style={styles.primaFondoCard}>
          <View style={styles.primaFondoTop}>
            <View>
              <Text style={styles.primaFondoLabel}>Fondo Primas Semestrales (I:29)</Text>
              <Text style={styles.primaFondoAmount}>{formatCOP(pagosAnualesVal)}</Text>
            </View>
            <TouchableOpacity
              style={styles.injectPrimaBtn}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                onOpenPrima();
              }}
            >
              <Plus size={14} color="#06181D" />
              <Text style={styles.injectPrimaBtnText}>Inyectar Prima</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.primaProgressSection}>
            <View style={styles.primaProgressHeader}>
              <Text style={styles.primaProgressLabel}>Cobertura Anual Total</Text>
              <Text style={styles.primaProgressValue}>
                {pctCubiertoAnual}% ({formatCOP(totalAhorradoAnual)} / {formatCOP(totalCostoAnual)})
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, pctCubiertoAnual)}%`,
                    backgroundColor:
                      pctCubiertoAnual >= 80
                        ? theme.colors.accentMint
                        : theme.colors.accentGold,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* PRÓXIMO COMPROMISO O ESTADO */}
        <View style={styles.annualShortcutLeft}>
          <View style={styles.annualShortcutIconBox}>
            <Calendar size={16} color={theme.colors.accentGold} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.annualShortcutTitle}>
                {proximoPagoPendiente ? 'Próximo Compromiso Anual' : 'Obligaciones Anuales'}
              </Text>
              <View
                style={
                  proximoPagoPendiente
                    ? styles.annualBadgePendingSmall
                    : styles.annualBadgePaidSmall
                }
              >
                <Text
                  style={
                    proximoPagoPendiente
                      ? styles.annualBadgeTextPendingSmall
                      : styles.annualBadgeTextPaidSmall
                  }
                >
                  {proximoPagoPendiente ? proximoPagoPendiente.mesPago : 'Al día 🎉'}
                </Text>
              </View>
            </View>
            <Text style={styles.annualShortcutConcept}>
              {proximoPagoPendiente
                ? `${proximoPagoPendiente.concepto} • ${formatCOP(proximoPagoPendiente.costoEstimado)}`
                : 'Todas las obligaciones cubiertas'}
            </Text>
          </View>
        </View>
      </View>

      {/* 10. SERVICIOS STREAMING */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Streaming & Suscripciones</Text>
            <Text style={styles.cardDesc}>
              Total Mensual: {formatCOP(dashboardData?.streaming?.totalMensual || 0)}
            </Text>
          </View>
          <Tv size={18} color={theme.colors.textMuted} />
        </View>
        <View style={styles.streamingTagsWrap}>
          {dashboardData?.streaming?.lista
            ?.filter(s => s.valor > 0)
            ?.map((s, idx) => (
              <View key={idx} style={styles.streamingTag}>
                <Text style={styles.streamingTagName}>{s.nombre}</Text>
                <Text style={styles.streamingTagVal}>{formatCOP(s.valor)}</Text>
                {s.banco ? <Text style={styles.streamingTagBank}>• {s.banco}</Text> : null}
              </View>
            ))}
        </View>
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

  // NOTIFICACIONES PENDIENTES
  pendingInboxBanner: {
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accentGold,
  },
  pendingInboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pendingInboxIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingInboxTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
  },
  pendingInboxSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 1,
  },
  pendingInboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  pendingInboxBtnText: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },

  // HERO CARD
  heroCard: {
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroLabel: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
  },
  chipTag: {
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  chipText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
  },
  heroAmount: {
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.hero,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: 8,
  },

  // BURN-RATE BADGE
  burnRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  burnRateText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },
  burnRateHighlight: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.accentMintLight,
  },

  // PROGRESO EMBEBIDO
  progressSection: {
    marginBottom: theme.spacing.lg,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },
  progressValue: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: theme.radius.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.radius.xs,
  },

  // ACCIONES HERO
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  quincenaToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quincenaToggleBtnActive: {
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.accentMint,
  },
  quincenaToggleText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },
  quincenaToggleTextActive: {
    color: theme.colors.accentMint,
  },
  cargarBtn: {
    marginLeft: 'auto',
    backgroundColor: theme.colors.accentMint,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  cargarBtnText: {
    fontFamily: theme.fonts.bold,
    color: '#060D0F',
    fontSize: theme.fontSizes.xs,
  },

  // TARJETA DE SALIDAS & OCIO
  salidasCard: {
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  salidasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  salidasHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  salidasIconBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentMintMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salidasTitle: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
  },
  salidasSubtitle: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },
  salidasDisponibleBadge: {
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  salidasDisponibleBadgeText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
  },
  salidasAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  salidasAmountBig: {
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xxl,
  },
  salidasAmountSub: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 2,
  },
  salidasPercentCircle: {
    alignItems: 'flex-end',
  },
  salidasPercentText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.accentMint,
    fontSize: 18,
  },
  salidasPercentLabel: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  salidasTipText: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    fontSize: 10,
    marginTop: 10,
  },

  // CARDS GENERALES
  card: {
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
  },
  cardDesc: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 2,
  },

  // GRID DE MÉTRICAS (BOLSILLOS)
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  metricLabel: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    marginBottom: 2,
  },
  metricSub: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
    fontSize: 10,
  },

  // FILAS DE DETALLE / DEUDA
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  debtName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
  debtMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 1,
  },
  debtAmount: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
  },
  debtDivider: {
    height: 1,
    backgroundColor: theme.colors.surfaceBorder,
    marginVertical: 6,
  },

  // PRIMAS & COMPROMISOS
  primaFondoCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  primaFondoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaFondoLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: theme.letterSpacing.wide,
  },
  primaFondoAmount: {
    color: theme.colors.accentMintLight,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.heavy,
    marginTop: 2,
  },
  injectPrimaBtn: {
    backgroundColor: theme.colors.accentMint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
  },
  injectPrimaBtnText: {
    color: '#06181D',
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },
  primaProgressSection: {
    marginTop: 2,
  },
  primaProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  primaProgressLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  primaProgressValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },

  annualShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  annualShortcutIconBox: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentGoldMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  annualShortcutTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },
  annualShortcutConcept: {
    color: theme.colors.accentGold,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
    marginTop: 2,
  },
  annualBadgePendingSmall: {
    backgroundColor: theme.colors.accentGoldMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  annualBadgeTextPendingSmall: {
    color: theme.colors.accentGold,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  annualBadgePaidSmall: {
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  annualBadgeTextPaidSmall: {
    color: theme.colors.accentMint,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },

  // TARJETAS DE CRÉDITO DESGLOSE
  tcDetalleList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    gap: 6,
  },
  tcDetalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  tcDetalleName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  tcCorteBadge: {
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  tcCorteBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: theme.fontWeights.semiBold,
  },
  tcDetalleVal: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },

  // STREAMING TAGS
  streamingTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  streamingTag: {
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  streamingTagName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  streamingTagVal: {
    color: theme.colors.accentMint,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  streamingTagBank: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
});
