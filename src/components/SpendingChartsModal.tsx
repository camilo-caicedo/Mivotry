import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import {
  X,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Calendar,
  Wallet,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Flame,
} from 'lucide-react-native';

import { DashboardResponse, GastoItem } from '../services/api';
import { formatCOP, getBudgetColor } from './BudgetProgressBar';
import { getCategoryVisuals } from './CategoryProgressCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SpendingChartsModalProps {
  visible: boolean;
  onClose: () => void;
  dashboardData: DashboardResponse | null;
}

type ViewMode = 'nomina' | 'bonos' | 'consolidado';
type DonutMetric = 'consumo' | 'presupuesto';

interface ProcessedCategory {
  id: string;
  nombre: string;
  presupuesto: number;
  disponible: number;
  gastado: number;
  porcentajeGastado: number; // gastado / presupuesto
  porcentajeDelTotal: number; // valor / total (para donut)
  color: string;
  emoji: string;
  cuenta: 'nomina' | 'bonos';
}

const PALETTE = [
  '#10B981', // Mint
  '#38BDF8', // Sky Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#A855F7', // Violet
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

/**
 * Calcula el path de un segmento de donut SVG
 */
function createDonutArc(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
): string {
  const angleDiff = endAngle - startAngle;
  // Si el ángulo es prácticamente una vuelta completa, dejamos un micro espacio para que el arco SVG no colapse
  const effectiveEnd =
    angleDiff >= 2 * Math.PI ? startAngle + 2 * Math.PI - 0.0001 : endAngle;

  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(effectiveEnd);
  const y2 = cy + rOuter * Math.sin(effectiveEnd);

  const x3 = cx + rInner * Math.cos(effectiveEnd);
  const y3 = cy + rInner * Math.sin(effectiveEnd);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);

  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
}

export const SpendingChartsModal: React.FC<SpendingChartsModalProps> = ({
  visible,
  onClose,
  dashboardData,
}) => {
  // Estado de vista
  const [selectedView, setSelectedView] = useState<ViewMode>('nomina');
  const [donutMetric, setDonutMetric] = useState<DonutMetric>('consumo');
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);

  // Procesamiento de datos según la vista seleccionada
  const { categories, totalPresupuesto, totalGastado, totalDisponible, topGasto } =
    useMemo(() => {
      const rawCategories: Array<{ item: GastoItem; cuenta: 'nomina' | 'bonos' }> = [];

      if (selectedView === 'nomina' || selectedView === 'consolidado') {
        (dashboardData?.nomina?.gastos || []).forEach((item) => {
          rawCategories.push({ item, cuenta: 'nomina' });
        });
      }

      if (selectedView === 'bonos' || selectedView === 'consolidado') {
        (dashboardData?.bonos?.gastos || []).forEach((item) => {
          rawCategories.push({ item, cuenta: 'bonos' });
        });
      }

      let sumPresupuesto = 0;
      let sumGastado = 0;
      let sumDisponible = 0;

      const processed: ProcessedCategory[] = rawCategories.map(
        ({ item, cuenta }, idx) => {
          const presupuesto = item.presupuestoTotal || 0;
          const disponible = item.manejoActual || 0;
          // Gastado = Presupuesto - Disponible (si sobregirado, gastado > presupuesto)
          const gastado =
            disponible < 0
              ? presupuesto + Math.abs(disponible)
              : Math.max(0, presupuesto - disponible);

          sumPresupuesto += presupuesto;
          sumGastado += gastado;
          sumDisponible += disponible;

          const visuals = getCategoryVisuals(item.nombre);
          const color = visuals.accentColor || PALETTE[idx % PALETTE.length];

          const pctGastado =
            presupuesto > 0
              ? Math.round((gastado / presupuesto) * 100)
              : gastado > 0
              ? 100
              : 0;

          return {
            id: `${cuenta}-${item.fila || idx}-${item.nombre}`,
            nombre: item.nombre,
            presupuesto,
            disponible,
            gastado,
            porcentajeGastado: pctGastado,
            porcentajeDelTotal: 0, // Se calcula abajo
            color,
            emoji: visuals.emoji || '🏷️',
            cuenta,
          };
        }
      );

      // Calcular % del total para el donut según la métrica activa
      const divisor = donutMetric === 'consumo' ? sumGastado : sumPresupuesto;
      processed.forEach((cat) => {
        const val = donutMetric === 'consumo' ? cat.gastado : cat.presupuesto;
        cat.porcentajeDelTotal = divisor > 0 ? (val / divisor) * 100 : 0;
      });

      // Top gasto (mayor monto gastado)
      const sortedByGastado = [...processed].sort((a, b) => b.gastado - a.gastado);
      const top = sortedByGastado.length > 0 && sortedByGastado[0].gastado > 0
        ? sortedByGastado[0]
        : null;

      return {
        categories: processed,
        totalPresupuesto: sumPresupuesto,
        totalGastado: sumGastado,
        totalDisponible: sumDisponible,
        topGasto: top,
      };
    }, [dashboardData, selectedView, donutMetric]);

  // Cálculos de Quincena actual y Ritmo de Gasto
  const quincenaMetrics = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    let quincenaNum: 15 | 30 = 15;
    let diasTranscurridos = day;
    let diasTotalesQuincena = 15;

    if (day > 15) {
      quincenaNum = 30;
      diasTranscurridos = day - 15;
      diasTotalesQuincena = lastDayOfMonth - 15;
    }

    const pctTiempoQuincena = Math.min(
      100,
      Math.max(1, Math.round((diasTranscurridos / diasTotalesQuincena) * 100))
    );

    const pctPresupuestoConsumido =
      totalPresupuesto > 0
        ? Math.round((totalGastado / totalPresupuesto) * 100)
        : 0;

    let ritmoStatus: 'optimo' | 'moderado' | 'acelerado' = 'optimo';
    let ritmoColor = '#10B981';
    let ritmoTexto = 'Ritmo óptimo';

    const diferencia = pctPresupuestoConsumido - pctTiempoQuincena;
    if (diferencia > 15) {
      ritmoStatus = 'acelerado';
      ritmoColor = '#EF4444';
      ritmoTexto = 'Ritmo acelerado';
    } else if (diferencia > 5) {
      ritmoStatus = 'moderado';
      ritmoColor = '#F59E0B';
      ritmoTexto = 'Gasto adelantado';
    } else {
      ritmoStatus = 'optimo';
      ritmoColor = '#10B981';
      ritmoTexto = 'Ritmo controlado';
    }

    return {
      quincenaNum,
      diasTranscurridos,
      diasTotalesQuincena,
      pctTiempoQuincena,
      pctPresupuestoConsumido,
      ritmoStatus,
      ritmoColor,
      ritmoTexto,
    };
  }, [totalPresupuesto, totalGastado]);

  // Categorías ordenadas para las barras comparativas (mayor gasto primero)
  const categoriesSortedByExpense = useMemo(() => {
    return [...categories].sort((a, b) => b.gastado - a.gastado);
  }, [categories]);

  // Donut slices geometry
  const chartDimension = Math.min(SCREEN_WIDTH - 64, 250);
  const center = chartDimension / 2;
  const normalOuterRadius = center - 12;
  const normalInnerRadius = normalOuterRadius - 32;

  const donutSlices = useMemo(() => {
    const totalVal =
      donutMetric === 'consumo' ? totalGastado : totalPresupuesto;

    if (totalVal <= 0 || categories.length === 0) {
      return [];
    }

    const activeItems = categories.filter((c) =>
      donutMetric === 'consumo' ? c.gastado > 0 : c.presupuesto > 0
    );

    if (activeItems.length === 0) return [];

    let currentAngle = -Math.PI / 2;
    const slices: Array<{
      category: ProcessedCategory;
      path: string;
      value: number;
      percentage: number;
      color: string;
      isSelected: boolean;
    }> = [];

    // Si solo hay un rubro activo, generamos 2 semicírculos para evitar el colapso de arco SVG
    if (activeItems.length === 1) {
      const item = activeItems[0];
      const isSel = selectedSliceId === item.id;
      const rOut = isSel ? normalOuterRadius + 6 : normalOuterRadius;
      const rIn = isSel ? normalInnerRadius - 2 : normalInnerRadius;

      const path1 = createDonutArc(center, center, rIn, rOut, -Math.PI / 2, Math.PI / 2);
      const path2 = createDonutArc(center, center, rIn, rOut, Math.PI / 2, (3 * Math.PI) / 2);

      slices.push({
        category: item,
        path: `${path1} ${path2}`,
        value: donutMetric === 'consumo' ? item.gastado : item.presupuesto,
        percentage: 100,
        color: item.color,
        isSelected: isSel,
      });
      return slices;
    }

    const gap = 0.035; // Espacio visual moderno entre slices

    activeItems.forEach((cat) => {
      const val = donutMetric === 'consumo' ? cat.gastado : cat.presupuesto;
      const sliceAngle = (val / totalVal) * (2 * Math.PI);
      const isSel = selectedSliceId === cat.id;

      const rOut = isSel ? normalOuterRadius + 6 : normalOuterRadius;
      const rIn = isSel ? normalInnerRadius - 2 : normalInnerRadius;

      const start = currentAngle + gap / 2;
      const end = currentAngle + sliceAngle - gap / 2;

      if (end > start) {
        const path = createDonutArc(center, center, rIn, rOut, start, end);
        slices.push({
          category: cat,
          path,
          value: val,
          percentage: (val / totalVal) * 100,
          color: cat.color,
          isSelected: isSel,
        });
      }

      currentAngle += sliceAngle;
    });

    return slices;
  }, [
    categories,
    donutMetric,
    totalGastado,
    totalPresupuesto,
    selectedSliceId,
    center,
    normalOuterRadius,
    normalInnerRadius,
  ]);

  // Rubro actualmente seleccionado en el Donut
  const activeSelectedCategory = useMemo(() => {
    if (!selectedSliceId) return null;
    return categories.find((c) => c.id === selectedSliceId) || null;
  }, [selectedSliceId, categories]);

  const handleToggleSlice = (id: string) => {
    setSelectedSliceId((prev) => (prev === id ? null : id));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#06181D" />

        {/* CABECERA SUPERIOR */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIconBox}>
              <PieChartIcon size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Análisis de Consumo</Text>
              <Text style={styles.headerSubtitle}>
                Estadísticas y ejecución presupuestal
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* SELECTOR DE VISTA (Nómina / Bonos / Consolidado) */}
        <View style={styles.viewSelectorWrapper}>
          <View style={styles.viewSelectorContainer}>
            <TouchableOpacity
              style={[
                styles.viewTab,
                selectedView === 'nomina' && styles.viewTabActive,
              ]}
              onPress={() => {
                setSelectedView('nomina');
                setSelectedSliceId(null);
              }}
            >
              <Text
                style={[
                  styles.viewTabText,
                  selectedView === 'nomina' && styles.viewTabTextActive,
                ]}
              >
                Nómina
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewTab,
                selectedView === 'bonos' && styles.viewTabActive,
              ]}
              onPress={() => {
                setSelectedView('bonos');
                setSelectedSliceId(null);
              }}
            >
              <Text
                style={[
                  styles.viewTabText,
                  selectedView === 'bonos' && styles.viewTabTextActive,
                ]}
              >
                Bonos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewTab,
                selectedView === 'consolidado' && styles.viewTabActive,
              ]}
              onPress={() => {
                setSelectedView('consolidado');
                setSelectedSliceId(null);
              }}
            >
              <Text
                style={[
                  styles.viewTabText,
                  selectedView === 'consolidado' && styles.viewTabTextActive,
                ]}
              >
                Consolidado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENIDO PRINCIPAL */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* TARJETAS DE MÉTRICAS CLAVE (KPIs) */}
          <View style={styles.kpiGrid}>
            {/* KPI 1: Consumo Total */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View
                  style={[
                    styles.kpiIconWrapper,
                    { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                  ]}
                >
                  <TrendingUp size={16} color="#F59E0B" />
                </View>
                <Text style={styles.kpiLabel}>Consumo Total</Text>
              </View>
              <Text style={styles.kpiValueMain}>
                {formatCOP(totalGastado)}
              </Text>
              <Text style={styles.kpiSubtext}>
                de {formatCOP(totalPresupuesto)} presupuestado
              </Text>
            </View>

            {/* KPI 2: Ritmo de Quincena (% vs Días) */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View
                  style={[
                    styles.kpiIconWrapper,
                    { backgroundColor: `${quincenaMetrics.ritmoColor}20` },
                  ]}
                >
                  <Calendar size={16} color={quincenaMetrics.ritmoColor} />
                </View>
                <Text style={styles.kpiLabel}>Ritmo Quincenal</Text>
              </View>
              <View style={styles.kpiCompareRow}>
                <Text
                  style={[
                    styles.kpiValueMain,
                    { color: quincenaMetrics.ritmoColor },
                  ]}
                >
                  {quincenaMetrics.pctPresupuestoConsumido}%
                </Text>
                <Text style={styles.kpiVsText}>
                  vs {quincenaMetrics.pctTiempoQuincena}% tiempo
                </Text>
              </View>
              <View style={styles.ritmoBadgeRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: quincenaMetrics.ritmoColor },
                  ]}
                />
                <Text
                  style={[
                    styles.ritmoBadgeText,
                    { color: quincenaMetrics.ritmoColor },
                  ]}
                >
                  {quincenaMetrics.ritmoTexto} (Día {quincenaMetrics.diasTranscurridos}/{quincenaMetrics.diasTotalesQuincena})
                </Text>
              </View>
            </View>

            {/* KPI 3: Top Gasto */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View
                  style={[
                    styles.kpiIconWrapper,
                    { backgroundColor: 'rgba(236, 72, 153, 0.15)' },
                  ]}
                >
                  <Flame size={16} color="#EC4899" />
                </View>
                <Text style={styles.kpiLabel}>Mayor Gasto</Text>
              </View>
              {topGasto ? (
                <>
                  <Text style={styles.kpiValueMain} numberOfLines={1}>
                    {topGasto.emoji} {topGasto.nombre}
                  </Text>
                  <Text style={styles.kpiSubtext}>
                    {formatCOP(topGasto.gastado)} (
                    {topGasto.porcentajeDelTotal.toFixed(0)}% del consumo)
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.kpiValueMain}>Sin registros</Text>
                  <Text style={styles.kpiSubtext}>Presupuesto al 100%</Text>
                </>
              )}
            </View>

            {/* KPI 4: Saldo Libre Restante */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View
                  style={[
                    styles.kpiIconWrapper,
                    {
                      backgroundColor:
                        totalDisponible < 0
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                    },
                  ]}
                >
                  <Wallet
                    size={16}
                    color={totalDisponible < 0 ? '#EF4444' : '#10B981'}
                  />
                </View>
                <Text style={styles.kpiLabel}>Saldo Libre</Text>
              </View>
              <Text
                style={[
                  styles.kpiValueMain,
                  {
                    color: totalDisponible < 0 ? '#EF4444' : '#10B981',
                  },
                ]}
              >
                {formatCOP(totalDisponible)}
              </Text>
              <Text style={styles.kpiSubtext}>
                {totalPresupuesto > 0
                  ? `${Math.max(
                      0,
                      Math.round((totalDisponible / totalPresupuesto) * 100)
                    )}% remanente disponible`
                  : 'en cuentas activas'}
              </Text>
            </View>
          </View>

          {/* SECCIÓN 2: GRÁFICO DONUT / TORTA SVG */}
          <View style={styles.chartSectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleBlock}>
                <Text style={styles.sectionTitle}>Distribución Porcentual</Text>
                <Text style={styles.sectionSubtitle}>
                  Toca una porción para inspeccionar el rubro
                </Text>
              </View>

              {/* Selector de Métrica Donut: Consumo vs Presupuesto */}
              <View style={styles.donutMetricSelector}>
                <TouchableOpacity
                  style={[
                    styles.donutMetricTab,
                    donutMetric === 'consumo' && styles.donutMetricTabActive,
                  ]}
                  onPress={() => {
                    setDonutMetric('consumo');
                    setSelectedSliceId(null);
                  }}
                >
                  <Text
                    style={[
                      styles.donutMetricText,
                      donutMetric === 'consumo' && styles.donutMetricTextActive,
                    ]}
                  >
                    Consumo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.donutMetricTab,
                    donutMetric === 'presupuesto' && styles.donutMetricTabActive,
                  ]}
                  onPress={() => {
                    setDonutMetric('presupuesto');
                    setSelectedSliceId(null);
                  }}
                >
                  <Text
                    style={[
                      styles.donutMetricText,
                      donutMetric === 'presupuesto' &&
                        styles.donutMetricTextActive,
                    ]}
                  >
                    Presupuesto
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SVG DONUT */}
            <View style={styles.donutWrapper}>
              {donutSlices.length > 0 ? (
                <View
                  style={{
                    width: chartDimension,
                    height: chartDimension,
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Svg width={chartDimension} height={chartDimension}>
                    <G>
                      {donutSlices.map((slice) => (
                        <Path
                          key={slice.category.id}
                          d={slice.path}
                          fill={slice.color}
                          opacity={
                            selectedSliceId === null || slice.isSelected
                              ? 1
                              : 0.35
                          }
                          onPress={() => handleToggleSlice(slice.category.id)}
                        />
                      ))}
                    </G>
                  </Svg>

                  {/* CENTRO DEL DONUT (CALLOUT DINÁMICO) */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedSliceId(null)}
                    style={[
                      styles.donutCenterContent,
                      {
                        width: normalInnerRadius * 2 - 8,
                        height: normalInnerRadius * 2 - 8,
                        borderRadius: normalInnerRadius,
                      },
                    ]}
                  >
                    {activeSelectedCategory ? (
                      <>
                        <Text style={styles.centerEmoji}>
                          {activeSelectedCategory.emoji}
                        </Text>
                        <Text
                          style={styles.centerCategoryName}
                          numberOfLines={1}
                        >
                          {activeSelectedCategory.nombre}
                        </Text>
                        <Text style={styles.centerAmount}>
                          {formatCOP(
                            donutMetric === 'consumo'
                              ? activeSelectedCategory.gastado
                              : activeSelectedCategory.presupuesto
                          )}
                        </Text>
                        <View style={styles.centerPctBadge}>
                          <Text style={styles.centerPctText}>
                            {activeSelectedCategory.porcentajeDelTotal.toFixed(
                              1
                            )}
                            %
                          </Text>
                        </View>
                        <Text style={styles.centerResetHint}>
                          Toca para resetear
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.centerTotalLabel}>
                          {donutMetric === 'consumo'
                            ? 'Total Gastado'
                            : 'Total Presupuesto'}
                        </Text>
                        <Text style={styles.centerTotalAmount}>
                          {formatCOP(
                            donutMetric === 'consumo'
                              ? totalGastado
                              : totalPresupuesto
                          )}
                        </Text>
                        <Text style={styles.centerHint}>
                          {categories.length} rubros
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyChartContainer}>
                  <PieChartIcon size={44} color="#0B2B33" />
                  <Text style={styles.emptyChartTitle}>
                    Sin consumos en esta vista
                  </Text>
                  <Text style={styles.emptyChartSubtitle}>
                    {donutMetric === 'consumo'
                      ? 'No se registran gastos activos para mostrar proporciones.'
                      : 'No hay presupuestos definidos.'}
                  </Text>
                </View>
              )}
            </View>

            {/* LEYENDA DEL DONUT INTERACTIVA */}
            <View style={styles.legendContainer}>
              {categories.map((cat) => {
                const val =
                  donutMetric === 'consumo' ? cat.gastado : cat.presupuesto;
                const isSelected = selectedSliceId === cat.id;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => handleToggleSlice(cat.id)}
                    style={[
                      styles.legendItem,
                      isSelected && styles.legendItemSelected,
                      { borderColor: isSelected ? cat.color : 'transparent' },
                    ]}
                  >
                    <View style={styles.legendLeft}>
                      <View
                        style={[
                          styles.legendColorDot,
                          { backgroundColor: cat.color },
                        ]}
                      />
                      <Text style={styles.legendEmoji}>{cat.emoji}</Text>
                      <View style={{ flexShrink: 1 }}>
                        <Text
                          style={[
                            styles.legendName,
                            isSelected && { color: '#F1F5F9' },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.nombre}
                        </Text>
                        {selectedView === 'consolidado' && (
                          <Text style={styles.legendAccountTag}>
                            {cat.cuenta === 'nomina' ? 'Nómina' : 'Bonos'}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.legendRight}>
                      <Text style={styles.legendAmount}>{formatCOP(val)}</Text>
                      <View
                        style={[
                          styles.legendPctBadge,
                          { backgroundColor: `${cat.color}25` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.legendPctText,
                            { color: cat.color },
                          ]}
                        >
                          {cat.porcentajeDelTotal.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECCIÓN 3: GRÁFICO DE BARRAS HORIZONTALES COMPARATIVAS */}
          <View style={styles.chartSectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleBlock}>
                <View style={styles.barSectionHeader}>
                  <BarChart3 size={18} color="#38BDF8" />
                  <Text style={styles.sectionTitle}>
                    Presupuesto vs Gastado / Disponible
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Ejecución relativa por categoría (ordenado por mayor consumo)
                </Text>
              </View>
            </View>

            <View style={styles.barsList}>
              {categoriesSortedByExpense.map((cat) => {
                const isOverspent = cat.disponible < 0;
                const statusColor = getBudgetColor(cat.disponible, cat.presupuesto);

                // Progreso visual: relativo al presupuesto base
                const maxReference = Math.max(cat.presupuesto, cat.gastado, 1);
                const gastadoPercent = Math.min(
                  100,
                  Math.round((cat.gastado / maxReference) * 100)
                );
                const disponiblePercent = Math.max(
                  0,
                  Math.round((cat.disponible / maxReference) * 100)
                );

                return (
                  <View key={cat.id} style={styles.barItemCard}>
                    {/* ENCABEZADO DE CATEGORÍA */}
                    <View style={styles.barItemHeader}>
                      <View style={styles.barCategoryTitleBox}>
                        <Text style={styles.barItemEmoji}>{cat.emoji}</Text>
                        <View style={{ flexShrink: 1 }}>
                          <Text style={styles.barCategoryName} numberOfLines={1}>
                            {cat.nombre}
                          </Text>
                          {selectedView === 'consolidado' && (
                            <Text style={styles.barAccountPill}>
                              {cat.cuenta === 'nomina' ? 'Nómina' : 'Bonos'}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* BADGE DE PORCENTAJE GASTADO */}
                      <View
                        style={[
                          styles.pctBadgePill,
                          {
                            backgroundColor: isOverspent
                              ? 'rgba(239, 68, 68, 0.15)'
                              : `${statusColor}18`,
                            borderColor: isOverspent
                              ? 'rgba(239, 68, 68, 0.4)'
                              : `${statusColor}40`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pctBadgeText,
                            {
                              color: isOverspent ? '#EF4444' : statusColor,
                            },
                          ]}
                        >
                          {cat.porcentajeGastado}% gastado
                        </Text>
                      </View>
                    </View>

                    {/* BARRA DE PROGRESO HORIZONTAL COMPARATIVA */}
                    <View style={styles.barTrackContainer}>
                      {/* Fondo de la barra */}
                      <View style={styles.barTrack}>
                        {/* Porción Gastada */}
                        <View
                          style={[
                            styles.barFillGastado,
                            {
                              width: `${gastadoPercent}%`,
                              backgroundColor: isOverspent
                                ? '#EF4444'
                                : cat.color,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* DETALLE FINANCIERO INFERIOR (3 VALORES) */}
                    <View style={styles.barMetricsRow}>
                      <View style={styles.barMetricCol}>
                        <Text style={styles.barMetricLabel}>Gastado</Text>
                        <Text
                          style={[
                            styles.barMetricValue,
                            { color: isOverspent ? '#EF4444' : '#F1F5F9' },
                          ]}
                        >
                          {formatCOP(cat.gastado)}
                        </Text>
                      </View>

                      <View style={[styles.barMetricCol, { alignItems: 'center' }]}>
                        <Text style={styles.barMetricLabel}>Presupuesto</Text>
                        <Text style={styles.barMetricValue}>
                          {formatCOP(cat.presupuesto)}
                        </Text>
                      </View>

                      <View style={[styles.barMetricCol, { alignItems: 'flex-end' }]}>
                        <Text style={styles.barMetricLabel}>
                          {isOverspent ? 'Sobregiro' : 'Disponible'}
                        </Text>
                        <Text
                          style={[
                            styles.barMetricValue,
                            {
                              color: isOverspent ? '#EF4444' : '#10B981',
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {formatCOP(cat.disponible)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ESPACIADOR INFERIOR */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06181D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewSelectorWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#06181D',
  },
  viewSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B2B33',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  viewTabActive: {
    backgroundColor: '#0F3741',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  viewTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  viewTabTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  /* GRID DE KPIS */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    backgroundColor: '#0B2B33',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kpiIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  kpiValueMain: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  kpiSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  kpiCompareRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  kpiVsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  ritmoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ritmoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  /* SECCIÓN DE GRÁFICO (DONUT) */
  chartSectionCard: {
    backgroundColor: '#0B2B33',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  barSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  donutMetricSelector: {
    flexDirection: 'row',
    backgroundColor: '#06181D',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  donutMetricTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  donutMetricTabActive: {
    backgroundColor: '#10B981',
  },
  donutMetricText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  donutMetricTextActive: {
    color: '#06181D',
    fontWeight: '700',
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  donutCenterContent: {
    position: 'absolute',
    backgroundColor: '#06181D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  centerEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  centerCategoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    maxWidth: '90%',
  },
  centerAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  centerPctBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  centerPctText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  centerResetHint: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 3,
  },
  centerTotalLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  centerTotalAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F1F5F9',
    marginVertical: 2,
  },
  centerHint: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyChartContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 10,
  },
  emptyChartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 220,
  },
  /* LEYENDA */
  legendContainer: {
    marginTop: 8,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F3741',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  legendItemSelected: {
    backgroundColor: 'rgba(15, 55, 65, 0.95)',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendEmoji: {
    fontSize: 14,
  },
  legendName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  legendAccountTag: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  legendPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  legendPctText: {
    fontSize: 10,
    fontWeight: '700',
  },
  /* SECCIÓN BARRAS COMPARATIVAS */
  barsList: {
    marginTop: 10,
    gap: 12,
  },
  barItemCard: {
    backgroundColor: '#0F3741',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  barItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barCategoryTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  barItemEmoji: {
    fontSize: 16,
  },
  barCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  barAccountPill: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },
  pctBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pctBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barTrackContainer: {
    marginBottom: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barFillGastado: {
    height: '100%',
    borderRadius: 4,
  },
  barMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  barMetricCol: {
    flex: 1,
  },
  barMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 1,
  },
  barMetricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
});

export default SpendingChartsModal;
