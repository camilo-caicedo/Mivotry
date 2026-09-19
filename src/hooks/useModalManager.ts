import { useState, useCallback } from 'react';
import { QuickActionItem } from '../services/quickActionsService';

export type ModalName =
  | 'sms'
  | 'inbox'
  | 'history'
  | 'charts'
  | 'transfer'
  | 'salidas'
  | 'bonos'
  | 'quickAction'
  | 'prima'
  | 'gastoManual'
  // Variantes con sufijo "Modal" o nombres de App.tsx para máxima interoperabilidad
  | 'smsModal'
  | 'inboxModal'
  | 'historyModal'
  | 'chartsModal'
  | 'transferModal'
  | 'salidasModal'
  | 'bonosModal'
  | 'quickActionModal'
  | 'primaModal'
  | 'modal'
  | 'modalVisible';

export interface SelectedGastoPayload {
  nombre: string;
  cuenta: 'nomina' | 'bonos';
  manejoActual: number;
  presupuestoTotal: number;
}

export interface TransferOptionsPayload {
  initialMode: 'add' | 'transfer';
  initialAccount: 'nomina' | 'bonos' | 'bolsillos';
  initialCategory?: string;
}

export interface QuickActionOptionsPayload {
  action: QuickActionItem | null;
  mode: 'execute' | 'create';
}

interface InternalModalState {
  sms: boolean;
  inbox: boolean;
  history: boolean;
  charts: boolean;
  transfer: boolean;
  salidas: boolean;
  bonos: boolean;
  quickAction: boolean;
  prima: boolean;
  gastoManual: boolean;
}

const INITIAL_MODAL_STATE: InternalModalState = {
  sms: false,
  inbox: false,
  history: false,
  charts: false,
  transfer: false,
  salidas: false,
  bonos: false,
  quickAction: false,
  prima: false,
  gastoManual: false,
};

const INITIAL_TRANSFER_OPTIONS: TransferOptionsPayload = {
  initialMode: 'add',
  initialAccount: 'nomina',
  initialCategory: undefined,
};

const INITIAL_QUICK_ACTION_OPTIONS: QuickActionOptionsPayload = {
  action: null,
  mode: 'execute',
};

/**
 * Normaliza nombres de modal para soportar tanto variantes cortas como nombres originales de App.tsx
 */
function normalizeModalName(name: ModalName): keyof InternalModalState {
  switch (name) {
    case 'sms':
    case 'smsModal':
      return 'sms';
    case 'inbox':
    case 'inboxModal':
      return 'inbox';
    case 'history':
    case 'historyModal':
      return 'history';
    case 'charts':
    case 'chartsModal':
      return 'charts';
    case 'transfer':
    case 'transferModal':
      return 'transfer';
    case 'salidas':
    case 'salidasModal':
      return 'salidas';
    case 'bonos':
    case 'bonosModal':
      return 'bonos';
    case 'quickAction':
    case 'quickActionModal':
      return 'quickAction';
    case 'prima':
    case 'primaModal':
      return 'prima';
    case 'gastoManual':
    case 'modal':
    case 'modalVisible':
      return 'gastoManual';
    default:
      return name as keyof InternalModalState;
  }
}

export interface UseModalManagerReturn {
  // Banderas de visibilidad
  smsModalVisible: boolean;
  inboxModalVisible: boolean;
  historyModalVisible: boolean;
  chartsModalVisible: boolean;
  transferModalVisible: boolean;
  salidasModalVisible: boolean;
  bonosModalVisible: boolean;
  quickActionModalVisible: boolean;
  primaModalVisible: boolean;
  gastoManualVisible: boolean;
  modalVisible: boolean; // Alias directo para App.tsx (Gasto manual)

  // Payloads y datos contextuales de modales
  selectedGasto: SelectedGastoPayload | null;
  setSelectedGasto: React.Dispatch<React.SetStateAction<SelectedGastoPayload | null>>;

  transferOptions: TransferOptionsPayload;
  setTransferOptions: React.Dispatch<React.SetStateAction<TransferOptionsPayload>>;
  transferInitialMode: 'add' | 'transfer';
  transferInitialAccount: 'nomina' | 'bonos' | 'bolsillos';
  transferInitialCategory?: string;

  quickActionOptions: QuickActionOptionsPayload;
  setQuickActionOptions: React.Dispatch<React.SetStateAction<QuickActionOptionsPayload>>;
  quickActionToExecute: QuickActionItem | null;
  quickActionModalMode: 'execute' | 'create';

  // API unificada de control
  openModal: (name: ModalName, payload?: any) => void;
  closeModal: (name: ModalName) => void;
  closeAllModals: () => void;
  isModalOpen: (name: ModalName) => boolean;
  toggleModal: (name: ModalName, payload?: any) => void;

  // Setters individuales de visibilidad (compatibilidad total con App.tsx)
  setSmsModalVisible: (visible: boolean) => void;
  setInboxModalVisible: (visible: boolean) => void;
  setHistoryModalVisible: (visible: boolean) => void;
  setChartsModalVisible: (visible: boolean) => void;
  setTransferModalVisible: (visible: boolean) => void;
  setSalidasModalVisible: (visible: boolean) => void;
  setBonosModalVisible: (visible: boolean) => void;
  setQuickActionModalVisible: (visible: boolean) => void;
  setPrimaModalVisible: (visible: boolean) => void;
  setGastoManualVisible: (visible: boolean) => void;
  setModalVisible: (visible: boolean) => void;

  // Setters de atajos de payloads
  setTransferInitialMode: (mode: 'add' | 'transfer') => void;
  setTransferInitialAccount: (account: 'nomina' | 'bonos' | 'bolsillos') => void;
  setTransferInitialCategory: (category: string | undefined) => void;
  setQuickActionToExecute: (action: QuickActionItem | null) => void;
  setQuickActionModalMode: (mode: 'execute' | 'create') => void;
}

/**
 * Hook para consolidar y desacoplar los estados de apertura/cierre y payloads
 * de los más de 10 modales de Mivotry.
 */
export function useModalManager(): UseModalManagerReturn {
  const [modals, setModals] = useState<InternalModalState>(INITIAL_MODAL_STATE);

  // Payloads
  const [selectedGasto, setSelectedGasto] = useState<SelectedGastoPayload | null>(null);
  const [transferOptions, setTransferOptions] = useState<TransferOptionsPayload>(INITIAL_TRANSFER_OPTIONS);
  const [quickActionOptions, setQuickActionOptions] = useState<QuickActionOptionsPayload>(INITIAL_QUICK_ACTION_OPTIONS);

  /**
   * Abre un modal por su identificador y asigna de forma inteligente el payload si se provee.
   */
  const openModal = useCallback((name: ModalName, payload?: any) => {
    const key = normalizeModalName(name);

    if (payload !== undefined) {
      if (key === 'gastoManual') {
        setSelectedGasto(payload);
      } else if (key === 'transfer') {
        setTransferOptions(prev => ({
          ...prev,
          ...payload,
        }));
      } else if (key === 'quickAction') {
        if (payload && typeof payload === 'object' && ('mode' in payload || 'action' in payload)) {
          setQuickActionOptions(prev => ({
            ...prev,
            ...payload,
          }));
        } else if (payload) {
          // Si se pasa directamente el item de QuickAction
          setQuickActionOptions({
            action: payload as QuickActionItem,
            mode: 'execute',
          });
        }
      }
    }

    setModals(prev => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  /**
   * Cierra un modal específico por su identificador.
   */
  const closeModal = useCallback((name: ModalName) => {
    const key = normalizeModalName(name);
    setModals(prev => ({
      ...prev,
      [key]: false,
    }));
  }, []);

  /**
   * Cierra todos los modales abiertos simultáneamente.
   */
  const closeAllModals = useCallback(() => {
    setModals(INITIAL_MODAL_STATE);
  }, []);

  /**
   * Retorna si un modal específico está abierto.
   */
  const isModalOpen = useCallback(
    (name: ModalName): boolean => {
      const key = normalizeModalName(name);
      return Boolean(modals[key]);
    },
    [modals]
  );

  /**
   * Alterna la visibilidad de un modal.
   */
  const toggleModal = useCallback(
    (name: ModalName, payload?: any) => {
      const key = normalizeModalName(name);
      if (modals[key]) {
        closeModal(name);
      } else {
        openModal(name, payload);
      }
    },
    [modals, closeModal, openModal]
  );

  // Setters individuales de visibilidad
  const setSmsModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, sms: visible }));
  }, []);

  const setInboxModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, inbox: visible }));
  }, []);

  const setHistoryModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, history: visible }));
  }, []);

  const setChartsModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, charts: visible }));
  }, []);

  const setTransferModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, transfer: visible }));
  }, []);

  const setSalidasModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, salidas: visible }));
  }, []);

  const setBonosModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, bonos: visible }));
  }, []);

  const setQuickActionModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, quickAction: visible }));
  }, []);

  const setPrimaModalVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, prima: visible }));
  }, []);

  const setGastoManualVisible = useCallback((visible: boolean) => {
    setModals(prev => ({ ...prev, gastoManual: visible }));
  }, []);

  const setModalVisible = setGastoManualVisible;

  // Setters individuales de subpropiedades de payloads
  const setTransferInitialMode = useCallback((mode: 'add' | 'transfer') => {
    setTransferOptions(prev => ({ ...prev, initialMode: mode }));
  }, []);

  const setTransferInitialAccount = useCallback((account: 'nomina' | 'bonos' | 'bolsillos') => {
    setTransferOptions(prev => ({ ...prev, initialAccount: account }));
  }, []);

  const setTransferInitialCategory = useCallback((category: string | undefined) => {
    setTransferOptions(prev => ({ ...prev, initialCategory: category }));
  }, []);

  const setQuickActionToExecute = useCallback((action: QuickActionItem | null) => {
    setQuickActionOptions(prev => ({ ...prev, action }));
  }, []);

  const setQuickActionModalMode = useCallback((mode: 'execute' | 'create') => {
    setQuickActionOptions(prev => ({ ...prev, mode }));
  }, []);

  return {
    // Flags de visibilidad
    smsModalVisible: modals.sms,
    inboxModalVisible: modals.inbox,
    historyModalVisible: modals.history,
    chartsModalVisible: modals.charts,
    transferModalVisible: modals.transfer,
    salidasModalVisible: modals.salidas,
    bonosModalVisible: modals.bonos,
    quickActionModalVisible: modals.quickAction,
    primaModalVisible: modals.prima,
    gastoManualVisible: modals.gastoManual,
    modalVisible: modals.gastoManual,

    // Payloads
    selectedGasto,
    setSelectedGasto,

    transferOptions,
    setTransferOptions,
    transferInitialMode: transferOptions.initialMode,
    transferInitialAccount: transferOptions.initialAccount,
    transferInitialCategory: transferOptions.initialCategory,

    quickActionOptions,
    setQuickActionOptions,
    quickActionToExecute: quickActionOptions.action,
    quickActionModalMode: quickActionOptions.mode,

    // API de control
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    toggleModal,

    // Setters de visibilidad
    setSmsModalVisible,
    setInboxModalVisible,
    setHistoryModalVisible,
    setChartsModalVisible,
    setTransferModalVisible,
    setSalidasModalVisible,
    setBonosModalVisible,
    setQuickActionModalVisible,
    setPrimaModalVisible,
    setGastoManualVisible,
    setModalVisible,

    // Setters de payload
    setTransferInitialMode,
    setTransferInitialAccount,
    setTransferInitialCategory,
    setQuickActionToExecute,
    setQuickActionModalMode,
  };
}

export default useModalManager;
