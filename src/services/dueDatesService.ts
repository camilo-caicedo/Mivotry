import { DashboardResponse, TarjetaCreditoItem, PagoAnualItem } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DueDateAlertItem {
  id: string;
  title: string;
  tipo: 'tarjeta' | 'pago_anual';
  diasRestantes: number;
  fechaTexto: string;
  urgencia: 'urgente' | 'proximo' | 'al_dia';
  monto?: number;
  estado?: string;
}

/**
 * Mapa de meses en español para normalización
 */
const MESES_MAP: { [key: string]: number } = {
  enero: 0, ene: 0,
  febrero: 1, feb: 1,
  marzo: 2, mar: 2,
  abril: 3, abr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5,
  julio: 6, jul: 6,
  agosto: 7, ago: 7,
  septiembre: 8, setiembre: 8, sep: 8, sept: 8,
  octubre: 9, oct: 9,
  noviembre: 10, nov: 10,
  diciembre: 11, dic: 11,
};

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtiene el día de corte para una tarjeta de crédito.
 * Reglas de negocio:
 * - Infinity: corte día 15
 * - Rappi: corte día 30
 * - Scotia: corte día 30
 * - Falabella: configurable en fechaPago / default 15
 */
export function getCardCutoffDay(cardName: string, fechaPagoStr?: string): number {
  const nameLower = (cardName || '').toLowerCase().trim();

  // Falabella: corte configurable / default 15
  if (nameLower.includes('falabella') || nameLower.includes('cmr')) {
    if (fechaPagoStr) {
      const parsed = parseInt(fechaPagoStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        return parsed;
      }
    }
    return 15;
  }

  // Rappi: corte día 30
  if (nameLower.includes('rappi')) {
    if (fechaPagoStr) {
      const parsed = parseInt(fechaPagoStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        return parsed;
      }
    }
    return 30;
  }

  // Scotia / Colpatria: corte día 30
  if (nameLower.includes('scotia') || nameLower.includes('colpatria')) {
    if (fechaPagoStr) {
      const parsed = parseInt(fechaPagoStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        return parsed;
      }
    }
    return 30;
  }

  // Infinity: corte día 15
  if (nameLower.includes('infinity')) {
    if (fechaPagoStr) {
      const parsed = parseInt(fechaPagoStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        return parsed;
      }
    }
    return 15;
  }

  // Cualquier otra tarjeta: intentar extraer día de fechaPago o default 15
  if (fechaPagoStr) {
    const parsed = parseInt(fechaPagoStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
      return parsed;
    }
  }

  return 15;
}

/**
 * Calcula los días restantes hasta el próximo día de corte desde una fecha base.
 */
export function getDaysUntilCutoff(
  cutoffDay: number,
  baseDate: Date = new Date()
): { diasRestantes: number; targetDate: Date } {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  const todayMidnight = new Date(year, month, day, 0, 0, 0, 0);

  // Corte en el mes actual
  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const targetDayThisMonth = Math.min(cutoffDay, lastDayThisMonth);
  const targetThisMonth = new Date(year, month, targetDayThisMonth, 0, 0, 0, 0);

  if (targetThisMonth.getTime() >= todayMidnight.getTime()) {
    const diffTime = targetThisMonth.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return { diasRestantes: diffDays, targetDate: targetThisMonth };
  }

  // Si ya pasó el corte en el mes actual, el próximo es el siguiente mes
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const targetDayNextMonth = Math.min(cutoffDay, lastDayNextMonth);
  const targetNextMonth = new Date(nextMonthYear, nextMonth, targetDayNextMonth, 0, 0, 0, 0);

  const diffTime = targetNextMonth.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return { diasRestantes: diffDays, targetDate: targetNextMonth };
}

/**
 * Determina el mes estimado de vencimiento para pagos anuales.
 * Reglas: SOAT (Noviembre), Tecno (Noviembre), etc.
 */
export function getEstimatedDueMonth(concepto: string, mesPagoStr?: string): { monthIndex: number; monthName: string } {
  const mesLower = (mesPagoStr || '').toLowerCase().trim();

  // 1. Buscar en mesPagoStr si contiene algún mes en español
  for (const [key, index] of Object.entries(MESES_MAP)) {
    if (mesLower.includes(key)) {
      return { monthIndex: index, monthName: NOMBRES_MESES[index] };
    }
  }

  // 2. Si no viene en mesPago, deducir por concepto
  const conceptoLower = (concepto || '').toLowerCase().trim();
  if (conceptoLower.includes('soat')) {
    return { monthIndex: 10, monthName: 'Noviembre' };
  }
  if (conceptoLower.includes('tecno') || conceptoLower.includes('mecánica') || conceptoLower.includes('mecanica')) {
    return { monthIndex: 10, monthName: 'Noviembre' };
  }
  if (conceptoLower.includes('impuesto') || conceptoLower.includes('vehicular')) {
    return { monthIndex: 3, monthName: 'Abril' };
  }
  if (conceptoLower.includes('seguro')) {
    return { monthIndex: 10, monthName: 'Noviembre' };
  }

  // Default Noviembre
  return { monthIndex: 10, monthName: 'Noviembre' };
}

/**
 * Calcula días restantes y fecha para un Pago Anual.
 */
export function getDaysUntilAnnualPayment(
  pago: PagoAnualItem,
  baseDate: Date = new Date()
): { diasRestantes: number; fechaTexto: string } {
  const esPagado = (pago.estado || '').trim().toLowerCase() === 'pagado';
  const { monthIndex, monthName } = getEstimatedDueMonth(pago.concepto, pago.mesPago);

  if (esPagado) {
    return {
      diasRestantes: 999,
      fechaTexto: `${monthName} • Pagado`
    };
  }

  const year = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth();
  const currentDay = baseDate.getDate();
  const todayMidnight = new Date(year, currentMonth, currentDay, 0, 0, 0, 0);

  // Verificar si mesPago contiene un día explícito (ej: "15 Noviembre", "Noviembre 30")
  let targetDay = 1;
  const dayMatch = (pago.mesPago || '').match(/\b([1-9]|[12][0-9]|3[01])\b/);
  if (dayMatch) {
    targetDay = parseInt(dayMatch[1], 10);
  }

  // Si el mes de pago ya pasó este año y sigue pendiente => vencido (días negativos)
  if (monthIndex < currentMonth) {
    const targetDate = new Date(year, monthIndex, targetDay, 0, 0, 0, 0);
    const diffDays = Math.round((targetDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return {
      diasRestantes: diffDays,
      fechaTexto: `${monthName} (Vencido hace ${Math.abs(diffDays)} días)`
    };
  }

  // Si es el mes actual
  if (monthIndex === currentMonth) {
    const targetDate = new Date(year, monthIndex, targetDay, 0, 0, 0, 0);
    const diffDays = Math.round((targetDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        diasRestantes: diffDays,
        fechaTexto: `${monthName} (Vence este mes • Pendiente)`
      };
    }
    if (diffDays === 0) {
      return {
        diasRestantes: 0,
        fechaTexto: `${monthName} (Vence hoy)`
      };
    }
    return {
      diasRestantes: diffDays,
      fechaTexto: `${monthName} (en ${diffDays} días)`
    };
  }

  // Mes futuro dentro del mismo año
  const targetDate = new Date(year, monthIndex, targetDay, 0, 0, 0, 0);
  const diffDays = Math.round((targetDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  return {
    diasRestantes: diffDays,
    fechaTexto: diffDays <= 30
      ? `${monthName} (en ${diffDays} días)`
      : `${monthName} (${Math.ceil(diffDays / 30)} meses)`
  };
}

/**
 * Analiza tarjetas de crédito y pagos anuales del DashboardResponse.
 * Retorna lista de DueDateAlertItem clasificados por urgencia:
 * - urgente: 0 to 5 days remaining or past due
 * - proximo: 6 to 12 days remaining
 * - al_dia: > 12 days or already paid
 */
export function getDueDatesSummary(dashboard: DashboardResponse | null | undefined): DueDateAlertItem[] {
  if (!dashboard) return [];

  const results: DueDateAlertItem[] = [];
  const now = new Date();

  // 1. ANÁLISIS DE TARJETAS DE CRÉDITO
  const tarjetasDetalle: TarjetaCreditoItem[] =
    dashboard.deudas?.tarjetasDetalle && dashboard.deudas.tarjetasDetalle.length > 0
      ? [...dashboard.deudas.tarjetasDetalle]
      : [
          { fila: 8, nombre: 'Infinity', saldo: 0, fechaPago: '15' },
          { fila: 9, nombre: 'Rappi', saldo: 0, fechaPago: '30' },
          { fila: 10, nombre: 'Scotia', saldo: 0, fechaPago: '30' },
          { fila: 11, nombre: 'Falabella', saldo: 0, fechaPago: '15' }
        ];

  // Si Falabella no está en la lista de tarjetas devuelta, asegurar su presencia con default 15
  if (!tarjetasDetalle.some(t => t.nombre.toLowerCase().includes('falabella'))) {
    tarjetasDetalle.push({ fila: 11, nombre: 'Falabella', saldo: 0, fechaPago: '15' });
  }

  for (const tc of tarjetasDetalle) {
    const corteDay = getCardCutoffDay(tc.nombre, tc.fechaPago);
    const { diasRestantes } = getDaysUntilCutoff(corteDay, now);

    let fechaTexto = '';
    if (diasRestantes === 0) {
      fechaTexto = `Corte hoy (Día ${corteDay})`;
    } else if (diasRestantes === 1) {
      fechaTexto = `Corte mañana (Día ${corteDay})`;
    } else {
      fechaTexto = `Corte día ${corteDay} (en ${diasRestantes} días)`;
    }

    let urgencia: 'urgente' | 'proximo' | 'al_dia' = 'al_dia';
    if (diasRestantes <= 5) {
      urgencia = 'urgente';
    } else if (diasRestantes >= 6 && diasRestantes <= 12) {
      urgencia = 'proximo';
    } else {
      urgencia = 'al_dia';
    }

    const estadoDesc =
      tc.saldo > 0
        ? `Saldo: $${Math.round(tc.saldo).toLocaleString('es-CO')}`
        : 'Sin deuda pendiente';

    results.push({
      id: `tc-${tc.fila || tc.nombre.toLowerCase()}`,
      title: tc.nombre,
      tipo: 'tarjeta',
      diasRestantes,
      fechaTexto,
      urgencia,
      monto: tc.saldo,
      estado: estadoDesc
    });
  }

  // 2. ANÁLISIS DE PAGOS ANUALES
  const pagosAnuales: PagoAnualItem[] = dashboard.pagosAnuales || [];
  for (const pago of pagosAnuales) {
    const { diasRestantes, fechaTexto } = getDaysUntilAnnualPayment(pago, now);
    const esPagado = (pago.estado || '').trim().toLowerCase() === 'pagado';

    let urgencia: 'urgente' | 'proximo' | 'al_dia' = 'al_dia';
    if (esPagado) {
      urgencia = 'al_dia';
    } else if (diasRestantes <= 5) {
      urgencia = 'urgente';
    } else if (diasRestantes >= 6 && diasRestantes <= 12) {
      urgencia = 'proximo';
    } else {
      urgencia = 'al_dia';
    }

    results.push({
      id: `anual-${pago.fila || pago.concepto.toLowerCase()}`,
      title: pago.concepto,
      tipo: 'pago_anual',
      diasRestantes,
      fechaTexto,
      urgencia,
      monto: pago.costoEstimado,
      estado: pago.estado || 'Pendiente'
    });
  }

  // Ordenar: urgentes primero (menor días restantes), luego próximos, luego al día
  const ordenUrgencia = { urgente: 0, proximo: 1, al_dia: 2 };
  return results.sort((a, b) => {
    if (ordenUrgencia[a.urgencia] !== ordenUrgencia[b.urgencia]) {
      return ordenUrgencia[a.urgencia] - ordenUrgencia[b.urgencia];
    }
    return a.diasRestantes - b.diasRestantes;
  });
}

/**
 * Helper para generar el texto del badge de cuenta regresiva
 * e.g. "Corte Infinity en 3 días", "SOAT pendiente"
 */
export function formatBadgeCountdown(item: DueDateAlertItem): string {
  if (item.tipo === 'tarjeta') {
    if (item.diasRestantes === 0) {
      return `Corte ${item.title} HOY`;
    }
    if (item.diasRestantes === 1) {
      return `Corte ${item.title} mañana`;
    }
    return `Corte ${item.title} en ${item.diasRestantes} días`;
  } else {
    if (item.estado?.toLowerCase() === 'pagado') {
      return `${item.title} pagado`;
    }
    if (item.diasRestantes <= 0) {
      return `${item.title} pendiente`;
    }
    if (item.diasRestantes <= 5) {
      return `${item.title} en ${item.diasRestantes} días`;
    }
    return `${item.title} pendiente`;
  }
}

export const SNOOZE_ALERTS_KEY = '@mivotry_snooze_alerts_until';

/**
 * Posponer la visualización de alertas urgentes por N días
 */
export async function snoozeAlerts(days: number): Promise<number> {
  const snoozeUntil = Date.now() + days * 24 * 60 * 60 * 1000;
  await AsyncStorage.setItem(SNOOZE_ALERTS_KEY, snoozeUntil.toString());
  return snoozeUntil;
}

/**
 * Obtener timestamp hasta el cual están silenciadas las alertas.
 * Si ya venció el tiempo, lo limpia y retorna null.
 */
export async function getSnoozedUntil(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(SNOOZE_ALERTS_KEY);
    if (!val) return null;
    const ts = parseInt(val, 10);
    if (isNaN(ts)) return null;
    if (Date.now() >= ts) {
      await AsyncStorage.removeItem(SNOOZE_ALERTS_KEY);
      return null;
    }
    return ts;
  } catch (err) {
    console.error('[DueDatesService] Error reading snooze:', err);
    return null;
  }
}

/**
 * Reactivar alertas inmediatamente
 */
export async function clearSnoozedAlerts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SNOOZE_ALERTS_KEY);
  } catch (err) {
    console.error('[DueDatesService] Error clearing snooze:', err);
  }
}

/**
 * Formatear fecha legible para el aviso de pospuesto
 */
export function formatSnoozeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const dia = date.getDate();
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mes = meses[date.getMonth()];
  return `${dia} de ${mes}`;
}
