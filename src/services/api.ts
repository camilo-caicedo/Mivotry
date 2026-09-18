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

export interface DashboardResponse {
  nomina: {
    quincenaBase: number;
    mensualBase: number;
    fondoOcasional: number;
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
    totalRendimientos: number;
  };
  pagosAnuales: PagoAnualItem[];
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
  }
};
