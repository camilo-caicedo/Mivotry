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
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Droplets,
  DollarSign,
  Palmtree,
  Info,
} from 'lucide-react-native';
import { formatCOP } from '../components/BudgetProgressBar';
import { DashboardResponse, PagoAnualItem } from '../services/api';
import { theme } from '../theme';

export interface BolsillosScreenProps {
  dashboardData: DashboardResponse | null;
  onOpenPrimaModal: () => void;
  onTogglePagoAnual?: (pago: PagoAnualItem) => void;
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

export const BolsillosScreen: React.FC<BolsillosScreenProps> = ({
  dashboardData,
  onOpenPrimaModal,
  onTogglePagoAnual,
  refreshing = false,
  onRefresh,
  scrollable = true,
}) => {
  // 1. Bolsillos & Rendimientos (Columnas H e I, filas 25 a 32)
  const bolsillosData = dashboardData?.bolsillos;
  const totalCompletoI30 = bolsillosData?.totalCompleto ?? bolsillosData?.totalRendimientos ?? 7800000;
  const totalDeudasI31 = bolsillosData?.totalDeudas ?? 0;
  const totalAhorrosI32 = bolsillosData?.totalAhorros ?? 7800000;

  // Detalle individual de conceptos de ahorro
  const fondoOcasionalVal = dashboardData?.nomina?.fondoOcasional ?? 0; // F:20
  const inversionesVal = bolsillosData?.items
    ? (bolsillosData.inversiones ?? 6800000)
    : (bolsillosData?.inversiones && bolsillosData.inversiones > 0 ? bolsillosData.inversiones : 6800000); // Fila 28
  const pagosAnualesVal = bolsillosData?.items
    ? (bolsillosData.pagosAnuales ?? 1000000)
    : (bolsillosData?.pagosAnuales === 6800000 ? 1000000 : (bolsillosData?.pagosAnuales ?? 1000000)); // Fila 29
  const bolsilloVal = bolsillosData?.bolsillo ?? 0; // Fila 27

  // Detalle de Deudas
  const cuotasOccidenteVal = bolsillosData?.cuotasOccidente ?? 0; // Fila 25
  const cuotaAdicionalOccVal = bolsillosData?.cuotaAdicionalOcc ?? 0; // Fila 26

  // 2. Pagos Anuales & Primas Semestrales (Columnas K a O, filas 25 a 29)
  const pagosAnualesList = useMemo(() => {
    return dashboardData?.pagosAnuales || [];
  }, [dashboardData]);

  const obligacionesAnualesSinPredial = useMemo(() => {
    return pagosAnualesList.filter(
      p => !(p.concepto || '').toLowerCase().includes('predial')
    );
  }, [pagosAnualesList]);

  const totalCostoAnual = useMemo(() => {
    return (
      obligacionesAnualesSinPredial.reduce((acc, p) => acc + (p.costoEstimado || 0), 0) || 1570000
    );
  }, [obligacionesAnualesSinPredial]);

  const totalAhorradoAnual = useMemo(() => {
    return (
      obligacionesAnualesSinPredial.reduce((acc, p) => acc + (p.ahorrado || 0), 0) + pagosAnualesVal
    );
  }, [obligacionesAnualesSinPredial, pagosAnualesVal]);

  const pctCubiertoAnual = useMemo(() => {
    return totalCostoAnual > 0
      ? Math.min(100, Math.round((totalAhorradoAnual / totalCostoAnual) * 100))
      : 0;
  }, [totalAhorradoAnual, totalCostoAnual]);

  const content = (
    <View style={styles.container}>
      {/* 1. HEADER SUMMARY: HERO TOTAL BOLSILLO (I:30) */}
      <View style={styles.heroOuterCard}>
        <View style={styles.heroInnerCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTitleGroup}>
              <Text style={styles.heroPreTitle}>PATRIMONIO EN RENDIMIENTO</Text>
              <Text style={styles.heroTitle}>Total en Bolsillo (I:30)</Text>
            </View>
            <View style={styles.statusLiveBadge}>
              <View style={styles.statusLiveDot} />
              <Text style={styles.statusLiveText}>En Rendimiento</Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>{formatCOP(totalCompletoI30)}</Text>

          {/* FÓRMULA DE TOTALIZACIÓN */}
          <View style={styles.formulaBadge}>
            <Text style={styles.formulaText}>
              I:30 = Deudas (I:31) + Ahorros (I:32)
            </Text>
          </View>

          {/* DUAL PILLARS: AHORROS (I:32) Y DEUDAS (I:31) */}
          <View style={styles.dualGrid}>
            {/* PILAR AHORROS (I:32) */}
            <View style={styles.pillarBoxAhorros}>
              <View style={styles.pillarHeader}>
                <Text style={styles.pillarLabelAhorros}>Ahorros (I:32)</Text>
                <TrendingUp size={14} color={theme.colors.accentMint} />
              </View>
              <Text style={styles.pillarValueAhorros}>{formatCOP(totalAhorrosI32)}</Text>
              <Text style={styles.pillarMeta}>Ahorro neto guardado</Text>
            </View>

            {/* PILAR DEUDAS (I:31) */}
            <View
              style={[
                styles.pillarBoxDeudas,
                totalDeudasI31 > 0 && styles.pillarBoxDeudasActive,
              ]}
            >
              <View style={styles.pillarHeader}>
                <Text
                  style={[
                    styles.pillarLabelDeudas,
                    totalDeudasI31 > 0 && styles.pillarLabelDeudasActive,
                  ]}
                >
                  Deudas (I:31)
                </Text>
                <CreditCard
                  size={14}
                  color={totalDeudasI31 > 0 ? theme.colors.accentRose : theme.colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.pillarValueDeudas,
                  totalDeudasI31 > 0 && styles.pillarValueDeudasActive,
                ]}
              >
                {formatCOP(totalDeudasI31)}
              </Text>
              <Text style={styles.pillarMeta}>Obligaciones en bolsillo</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. TARJETAS DE AHORRO CON DISEÑO DOUBLE-BEZEL (surface1 & surface2) */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Tarjetas de Ahorro</Text>
          <Text style={styles.sectionSubtitle}>
            Subtotal Ahorros (I:32): {formatCOP(totalAhorrosI32)}
          </Text>
        </View>
        <Sparkles size={18} color={theme.colors.accentMint} />
      </View>

      <View style={styles.savingsList}>
        {/* TARJETA 1: 🏖️ FONDO OCASIONAL / VACACIONES (F:20) */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.accentGoldMuted }]}>
                  <Text style={styles.emojiText}>🏖️</Text>
                </View>
                <View style={styles.cardTitles}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>Fondo Ocasional / Vacaciones</Text>
                    <View style={styles.badgeFilaGold}>
                      <Text style={styles.badgeFilaTextGold}>F:20</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc}>
                    Reserva de nómina para vacaciones e imprevistos
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cardBalanceRow}>
              <Text style={styles.cardBalanceLabel}>Saldo acumulado</Text>
              <Text style={[styles.cardBalanceVal, { color: theme.colors.accentMint }]}>
                {formatCOP(fondoOcasionalVal)}
              </Text>
            </View>
          </View>
        </View>

        {/* TARJETA 2: 📈 INVERSIONES (FILA 28) */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.accentGoldMuted }]}>
                  <TrendingUp size={20} color={theme.colors.accentGold} />
                </View>
                <View style={styles.cardTitles}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>Inversiones</Text>
                    <View style={styles.badgeFilaGold}>
                      <Text style={styles.badgeFilaTextGold}>Fila 28</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc}>
                    Capital productivo base a largo plazo
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cardBalanceRow}>
              <Text style={styles.cardBalanceLabel}>Capital en rendimiento</Text>
              <Text style={[styles.cardBalanceVal, { color: theme.colors.accentGold }]}>
                {formatCOP(inversionesVal)}
              </Text>
            </View>
          </View>
        </View>

        {/* TARJETA 3: 🛡️ AHORRO PAGOS ANUALES (FILA 29) */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.accentVioletMuted }]}>
                  <ShieldCheck size={20} color={theme.colors.accentVioletLight} />
                </View>
                <View style={styles.cardTitles}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>Ahorro Pagos Anuales</Text>
                    <View style={styles.badgeFilaViolet}>
                      <Text style={styles.badgeFilaTextViolet}>Fila 29</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc}>
                    SOAT, Tecno, Impuestos • Predial vía Cesantías
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cardBalanceRow}>
              <Text style={styles.cardBalanceLabel}>Fondo disponible</Text>
              <Text style={[styles.cardBalanceVal, { color: theme.colors.accentMint }]}>
                {formatCOP(pagosAnualesVal)}
              </Text>
            </View>
          </View>
        </View>

        {/* TARJETA 4: 💧 BOLSILLO LÍQUIDO (FILA 27) */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.accentSkyMuted }]}>
                  <Droplets size={20} color={theme.colors.accentSky} />
                </View>
                <View style={styles.cardTitles}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>Bolsillo Líquido</Text>
                    <View style={styles.badgeFilaSky}>
                      <Text style={styles.badgeFilaTextSky}>Fila 27</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc}>
                    Saldo disponible de inmediato sin afectación
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cardBalanceRow}>
              <Text style={styles.cardBalanceLabel}>Disponible inmediato</Text>
              <Text
                style={[
                  styles.cardBalanceVal,
                  { color: bolsilloVal > 0 ? theme.colors.accentMint : theme.colors.textSecondary },
                ]}
              >
                {formatCOP(bolsilloVal)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. DETALLE DE DEUDAS (I:31) */}
      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Detalle de Deudas</Text>
              <Text style={styles.cardDesc}>
                Subtotal Deudas (I:31): {formatCOP(totalDeudasI31)}
              </Text>
            </View>
            <CreditCard size={18} color={theme.colors.textMuted} />
          </View>

          <View style={styles.divider} />

          {/* CUOTAS OCCIDENTE (FILA 25) */}
          <View style={styles.debtRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.debtName}>Cuotas Occidente</Text>
                <View style={styles.badgeFilaMuted}>
                  <Text style={styles.badgeFilaTextMuted}>Fila 25</Text>
                </View>
              </View>
              <Text style={styles.debtMeta}>Control de cuota en bolsillo</Text>
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

          <View style={styles.divider} />

          {/* CUOTA ADICIONAL OCC (FILA 26) */}
          <View style={styles.debtRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.debtName}>Cuota adicional occ</Text>
                <View style={styles.badgeFilaMuted}>
                  <Text style={styles.badgeFilaTextMuted}>Fila 26</Text>
                </View>
              </View>
              <Text style={styles.debtMeta}>Abono o cuota adicional programada</Text>
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
      </View>

      {/* 4. FONDO PRIMAS SEMESTRALES (I:29) & COMPROMISOS ANUALES */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Pagos Anuales & Primas</Text>
          <Text style={styles.sectionSubtitle}>
            Fondeo con primas de Junio y Diciembre (I:29)
          </Text>
        </View>
        <ShieldCheck size={18} color={theme.colors.accentMint} />
      </View>

      {/* FONDO DE PRIMAS CARD */}
      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
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
                onOpenPrimaModal();
              }}
            >
              <Plus size={14} color="#06181D" />
              <Text style={styles.injectPrimaBtnText}>Inyectar Prima</Text>
            </TouchableOpacity>
          </View>

          {/* BARRA DE COBERTURA ANUAL */}
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
                      pctCubiertoAnual >= 80 ? theme.colors.accentMint : theme.colors.accentGold,
                  },
                ]}
              />
            </View>
            <Text style={styles.primaCoverageHint}>
              Fondeo con primas semestrales • Predial cubierto al 100% vía Cesantías
            </Text>
          </View>
        </View>
      </View>

      {/* LISTA INTERACTIVA DE COMPROMISOS ANUALES (K25:O29) */}
      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Obligaciones del Año (K25:O29)</Text>
              <Text style={styles.cardDesc}>
                Toca cualquier pago para cambiar a Pagado / Pendiente
              </Text>
            </View>
            <Calendar size={18} color={theme.colors.textMuted} />
          </View>

          <View style={styles.divider} />

          {pagosAnualesList.length > 0 ? (
            pagosAnualesList.map((pago, idx) => {
              const isPaid = (pago.estado || '').toLowerCase() === 'pagado';
              const isPredial = (pago.concepto || '').toLowerCase().includes('predial');

              return (
                <React.Fragment key={pago.fila || idx}>
                  <TouchableOpacity
                    style={styles.annualRowInteractive}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic();
                      onTogglePagoAnual?.(pago);
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.debtName, isPaid && styles.annualItemPaid]}>
                          {pago.concepto}
                        </Text>
                        {isPredial ? (
                          <View style={styles.statusBadgeCesantiasSmall}>
                            <Text style={styles.statusBadgeTextCesantiasSmall}>
                              Cesantías
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={
                              isPaid
                                ? styles.statusBadgePaidSmall
                                : styles.statusBadgePendingSmall
                            }
                          >
                            <Text
                              style={
                                isPaid
                                  ? styles.statusBadgeTextPaidSmall
                                  : styles.statusBadgeTextPendingSmall
                              }
                            >
                              {pago.mesPago}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.debtMeta}>
                        Estimado: {formatCOP(pago.costoEstimado)}
                        {isPredial
                          ? ' • Cubierto con Cesantías (sin ahorro mensual)'
                          : pago.ahorrado > 0
                          ? ` • Ahorro asignado: ${formatCOP(pago.ahorrado)}`
                          : ''}
                      </Text>
                    </View>

                    {/* BADGE DE ESTADO CONMUTABLE */}
                    <View
                      style={[
                        styles.annualToggleBadge,
                        isPaid ? styles.annualBadgePaid : styles.annualBadgePending,
                      ]}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 size={13} color={theme.colors.accentMint} />
                          <Text style={styles.annualBadgeTextPaid}>Pagado</Text>
                        </>
                      ) : (
                        <>
                          <Clock size={13} color={theme.colors.accentGold} />
                          <Text style={styles.annualBadgeTextPending}>Pendiente</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                  {idx < pagosAnualesList.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );
            })
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={styles.emptyListText}>
                Cargando compromisos anuales desde Google Sheets...
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 5. NOTA INFORMATIVA DE RENDIMIENTOS DIARIOS */}
      <View style={styles.infoNoteOuter}>
        <View style={styles.infoNoteInner}>
          <View style={styles.infoNoteHeader}>
            <Info size={16} color={theme.colors.accentMint} />
            <Text style={styles.infoNoteTitle}>Rendimientos Diarios</Text>
          </View>
          <Text style={styles.infoNoteText}>
            El total de <Text style={{ color: theme.colors.accentGold, fontWeight: '700' }}>I:30 ({formatCOP(totalCompletoI30)})</Text>{' '}
            suma las Deudas <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>I:31 ({formatCOP(totalDeudasI31)})</Text>{' '}
            y los Ahorros <Text style={{ color: theme.colors.accentMint, fontWeight: '700' }}>I:32 ({formatCOP(totalAhorrosI32)})</Text>.
            Los intereses diarios se generan directamente sobre el capital ahorrado en tu cuenta.
          </Text>
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

  // DOUBLE-BEZEL DESIGN PATTERN (Concentric Apple/Linear)
  doubleBezelOuter: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.xl, // 22px
    padding: 6, // 6px concentric bezel gap
    marginBottom: theme.spacing.md,
  },
  doubleBezelInner: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 16, // Concentric radius (22 - 6 = 16px)
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },

  // HERO CARD TOTAL EN BOLSILLO
  heroOuterCard: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    borderRadius: theme.radius.xl,
    padding: 6,
    marginBottom: theme.spacing.lg,
  },
  heroInnerCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 191, 36, 0.15)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroTitleGroup: {
    flex: 1,
  },
  heroPreTitle: {
    color: theme.colors.accentGold,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
    letterSpacing: theme.letterSpacing.wider,
    marginBottom: 2,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.bold,
  },
  statusLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentMint,
  },
  statusLiveText: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  heroAmount: {
    color: theme.colors.accentGold,
    fontSize: theme.fontSizes.display,
    fontWeight: theme.fontWeights.heavy,
    letterSpacing: theme.letterSpacing.tight,
    marginVertical: 6,
  },
  formulaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  formulaText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
  },

  // DUAL PILLARS (Ahorros vs Deudas)
  dualGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  pillarBoxAhorros: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  pillarBoxDeudas: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  pillarBoxDeudasActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pillarLabelAhorros: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  pillarLabelDeudas: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  pillarLabelDeudasActive: {
    color: theme.colors.accentRose,
  },
  pillarValueAhorros: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.bold,
    marginBottom: 2,
  },
  pillarValueDeudas: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.bold,
    marginBottom: 2,
  },
  pillarValueDeudasActive: {
    color: theme.colors.accentRose,
  },
  pillarMeta: {
    color: theme.colors.textTertiary,
    fontSize: 10,
  },

  // SECCIONES GENERALES
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.bold,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 1,
  },

  // LISTA DE TARJETAS DE AHORRO
  savingsList: {
    marginBottom: theme.spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  emojiText: {
    fontSize: 18,
  },
  cardTitles: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.bold,
  },
  cardDesc: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },
  cardBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardBalanceLabel: {
    color: theme.colors.textTertiary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
  },
  cardBalanceVal: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
  },

  // BADGES DE FILA
  badgeFilaGold: {
    backgroundColor: theme.colors.accentGoldMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeFilaTextGold: {
    color: theme.colors.accentGold,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  badgeFilaViolet: {
    backgroundColor: theme.colors.accentVioletMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeFilaTextViolet: {
    color: theme.colors.accentVioletLight,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  badgeFilaSky: {
    backgroundColor: theme.colors.accentSkyMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeFilaTextSky: {
    color: theme.colors.accentSky,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  badgeFilaMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeFilaTextMuted: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    fontWeight: theme.fontWeights.semiBold,
  },

  // DEUDAS SECTION
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  debtName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.semiBold,
  },
  debtMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 2,
  },
  debtAmount: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: theme.spacing.sm,
  },

  // FONDO PRIMAS SEMESTRALES
  primaFondoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaFondoLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginBottom: 2,
  },
  primaFondoAmount: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.heavy,
  },
  injectPrimaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentMint,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  injectPrimaBtnText: {
    color: '#06181D',
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },
  primaProgressSection: {
    marginTop: theme.spacing.xs,
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
  },
  primaProgressValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: theme.radius.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.radius.xs,
  },
  primaCoverageHint: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    marginTop: 6,
  },

  // LISTA INTERACTIVA DE COMPROMISOS ANUALES
  annualRowInteractive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  annualItemPaid: {
    textDecorationLine: 'line-through',
    color: theme.colors.textTertiary,
  },
  statusBadgeCesantiasSmall: {
    backgroundColor: theme.colors.accentVioletMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statusBadgeTextCesantiasSmall: {
    color: theme.colors.accentVioletLight,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
  },
  statusBadgePaidSmall: {
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeTextPaidSmall: {
    color: theme.colors.accentMint,
    fontSize: 10,
    fontWeight: theme.fontWeights.semiBold,
  },
  statusBadgePendingSmall: {
    backgroundColor: theme.colors.accentGoldMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeTextPendingSmall: {
    color: theme.colors.accentGold,
    fontSize: 10,
    fontWeight: theme.fontWeights.semiBold,
  },
  annualToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
  },
  annualBadgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  annualBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  annualBadgeTextPaid: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  annualBadgeTextPending: {
    color: theme.colors.accentGold,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },
  emptyListText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
  },

  // NOTA INFORMATIVA
  infoNoteOuter: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: theme.radius.lg,
    padding: 4,
    marginTop: theme.spacing.sm,
  },
  infoNoteInner: {
    backgroundColor: 'rgba(6, 24, 29, 0.7)',
    borderRadius: 14,
    padding: theme.spacing.md,
  },
  infoNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoNoteTitle: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
  },
  infoNoteText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    lineHeight: 18,
  },
});

export default BolsillosScreen;
