import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Utensils,
  X,
  RefreshCw,
  Clock,
  TrendingDown,
  Award,
  Calendar,
  Coffee,
  Plus,
  AlertCircle,
  MessageSquare,
  Smartphone,
  Edit3,
  ChevronRight,
  Wallet,
} from 'lucide-react-native';

import { MivotryAPI, LogItem } from '../services/api';
import { formatCOP, getBudgetColor } from './BudgetProgressBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SalidasDetailModalProps {
  visible: boolean;
  onClose: () => void;
  salidasDisponible?: number;
  salidasPresupuesto?: number;
  onAddExpense?: () => void;
}

export type PeriodFilter = 'quincena' | 'mes' | '3meses' | 'todos';

interface PeriodOption {
  id: PeriodFilter;
  label: string;
  days: number | null;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'quincena', label: 'Quincena', days: 15 },
  { id: 'mes', label: 'Mes (30d)', days: 30 },
  { id: '3meses', label: '3 Meses', days: 90 },
  { id: 'todos', label: 'Historial Completo', days: null },
];

const MESES_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const CONCEPT_COLORS = ['#F59E0B', '#10B981', '#38BDF8', '#A855F7'];

/**
 * Normaliza y extrae las horas y minutos desde cadenas como "9:13 PM", "21:13" o "09:13:00"
 */
function parseTimeString(hora?: string): { hours: number; minutes: number } {
  if (!hora) return { hours: 12, minutes: 0 };
  const match = hora.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return { hours: 12, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[4]?.toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Parsea la fecha y hora de un LogItem admitiendo formatos ISO, YYYY-MM-DD y DD/MM/YYYY
 */
export function parseLogDate(item: LogItem): Date | null {
  if (item.timestamp) {
    const d = new Date(item.timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.fecha) {
    const cleanFecha = item.fecha.trim();

    // Formato YYYY-MM-DD o YYYY/MM/DD
    const isoMatch = cleanFecha.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const { hours, minutes } = parseTimeString(item.hora);
      const d = new Date(year, month, day, hours, minutes);
      if (!isNaN(d.getTime())) return d;
    }

    // Formato DD-MM-YYYY o DD/MM/YYYY
    const dmyMatch = cleanFecha.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const { hours, minutes } = parseTimeString(item.hora);
      const d = new Date(year, month, day, hours, minutes);
      if (!isNaN(d.getTime())) return d;
    }

    const fallback = new Date(cleanFecha);
    if (!isNaN(fallback.getTime())) return fallback;
  }
  return null;
}

/**
 * Formatea una fecha y hora legible (ej. "18 Sep, 9:13 PM")
 */
export function formatReadableDate(item: LogItem): string {
  const d = parseLogDate(item);
  if (d) {
    const dia = d.getDate();
    const mes = MESES_ES[d.getMonth()];
    let horas = d.getHours();
    const minutos = d.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12 || 12;
    return `${dia} ${mes}, ${horas}:${minutos} ${ampm}`;
  }
  if (item.fecha) {
    return item.hora ? `${item.fecha}, ${item.hora}` : item.fecha;
  }
  return 'Fecha desconocida';
}

/**
 * Agrupa y normaliza conceptos similares o nombres de comercios
 */
export function normalizeConcept(concepto?: string): string {
  if (!concepto || !concepto.trim()) return 'Varios / Otros';
  const raw = concepto.trim();
  const lower = raw.toLowerCase();

  if (lower.includes('starbucks')) return 'Starbucks';
  if (lower.includes('crepes') || lower.includes('waffles')) return 'Crepes & Waffles';
  if (lower.includes('juan valdez')) return 'Juan Valdez';
  if (lower.includes('corral')) return 'El Corral';
  if (lower.includes('mcdonald') || lower.includes('mc donald')) return "McDonald's";
  if (lower.includes('frisby')) return 'Frisby';
  if (lower.includes('kfc')) return 'KFC';
  if (lower.includes('subway')) return 'Subway';
  if (lower.includes('cine') || lower.includes('cinemark') || lower.includes('procinal')) return 'Cine';
  if (lower.includes('rappi')) return 'Rappi';
  if (lower.includes('uber eats')) return 'Uber Eats';
  if (lower.includes('didi food')) return 'Didi Food';
  if (lower.includes('popsy') || lower.includes('mimos') || lower.includes('helad')) return 'Heladerías';
  if (
    lower.includes('cervez') ||
    lower.includes('bar') ||
    lower.includes('pub') ||
    lower.includes('licor') ||
    lower.includes('discoteca')
  ) {
    return 'Bares & Pubs';
  }
  if (lower.includes('cafe') || lower.includes('café') || lower.includes('panader')) {
    return 'Cafés & Panadería';
  }
  if (lower.includes('pizza') || lower.includes('dominos') || lower.includes('papa john')) {
    return 'Pizzerías';
  }
  if (lower.includes('hamburgues') || lower.includes('burger')) return 'Hamburguesas';
  if (lower.includes('sushi') || lower.includes('wok') || lower.includes('asian')) {
    return 'Sushi & Asiática';
  }
  if (lower.includes('almuerzo') || lower.includes('cena') || lower.includes('restaurante')) {
    return 'Restaurantes';
  }
  if (
    lower.includes('ocio') ||
    lower.includes('juego') ||
    lower.includes('parque') ||
    lower.includes('bolera')
  ) {
    return 'Ocio & Entretenimiento';
  }

  // Limpieza de prefijos bancarios o sufijos geográficos comunes
  let clean = raw
    .replace(/^(compra\s+(nacional\s+|internacional\s+)?(aprobada\s+)?)/i, '')
    .replace(/\s+(cc|c\.c\.|cali|bogota|medellin|co|col)\b/gi, '')
    .replace(/[*#\d]+$/, '')
    .trim();

  if (!clean) clean = raw;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

interface ConceptAggregation {
  concepto: string;
  total: number;
  count: number;
  percentage: number;
}

export const SalidasDetailModal: React.FC<SalidasDetailModalProps> = ({
  visible,
  onClose,
  salidasDisponible,
  salidasPresupuesto,
  onAddExpense,
}) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('mes');

  // Carga de historial de transacciones (límite 150)
  const fetchSalidasLogs = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await MivotryAPI.getHistorialLogs(150);
      if (res && res.success) {
        // Filtrar transacciones pertenecientes a salidas
        const salidasOnly = (res.logs || []).filter(
          (item) => item.categoria && item.categoria.toLowerCase().includes('salida')
        );
        setLogs(salidasOnly);
      } else {
        setError('No se pudo cargar el historial de salidas.');
      }
    } catch (err: any) {
      console.error('Error al cargar historial de salidas:', err);
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchSalidasLogs();
      setSelectedPeriod('mes');
    }
  }, [visible, fetchSalidasLogs]);

  // Filtrado por periodo de tiempo
  const filteredLogs = useMemo(() => {
    if (selectedPeriod === 'todos') {
      return logs;
    }

    const targetOption = PERIOD_OPTIONS.find((o) => o.id === selectedPeriod);
    if (!targetOption || !targetOption.days) {
      return logs;
    }

    const now = new Date();
    const maxDiffMs = targetOption.days * 24 * 60 * 60 * 1000;

    return logs.filter((item) => {
      const itemDate = parseLogDate(item);
      if (!itemDate) return true; // Si no tiene fecha parseable, no descartar
      const diffMs = now.getTime() - itemDate.getTime();
      // Permitir hasta 2 días en el futuro por variaciones de zona horaria del servidor
      return diffMs >= -172800000 && diffMs <= maxDiffMs;
    });
  }, [logs, selectedPeriod]);

  // Lista ordenada cronológicamente (más recientes primero)
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const dateA = parseLogDate(a);
      const dateB = parseLogDate(b);
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });
  }, [filteredLogs]);

  // Métricas del periodo seleccionado
  const { totalGastado, promedioPorSalida, totalTransacciones, topCommerce, topConcepts } =
    useMemo(() => {
      let sum = 0;
      const conceptMap: Record<string, { total: number; count: number }> = {};

      filteredLogs.forEach((item) => {
        const monto = Math.abs(item.monto || 0);
        sum += monto;

        const normalized = normalizeConcept(item.concepto || item.categoria);
        if (!conceptMap[normalized]) {
          conceptMap[normalized] = { total: 0, count: 0 };
        }
        conceptMap[normalized].total += monto;
        conceptMap[normalized].count += 1;
      });

      const count = filteredLogs.length;
      const avg = count > 0 ? sum / count : 0;

      // Desglose de conceptos ordenados de mayor a menor
      const aggregatedList: ConceptAggregation[] = Object.entries(conceptMap)
        .map(([concepto, data]) => ({
          concepto,
          total: data.total,
          count: data.count,
          percentage: sum > 0 ? Math.round((data.total / sum) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      const top = aggregatedList.length > 0 ? aggregatedList[0] : null;
      const top4 = aggregatedList.slice(0, 4);

      return {
        totalGastado: sum,
        promedioPorSalida: avg,
        totalTransacciones: count,
        topCommerce: top,
        topConcepts: top4,
      };
    }, [filteredLogs]);

  // Conteo de transacciones por píldora de periodo
  const periodCounts = useMemo(() => {
    const counts: Record<PeriodFilter, number> = {
      quincena: 0,
      mes: 0,
      '3meses': 0,
      todos: logs.length,
    };

    const now = new Date();
    const day15Ms = 15 * 24 * 60 * 60 * 1000;
    const day30Ms = 30 * 24 * 60 * 60 * 1000;
    const day90Ms = 90 * 24 * 60 * 60 * 1000;

    logs.forEach((item) => {
      const d = parseLogDate(item);
      if (!d) {
        counts.quincena++;
        counts.mes++;
        counts['3meses']++;
        return;
      }
      const diff = now.getTime() - d.getTime();
      if (diff >= -172800000 && diff <= day15Ms) counts.quincena++;
      if (diff >= -172800000 && diff <= day30Ms) counts.mes++;
      if (diff >= -172800000 && diff <= day90Ms) counts['3meses']++;
    });

    return counts;
  }, [logs]);

  // Insignia de origen
  const renderOriginBadge = (origen: string) => {
    const o = (origen || '').toLowerCase();
    let label = 'Manual';
    let color = '#38BDF8';
    let bg = 'rgba(56, 189, 248, 0.15)';
    let IconComponent = Edit3;

    if (o.includes('sms') || o.includes('notificacion') || o.includes('banco') || o.includes('tc')) {
      label = 'SMS';
      color = '#10B981';
      bg = 'rgba(16, 185, 129, 0.15)';
      IconComponent = Smartphone;
    } else if (o.includes('chat') || o.includes('asistente') || o.includes('ia')) {
      label = 'Chat';
      color = '#A855F7';
      bg = 'rgba(168, 85, 247, 0.15)';
      IconComponent = MessageSquare;
    }

    return (
      <View style={[styles.originBadge, { backgroundColor: bg, borderColor: color }]}>
        <IconComponent size={10} color={color} style={{ marginRight: 3 }} />
        <Text style={[styles.originBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const handleAddExpense = () => {
    onClose();
    if (onAddExpense) {
      onAddExpense();
    }
  };

  // Render de cada movimiento en la lista
  const renderItem = ({ item }: { item: LogItem }) => {
    const formattedDate = formatReadableDate(item);
    const displayMonto = item.monto > 0 ? `-${formatCOP(item.monto)}` : formatCOP(item.monto);

    return (
      <View style={styles.transactionCard}>
        {/* Encabezado del ítem: Fecha legible e insignia de origen */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.dateRow}>
            <Clock size={12} color="#64748B" style={{ marginRight: 5 }} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          {renderOriginBadge(item.origen)}
        </View>

        {/* Fila principal: Concepto y Monto */}
        <View style={styles.cardMainRow}>
          <View style={styles.conceptCol}>
            <Text style={styles.conceptTitle} numberOfLines={2}>
              {item.concepto || item.categoria || 'Gasto en salidas'}
            </Text>
            {item.categoria ? (
              <Text style={styles.categorySub} numberOfLines={1}>
                {item.categoria}
              </Text>
            ) : null}
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountText}>{displayMonto}</Text>
            <Text style={styles.balanceText}>
              Saldo: <Text style={styles.balanceValue}>{formatCOP(item.saldoRestante)}</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Cabecera de la lista con resumen analítico
  const renderListHeader = () => {
    const hasBudgetInfo =
      salidasDisponible !== undefined || salidasPresupuesto !== undefined;
    const disp = salidasDisponible ?? 0;
    const pres = salidasPresupuesto ?? 0;
    const budgetColor = getBudgetColor(disp, pres);
    const budgetPct = pres > 0 ? Math.max(0, Math.min(100, (disp / pres) * 100)) : 0;

    return (
      <View style={styles.headerContainer}>
        {/* Tarjeta de estado de presupuesto actual (si se proporciona) */}
        {hasBudgetInfo && (
          <View style={styles.budgetStatusCard}>
            <View style={styles.budgetStatusHeader}>
              <View style={styles.budgetBadge}>
                <Wallet size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.budgetBadgeText}>Fondo Salidas & Ocio</Text>
              </View>
              <Text style={[styles.budgetStatusPct, { color: budgetColor }]}>
                {Math.round(budgetPct)}% remanente
              </Text>
            </View>

            <View style={styles.budgetNumbersRow}>
              <View>
                <Text style={styles.budgetNumberLabel}>Disponible Actual</Text>
                <Text style={[styles.budgetNumberValue, { color: budgetColor }]}>
                  {formatCOP(disp)}
                </Text>
              </View>
              {pres > 0 && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.budgetNumberLabel}>Presupuesto Base</Text>
                  <Text style={styles.budgetNumberSubValue}>{formatCOP(pres)}</Text>
                </View>
              )}
            </View>

            {pres > 0 && (
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${budgetPct}%`, backgroundColor: budgetColor },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {/* Selector de periodo de tiempo */}
        <View style={styles.periodsSection}>
          <Text style={styles.sectionLabel}>PERIODO DE ANÁLISIS</Text>
          <View style={styles.periodsRow}>
            {PERIOD_OPTIONS.map((opt) => {
              const active = selectedPeriod === opt.id;
              const count = periodCounts[opt.id];
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.periodPill, active && styles.periodPillActive]}
                  onPress={() => setSelectedPeriod(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.periodBadge, active && styles.periodBadgeActive]}>
                    <Text
                      style={[
                        styles.periodBadgeText,
                        active && styles.periodBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Métricas resumen del periodo seleccionado */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <TrendingDown size={16} color="#F59E0B" />
            </View>
            <Text style={styles.metricLabel}>Total Gastado</Text>
            <Text style={styles.metricValue}>{formatCOP(totalGastado)}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Coffee size={16} color="#38BDF8" />
            </View>
            <Text style={styles.metricLabel}>Promedio / Salida</Text>
            <Text style={styles.metricValue}>{formatCOP(promedioPorSalida)}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Calendar size={16} color="#10B981" />
            </View>
            <Text style={styles.metricLabel}>Frecuencia</Text>
            <Text style={styles.metricValue}>
              {totalTransacciones} {totalTransacciones === 1 ? 'salida' : 'salidas'}
            </Text>
          </View>
        </View>

        {/* Analítica: En qué gastas más */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsSectionHeader}>
            <View style={styles.analyticsTitleRow}>
              <Award size={16} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={styles.analyticsSectionTitle}>¿En qué gastas más?</Text>
            </View>
            <Text style={styles.analyticsSectionSubtitle}>
              Comercios y conceptos principales
            </Text>
          </View>

          {topCommerce ? (
            <>
              {/* Tarjeta destacada del comercio principal */}
              <View style={styles.topCommerceCard}>
                <View style={styles.topCommerceHeader}>
                  <View style={styles.topCommerceCrownBox}>
                    <Text style={styles.topCommerceCrownEmoji}>👑</Text>
                    <Text style={styles.topCommerceTag}>TOP GASTO PRINCIPAL</Text>
                  </View>
                  <Text style={styles.topCommercePct}>{topCommerce.percentage}% del total</Text>
                </View>

                <View style={styles.topCommerceBody}>
                  <Text style={styles.topCommerceName}>{topCommerce.concepto}</Text>
                  <Text style={styles.topCommerceAmount}>{formatCOP(topCommerce.total)}</Text>
                </View>
                <Text style={styles.topCommerceCount}>
                  {topCommerce.count} transacci{topCommerce.count === 1 ? 'ón' : 'ones'} registrada
                  {topCommerce.count === 1 ? '' : 's'} en este periodo
                </Text>
              </View>

              {/* Barra / Desglose de los principales 4 conceptos */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Principales 4 Categorías de Salidas</Text>

                {topConcepts.map((item, index) => {
                  const color = CONCEPT_COLORS[index % CONCEPT_COLORS.length];
                  return (
                    <View key={item.concepto} style={styles.breakdownItem}>
                      <View style={styles.breakdownItemTopRow}>
                        <View style={styles.breakdownNameCol}>
                          <View style={[styles.conceptDot, { backgroundColor: color }]} />
                          <Text style={styles.breakdownItemName} numberOfLines={1}>
                            {item.concepto}
                          </Text>
                          <Text style={styles.breakdownCountBadge}>
                            {item.count} {item.count === 1 ? 'vez' : 'veces'}
                          </Text>
                        </View>
                        <View style={styles.breakdownAmountCol}>
                          <Text style={styles.breakdownItemAmount}>{formatCOP(item.total)}</Text>
                          <Text style={styles.breakdownItemPct}>{item.percentage}%</Text>
                        </View>
                      </View>

                      <View style={styles.breakdownBarTrack}>
                        <View
                          style={[
                            styles.breakdownBarFill,
                            {
                              width: `${Math.max(4, Math.min(100, item.percentage))}%`,
                              backgroundColor: color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyAnalyticsBox}>
              <Coffee size={28} color="#64748B" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyAnalyticsText}>
                Sin registros de salidas en este periodo
              </Text>
            </View>
          )}
        </View>

        {/* Título de la lista cronológica */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>Movimientos de Salidas</Text>
          <View style={styles.listSectionBadge}>
            <Text style={styles.listSectionBadgeText}>
              {sortedLogs.length} registro{sortedLogs.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render del estado vacío
  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Utensils size={32} color="#64748B" />
        </View>
        <Text style={styles.emptyTitle}>No hay salidas registradas</Text>
        <Text style={styles.emptySub}>
          No se encontraron movimientos en la categoría Salidas para el periodo seleccionado.
        </Text>
        {onAddExpense && (
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#06181D" style={{ marginRight: 6 }} />
            <Text style={styles.emptyActionBtnText}>Registrar Salida</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header Superior del Modal */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.headerIconBox}>
                <Utensils size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Detalle de Salidas & Ocio</Text>
                <Text style={styles.headerSubtitle}>
                  Análisis de consumo y desglose de gastos
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => fetchSalidasLogs(true)}
                disabled={loading || refreshing}
                activeOpacity={0.7}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <RefreshCw size={17} color="#94A3B8" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenido Principal con Scroll */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Cargando analítica de salidas...</Text>
            </View>
          ) : error && logs.length === 0 ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={36} color="#EF4444" style={{ marginBottom: 12 }} />
              <Text style={styles.errorTitle}>Error al cargar datos</Text>
              <Text style={styles.errorSub}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchSalidasLogs()}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color="#F1F5F9" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sortedLogs}
              keyExtractor={(item, index) => item.timestamp || `salida_${index}`}
              renderItem={renderItem}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={15}
            />
          )}

          {/* Botón Flotante Inferior de Acción Rápida */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.addExpenseBtn}
              onPress={handleAddExpense}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#06181D" style={{ marginRight: 8 }} />
              <Text style={styles.addExpenseBtnText}>Registrar Nueva Salida</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#06181D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    maxHeight: '94%',
    borderTopWidth: 1,
    borderColor: '#0F3741',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F3741',
    backgroundColor: '#0B2B33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
  },
  errorSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3741',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  retryBtnText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  budgetStatusCard: {
    backgroundColor: '#0B2B33',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#0F3741',
    marginBottom: 16,
  },
  budgetStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  budgetBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  budgetStatusPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  budgetNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  budgetNumberLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 2,
  },
  budgetNumberValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  budgetNumberSubValue: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  periodsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  periodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2B33',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0F3741',
    gap: 4,
  },
  periodPillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  periodPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  periodPillTextActive: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  periodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  periodBadgeActive: {
    backgroundColor: '#F59E0B',
  },
  periodBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  periodBadgeTextActive: {
    color: '#06181D',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0B2B33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0F3741',
    alignItems: 'center',
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'center',
  },
  metricValue: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  analyticsSection: {
    backgroundColor: '#0B2B33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0F3741',
    marginBottom: 20,
  },
  analyticsSectionHeader: {
    marginBottom: 14,
  },
  analyticsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsSectionTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
  },
  analyticsSectionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  topCommerceCard: {
    backgroundColor: '#06181D',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 14,
  },
  topCommerceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topCommerceCrownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topCommerceCrownEmoji: {
    fontSize: 14,
  },
  topCommerceTag: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topCommercePct: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  topCommerceBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topCommerceName: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  topCommerceAmount: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
  },
  topCommerceCount: {
    color: '#64748B',
    fontSize: 11,
  },
  breakdownCard: {
    backgroundColor: '#06181D',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0F3741',
  },
  breakdownTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownItem: {
    marginBottom: 12,
  },
  breakdownItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  breakdownNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  conceptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownItemName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '65%',
  },
  breakdownCountBadge: {
    color: '#64748B',
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  breakdownAmountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownItemAmount: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownItemPct: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  breakdownBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyAnalyticsBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyAnalyticsText: {
    color: '#64748B',
    fontSize: 12,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listSectionTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '800',
  },
  listSectionBadge: {
    backgroundColor: '#0F3741',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listSectionBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#0B2B33',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0F3741',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  originBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  originBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conceptCol: {
    flex: 1,
    marginRight: 12,
  },
  conceptTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  categorySub: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  balanceText: {
    color: '#64748B',
    fontSize: 11,
  },
  balanceValue: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0B2B33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0F3741',
  },
  emptyTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#06181D',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#0B2B33',
    borderTopWidth: 1,
    borderTopColor: '#0F3741',
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  addExpenseBtnText: {
    color: '#06181D',
    fontSize: 14,
    fontWeight: '800',
  },
});
