import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  X,
  Zap,
  CheckCircle2,
  Trash2,
  Building2,
  Wallet,
  Plus,
  Minus,
  Sparkles,
  Layers
} from 'lucide-react-native';
import { MivotryAPI, DashboardResponse } from '../services/api';
import { QuickActionItem, quickActionsService } from '../services/quickActionsService';

export interface QuickActionExecuteModalProps {
  visible: boolean;
  onClose: () => void;
  action?: QuickActionItem | null;
  mode?: 'execute' | 'create';
  dashboardData?: DashboardResponse | null;
  onSuccess?: (details?: {
    type: 'expense' | 'created' | 'deleted';
    action?: QuickActionItem;
    res?: any;
  }) => void;
  onActionCreated?: (newAction: QuickActionItem) => void;
  onActionDeleted?: (actionId: string) => void;
}

const EMOJI_PRESETS = [
  '⛽', '🍽️', '🛒', '🥬', '🎬', '🐱', '☕', '💊',
  '🚗', '🍕', '👕', '🏋️', '✈️', '💻', '💡', '🐾',
  '🍔', '🍦', '📦', '🏥', '💈', '📱', '🎮', '🥖'
];

const DEFAULT_NOMINA_CATEGORIES = [
  'Gasolina/Lavar',
  'Salidas',
  'Mercado',
  'Servicios',
  'Administración',
  'Deudas tarjetas',
  'Ahorro',
  'Gatos'
];

const DEFAULT_BONOS_CATEGORIES = [
  'Pricesmart',
  'Verduras y demas',
  'Gatos',
  'Salidas'
];

const formatCOP = (val: number = 0): string => {
  return '$' + Math.round(val).toLocaleString('es-CO');
};

export const QuickActionExecuteModal: React.FC<QuickActionExecuteModalProps> = ({
  visible,
  onClose,
  action,
  mode: initialMode = 'execute',
  dashboardData,
  onSuccess,
  onActionCreated,
  onActionDeleted
}) => {
  const [currentMode, setCurrentMode] = useState<'execute' | 'create'>(
    !action || initialMode === 'create' ? 'create' : 'execute'
  );

  // --- Estado Modo Ejecución ---
  const [executeAmount, setExecuteAmount] = useState<number>(0);
  const [executeConcepto, setExecuteConcepto] = useState<string>('');
  const [submittingExpense, setSubmittingExpense] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{
    montoDescontado: number;
    nuevoSaldo?: number;
    categoria: string;
  } | null>(null);

  // --- Estado Modo Crear Atajo ---
  const [createTitulo, setCreateTitulo] = useState<string>('');
  const [createIcono, setCreateIcono] = useState<string>('⚡');
  const [createCuenta, setCreateCuenta] = useState<'nomina' | 'bonos'>('nomina');
  const [createCategoria, setCreateCategoria] = useState<string>('');
  const [createMonto, setCreateMonto] = useState<string>('50000');
  const [createConcepto, setCreateConcepto] = useState<string>('');
  const [savingAction, setSavingAction] = useState<boolean>(false);

  // Sincronizar estado cuando se abre el modal o cambia el action
  useEffect(() => {
    if (visible) {
      setSuccessInfo(null);
      if (action && initialMode !== 'create') {
        setCurrentMode('execute');
        setExecuteAmount(action.monto);
        setExecuteConcepto(action.concepto || action.titulo);
      } else {
        setCurrentMode('create');
        setCreateTitulo('');
        setCreateIcono('⚡');
        setCreateCuenta('nomina');
        setCreateCategoria(DEFAULT_NOMINA_CATEGORIES[0]);
        setCreateMonto('50000');
        setCreateConcepto('');
      }
    }
  }, [visible, action, initialMode]);

  // Lista de categorías disponibles según la cuenta seleccionada
  const availableCategories = useMemo(() => {
    const targetAccount = currentMode === 'execute' ? action?.cuenta : createCuenta;

    if (targetAccount === 'bonos') {
      if (dashboardData?.bonos?.gastos && dashboardData.bonos.gastos.length > 0) {
        return dashboardData.bonos.gastos.map((g) => g.nombre).filter(Boolean);
      }
      return DEFAULT_BONOS_CATEGORIES;
    }

    // Nómina
    if (dashboardData?.nomina?.gastos && dashboardData.nomina.gastos.length > 0) {
      return dashboardData.nomina.gastos.map((g) => g.nombre).filter(Boolean);
    }
    return DEFAULT_NOMINA_CATEGORIES;
  }, [currentMode, action?.cuenta, createCuenta, dashboardData]);

  // Ajustar categoría por defecto al cambiar la cuenta en creación
  useEffect(() => {
    if (currentMode === 'create' && availableCategories.length > 0) {
      if (!availableCategories.includes(createCategoria)) {
        setCreateCategoria(availableCategories[0]);
      }
    }
  }, [createCuenta, availableCategories, currentMode]);

  // --- Manejo de Ajustes Rápidos en Ejecución ---
  const handleAdjustAmount = (delta: number) => {
    setExecuteAmount((prev) => Math.max(0, prev + delta));
  };

  const handleResetAmount = () => {
    if (action) {
      setExecuteAmount(action.monto);
    }
  };

  // --- Ejecutar Gasto 1-Tap ---
  const handleExecuteGasto = async () => {
    if (!action) return;
    if (executeAmount <= 0) {
      Alert.alert('Monto Inválido', 'El monto debe ser mayor a $0.');
      return;
    }

    try {
      setSubmittingExpense(true);
      const res = await MivotryAPI.registrarGasto({
        cuenta: action.cuenta,
        categoria: action.categoria,
        monto: executeAmount,
        concepto: executeConcepto.trim() || action.titulo,
        origen: 'manual'
      });

      if (res && res.success) {
        setSuccessInfo({
          montoDescontado: executeAmount,
          nuevoSaldo: res.nuevoSaldo,
          categoria: action.categoria
        });
        if (onSuccess) {
          onSuccess({ type: 'expense', action, res });
        }
      } else {
        Alert.alert('Error', res?.error || 'No se pudo registrar el gasto.');
      }
    } catch (err: any) {
      console.error('[QuickActionExecuteModal] Error al registrar gasto:', err);
      Alert.alert('Error de conexión', err?.message || 'Ocurrió un error al contactar la API.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // --- Eliminar Atajo Rápido ---
  const handleDeleteAction = () => {
    if (!action) return;

    Alert.alert(
      'Eliminar Atajo',
      `¿Seguro que deseas eliminar el atajo "${action.titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await quickActionsService.deleteQuickAction(action.id);
              if (onActionDeleted) {
                onActionDeleted(action.id);
              }
              if (onSuccess) {
                onSuccess({ type: 'deleted', action });
              }
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar el atajo.');
            }
          }
        }
      ]
    );
  };

  // --- Crear Nuevo Atajo ---
  const handleCreateAction = async () => {
    const titulo = createTitulo.trim();
    if (!titulo) {
      Alert.alert('Título Requerido', 'Por favor ingresa un título para el atajo.');
      return;
    }

    const montoNum = parseFloat(createMonto.replace(/[^0-9]/g, ''));
    if (!montoNum || montoNum <= 0) {
      Alert.alert('Monto Inválido', 'Por favor ingresa un monto mayor a $0.');
      return;
    }

    if (!createCategoria) {
      Alert.alert('Categoría Requerida', 'Por favor selecciona una categoría de destino.');
      return;
    }

    try {
      setSavingAction(true);
      const updatedList = await quickActionsService.addQuickAction({
        titulo,
        icono: createIcono || '⚡',
        cuenta: createCuenta,
        categoria: createCategoria,
        monto: montoNum,
        concepto: createConcepto.trim() || titulo
      });

      const newCreated = updatedList[updatedList.length - 1];
      if (onActionCreated && newCreated) {
        onActionCreated(newCreated);
      }
      if (onSuccess) {
        onSuccess({ type: 'created', action: newCreated });
      }
      Alert.alert('¡Atajo Creado!', `El atajo "${titulo}" ha sido guardado correctamente.`);
      onClose();
    } catch (err: any) {
      console.error('[QuickActionExecuteModal] Error al crear atajo:', err);
      Alert.alert('Error', err?.message || 'No se pudo guardar el atajo.');
    } finally {
      setSavingAction(false);
    }
  };

  const isNomina = (currentMode === 'execute' ? action?.cuenta : createCuenta) === 'nomina';

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
        <View style={styles.modalCard}>
          {/* Header del Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBadge}>
                <Zap size={16} color="#10B981" />
              </View>
              <Text style={styles.modalHeaderTitle}>
                {currentMode === 'execute' ? 'Confirmar Gasto Rápido' : 'Crear Nuevo Atajo'}
              </Text>
            </View>

            <View style={styles.headerRightActions}>
              {currentMode === 'execute' && action && (
                <TouchableOpacity
                  style={styles.deleteHeaderBtn}
                  onPress={handleDeleteAction}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Pantalla de Éxito Tras Registrar Gasto */}
            {successInfo ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={42} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>¡Gasto Registrado con Éxito!</Text>
                <Text style={styles.successSubtitle}>
                  Se descontaron{' '}
                  <Text style={styles.successHighlight}>{formatCOP(successInfo.montoDescontado)}</Text>{' '}
                  de <Text style={styles.successHighlight}>{successInfo.categoria}</Text>.
                </Text>
                {typeof successInfo.nuevoSaldo === 'number' && (
                  <View style={styles.balancePill}>
                    <Text style={styles.balancePillLabel}>Nuevo saldo en manejo:</Text>
                    <Text style={styles.balancePillValue}>{formatCOP(successInfo.nuevoSaldo)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.successCloseBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.successCloseBtnText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            ) : currentMode === 'execute' && action ? (
              /* ============================================================ */
              /* MODO EJECUCIÓN (CONFIRMAR GASTO 1-TAP)                        */
              /* ============================================================ */
              <View style={styles.executeContainer}>
                {/* Tarjeta Resumen del Atajo */}
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryEmojiBadge, isNomina ? styles.badgeNomina : styles.badgeBonos]}>
                    <Text style={styles.summaryEmojiText}>{action.icono || '⚡'}</Text>
                  </View>
                  <View style={styles.summaryDetails}>
                    <Text style={styles.summaryTitle}>{action.titulo}</Text>
                    <View style={styles.summaryBadgesRow}>
                      <View
                        style={[
                          styles.accountPill,
                          {
                            backgroundColor: isNomina
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(139, 92, 246, 0.18)'
                          }
                        ]}
                      >
                        {isNomina ? (
                          <Building2 size={11} color="#10B981" />
                        ) : (
                          <Wallet size={11} color="#A78BFA" />
                        )}
                        <Text
                          style={[
                            styles.accountPillText,
                            { color: isNomina ? '#10B981' : '#A78BFA' }
                          ]}
                        >
                          {isNomina ? 'Nómina' : 'Bonos'}
                        </Text>
                      </View>

                      <View style={styles.categoryPill}>
                        <Layers size={11} color="#94A3B8" />
                        <Text style={styles.categoryPillText}>{action.categoria}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Display del Monto Grande y Editable */}
                <View style={styles.amountDisplayCard}>
                  <Text style={styles.amountLabel}>Monto a descontar</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      value={executeAmount ? executeAmount.toLocaleString('es-CO') : '0'}
                      onChangeText={(val) => {
                        const clean = parseFloat(val.replace(/[^0-9]/g, '')) || 0;
                        setExecuteAmount(clean);
                      }}
                      selectTextOnFocus
                    />
                  </View>

                  {/* Botones de Ajuste Rápido (-10k, +10k, +50k) */}
                  <View style={styles.adjustmentRow}>
                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjBtnMinus]}
                      onPress={() => handleAdjustAmount(-10000)}
                      activeOpacity={0.7}
                    >
                      <Minus size={12} color="#EF4444" />
                      <Text style={[styles.adjBtnText, { color: '#EF4444' }]}>10k</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjBtnPlus]}
                      onPress={() => handleAdjustAmount(10000)}
                      activeOpacity={0.7}
                    >
                      <Plus size={12} color="#10B981" />
                      <Text style={[styles.adjBtnText, { color: '#10B981' }]}>10k</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjBtnPlus]}
                      onPress={() => handleAdjustAmount(50000)}
                      activeOpacity={0.7}
                    >
                      <Plus size={12} color="#10B981" />
                      <Text style={[styles.adjBtnText, { color: '#10B981' }]}>50k</Text>
                    </TouchableOpacity>

                    {executeAmount !== action.monto && (
                      <TouchableOpacity
                        style={styles.adjBtnReset}
                        onPress={handleResetAmount}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.adjBtnResetText}>Reset</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Concepto / Nota Opcional */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Concepto / Detalle (Opcional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. Gasolina bomba calle 5ta"
                    placeholderTextColor="#64748B"
                    value={executeConcepto}
                    onChangeText={setExecuteConcepto}
                  />
                </View>

                {/* Botón Principal de Confirmación 1-Tap */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, submittingExpense && styles.btnDisabled]}
                  onPress={handleExecuteGasto}
                  disabled={submittingExpense}
                  activeOpacity={0.8}
                >
                  {submittingExpense ? (
                    <View style={styles.btnLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Registrando en Sheets...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnLoadingRow}>
                      <Sparkles size={18} color="#06181D" />
                      <Text style={styles.primaryActionBtnText}>Registrar Gasto en Sheets</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ============================================================ */
              /* MODO CREAR NUEVO ATAJO                                       */
              /* ============================================================ */
              <View style={styles.createContainer}>
                {/* Selector de Emoji */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ícono Emoji</Text>
                  <View style={styles.emojiRow}>
                    <View style={styles.selectedEmojiBox}>
                      <Text style={styles.selectedEmojiText}>{createIcono}</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.emojiList}
                    >
                      {EMOJI_PRESETS.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[
                            styles.emojiChoiceBtn,
                            createIcono === emoji && styles.emojiChoiceSelected
                          ]}
                          onPress={() => setCreateIcono(emoji)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.emojiChoiceText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Título del Atajo */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre del Atajo *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. Café Matutino, Uber, Cine..."
                    placeholderTextColor="#64748B"
                    value={createTitulo}
                    onChangeText={setCreateTitulo}
                  />
                </View>

                {/* Selector de Cuenta */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cuenta de Origen *</Text>
                  <View style={styles.accountSelectorRow}>
                    <TouchableOpacity
                      style={[
                        styles.accountSelectorBtn,
                        createCuenta === 'nomina' && styles.accountSelectorNominaActive
                      ]}
                      onPress={() => setCreateCuenta('nomina')}
                      activeOpacity={0.7}
                    >
                      <Building2
                        size={16}
                        color={createCuenta === 'nomina' ? '#10B981' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.accountSelectorText,
                          createCuenta === 'nomina' && styles.accountSelectorNominaTextActive
                        ]}
                      >
                        Nómina
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.accountSelectorBtn,
                        createCuenta === 'bonos' && styles.accountSelectorBonosActive
                      ]}
                      onPress={() => setCreateCuenta('bonos')}
                      activeOpacity={0.7}
                    >
                      <Wallet
                        size={16}
                        color={createCuenta === 'bonos' ? '#8B5CF6' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.accountSelectorText,
                          createCuenta === 'bonos' && styles.accountSelectorBonosTextActive
                        ]}
                      >
                        Bonos
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selector de Categoría */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Categoría de Destino *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryChipsScroll}
                  >
                    {availableCategories.map((cat) => {
                      const isSelected = createCategoria === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            isSelected && (isNomina ? styles.categoryChipNominaActive : styles.categoryChipBonosActive)
                          ]}
                          onPress={() => setCreateCategoria(cat)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              isSelected && styles.categoryChipTextActive
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Monto por Defecto */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monto Predeterminado *</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      value={
                        createMonto
                          ? parseFloat(createMonto.replace(/[^0-9]/g, '') || '0').toLocaleString('es-CO')
                          : '0'
                      }
                      onChangeText={(val) => {
                        const clean = val.replace(/[^0-9]/g, '');
                        setCreateMonto(clean);
                      }}
                      selectTextOnFocus
                    />
                  </View>

                  {/* Atajos Rápidos de Monto */}
                  <View style={styles.adjustmentRow}>
                    {[20000, 50000, 100000, 200000].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={styles.quickMontoBtn}
                        onPress={() => setCreateMonto(m.toString())}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickMontoBtnText}>{formatCOP(m)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Concepto / Nota Opcional */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Concepto o Nota Predeterminada</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. Compra recurrente (opcional)"
                    placeholderTextColor="#64748B"
                    value={createConcepto}
                    onChangeText={setCreateConcepto}
                  />
                </View>

                {/* Botón Guardar Atajo */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, savingAction && styles.btnDisabled]}
                  onPress={handleCreateAction}
                  disabled={savingAction}
                  activeOpacity={0.8}
                >
                  {savingAction ? (
                    <View style={styles.btnLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Guardando Atajo...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnLoadingRow}>
                      <Plus size={18} color="#06181D" />
                      <Text style={styles.primaryActionBtnText}>Guardar Nuevo Atajo</Text>
                    </View>
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
    backgroundColor: 'rgba(6, 24, 29, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0F3741',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
  },

  /* Pantalla de Éxito */
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  successHighlight: {
    color: '#10B981',
    fontWeight: '700',
  },
  balancePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  balancePillLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  balancePillValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38BDF8',
  },
  successCloseBtn: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  successCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06181D',
  },

  /* MODO EJECUCIÓN */
  executeContainer: {
    gap: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 24, 29, 0.5)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryEmojiBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeNomina: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeBonos: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  summaryEmojiText: {
    fontSize: 26,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  summaryBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  accountPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Display de Monto */
  amountDisplayCard: {
    backgroundColor: 'rgba(6, 24, 29, 0.4)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F1F5F9',
    minWidth: 140,
    textAlign: 'center',
    padding: 0,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  adjBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  adjBtnMinus: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  adjBtnPlus: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  adjBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  adjBtnReset: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  adjBtnResetText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Campos de Entrada */
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  textInput: {
    backgroundColor: 'rgba(6, 24, 29, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Botón Principal */
  primaryActionBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#06181D',
  },

  /* MODO CREAR ATAJO */
  createContainer: {
    gap: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedEmojiBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  selectedEmojiText: {
    fontSize: 24,
  },
  emojiList: {
    gap: 6,
    paddingVertical: 4,
  },
  emojiChoiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiChoiceSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  emojiChoiceText: {
    fontSize: 20,
  },
  accountSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accountSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 24, 29, 0.6)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  accountSelectorNominaActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  accountSelectorBonosActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: '#8B5CF6',
  },
  accountSelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  accountSelectorNominaTextActive: {
    color: '#10B981',
  },
  accountSelectorBonosTextActive: {
    color: '#A78BFA',
  },
  categoryChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipNominaActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  categoryChipBonosActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryChipTextActive: {
    color: '#F1F5F9',
    fontWeight: '700',
  },
  quickMontoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickMontoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
  },
});

export default QuickActionExecuteModal;
