import { CONFIG } from '../config';

export interface GastoItem {
  fila: number;
  nombre: string;
  presupuestoTotal: number;
  q15?: number;
  q30?: number;
  manejoActual: number;
}

export interface StreamingItem {
  nombre: string;
  valor: number;
  banco: string;
}

export interface PagoAnualItem {
  fila: number;
  concepto: string;
  costoEstimado: number;
  ahorrado: number;
  mesPago: string;
  estado: string;
}

export interface NotificacionPendienteItem {
  filaHoja: number;
  id: string;
  fechaHora: string;
  entidad: string;
  textoOriginal: string;
  monto: number;
  comercio: string;
  categoriaSugerida: string;
  cuentaSugerida: string;
  estado: 'Pendiente' | 'Aprobado' | 'Descartado';
}

export interface TarjetaCreditoItem {
  fila: number;
  nombre: string;
  saldo: number;
  fechaPago: string;
}

export interface LogItem {
  timestamp: string;
  fecha: string;
  hora: string;
  cuenta: string;
  categoria: string;
  concepto: string;
  monto: number;
  saldoRestante: number;
  origen: string;
}

export interface DashboardResponse {
  nomina: {
    quincenaBase: number;
    mensualBase: number;
    fondoOcasional: number;
    totalManejoF21?: number;
    gastos: GastoItem[];
  };
  bonos: {
    presupuestoTotal: number;
    gastos: GastoItem[];
  };
  deudas: {
    creditoApto: { nombre: string; saldo: number; fechaPago: string };
    creditoOccidente: { nombre: string; saldo: number; fechaPago: string };
    totalDeudaCreditos: number;
    totalDeudaTarjetas: number;
    tarjetasDetalle?: TarjetaCreditoItem[];
    cuentasPorCobrar: Array<{ fila: number; nombre: string; saldoPendiente: number }>;
    totalPorCobrar: number;
  };
  streaming: {
    lista: StreamingItem[];
    totalMensual: number;
  };
  bolsillos: {
    inversiones: number;
    pagosAnuales: number;
    totalCompleto: number;
    totalDeudas: number;
    totalAhorros: number;
    totalRendimientos: number;
    cuotasOccidente?: number;
    cuotaAdicionalOcc?: number;
    bolsillo?: number;
    items?: Array<{
      nombre: string;
      valor: number;
      tipo: 'deuda' | 'ahorro';
      fila: number;
    }>;
  };
  pagosAnuales: PagoAnualItem[];
  totalNotificacionesPendientes?: number;
}

export interface AgregarDineroPayload {
  cuenta: 'nomina' | 'bonos' | 'bolsillos';
  categoria: string;
  monto: number;
  concepto?: string;
}

export interface TransferirDineroPayload {
  cuentaOrigen: 'nomina' | 'bonos' | 'bolsillos';
  categoriaOrigen: string;
  cuentaDestino: 'nomina' | 'bonos' | 'bolsillos';
  categoriaDestino: string;
  monto: number;
  concepto?: string;
}

export const MivotryAPI = {
  /**
   * Obtiene todos los datos en vivo del Google Sheet
   */
  async getDashboard(): Promise<DashboardResponse> {
    const res = await fetch(CONFIG.API_URL);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al obtener dashboard');
    return json.data;
  },

  /**
   * Registra un gasto en Manejo (Nómina o Bonos)
   */
  async registrarGasto(params: {
    cuenta: 'nomina' | 'bonos';
    categoria: string;
    monto: number;
    concepto?: string;
    origen?: 'chat' | 'manual' | 'sms';
  }) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'registrarGasto', ...params })
    });
    return await res.json();
  },

  /**
   * Carga la quincena 15 o 30 (Rollover acumulativo)
   */
  async cargarQuincena(quincena: 15 | 30) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'cargarQuincena', quincena })
    });
    return await res.json();
  },

  /**
   * Recarga mensual de la tarjeta de bonos Peoplepass Paycash ($1.600.000)
   */
  async recargarBonos() {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'recargarBonos' })
    });
    return await res.json();
  },

  /**
   * Parsea un SMS de un banco colombiano
   */
  async parseSMS(texto: string) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'parseSMS', texto })
    });
    return await res.json();
  },

  /**
   * Actualiza el fondo ocasional / vacaciones (F20)
   */
  async actualizarFondoOcasional(monto: number) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'actualizarFondoOcasional', monto })
    });
    return await res.json();
  },

  /**
   * Inyecta o actualiza el ahorro para pagos anuales fondeado con primas (I29)
   */
  async actualizarAhorroPagosAnuales(params: { monto: number; modo?: 'sumar' | 'reemplazar'; concepto?: string }) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'actualizarAhorroPagosAnuales',
        monto: params.monto,
        modo: params.modo || 'sumar',
        concepto: params.concepto || 'Inyección desde Prima semestral'
      })
    });
    return await res.json();
  },

  /**
   * Actualiza el estado de un pago anual (ej. "Pagado" o "Pendiente" en columna O)
   */
  async actualizarEstadoPagoAnual(params: { fila: number; estado: 'Pagado' | 'Pendiente' }) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'actualizarEstadoPagoAnual',
        fila: params.fila,
        estado: params.estado
      })
    });
    return await res.json();
  },

  /**
   * Obtiene la lista de notificaciones y SMS bancarios pendientes por aprobar
   */
  async getNotificacionesPendientes(): Promise<{ success: boolean; total: number; pendientes: NotificacionPendienteItem[] }> {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getNotificacionesPendientes' })
    });
    return await res.json();
  },

  /**
   * Procesa una notificación individual (aprobar o descartar)
   */
  async procesarNotificacionPendiente(params: {
    id: string;
    accion: 'aprobar' | 'descartar';
    categoria?: string;
    cuenta?: 'nomina' | 'bonos' | 'tarjeta_credito';
    monto?: number;
    concepto?: string;
    tarjeta?: string;
    fila?: number;
    isTarjetaCredito?: boolean;
    tipoTransaccion?: string;
  }) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'procesarNotificacionPendiente',
        ...params
      })
    });
    return await res.json();
  },

  /**
   * Aprueba un lote de notificaciones en 1 solo paso
   */
  async aprobarLoteNotificaciones(ids: string[]) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'aprobarLoteNotificaciones',
        ids
      })
    });
    return await res.json();
  },

  /**
   * Encola múltiples notificaciones pegadas en bloque
   */
  async encolarNotificacionesMultiples(textos: string[]) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'encolarNotificacionesMultiples',
        textos
      })
    });
    return await res.json();
  },

  /**
   * Encola una notificación individual recibida de MacroDroid, Tasker o webhook
   */
  async recibirNotificacionExterna(texto: string, origen: string = 'app') {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'recibirNotificacionExterna',
        texto,
        origen
      })
    });
    return await res.json();
  },

  /**
   * Actualiza el saldo de una tarjeta de crédito específica (H8:J11)
   * operacion: 'sumar' (consumo con TC) | 'restar' (pago de tarjeta)
   */
  async actualizarSaldoTarjetaCredito(params: {
    tarjeta: string;
    monto: number;
    operacion?: 'sumar' | 'restar';
    concepto?: string;
    fila?: number;
  }) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'actualizarSaldoTarjetaCredito',
        tarjeta: params.tarjeta,
        monto: params.monto,
        operacion: params.operacion || 'sumar',
        concepto: params.concepto,
        fila: params.fila
      })
    });
    return await res.json();
  },

  /**
   * Obtiene el historial reciente de transacciones registradas en Transacciones_Log
   */
  async getHistorialLogs(limit?: number): Promise<{ success: boolean; total: number; logs: LogItem[] }> {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'getHistorialLogs',
        limit
      })
    });
    return await res.json();
  },

  /**
   * Añade dinero/saldo directamente a un rubro (Nómina, Bonos o Bolsillos)
   */
  async agregarDineroRubro(payload: AgregarDineroPayload): Promise<{ success: boolean; nuevoSaldo?: number; error?: string }> {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'agregarDineroRubro',
        ...payload
      })
    });
    return await res.json();
  },

  /**
   * Transfiere dinero de un rubro origen a un rubro destino
   */
  async transferirDineroRubros(payload: TransferirDineroPayload): Promise<{ success: boolean; nuevoSaldoOrigen?: number; nuevoSaldoDestino?: number; error?: string }> {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'transferirDineroRubros',
        ...payload
      })
    });
    return await res.json();
  }
};
