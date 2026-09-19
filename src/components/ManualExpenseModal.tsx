import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../theme';
import { MivotryAPI, DashboardResponse, GastoItem, TarjetaCreditoItem } from '../services/api';

export interface SelectedGasto {
  nombre: string;
  cuenta: 'nomina' | 'bonos';
  manejoActual: number;
  presupuestoTotal: number;
}

export interface ManualExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  selectedGasto: SelectedGasto | null;
  dashboardData: DashboardResponse | null;
  onSuccess: () => void;
}

type TabMode = 'nomina' | 'bonos' | 'tarjeta' | 'credito';

const formatCOP = (val: number = 0) => '$' + Math.round(val).toLocaleString('es-CO');

export const ManualExpenseModal: React.FC<ManualExpenseModalProps> = ({
  visible,
  onClose,
  selectedGasto: initialGasto,
  dashboardData,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('nomina');
  const [currentGasto, setCurrentGasto] = useState<SelectedGasto | null>(initialGasto);
  const [montoInput, setMontoInput] = useState('');
  const [conceptoInput, setConceptoInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tarjeta de crédito
  const tarjetas: TarjetaCreditoItem[] = dashboardData?.deudas?.tarjetasDetalle ?? [];
  const [selectedTarjeta, setSelectedTarjeta] = useState<TarjetaCreditoItem | null>(null);
  const [tcMode, setTcMode] = useState<'compra' | 'pago'>('compra');

  // Créditos bancarios
  const [selectedCredito, setSelectedCredito] = useState<'apto' | 'occidente'>('apto');

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setCurrentGasto(initialGasto);
      setMontoInput('');
      setConceptoInput('');
      setSelectedTarjeta(tarjetas[0] ?? null);
      setSelectedCredito('apto');
      setTcMode('compra');
      // Si el gasto inicial es de bonos, arrancar en esa tab
      setActiveTab(initialGasto?.cuenta === 'bonos' ? 'bonos' : 'nomina');
    }
  }, [visible, initialGasto]);

  // Sincronizar tarjeta seleccionada cuando carguen las tarjetas
  useEffect(() => {
    if (tarjetas.length > 0 && !selectedTarjeta) {
      setSelectedTarjeta(tarjetas[0]);
    }
  }, [tarjetas]);

  const parseMonto = () => {
    const clean = montoInput.replace(/[^0-9]/g, '');
    return parseInt(clean, 10);
  };

  // ── GUARDAR GASTO NORMAL ────────────────────────────────────────
  const handleSaveGasto = async () => {
    if (!currentGasto) return;
    const monto = parseMonto();
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await MivotryAPI.registrarGasto({
        cuenta: currentGasto.cuenta,
        categoria: currentGasto.nombre,
        monto,
        concepto: conceptoInput.trim() || undefined,
        origen: 'manual'
      });
      if (res.success) {
        Alert.alert('¡Gasto Registrado!', `Se descontaron ${formatCOP(monto)} de ${currentGasto.nombre}.\nNuevo saldo: ${formatCOP(res.nuevoSaldo)}`);
        onClose();
        onSuccess();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar el gasto.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  // ── GUARDAR TARJETA DE CRÉDITO ──────────────────────────────────
  const handleSaveTarjeta = async () => {
    if (!selectedTarjeta) {
      Alert.alert('Selecciona una tarjeta', 'No hay tarjetas de crédito configuradas.');
      return;
    }
    const monto = parseMonto();
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await MivotryAPI.actualizarSaldoTarjetaCredito({
        tarjeta: selectedTarjeta.nombre,
        monto,
        operacion: tcMode === 'compra' ? 'sumar' : 'restar',
        concepto: conceptoInput.trim() || undefined,
        fila: selectedTarjeta.fila
      });
      if (res.success) {
        const accion = tcMode === 'compra' ? 'Compra registrada' : 'Pago registrado';
        Alert.alert(`✅ ${accion}`, `${formatCOP(monto)} en ${selectedTarjeta.nombre}.\nNuevo saldo: ${formatCOP(res.nuevoSaldo)}`);
        onClose();
        onSuccess();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  // ── PAGAR CUOTA CRÉDITO BANCARIO ────────────────────────────────
  const handleSaveCredito = async () => {
    const monto = parseMonto();
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await MivotryAPI.pagarCuotaCredito({
        credito: selectedCredito,
        monto,
        concepto: conceptoInput.trim() || undefined
      });
      if (res.success) {
        Alert.alert(
          '✅ Cuota registrada',
          `Se abonaron ${formatCOP(monto)} a ${res.credito}.\nNuevo saldo: ${formatCOP(res.nuevoSaldo)}`
        );
        onClose();
        onSuccess();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar el pago.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = () => {
    if (activeTab === 'tarjeta') return handleSaveTarjeta();
    if (activeTab === 'credito') return handleSaveCredito();
    return handleSaveGasto();
  };

  if (!visible) return null;

  const categories =
    activeTab === 'bonos'
      ? dashboardData?.bonos.gastos
      : dashboardData?.nomina.gastos;

  const creditoApto = dashboardData?.deudas?.creditoApto;
  const creditoOcc = dashboardData?.deudas?.creditoOccidente;

  const tabs: { key: TabMode; label: string }[] = [
    { key: 'nomina',  label: '💵 Nómina' },
    { key: 'bonos',   label: '🎫 Bonos' },
    { key: 'tarjeta', label: '💳 TC' },
    { key: 'credito', label: '🏦 Crédito' },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>

          {/* CABECERA */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalCategoryTitle}>Registrar Movimiento</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* TABS PRINCIPALES */}
          <View style={styles.tabRow}>
            {tabs.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                onPress={() => {
                  setActiveTab(t.key);
                  setMontoInput('');
                  setConceptoInput('');
                  if (t.key === 'nomina') {
                    const first = dashboardData?.nomina.gastos[0];
                    if (first) setCurrentGasto({ nombre: first.nombre, cuenta: 'nomina', manejoActual: first.manejoActual, presupuestoTotal: first.presupuestoTotal });
                  }
                  if (t.key === 'bonos') {
                    const first = dashboardData?.bonos.gastos[0];
                    if (first) setCurrentGasto({ nombre: first.nombre, cuenta: 'bonos', manejoActual: first.manejoActual, presupuestoTotal: first.presupuestoTotal });
                  }
                }}
              >
                <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── MODO NÓMINA / BONOS ──────────────────────── */}
          {(activeTab === 'nomina' || activeTab === 'bonos') && (
            <>
              <Text style={styles.inputFieldLabel}>Categoría:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
                {categories?.map((g: GastoItem, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.categoryChip, currentGasto?.nombre === g.nombre && styles.categoryChipActive]}
                    onPress={() => setCurrentGasto({ nombre: g.nombre, cuenta: activeTab, manejoActual: g.manejoActual, presupuestoTotal: g.presupuestoTotal })}
                  >
                    <Text style={[styles.categoryChipText, currentGasto?.nombre === g.nombre && styles.categoryChipTextActive]}>
                      {g.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>Disponible en Manejo:</Text>
                <Text style={styles.balanceValue}>{formatCOP(currentGasto?.manejoActual)}</Text>
              </View>
            </>
          )}

          {/* ── MODO TARJETA DE CRÉDITO ──────────────────── */}
          {activeTab === 'tarjeta' && (
            <>
              {/* Tipo: Compra o Pago */}
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, tcMode === 'compra' && styles.segmentBtnActive]}
                  onPress={() => setTcMode('compra')}
                >
                  <Text style={[styles.segmentText, tcMode === 'compra' && styles.segmentTextActive]}>🛍️ Compra</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, tcMode === 'pago' && styles.segmentBtnActiveGreen]}
                  onPress={() => setTcMode('pago')}
                >
                  <Text style={[styles.segmentText, tcMode === 'pago' && styles.segmentTextActive]}>💸 Pagar cuota</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputFieldLabel}>Tarjeta:</Text>
              {tarjetas.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
                  {tarjetas.map((t, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.categoryChip, selectedTarjeta?.fila === t.fila && styles.categoryChipActive]}
                      onPress={() => setSelectedTarjeta(t)}
                    >
                      <Text style={[styles.categoryChipText, selectedTarjeta?.fila === t.fila && styles.categoryChipTextActive]}>
                        {t.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyHint}>No hay tarjetas registradas en el Sheet.</Text>
              )}

              {selectedTarjeta && (
                <View style={styles.balanceBox}>
                  <Text style={styles.balanceLabel}>
                    {tcMode === 'compra' ? 'Saldo deuda actual:' : 'Saldo a cancelar:'}
                  </Text>
                  <Text style={[styles.balanceValue, { color: '#EF4444' }]}>{formatCOP(selectedTarjeta.saldo)}</Text>
                </View>
              )}
            </>
          )}

          {/* ── MODO CRÉDITO BANCARIO ─────────────────────── */}
          {activeTab === 'credito' && (
            <>
              <Text style={styles.inputFieldLabel}>Crédito:</Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, selectedCredito === 'apto' && styles.segmentBtnActiveGreen]}
                  onPress={() => setSelectedCredito('apto')}
                >
                  <Text style={[styles.segmentText, selectedCredito === 'apto' && styles.segmentTextActive]}>Apto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, selectedCredito === 'occidente' && styles.segmentBtnActiveGreen]}
                  onPress={() => setSelectedCredito('occidente')}
                >
                  <Text style={[styles.segmentText, selectedCredito === 'occidente' && styles.segmentTextActive]}>Occidente</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>Saldo deuda:</Text>
                <Text style={[styles.balanceValue, { color: '#EF4444' }]}>
                  {selectedCredito === 'apto'
                    ? formatCOP(creditoApto?.saldo ?? 0)
                    : formatCOP(creditoOcc?.saldo ?? 0)}
                </Text>
              </View>

              <Text style={styles.infoHint}>
                💡 Registra el valor de la cuota mensual que pagas. Reduce el saldo de la deuda en el Sheet.
              </Text>
            </>
          )}

          {/* MONTO (común a todos los modos) */}
          <Text style={styles.inputFieldLabel}>
            {activeTab === 'tarjeta' && tcMode === 'pago' ? 'Valor cuota pagada ($COP):' :
             activeTab === 'credito' ? 'Valor cuota pagada ($COP):' :
             'Monto a descontar ($COP):'}
          </Text>
          <TextInput
            style={styles.modalInputMonto}
            placeholder="$0"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            value={montoInput}
            onChangeText={setMontoInput}
            autoFocus={true}
          />

          {/* CONCEPTO */}
          <Text style={styles.inputFieldLabel}>Concepto (opcional):</Text>
          <TextInput
            style={styles.modalInputConcepto}
            placeholder="Ej. Cuota febrero, Cena, etc."
            placeholderTextColor={theme.colors.textMuted}
            value={conceptoInput}
            onChangeText={setConceptoInput}
          />

          {/* BOTÓN CONFIRMAR */}
          <TouchableOpacity
            style={[styles.modalSubmitBtn, (!montoInput.trim() || submitting) && styles.modalSubmitBtnDisabled]}
            onPress={handleSave}
            disabled={!montoInput.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={styles.modalSubmitBtnText}>
                {activeTab === 'tarjeta'
                  ? tcMode === 'compra' ? '💳 Registrar compra TC' : '💸 Registrar pago TC'
                  : activeTab === 'credito'
                  ? '🏦 Registrar pago de cuota'
                  : '✅ Registrar en Google Sheets'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    padding: theme.spacing.xl,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  modalCategoryTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold
  },
  modalCloseBtn: {
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.radius.pill
  },
  // Tabs principales
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.radius.md,
    padding: 3,
    marginBottom: theme.spacing.md,
    gap: 2
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: theme.radius.sm
  },
  tabBtnActive: {
    backgroundColor: theme.colors.surface1
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semiBold
  },
  tabTextActive: {
    color: theme.colors.accentMint,
    fontWeight: theme.typography.fontWeights.bold
  },
  // Segmento compra/pago
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.radius.md,
    padding: 3,
    marginBottom: theme.spacing.sm,
    gap: 3
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.2)'
  },
  segmentBtnActiveGreen: {
    backgroundColor: theme.colors.accentMintMuted
  },
  segmentText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semiBold
  },
  segmentTextActive: {
    color: theme.colors.accentMint,
    fontWeight: theme.typography.fontWeights.bold
  },
  inputFieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semiBold,
    marginBottom: 6,
    marginTop: 6
  },
  categoryChipsScroll: {
    marginBottom: theme.spacing.sm
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accentMintMuted,
    borderColor: theme.colors.accentMint
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium
  },
  categoryChipTextActive: {
    color: theme.colors.accentMint,
    fontWeight: theme.typography.fontWeights.bold
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderRadius: theme.radius.md,
    marginVertical: 8
  },
  balanceLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs
  },
  balanceValue: {
    color: theme.colors.accentMint,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold
  },
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.fontSizes.xs,
    marginBottom: 8,
    fontStyle: 'italic'
  },
  infoHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    marginBottom: 8,
    lineHeight: 16
  },
  modalInputMonto: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 8
  },
  modalInputConcepto: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSizes.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 16
  },
  modalSubmitBtn: {
    backgroundColor: theme.colors.accentMint,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  modalSubmitBtnDisabled: {
    opacity: 0.4
  },
  modalSubmitBtnText: {
    color: theme.colors.background,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold
  }
});
