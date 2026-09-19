import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { X, ShieldCheck } from 'lucide-react-native';
import { theme } from '../theme';
import { MivotryAPI } from '../services/api';

export interface PrimaInjectionModalProps {
  visible: boolean;
  onClose: () => void;
  pagosAnualesActual?: number;
  onSuccess: () => void;
}

const formatCOP = (val: number = 0) => '$' + Math.round(val).toLocaleString('es-CO');

export const PrimaInjectionModal: React.FC<PrimaInjectionModalProps> = ({
  visible,
  onClose,
  pagosAnualesActual = 0,
  onSuccess
}) => {
  const [primaInputMonto, setPrimaInputMonto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInyectarPrima = async () => {
    const clean = primaInputMonto.replace(/[^0-9]/g, '');
    const monto = parseInt(clean, 10);

    if (!monto || monto <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero para la prima.');
      return;
    }

    try {
      setSubmitting(true);
      await MivotryAPI.actualizarAhorroPagosAnuales({
        monto,
        modo: 'sumar',
        concepto: 'Inyección de Prima Semestral'
      });

      Alert.alert(
        '¡Prima Inyectada con Éxito!',
        `Se han sumado ${formatCOP(monto)} al Fondo de Pagos Anuales (Celda I:29).`
      );
      setPrimaInputMonto('');
      onClose();
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar la prima en Google Sheets');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <ShieldCheck size={18} color={theme.colors.accentMint} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Inyectar Prima Semestral</Text>
                <Text style={styles.modalSub}>Fondo de Pagos Anuales (Celda I:29)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.explainText}>
            Suma dinero al fondo de pagos anuales para cubrir SOAT, Impuestos y Tecnicomecánica sin desajustar tus quincenas habituales.
          </Text>

          {/* BALANCE ACTUAL */}
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>Saldo actual en I:29:</Text>
            <Text style={styles.balanceValue}>{formatCOP(pagosAnualesActual)}</Text>
          </View>

          {/* INPUT DE MONTO */}
          <Text style={styles.fieldLabel}>Monto de la prima a inyectar ($ COP):</Text>
          <TextInput
            style={styles.inputMonto}
            placeholder="$0"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            value={primaInputMonto}
            onChangeText={setPrimaInputMonto}
            autoFocus={true}
          />

          {/* CHIPS PRESET */}
          <View style={styles.presetRow}>
            {[500000, 1000000, 1500000, 2000000].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.presetChip}
                onPress={() => setPrimaInputMonto(String(val))}
              >
                <Text style={styles.presetText}>+{formatCOP(val)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* BOTÓN CONFIRMAR */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!primaInputMonto.trim() || submitting) && styles.submitBtnDisabled
            ]}
            onPress={handleInyectarPrima}
            disabled={!primaInputMonto.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={styles.submitBtnText}>Inyectar al Fondo I:29</Text>
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentMintMuted,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold
  },
  modalSub: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.radius.pill
  },
  explainText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 18,
    marginBottom: theme.spacing.md
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md
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
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semiBold,
    marginBottom: 6
  },
  inputMonto: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 12
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  presetText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semiBold
  },
  submitBtn: {
    backgroundColor: theme.colors.accentMint,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center'
  },
  submitBtnDisabled: {
    opacity: 0.4
  },
  submitBtnText: {
    color: theme.colors.background,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold
  }
});
