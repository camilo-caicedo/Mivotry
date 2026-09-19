import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuickActionItem {
  id: string;
  titulo: string;
  icono: string; // emoji e.g. ⛽, 🍽️, 🛒, 🥬, 🎬, ☕
  cuenta: 'nomina' | 'bonos';
  categoria: string;
  monto: number;
  concepto?: string;
}

export const STORAGE_KEY_QUICK_ACTIONS = '@mivotry_quick_actions';

export const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'quick-gasolina',
    titulo: 'Gasolina',
    icono: '⛽',
    cuenta: 'nomina',
    categoria: 'Gasolina/Lavar',
    monto: 50000,
    concepto: 'Gasolina / Tanqueada'
  },
  {
    id: 'quick-almuerzo',
    titulo: 'Almuerzo',
    icono: '🍽️',
    cuenta: 'nomina',
    categoria: 'Salidas',
    monto: 25000,
    concepto: 'Almuerzo'
  },
  {
    id: 'quick-pricesmart',
    titulo: 'PriceSmart',
    icono: '🛒',
    cuenta: 'bonos',
    categoria: 'Pricesmart',
    monto: 200000,
    concepto: 'Compras PriceSmart'
  },
  {
    id: 'quick-d1',
    titulo: 'D1 / Mercado',
    icono: '🥬',
    cuenta: 'bonos',
    categoria: 'Verduras y demas',
    monto: 40000,
    concepto: 'Mercado D1 / Verduras'
  },
  {
    id: 'quick-cine-bar',
    titulo: 'Salida Cine/Bar',
    icono: '🎬',
    cuenta: 'nomina',
    categoria: 'Salidas',
    monto: 60000,
    concepto: 'Salida Cine / Bar'
  },
  {
    id: 'quick-gatos',
    titulo: 'Gatos',
    icono: '🐱',
    cuenta: 'bonos',
    categoria: 'Gatos',
    monto: 50000,
    concepto: 'Gastos Gatos'
  }
];

/**
 * Obtiene la lista de atajos rápidos guardados en el almacenamiento local.
 * Si no existen, inicializa y retorna la lista predeterminada.
 */
export async function getQuickActions(): Promise<QuickActionItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_QUICK_ACTIONS);
    if (!raw) {
      await saveQuickActions(DEFAULT_QUICK_ACTIONS);
      return DEFAULT_QUICK_ACTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await saveQuickActions(DEFAULT_QUICK_ACTIONS);
      return DEFAULT_QUICK_ACTIONS;
    }
    return parsed as QuickActionItem[];
  } catch (error) {
    console.error('[QuickActionsService] Error al obtener atajos:', error);
    return DEFAULT_QUICK_ACTIONS;
  }
}

/**
 * Guarda una lista de atajos rápidos en el almacenamiento local.
 */
export async function saveQuickActions(actions: QuickActionItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_QUICK_ACTIONS, JSON.stringify(actions));
  } catch (error) {
    console.error('[QuickActionsService] Error al guardar atajos:', error);
    throw error;
  }
}

/**
 * Agrega un nuevo atajo a la lista existente y retorna la lista actualizada.
 */
export async function addQuickAction(item: Omit<QuickActionItem, 'id'>): Promise<QuickActionItem[]> {
  try {
    const current = await getQuickActions();
    const newItem: QuickActionItem = {
      ...item,
      id: `quick-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [...current, newItem];
    await saveQuickActions(updated);
    return updated;
  } catch (error) {
    console.error('[QuickActionsService] Error al agregar atajo:', error);
    throw error;
  }
}

/**
 * Elimina un atajo por su ID y retorna la lista actualizada.
 */
export async function deleteQuickAction(id: string): Promise<QuickActionItem[]> {
  try {
    const current = await getQuickActions();
    const updated = current.filter((action) => action.id !== id);
    await saveQuickActions(updated);
    return updated;
  } catch (error) {
    console.error('[QuickActionsService] Error al eliminar atajo:', error);
    throw error;
  }
}

/**
 * Restablece los atajos predeterminados y retorna la lista inicial.
 */
export async function resetDefaultQuickActions(): Promise<QuickActionItem[]> {
  try {
    await saveQuickActions(DEFAULT_QUICK_ACTIONS);
    return DEFAULT_QUICK_ACTIONS;
  } catch (error) {
    console.error('[QuickActionsService] Error al restablecer atajos predeterminados:', error);
    throw error;
  }
}

export const quickActionsService = {
  getQuickActions,
  saveQuickActions,
  addQuickAction,
  deleteQuickAction,
  resetDefaultQuickActions,
  DEFAULT_QUICK_ACTIONS
};

export default quickActionsService;
