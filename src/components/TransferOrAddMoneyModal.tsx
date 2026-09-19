import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import {
  PlusCircle,
  X,
  Wallet,
  Building2,
  Coins,
  ArrowRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react-native';
import { MivotryAPI, DashboardResponse } from '../services/api';

export interface TransferOrAddMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dashboardData?: DashboardResponse | null;
  initialMode?: 'add' | 'transfer';
  initialAccount?: 'nomina' | 'bonos' | 'bolsillos';
  initialCategory?: string;
}

type AccountType = 'nomina' | 'bonos' | 'bolsillos';
type TabType = 'add' | 'transfer';

export interface RubroOption {
  cuenta: AccountType;
  categoria: string;
  saldo: number;
}

const formatCOP = (num: number = 0) => {
  return '$ ' + Math.round(num).toLocaleString('es-CO');
};

const ACCOUNT_LABELS: Record<AccountType, { label: string; icon: typeof Building2; color: string; bg: string }> = {
  nomina: {
    label: 'Nómina',
    icon: Building2,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)'
  },
  bonos: {
    label: 'Bonos',
    icon: Wallet,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)'
  },
  bolsillos: {
    label: 'Bolsillos',
    icon: Coins,
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.15)'
  }
};

const QUICK_AMOUNTS = [
  { label: '+50k', value: 50000 },
  { label: '+100k', value: 100000 },
  { label: '+200k', value: 200000 },
  { label: '+500k', value: 500000 }
];

export const TransferOrAddMoneyModal: React.FC<TransferOrAddMoneyModalProps> = ({
  visible,
  onClose,
  onSuccess,
  dashboardData,
  initialMode = 'add',
  initialAccount = 'nomina',
  initialCategory
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialMode);
  
  // State for "Añadir Fondos"
  const [addAccount, setAddAccount] = useState<AccountType>(initialAccount);
  const [addCategory, setAddCategory] = useState<string>(initialCategory || '');
  const [addAmount, setAddAmount] = useState<string>('');
  const [addConcepto, setAddConcepto] = useState<string>('');
  const [loadingAdd, setLoadingAdd] = useState<boolean>(false);

  // State for "Mover Dinero (Transferir)"
  const [transferOriginAccount, setTransferOriginAccount] = useState<AccountType>(initialAccount);
  const [transferOriginCategory, setTransferOriginCategory] = useState<string>(initialCategory || '');
  const [transferDestAccount, setTransferDestAccount] = useState<AccountType>('nomina');
  const [transferDestCategory, setTransferDestCategory] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferConcepto, setTransferConcepto] = useState<string>('');
  const [loadingTransfer, setLoadingTransfer] = useState<boolean>(false);

  // Extract rubros per account
  const rubrosByAccount = useMemo(() => {
    const res: Record<AccountType, RubroOption[]> = {
      nomina: [],
      bonos: [],
      bolsillos: []
    };

    // 1. Nómina
    if (dashboardData?.nomina?.gastos && dashboardData.nomina.gastos.length > 0) {
      dashboardData.nomina.gastos.forEach((g) => {
        if (g.nombre) {
          res.nomina.push({
            cuenta: 'nomina',
            categoria: g.nombre,
            saldo: g.manejoActual || 0
          });
        }
      });
    } else {
      [
        'Mercado',
        'Servicios',
        'Administración',
        'Deudas tarjetas',
        'Salidas 1',
        'Salidas 2',
        'Ahorro',
        'Gatos'
      ].forEach((cat) => {
        res.nomina.push({ cuenta: 'nomina', categoria: cat, saldo: 0 });
      });
    }

    // Fondo Ocasional / Vacaciones (F20)
    const fondoOcasional = dashboardData?.nomina?.fondoOcasional ?? 0;
    res.nomina.push({
      cuenta: 'nomina',
      categoria: 'Fondo Ocasional / Vacaciones',
      saldo: fondoOcasional
    });

    // 2. Bonos
    if (dashboardData?.bonos?.gastos && dashboardData.bonos.gastos.length > 0) {
      dashboardData.bonos.gastos.forEach((g) => {
        if (g.nombre) {
          res.bonos.push({
            cuenta: 'bonos',
            categoria: g.nombre,
            saldo: g.manejoActual || 0
          });
        }
      });
    } else {
      ['Gatos', 'Verduras y demas', 'Carulla/Exito', 'Restaurantes', 'Mascotas'].forEach((cat) => {
        res.bonos.push({ cuenta: 'bonos', categoria: cat, saldo: 0 });
      });
    }

    // 3. Bolsillos
    if (dashboardData?.bolsillos?.items && dashboardData.bolsillos.items.length > 0) {
      dashboardData.bolsillos.items.forEach((b) => {
        if (b.nombre) {
          res.bolsillos.push({
            cuenta: 'bolsillos',
            categoria: b.nombre,
            saldo: b.valor || 0
          });
        }
      });
    } else {
      [
        { name: 'Cuotas Occidente', val: dashboardData?.bolsillos?.cuotasOccidente ?? 0 },
        { name: 'Cuota adicional occ', val: dashboardData?.bolsillos?.cuotaAdicionalOcc ?? 0 },
        { name: 'Bolsillo', val: dashboardData?.bolsillos?.bolsillo ?? 0 },
        { name: 'Bolsillo inversiones', val: dashboardData?.bolsillos?.inversiones ?? 0 },
        { name: 'Ahorro pagos anuales', val: dashboardData?.bolsillos?.pagosAnuales ?? 0 }
      ].forEach((item) => {
        res.bolsillos.push({
          cuenta: 'bolsillos',
          categoria: item.name,
          saldo: item.val
        });
      });
    }

    // Also include Fondo Ocasional in Bolsillos for convenience
    res.bolsillos.push({
      cuenta: 'bolsillos',
      categoria: 'Fondo Ocasional / Vacaciones',
      saldo: fondoOcasional
    });

    return res;
  }, [dashboardData]);

  // Sync initial props when modal becomes visible
  useEffect(() => {
    if (visible) {
      setActiveTab(initialMode);
      setAddAccount(initialAccount);
      setTransferOriginAccount(initialAccount);

      const nomList = rubrosByAccount[initialAccount] || [];
      const defaultCat = initialCategory || (nomList.length > 0 ? nomList[0].categoria : '');
      setAddCategory(defaultCat);
      setTransferOriginCategory(defaultCat);

      // Default destination: different category or next account
      const destAcc: AccountType = initialAccount === 'nomina' ? 'bolsillos' : 'nomina';
      setTransferDestAccount(destAcc);
      const destList = rubrosByAccount[destAcc] || [];
      setTransferDestCategory(destList.length > 0 ? destList[0].categoria : '');

      setAddAmount('');
      setAddConcepto('');
      setTransferAmount('');
      setTransferConcepto('');
    }
  }, [visible, initialMode, initialAccount, initialCategory, rubrosByAccount]);

  // Selected rubro objects
  const selectedAddRubro = useMemo(() => {
    return rubrosByAccount[addAccount]?.find(
      (r) => r.categoria.toLowerCase() === addCategory.toLowerCase()
    );
  }, [rubrosByAccount, addAccount, addCategory]);

  const selectedOriginRubro = useMemo(() => {
    return rubrosByAccount[transferOriginAccount]?.find(
      (r) => r.categoria.toLowerCase() === transferOriginCategory.toLowerCase()
    );
  }, [rubrosByAccount, transferOriginAccount, transferOriginCategory]);

  const selectedDestRubro = useMemo(() => {
    return rubrosByAccount[transferDestAccount]?.find(
      (r) => r.categoria.toLowerCase() === transferDestCategory.toLowerCase()
    );
  }, [rubrosByAccount, transferDestAccount, transferDestCategory]);

  // Quick amount click handler
  const handleQuickAmount = (val: number, isTransfer = false) => {
    if (isTransfer) {
      const current = parseInt(transferAmount.replace(/[^0-9]/g, '') || '0', 10);
      setTransferAmount(String(current + val));
    } else {
      const current = parseInt(addAmount.replace(/[^0-9]/g, '') || '0', 10);
      setAddAmount(String(current + val));
    }
  };

  // Transfer all balance handler
  const handleTransferAll = () => {
    if (selectedOriginRubro) {
      const maxTransfer = Math.max(0, Math.round(selectedOriginRubro.saldo));
      setTransferAmount(String(maxTransfer));
    }
  };

  // Submit Añadir Fondos
  const handleAddSubmit = async () => {
    const numericAmount = parseInt(addAmount.replace(/[^0-9]/g, ''), 10);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero para añadir fondos.');
      return;
    }
    if (!addCategory) {
      Alert.alert('Categoría requerida', 'Por favor selecciona un rubro o categoría de destino.');
      return;
    }

    try {
      setLoadingAdd(true);
      const res = await MivotryAPI.agregarDineroRubro({
        cuenta: addAccount,
        categoria: addCategory,
        monto: numericAmount,
        concepto: addConcepto.trim() || undefined
      });

      if (res.success) {
        Alert.alert(
          '¡Fondos Añadidos!',
          `Se han inyectado ${formatCOP(numericAmount)} al rubro "${addCategory}".\nNuevo saldo: ${formatCOP(res.nuevoSaldo ?? 0)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onSuccess?.();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', res.error || 'No se pudo agregar dinero al rubro.');
      }
    } catch (err: any) {
      console.error('Error in agregarDineroRubro:', err);
      Alert.alert('Error de conexión', err?.message || 'Ocurrió un fallo de red.');
    } finally {
      setLoadingAdd(false);
    }
  };

  // Submit Transferencia
  const handleTransferSubmit = async () => {
    const numericAmount = parseInt(transferAmount.replace(/[^0-9]/g, ''), 10);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero para transferir.');
      return;
    }
    if (!transferOriginCategory) {
      Alert.alert('Origen requerido', 'Por favor selecciona el rubro origen.');
      return;
    }
    if (!transferDestCategory) {
      Alert.alert('Destino requerido', 'Por favor selecciona el rubro destino.');
      return;
    }
    if (
      transferOriginAccount === transferDestAccount &&
      transferOriginCategory.toLowerCase() === transferDestCategory.toLowerCase()
    ) {
      Alert.alert('Rubro idéntico', 'El rubro origen y el rubro destino no pueden ser el mismo.');
      return;
    }

    try {
      setLoadingTransfer(true);
      const res = await MivotryAPI.transferirDineroRubros({
        cuentaOrigen: transferOriginAccount,
        categoriaOrigen: transferOriginCategory,
        cuentaDestino: transferDestAccount,
        categoriaDestino: transferDestCategory,
        monto: numericAmount,
        concepto: transferConcepto.trim() || undefined
      });

      if (res.success) {
        Alert.alert(
          '¡Transferencia Exitosa!',
          `Se transfirieron ${formatCOP(numericAmount)} de "${transferOriginCategory}" a "${transferDestCategory}".`,
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onSuccess?.();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', res.error || 'No se pudo completar la transferencia.');
      }
    } catch (err: any) {
      console.error('Error in transferirDineroRubros:', err);
      Alert.alert('Error de conexión', err?.message || 'Ocurrió un fallo de red.');
    } finally {
      setLoadingTransfer(false);
    }
  };

  const transferAmountNum = parseInt(transferAmount.replace(/[^0-9]/g, '') || '0', 10);
  const originBalance = selectedOriginRubro?.saldo ?? 0;
  const isOverBalance = originBalance > 0 && transferAmountNum > originBalance;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop} />

        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleBox}>
              <View style={styles.headerIconContainer}>
                <Coins size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Gestión de Dinero</Text>
                <Text style={styles.headerSubtitle}>Añade fondos o transfiere entre rubros</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Top Tabs Switcher */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'add' && styles.tabButtonActiveAdd]}
              onPress={() => setActiveTab('add')}
              activeOpacity={0.8}
            >
              <PlusCircle
                size={16}
                color={activeTab === 'add' ? '#10B981' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'add' && styles.tabButtonTextActiveAdd]}>
                Añadir Fondos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'transfer' && styles.tabButtonActiveTransfer]}
              onPress={() => setActiveTab('transfer')}
              activeOpacity={0.8}
            >
              <ArrowRight
                size={16}
                color={activeTab === 'transfer' ? '#38BDF8' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'transfer' && styles.tabButtonTextActiveTransfer
                ]}
              >
                Mover Dinero
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'add' ? (
              /* ================= TAB 1: AÑADIR FONDOS ================= */
              <View style={styles.tabContent}>
                {/* Account Selection */}
                <Text style={styles.sectionLabel}>1. Cuenta de Destino</Text>
                <View style={styles.accountPillsRow}>
                  {(['nomina', 'bonos', 'bolsillos'] as AccountType[]).map((acc) => {
                    const info = ACCOUNT_LABELS[acc];
                    const IconComp = info.icon;
                    const isSelected = addAccount === acc;
                    return (
                      <TouchableOpacity
                        key={acc}
                        style={[
                          styles.accountPill,
                          isSelected && {
                            borderColor: info.color,
                            backgroundColor: info.bg
                          }
                        ]}
                        onPress={() => {
                          setAddAccount(acc);
                          const list = rubrosByAccount[acc] || [];
                          setAddCategory(list.length > 0 ? list[0].categoria : '');
                        }}
                        activeOpacity={0.7}
                      >
                        <IconComp size={15} color={isSelected ? info.color : '#94A3B8'} />
                        <Text
                          style={[
                            styles.accountPillText,
                            isSelected && { color: info.color, fontWeight: '700' }
                          ]}
                        >
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Category Picker Chips */}
                <View style={styles.labelRow}>
                  <Text style={styles.sectionLabel}>2. Selecciona el Rubro</Text>
                  {selectedAddRubro && (
                    <Text style={styles.currentBalanceBadge}>
                      Saldo: <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCOP(selectedAddRubro.saldo)}</Text>
                    </Text>
                  )}
                </View>

                <View style={styles.categoryChipsContainer}>
                  {rubrosByAccount[addAccount]?.map((item) => {
                    const isSelected = item.categoria.toLowerCase() === addCategory.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={item.categoria}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive
                        ]}
                        onPress={() => setAddCategory(item.categoria)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.categoryChipName,
                            isSelected && styles.categoryChipNameActive
                          ]}
                          numberOfLines={1}
                        >
                          {item.categoria}
                        </Text>
                        <Text
                          style={[
                            styles.categoryChipBalance,
                            isSelected && styles.categoryChipBalanceActive
                          ]}
                        >
                          {formatCOP(item.saldo)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount Input */}
                <Text style={styles.sectionLabel}>3. Monto a Inyectar (COP)</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={addAmount ? parseInt(addAmount.replace(/[^0-9]/g, ''), 10).toLocaleString('es-CO') : ''}
                    onChangeText={(val) => setAddAmount(val.replace(/[^0-9]/g, ''))}
                  />
                  {addAmount.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setAddAmount('')}
                      style={styles.clearInputButton}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Amounts */}
                <View style={styles.quickAmountsRow}>
                  {QUICK_AMOUNTS.map((q) => (
                    <TouchableOpacity
                      key={q.label}
                      style={styles.quickAmountBtn}
                      onPress={() => handleQuickAmount(q.value, false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Concepto / Nota */}
                <Text style={styles.sectionLabel}>4. Concepto o Detalle (Opcional)</Text>
                <TextInput
                  style={styles.conceptInput}
                  placeholder="Ej. Ingreso extra, ajuste de quincena, ahorro..."
                  placeholderTextColor="#475569"
                  value={addConcepto}
                  onChangeText={setAddConcepto}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButtonAdd,
                    loadingAdd && styles.submitButtonDisabled
                  ]}
                  onPress={handleAddSubmit}
                  disabled={loadingAdd}
                  activeOpacity={0.8}
                >
                  {loadingAdd ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <PlusCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitButtonText}>
                        {addAmount ? `Añadir ${formatCOP(parseInt(addAmount, 10) || 0)}` : 'Añadir Fondos al Rubro'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ================= TAB 2: MOVER DINERO (TRANSFERIR) ================= */
              <View style={styles.tabContent}>
                {/* 1. ORIGEN */}
                <View style={styles.transferSectionCard}>
                  <View style={styles.transferSectionHeader}>
                    <View style={styles.originIndicator} />
                    <Text style={styles.transferSectionTitle}>DE (RUBRO ORIGEN)</Text>
                  </View>

                  {/* Account Selector */}
                  <View style={styles.accountPillsRowCompact}>
                    {(['nomina', 'bonos', 'bolsillos'] as AccountType[]).map((acc) => {
                      const isSelected = transferOriginAccount === acc;
                      return (
                        <TouchableOpacity
                          key={acc}
                          style={[
                            styles.accountPillCompact,
                            isSelected && styles.accountPillCompactActive
                          ]}
                          onPress={() => {
                            setTransferOriginAccount(acc);
                            const list = rubrosByAccount[acc] || [];
                            setTransferOriginCategory(list.length > 0 ? list[0].categoria : '');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.accountPillCompactText,
                              isSelected && styles.accountPillCompactTextActive
                            ]}
                          >
                            {ACCOUNT_LABELS[acc].label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Category Dropdown/Grid */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalChipsScroll}
                  >
                    {rubrosByAccount[transferOriginAccount]?.map((item) => {
                      const isSelected =
                        item.categoria.toLowerCase() === transferOriginCategory.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={item.categoria}
                          style={[
                            styles.transferChip,
                            isSelected && styles.transferChipActiveOrigin
                          ]}
                          onPress={() => setTransferOriginCategory(item.categoria)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.transferChipTitle,
                              isSelected && styles.transferChipTitleActive
                            ]}
                            numberOfLines={1}
                          >
                            {item.categoria}
                          </Text>
                          <Text
                            style={[
                              styles.transferChipBalance,
                              isSelected && styles.transferChipBalanceActiveOrigin
                            ]}
                          >
                            {formatCOP(item.saldo)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Divider with Transfer Icon */}
                <View style={styles.transferDivider}>
                  <View style={styles.transferDividerLine} />
                  <View style={styles.transferDividerBadge}>
                    <ArrowDownLeft size={16} color="#38BDF8" />
                  </View>
                  <View style={styles.transferDividerLine} />
                </View>

                {/* 2. DESTINO */}
                <View style={styles.transferSectionCard}>
                  <View style={styles.transferSectionHeader}>
                    <View style={styles.destIndicator} />
                    <Text style={styles.transferSectionTitle}>A (RUBRO DESTINO)</Text>
                  </View>

                  {/* Account Selector */}
                  <View style={styles.accountPillsRowCompact}>
                    {(['nomina', 'bonos', 'bolsillos'] as AccountType[]).map((acc) => {
                      const isSelected = transferDestAccount === acc;
                      return (
                        <TouchableOpacity
                          key={acc}
                          style={[
                            styles.accountPillCompact,
                            isSelected && styles.accountPillCompactActiveDest
                          ]}
                          onPress={() => {
                            setTransferDestAccount(acc);
                            const list = rubrosByAccount[acc] || [];
                            setTransferDestCategory(list.length > 0 ? list[0].categoria : '');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.accountPillCompactText,
                              isSelected && styles.accountPillCompactTextActiveDest
                            ]}
                          >
                            {ACCOUNT_LABELS[acc].label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Category Dropdown/Grid */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalChipsScroll}
                  >
                    {rubrosByAccount[transferDestAccount]?.map((item) => {
                      const isSelected =
                        item.categoria.toLowerCase() === transferDestCategory.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={item.categoria}
                          style={[
                            styles.transferChip,
                            isSelected && styles.transferChipActiveDest
                          ]}
                          onPress={() => setTransferDestCategory(item.categoria)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.transferChipTitle,
                              isSelected && styles.transferChipTitleActive
                            ]}
                            numberOfLines={1}
                          >
                            {item.categoria}
                          </Text>
                          <Text
                            style={[
                              styles.transferChipBalance,
                              isSelected && styles.transferChipBalanceActiveDest
                            ]}
                          >
                            {formatCOP(item.saldo)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 3. MONTO */}
                <View style={styles.labelRow}>
                  <Text style={styles.sectionLabel}>Monto a Mover (COP)</Text>
                  {originBalance > 0 && (
                    <TouchableOpacity
                      style={styles.transferAllBtn}
                      onPress={handleTransferAll}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                      <Text style={styles.transferAllBtnText}>Mover todo ({formatCOP(originBalance)})</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={
                      transferAmount
                        ? parseInt(transferAmount.replace(/[^0-9]/g, ''), 10).toLocaleString('es-CO')
                        : ''
                    }
                    onChangeText={(val) => setTransferAmount(val.replace(/[^0-9]/g, ''))}
                  />
                  {transferAmount.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setTransferAmount('')}
                      style={styles.clearInputButton}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {isOverBalance && (
                  <View style={styles.warningContainer}>
                    <AlertCircle size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={styles.warningText}>
                      El monto supera el saldo disponible actual ({formatCOP(originBalance)}).
                    </Text>
                  </View>
                )}

                {/* Quick Amounts */}
                <View style={styles.quickAmountsRow}>
                  {QUICK_AMOUNTS.map((q) => (
                    <TouchableOpacity
                      key={q.label}
                      style={styles.quickAmountBtn}
                      onPress={() => handleQuickAmount(q.value, true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Concepto / Nota */}
                <Text style={styles.sectionLabel}>Motivo o Nota (Opcional)</Text>
                <TextInput
                  style={styles.conceptInput}
                  placeholder="Ej. Rebalanceo de salidas, préstamo temporal..."
                  placeholderTextColor="#475569"
                  value={transferConcepto}
                  onChangeText={setTransferConcepto}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButtonTransfer,
                    loadingTransfer && styles.submitButtonDisabled
                  ]}
                  onPress={handleTransferSubmit}
                  disabled={loadingTransfer}
                  activeOpacity={0.8}
                >
                  {loadingTransfer ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <ArrowRight size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitButtonText}>
                        {transferAmountNum > 0
                          ? `Mover ${formatCOP(transferAmountNum)}`
                          : 'Ejecutar Transferencia'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.82)'
  },
  modalContainer: {
    width: '92%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#06181D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0F3741',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 17,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B2B33',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9
  },
  tabButtonActiveAdd: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981'
  },
  tabButtonActiveTransfer: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: '#38BDF8'
  },
  tabButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  },
  tabButtonTextActiveAdd: {
    color: '#10B981',
    fontWeight: '700'
  },
  tabButtonTextActiveTransfer: {
    color: '#38BDF8',
    fontWeight: '700'
  },
  formScrollView: {
    maxHeight: 520
  },
  formScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24
  },
  tabContent: {
    gap: 12
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  currentBalanceBadge: {
    fontSize: 12,
    color: '#94A3B8'
  },
  accountPillsRow: {
    flexDirection: 'row',
    gap: 8
  },
  accountPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#0B2B33',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6
  },
  accountPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0B2B33',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'column'
  },
  categoryChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981'
  },
  categoryChipName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600'
  },
  categoryChipNameActive: {
    color: '#10B981',
    fontWeight: '700'
  },
  categoryChipBalance: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2
  },
  categoryChipBalanceActive: {
    color: '#34D399'
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B2B33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14
  },
  currencyPrefix: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '800',
    marginRight: 6
  },
  amountInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8
  },
  clearInputButton: {
    padding: 6
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: 8
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F3741',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  quickAmountText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700'
  },
  conceptInput: {
    backgroundColor: '#0B2B33',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F1F5F9',
    fontSize: 13
  },
  submitButtonAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6
  },
  submitButtonTransfer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  transferSectionCard: {
    backgroundColor: '#0B2B33',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  transferSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  originIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B'
  },
  destIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  transferSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  accountPillsRowCompact: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8
  },
  accountPillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#06181D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  accountPillCompactActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B'
  },
  accountPillCompactActiveDest: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981'
  },
  accountPillCompactText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  accountPillCompactTextActive: {
    color: '#F59E0B',
    fontWeight: '700'
  },
  accountPillCompactTextActiveDest: {
    color: '#10B981',
    fontWeight: '700'
  },
  horizontalChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2
  },
  transferChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#06181D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  transferChipActiveOrigin: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B'
  },
  transferChipActiveDest: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981'
  },
  transferChipTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600'
  },
  transferChipTitleActive: {
    color: '#F1F5F9',
    fontWeight: '700'
  },
  transferChipBalance: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2
  },
  transferChipBalanceActiveOrigin: {
    color: '#F59E0B'
  },
  transferChipBalanceActiveDest: {
    color: '#10B981'
  },
  transferDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: -2
  },
  transferDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  transferDividerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F3741',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  transferAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)'
  },
  transferAllBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700'
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginTop: -4
  },
  warningText: {
    color: '#FCD34D',
    fontSize: 11,
    flex: 1
  }
});
