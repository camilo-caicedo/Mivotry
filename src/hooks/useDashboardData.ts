import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { DashboardResponse, MivotryAPI } from '../services/api';
import { cacheService } from '../services/cacheService';

export interface UseDashboardDataOptions {
  initialQuincena?: 15 | 30;
  initialAccount?: 'nomina' | 'bonos';
  autoRevalidate?: boolean;
}

export interface UseDashboardDataReturn {
  // Estado principal
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  refreshing: boolean;
  dashboardData: DashboardResponse | null;
  setDashboardData: React.Dispatch<React.SetStateAction<DashboardResponse | null>>;
  activeQuincena: 15 | 30;
  setActiveQuincena: (quincena: 15 | 30) => void;
  activeAccount: 'nomina' | 'bonos';
  setActiveAccount: (account: 'nomina' | 'bonos') => void;

  // Acciones y llamadas API
  fetchDashboard: (forceRemote?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  handleCargarQuincena: (quincena: 15 | 30) => void;
  executeCargarQuincena: (quincena: 15 | 30, sobrescribir?: boolean) => Promise<any>;

  // Totales computados
  totalManejoActual: number;
  salidasManejo: number;
  salidasPresupuestoQ: number;
  porcentajeManejo: number;
  salidasPorcentaje: number;
  basePresupuesto: number;
  totalPresupuestadoQ: number;

  // Utilidades
  formatCOP: (val?: number) => string;
}

/**
 * Custom hook que desacopla la sincronización de datos del dashboard,
 * persistencia en caché offline y cómputos de presupuesto/manejo.
 */
export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const {
    initialQuincena = 15,
    initialAccount = 'nomina',
    autoRevalidate = true,
  } = options;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [activeQuincena, setActiveQuincena] = useState<15 | 30>(initialQuincena);
  const [activeAccount, setActiveAccount] = useState<'nomina' | 'bonos'>(initialAccount);

  const dashboardDataRef = useRef<DashboardResponse | null>(null);
  dashboardDataRef.current = dashboardData;

  /**
   * Formateador de moneda colombiana (COP)
   */
  const formatCOP = useCallback((val: number = 0) => {
    return '$' + Math.round(val).toLocaleString('es-CO');
  }, []);

  /**
   * Obtiene datos actualizados de la API de Mivotry y los almacena en caché.
   * Si forceRemote es true, revalida silenciosamente sin mostrar spinner completo si ya hay datos.
   */
  const fetchDashboard = useCallback(
    async (forceRemote: boolean = false) => {
      try {
        const hasData = dashboardDataRef.current !== null;
        if (!forceRemote && !hasData) {
          setLoading(true);
        }

        const data = await MivotryAPI.getDashboardData();
        setDashboardData(data);
        await cacheService.saveCachedDashboard(data);
      } catch (err: any) {
        console.error('[useDashboardData] Error al conectar con Google Sheets:', err);
        if (!dashboardDataRef.current) {
          Alert.alert(
            'Error de conexión',
            'No se pudo conectar con tu Google Sheet. Revisa tu conexión a internet.'
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /**
   * Inicialización: carga instantánea desde caché y revalidación en segundo plano.
   */
  useEffect(() => {
    let isMounted = true;

    const loadCacheAndSync = async () => {
      try {
        const cached = await cacheService.getCachedDashboard();
        if (cached && cached.data && isMounted) {
          setDashboardData(cached.data);
          setLoading(false);
        }
      } catch (e) {
        console.error('[useDashboardData] Error al leer caché inicial:', e);
      }

      if (autoRevalidate && isMounted) {
        // Revalidar en segundo plano con forceRemote = true para no bloquear si ya hay caché
        await fetchDashboard(true);
      }
    };

    loadCacheAndSync();

    return () => {
      isMounted = false;
    };
  }, [autoRevalidate, fetchDashboard]);

  /**
   * Pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard(true);
  }, [fetchDashboard]);

  /**
   * Ejecución programática directa del rollover de quincena.
   */
  const executeCargarQuincena = useCallback(
    async (quincena: 15 | 30, sobrescribir: boolean = false) => {
      try {
        setLoading(true);
        const result = await MivotryAPI.cargarQuincena({ quincena, sobrescribir });
        await fetchDashboard(true);
        return result;
      } catch (error) {
        console.error('[useDashboardData] Error en executeCargarQuincena:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchDashboard]
  );

  /**
   * Manejador de confirmación interactiva para cargar quincena (rollover).
   */
  const handleCargarQuincena = useCallback(
    (quincena: 15 | 30) => {
      Alert.alert(
        'Cargar Quincena ' + quincena,
        '¿Deseas realizar el rollover de la Quincena ' +
          quincena +
          '? Se sumarán los valores presupuestados al saldo remanente que tengas en Manejo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar Rollover',
            style: 'default',
            onPress: async () => {
              try {
                setLoading(true);
                await MivotryAPI.cargarQuincena({ quincena, sobrescribir: false });
                Alert.alert('¡Éxito!', 'Quincena ' + quincena + ' cargada correctamente.');
                await fetchDashboard(true);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'No se pudo cargar la quincena.');
                setLoading(false);
              }
            },
          },
        ]
      );
    },
    [fetchDashboard]
  );

  // --- CÁLCULOS Y TOTALES COMPUTADOS ---

  const nominaGastos = useMemo(() => {
    return dashboardData?.nomina.gastos || [];
  }, [dashboardData]);

  const bonosGastos = useMemo(() => {
    return dashboardData?.bonos.gastos || [];
  }, [dashboardData]);

  const totalPresupuestadoQ = useMemo(() => {
    return nominaGastos.reduce((acc, item) => {
      return acc + (activeQuincena === 15 ? (item.q15 || 0) : (item.q30 || 0));
    }, 0);
  }, [nominaGastos, activeQuincena]);

  // Total de Manejo Actual según cuenta activa
  const totalManejoActual = useMemo(() => {
    if (!dashboardData) return 0;
    if (activeAccount === 'nomina') {
      return (
        dashboardData.nomina.totalManejoF21 ??
        nominaGastos.reduce((acc, item) => acc + (item.manejoActual || 0), 0)
      );
    }
    return bonosGastos.reduce((acc, item) => acc + (item.manejoActual || 0), 0);
  }, [dashboardData, activeAccount, nominaGastos, bonosGastos]);

  // Presupuesto base según cuenta activa
  const basePresupuesto = useMemo(() => {
    if (activeAccount === 'nomina') {
      return totalPresupuestadoQ > 0
        ? totalPresupuestadoQ
        : dashboardData?.nomina.quincenaBase || 4950000;
    }
    return dashboardData?.bonos.presupuestoTotal || 1600000;
  }, [activeAccount, totalPresupuestadoQ, dashboardData]);

  // Porcentaje disponible de Manejo
  const porcentajeManejo = useMemo(() => {
    if (basePresupuesto <= 0) return 0;
    return Math.round((totalManejoActual / basePresupuesto) * 100);
  }, [totalManejoActual, basePresupuesto]);

  // Rubro Salidas (Gastos variables)
  const itemSalidas = useMemo(() => {
    return nominaGastos.find(g => g.nombre.toLowerCase().includes('salida'));
  }, [nominaGastos]);

  const salidasManejo = useMemo(() => {
    return itemSalidas?.manejoActual ?? 240000;
  }, [itemSalidas]);

  const salidasPresupuestoQ = useMemo(() => {
    return (activeQuincena === 15 ? itemSalidas?.q15 : itemSalidas?.q30) ?? 300000;
  }, [activeQuincena, itemSalidas]);

  const salidasPorcentaje = useMemo(() => {
    if (salidasPresupuestoQ <= 0) return 0;
    return Math.min(100, Math.round((salidasManejo / salidasPresupuestoQ) * 100));
  }, [salidasManejo, salidasPresupuestoQ]);

  return {
    loading,
    setLoading,
    refreshing,
    dashboardData,
    setDashboardData,
    activeQuincena,
    setActiveQuincena,
    activeAccount,
    setActiveAccount,
    fetchDashboard,
    onRefresh,
    handleCargarQuincena,
    executeCargarQuincena,
    totalManejoActual,
    salidasManejo,
    salidasPresupuestoQ,
    porcentajeManejo,
    salidasPorcentaje,
    basePresupuesto,
    totalPresupuestadoQ,
    formatCOP,
  };
}

export default useDashboardData;
