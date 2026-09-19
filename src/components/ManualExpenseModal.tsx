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
import { MivotryAPI, DashboardResponse, GastoItem } from '../services/api';

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

const formatCOP = (val: number = 0) => '$' + Math.round(val).toLocaleString('es-CO');

export const ManualExpenseModal: React.FC<ManualExpenseModalProps> = ({
  visible,
  onClose,
  selectedGasto: initialGasto,
  dashboardData,
  onSuccess
}) => {
  const [currentGasto, setCurrentGasto] = useState<SelectedGasto | null>(initialGasto);
  const [montoInput, setMontoInput] = useState('');
  const [conceptoInput, setConceptoInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentGasto(initialGasto);
    setMontoInput('');
    setConceptoInput('');
  }, [initialGasto, visible]);

  const handleSave = async () => {
    if (!currentGasto) return;
    const cleanStr = montoInput.replace(/[^0-9]/g, '');
    const monto = parseInt(cleanStr, 10);

    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await MivotryAPI.registrarGasto({
        cuenta: currentGasto.cuenta,
        categoria: currentGasto.nombre,
        monto: monto,
        concepto: conceptoInput.trim() || undefined,
        origen: 'manual'
      });

      if (res.success) {
        Alert.alert(
          '¡Gasto Registrado!',
          `Se descontaron ${formatCOP(monto)} de ${currentGasto.nombre}.\nNuevo saldo: ${formatCOP(res.nuevoSaldo)}`
        );
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

  if (!visible) return null;

  const categories =
    currentGasto?.cuenta === 'bonos'
      ? dashboardData?.bonos.gastos
      : dashboardData?.nomina.gastos;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* CABECERA */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalCategoryTitle}>{currentGasto?.nombre || 'Registrar Gasto'}</Text>
              <Text style={styles.modalCategorySub}>
                Cuenta: {currentGasto?.cuenta === 'bonos' ? 'Tarjeta Bonos' : 'Sueldo Nómina'}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* SELECTOR DE CUENTA */}
          <View style={styles.modalAccountToggleRow}>
            <TouchableOpacity
              style={[
                styles.modalAccountToggleBtn,
                currentGasto?.cuenta === 'nomina' && styles.modalAccountToggleBtnActive
              ]}
              onPress={() => {
                const firstNomina = dashboardData?.nomina.gastos[0];
                if (firstNomina) {
                  setCurrentGasto({
                    nombre: firstNomina.nombre,
                    cuenta: 'nomina',
                    manejoActual: firstNomina.manejoActual,
                    presupuestoTotal: firstNomina.presupuestoTotal
                  });
                }
              }}
            >
              <Text
                style={[
                  styles.modalAccountToggleText,
                  currentGasto?.cuenta === 'nomina' && styles.modalAccountToggleTextActive
                ]}
              >
                Sueldo Nómina
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalAccountToggleBtn,
                currentGasto?.cuenta === 'bonos' && styles.modalAccountToggleBtnActive
              ]}
              onPress={() => {
                const firstBono = dashboardData?.bonos.gastos[0];
                if (firstBono) {
                  setCurrentGasto({
                    nombre: firstBono.nombre,
                    cuenta: 'bonos',
                    manejoActual: firstBono.manejoActual,
                    presupuestoTotal: firstBono.presupuestoTotal
                  });
                }
              }}
            >
              <Text
                style={[
                  styles.modalAccountToggleText,
                  currentGasto?.cuenta === 'bonos' && styles.modalAccountToggleTextActive
                ]}
              >
                Tarjeta Bonos
              </Text>
            </TouchableOpacity>
          </View>

          {/* SELECTOR DE CATEGORÍA */}
          <Text style={styles.inputFieldLabel}>Cambiar categoría:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
            {categories?.map((g: GastoItem, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.categoryChip,
                  currentGasto?.nombre === g.nombre && styles.categoryChipActive
                ]}
                onPress={() => {
                  setCurrentGasto({
                    nombre: g.nombre,
                    cuenta: currentGasto?.cuenta || 'nomina',
                    manejoActual: g.manejoActual,
                    presupuestoTotal: g.presupuestoTotal
                  });
                }}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    currentGasto?.nombre === g.nombre && styles.categoryChipTextActive
                  ]}
                >
                  {g.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* BALANCE DISPONIBLE */}
          <View style={styles.modalBalanceBox}>
            <Text style={styles.modalBalanceLabel}>Saldo disponible en Manejo:</Text>
            <Text style={styles.modalBalanceValue}>{formatCOP(currentGasto?.manejoActual)}</Text>
          </View>

          {/* MONTO */}
          <Text style={styles.inputFieldLabel}>Monto a descontar ($ COP):</Text>
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
          <Text style={styles.inputFieldLabel}>Concepto o detalle (opcional):</Text>
          <TextInput
            style={styles.modalInputConcepto}
            placeholder="Ej. Tanqueada, Almuerzo, etc."
            placeholderTextColor={theme.colors.textMuted}
            value={conceptoInput}
            onChangeText={setConceptoInput}
          />

          {/* BOTÓN CONFIRMAR */}
          <TouchableOpacity
            style={[
              styles.modalSubmitBtn,
              (!montoInput.trim() || submitting) && styles.modalSubmitBtnDisabled
            ]}
            onPress={handleSave}
            disabled={!montoInput.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={styles.modalSubmitBtnText}>Registrar en Google Sheets</Text>
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
  modalCategorySub: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.radius.pill
  },
  modalAccountToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.radius.md,
    padding: 3,
    marginBottom: theme.spacing.md
  },
  modalAccountToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm
  },
  modalAccountToggleBtnActive: {
    backgroundColor: theme.colors.surface1
  },
  modalAccountToggleText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semiBold
  },
  modalAccountToggleTextActive: {
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
  modalBalanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderRadius: theme.radius.md,
    marginVertical: 8
  },
  modalBalanceLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs
  },
  modalBalanceValue: {
    color: theme.colors.accentMint,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold
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
