import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  Smartphone,
  X,
  Clipboard as ClipboardIcon,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  CreditCard,
  Building2,
  Tag,
  AlertCircle
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { CONFIG } from '../config';
import { parseBankSMS, ParsedBankSMS, SMS_TEST_TEMPLATES, SMSTemplate } from '../services/smsParser';
import { MivotryAPI, DashboardResponse } from '../services/api';

interface SMSDetectorModalProps {
  visible: boolean;
  onClose: () => void;
  dashboardData: DashboardResponse | null;
  onGastoRegistrado: () => void;
}

export const SMSDetectorModal: React.FC<SMSDetectorModalProps> = ({
  visible,
  onClose,
  dashboardData,
  onGastoRegistrado
}) => {
  const [inputText, setInputText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedBankSMS | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedCuenta, setSelectedCuenta] = useState<'nomina' | 'bonos'>('nomina');
  const [customConcepto, setCustomConcepto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Leer texto desde el portapapeles con 1 toque
  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text.trim().length === 0) {
        Alert.alert('Portapapeles vacío', 'No se encontró ningún texto copiado en tu celular.');
        return;
      }
      setInputText(text);
      analyzeText(text);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo acceder al portapapeles: ' + e.message);
    }
  };

  // Analizar texto (sea pegado o escrito)
  const analyzeText = (text: string) => {
    const result = parseBankSMS(text);
    if (result) {
      setParsedResult(result);
      setSelectedCategoria(result.categoriaSugerida);
      setSelectedCuenta(result.cuentaSugerida);
      setCustomConcepto(result.comercio);
    } else {
      setParsedResult(null);
    }
  };

  // Seleccionar plantilla de prueba rápida
  const handleSelectTemplate = (template: SMSTemplate) => {
    setInputText(template.texto);
    analyzeText(template.texto);
  };

  // Registrar el gasto en Google Sheets
  const handleConfirmGasto = async () => {
    if (!parsedResult || parsedResult.monto <= 0) return;

    try {
      setSubmitting(true);
      const res = await MivotryAPI.registrarGasto({
        cuenta: selectedCuenta,
        categoria: selectedCategoria,
        monto: parsedResult.monto,
        concepto: customConcepto || parsedResult.comercio,
        origen: 'sms'
      });

      setSubmitting(false);
      Alert.alert(
        '¡Gasto Registrado!',
        `Se descontaron ${formatCOP(parsedResult.monto)} de ${selectedCategoria} (${selectedCuenta === 'bonos' ? 'Bonos' : 'Nómina'}). Saldo restante: ${formatCOP(res.nuevoSaldoManejo)}.`,
        [
          {
            text: 'Excelente',
            onPress: () => {
              setInputText('');
              setParsedResult(null);
              onGastoRegistrado();
              onClose();
            }
          }
        ]
      );
    } catch (e: any) {
      setSubmitting(false);
      Alert.alert('Error al registrar', e.message || 'No se pudo registrar el gasto.');
    }
  };

  const formatCOP = (val?: number) => {
    if (val === undefined || isNaN(val)) return '$0';
    return '$' + Math.round(val).toLocaleString('es-CO');
  };

  const categoriasDisponibles = selectedCuenta === 'bonos'
    ? dashboardData?.bonos.gastos || []
    : dashboardData?.nomina.gastos || [];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ENCABEZADO */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <Smartphone size={20} color={CONFIG.COLORS.accentMint} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Detector de SMS Bancarios</Text>
                <Text style={styles.modalSub}>Peoplepass, Occidente, Bancolombia, Rappi</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* BOTÓN RÁPIDO: PEGAR DESDE PORTAPAPELES */}
            <TouchableOpacity
              style={styles.pasteClipboardBtn}
              activeOpacity={0.8}
              onPress={handlePasteClipboard}
            >
              <ClipboardIcon size={18} color="#06181D" />
              <Text style={styles.pasteClipboardText}>Pegar SMS desde Portapapeles</Text>
            </TouchableOpacity>

            {/* INPUT DE TEXTO */}
            <Text style={styles.sectionLabel}>O escribe / pega el mensaje del banco:</Text>
            <TextInput
              style={styles.textInputArea}
              placeholder="Ej: Bancolombia le informa compra por $45.000 en Crepes..."
              placeholderTextColor="#64748B"
              multiline={true}
              numberOfLines={3}
              value={inputText}
              onChangeText={(txt) => {
                setInputText(txt);
                analyzeText(txt);
              }}
            />

            {/* PLANTILLAS RÁPIDAS DE PRUEBA */}
            <Text style={styles.sectionLabel}>Plantillas de prueba para ensayar:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
              {SMS_TEST_TEMPLATES.map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.templateChip}
                  onPress={() => handleSelectTemplate(tmpl)}
                >
                  <Text style={styles.templateChipText}>{tmpl.titulo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* RESULTADO DEL ANÁLISIS */}
            {parsedResult ? (
              <View style={styles.resultCard}>
                <View style={styles.resultHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color={CONFIG.COLORS.accentGold} />
                    <Text style={styles.resultHeaderTitle}>Gasto Detectado</Text>
                  </View>
                  <View style={styles.badgeConfidence}>
                    <Text style={styles.badgeConfidenceText}>
                      {parsedResult.confianza === 'alta' ? '🎯 Inferencia Exacta' : '⚡ Inferencia Sugerida'}
                    </Text>
                  </View>
                </View>

                {/* BANCO Y MONTO */}
                <View style={styles.resultAmountRow}>
                  <View>
                    <Text style={styles.resultBankName}>{parsedResult.entidad}</Text>
                    <Text style={styles.resultComercio}>{parsedResult.comercio}</Text>
                  </View>
                  <Text style={styles.resultMontoBig}>{formatCOP(parsedResult.monto)}</Text>
                </View>

                <View style={styles.resultDivider} />

                {/* SELECTOR DE CUENTA NÓMINA VS BONOS */}
                <Text style={styles.fieldLabelSmall}>Cuenta de origen:</Text>
                <View style={styles.accountToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.accountToggleBtn,
                      selectedCuenta === 'nomina' && styles.accountToggleBtnActive
                    ]}
                    onPress={() => setSelectedCuenta('nomina')}
                  >
                    <Text
                      style={[
                        styles.accountToggleText,
                        selectedCuenta === 'nomina' && styles.accountToggleTextActive
                      ]}
                    >
                      Sueldo Nómina
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.accountToggleBtn,
                      selectedCuenta === 'bonos' && styles.accountToggleBtnActive
                    ]}
                    onPress={() => setSelectedCuenta('bonos')}
                  >
                    <Text
                      style={[
                        styles.accountToggleText,
                        selectedCuenta === 'bonos' && styles.accountToggleTextActive
                      ]}
                    >
                      Tarjeta Bonos ($1.6M)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* SELECTOR DE CATEGORÍA DE HOJA */}
                <Text style={styles.fieldLabelSmall}>Categoría asignada en hoja:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
                  {categoriasDisponibles.map((cat, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.catChip,
                        selectedCategoria === cat.nombre && styles.catChipActive
                      ]}
                      onPress={() => setSelectedCategoria(cat.nombre)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          selectedCategoria === cat.nombre && styles.catChipTextActive
                        ]}
                      >
                        {cat.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* CONCEPTO DETALLE */}
                <Text style={styles.fieldLabelSmall}>Concepto o detalle a registrar:</Text>
                <TextInput
                  style={styles.conceptoInput}
                  value={customConcepto}
                  onChangeText={setCustomConcepto}
                  placeholder="Detalle del gasto"
                  placeholderTextColor="#64748B"
                />

                {/* BOTÓN CONFIRMAR EN GOOGLE SHEETS */}
                <TouchableOpacity
                  style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={submitting}
                  onPress={handleConfirmGasto}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#06181D" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={18} color="#06181D" />
                      <Text style={styles.confirmBtnText}>
                        Registrar {formatCOP(parsedResult.monto)} en Sheets
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : inputText.trim().length > 10 ? (
              <View style={styles.noResultBox}>
                <AlertCircle size={20} color="#F59E0B" />
                <Text style={styles.noResultText}>
                  No se pudo detectar un monto válido en el texto. Verifica que contenga un signo de pesos o cifra (ej: $45.000).
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0A252D',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '90%',
    paddingBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F3741',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700'
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 11
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollBody: {
    padding: 18
  },
  pasteClipboardBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  pasteClipboardText: {
    color: '#06181D',
    fontSize: 14,
    fontWeight: '800'
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8
  },
  textInputArea: {
    backgroundColor: '#06181D',
    borderRadius: 12,
    color: '#F1F5F9',
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    minHeight: 65,
    textAlignVertical: 'top'
  },
  templatesScroll: {
    marginBottom: 16
  },
  templateChip: {
    backgroundColor: '#0F3741',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  templateChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600'
  },
  resultCard: {
    backgroundColor: '#0F3741',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 4
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  resultHeaderTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700'
  },
  badgeConfidence: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  badgeConfidenceText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700'
  },
  resultAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  resultBankName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500'
  },
  resultComercio: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700'
  },
  resultMontoBig: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '800'
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12
  },
  fieldLabelSmall: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6
  },
  accountToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#06181D',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12
  },
  accountToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8
  },
  accountToggleBtnActive: {
    backgroundColor: '#0F3741'
  },
  accountToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  accountToggleTextActive: {
    color: '#10B981',
    fontWeight: '700'
  },
  categoryChipsScroll: {
    marginBottom: 12
  },
  catChip: {
    backgroundColor: '#06181D',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  catChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981'
  },
  catChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500'
  },
  catChipTextActive: {
    color: '#10B981',
    fontWeight: '700'
  },
  conceptoInput: {
    backgroundColor: '#06181D',
    borderRadius: 10,
    color: '#F1F5F9',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  confirmBtnText: {
    color: '#06181D',
    fontSize: 14,
    fontWeight: '800'
  },
  noResultBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  noResultText: {
    color: '#F59E0B',
    fontSize: 12,
    flex: 1,
    lineHeight: 18
  }
});
