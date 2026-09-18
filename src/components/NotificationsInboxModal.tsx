import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import {
  Inbox,
  Check,
  X,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Sparkles,
  Smartphone,
  ExternalLink,
  CheckCheck
} from 'lucide-react-native';
import { CONFIG } from '../config';
import { MivotryAPI, NotificacionPendienteItem, DashboardResponse } from '../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  dashboardData: DashboardResponse | null;
  onGastosActualizados: () => void;
}

const formatCOP = (num: number = 0) => {
  return '$ ' + Math.round(num).toLocaleString('es-CO');
};

export const NotificationsInboxModal: React.FC<Props> = ({
  visible,
  onClose,
  dashboardData,
  onGastosActualizados
}) => {
  const [loading, setLoading] = useState(false);
  const [pendientes, setPendientes] = useState<NotificacionPendienteItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Modo pegar en bloque
  const [showBatchPaste, setShowBatchPaste] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [enqueuingBatch, setEnqueuingBatch] = useState(false);

  // Modo instrucciones MacroDroid / Webhook
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  // Categorías editadas localmente por id
  const [selectedCategories, setSelectedCategories] = useState<{ [id: string]: string }>({});
  const [selectedAccounts, setSelectedAccounts] = useState<{ [id: string]: 'nomina' | 'bonos' }>({});

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      const res = await MivotryAPI.getNotificacionesPendientes();
      if (res && res.success) {
        setPendientes(res.pendientes || []);
      }
    } catch (e: any) {
      console.error('Error fetching pendientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchPendientes();
      setShowBatchPaste(false);
      setShowWebhookGuide(false);
    }
  }, [visible]);

  const handleAprobarItem = async (item: NotificacionPendienteItem) => {
    try {
      setProcessingId(item.id);
      const isTC = item.cuentaSugerida === 'tarjeta_credito' || item.categoriaSugerida === 'Deudas tarjetas' || /t\.cred|tarjeta de credito/i.test(item.textoOriginal);
      const cat = isTC ? 'Deudas tarjetas' : (selectedCategories[item.id] || item.categoriaSugerida || 'Salidas 1');
      const acc = isTC ? 'tarjeta_credito' : (selectedAccounts[item.id] || (item.cuentaSugerida as 'nomina' | 'bonos') || 'nomina');

      const res = await MivotryAPI.procesarNotificacionPendiente({
        id: item.id,
        accion: 'aprobar',
        categoria: cat,
        cuenta: acc as any,
        monto: item.monto,
        concepto: item.comercio || `Gasto ${item.entidad}`
      });

      if (res && res.success) {
        setPendientes(prev => prev.filter(p => p.id !== item.id));
        onGastosActualizados();
      } else {
        Alert.alert('Error', res?.error || 'No se pudo aprobar la notificación.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de conexión.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDescartarItem = async (item: NotificacionPendienteItem) => {
    Alert.alert(
      'Descartar Notificación',
      `¿Deseas descartar este gasto de ${formatCOP(item.monto)} (${item.comercio || item.entidad})? No se aplicará en Google Sheets.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(item.id);
              const res = await MivotryAPI.procesarNotificacionPendiente({
                id: item.id,
                accion: 'descartar'
              });
              if (res && res.success) {
                setPendientes(prev => prev.filter(p => p.id !== item.id));
                onGastosActualizados();
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo descartar.');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const handleAprobarTodo = async () => {
    if (pendientes.length === 0) return;

    Alert.alert(
      'Aprobar Todo el Lote',
      `¿Deseas aprobar las ${pendientes.length} notificaciones pendientes con sus categorías sugeridas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Aprobar ${pendientes.length} Gastos`,
          onPress: async () => {
            try {
              setBulkProcessing(true);
              const ids = pendientes.map(p => p.id);
              const res = await MivotryAPI.aprobarLoteNotificaciones(ids);
              if (res && res.success) {
                Alert.alert('¡Éxito!', `Se registraron los ${pendientes.length} gastos en Google Sheets.`);
                setPendientes([]);
                onGastosActualizados();
              } else {
                Alert.alert('Error', res?.error || 'No se pudieron aprobar todos los gastos.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Error de conexión.');
            } finally {
              setBulkProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleEncolarLotePegado = async () => {
    if (!batchText.trim()) {
      Alert.alert('Texto vacío', 'Pega al menos una notificación o SMS bancario.');
      return;
    }

    try {
      setEnqueuingBatch(true);
      // Separa por líneas o por entidades conocidas si están en un solo párrafo
      const rawLines = batchText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 15);
      
      if (rawLines.length === 0) {
        Alert.alert('Formato no reconocido', 'Por favor pega los mensajes con al menos una línea por notificación.');
        setEnqueuingBatch(false);
        return;
      }

      const res = await MivotryAPI.encolarNotificacionesMultiples(rawLines);
      if (res && res.success) {
        Alert.alert('¡Encolados!', `Se detectaron y encolaron ${res.totalEncoladas} notificaciones en la bandeja.`);
        setBatchText('');
        setShowBatchPaste(false);
        fetchPendientes();
        onGastosActualizados();
      } else {
        Alert.alert('Error', res?.error || 'No se pudieron encolar las notificaciones.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al procesar el lote.');
    } finally {
      setEnqueuingBatch(false);
    }
  };

  const webhookUrl = CONFIG.API_URL;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.headerIconBox}>
                <Inbox size={20} color={CONFIG.COLORS.accentMint} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Bandeja de Pendientes</Text>
                <Text style={styles.headerSub}>
                  {loading
                    ? 'Consultando Google Sheets...'
                    : `${pendientes.length} notificaciones por confirmar`}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={fetchPendientes}
                disabled={loading}
              >
                <RefreshCw size={18} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={onClose}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* QUICK TOOLBAR */}
          <View style={styles.toolbarRow}>
            {pendientes.length > 1 && (
              <TouchableOpacity
                style={styles.approveAllBtn}
                onPress={handleAprobarTodo}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? (
                  <ActivityIndicator size="small" color="#06181D" />
                ) : (
                  <>
                    <CheckCheck size={16} color="#06181D" />
                    <Text style={styles.approveAllBtnText}>Aprobar Todos ({pendientes.length})</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.toolTabBtn, showBatchPaste && styles.toolTabBtnActive]}
              onPress={() => {
                setShowBatchPaste(!showBatchPaste);
                setShowWebhookGuide(false);
              }}
            >
              <Copy size={14} color={showBatchPaste ? CONFIG.COLORS.accentMint : '#94A3B8'} />
              <Text style={[styles.toolTabText, showBatchPaste && styles.toolTabTextActive]}>
                Pegar Lote
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolTabBtn, showWebhookGuide && styles.toolTabBtnActive]}
              onPress={() => {
                setShowWebhookGuide(!showWebhookGuide);
                setShowBatchPaste(false);
              }}
            >
              <Smartphone size={14} color={showWebhookGuide ? CONFIG.COLORS.accentMint : '#94A3B8'} />
              <Text style={[styles.toolTabText, showWebhookGuide && styles.toolTabTextActive]}>
                Auto-Android
              </Text>
            </TouchableOpacity>
          </View>

          {/* VISTA 1: PEGAR LOTE DE MENSAJES */}
          {showBatchPaste && (
            <View style={styles.expandableBox}>
              <Text style={styles.expandableTitle}>Pegar Notificaciones en Bloque</Text>
              <Text style={styles.expandableDesc}>
                Copia varios SMS de tu banco y pégalos aquí juntos. Cada notificación se interpretará y sumará a la lista para aprobar con 1 solo toque.
              </Text>
              <TextInput
                style={styles.batchTextInput}
                multiline={true}
                numberOfLines={4}
                placeholder="Ejemplo:&#10;Bancolombia: Compraste $45.000 en Crepes...&#10;Peoplepass: Compra por $24.265 en Jardin Plaza...&#10;Bancolombia: Transferiste $64.200 a Diana..."
                placeholderTextColor="#64748B"
                value={batchText}
                onChangeText={setBatchText}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={styles.cancelBatchBtn}
                  onPress={() => setShowBatchPaste(false)}
                >
                  <Text style={styles.cancelBatchBtnText}>Cerrar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBatchBtn}
                  onPress={handleEncolarLotePegado}
                  disabled={enqueuingBatch}
                >
                  {enqueuingBatch ? (
                    <ActivityIndicator size="small" color="#06181D" />
                  ) : (
                    <Text style={styles.submitBatchBtnText}>Encolar Mensajes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* VISTA 2: GUÍA MACRODROID / WEBHOOK */}
          {showWebhookGuide && (
            <View style={styles.expandableBox}>
              <Text style={styles.expandableTitle}>⚡ Captura Automática sin Abrir Mivotry</Text>
              <Text style={styles.expandableDesc}>
                Si tienes Android, instala <Text style={{ color: '#38BDF8', fontWeight: '700' }}>MacroDroid</Text> (gratis en Play Store) y crea esta regla sencilla:
              </Text>
              <View style={styles.guideStepBox}>
                <Text style={styles.guideStepText}>1. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Disparador:</Text> Notificación recibida de Bancolombia / Peoplepass.</Text>
                <Text style={styles.guideStepText}>2. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Acción:</Text> Abrir sitio web / Solicitud HTTP POST a esta URL:</Text>
                <View style={styles.urlBox}>
                  <Text style={styles.urlText} numberOfLines={2} selectable={true}>
                    {webhookUrl}
                  </Text>
                </View>
                <Text style={styles.guideStepText}>3. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Cuerpo del POST:</Text> {"{ \"texto\": \"[notification_text]\" }"}</Text>
              </View>
              <Text style={styles.guideFooterNote}>
                ¡Listo! Con eso, cada vez que pagues en la calle, el gasto esperará en esta bandeja para que lo apruebes en 1 segundo cuando tú quieras.
              </Text>
            </View>
          )}

          {/* LISTA PRINCIPAL DE PENDIENTES */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {loading && pendientes.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={CONFIG.COLORS.accentMint} />
                <Text style={styles.loadingText}>Cargando bandeja de notificaciones...</Text>
              </View>
            ) : pendientes.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconBox}>
                  <Check size={36} color={CONFIG.COLORS.accentMint} />
                </View>
                <Text style={styles.emptyTitle}>¡Bandeja al día!</Text>
                <Text style={styles.emptyDesc}>
                  No tienes notificaciones bancarias pendientes de aprobación. Cada gasto que llegue mientras la app esté cerrada aparecerá aquí.
                </Text>
                <TouchableOpacity
                  style={styles.emptyPasteBtn}
                  onPress={() => setShowBatchPaste(true)}
                >
                  <Copy size={15} color="#06181D" />
                  <Text style={styles.emptyPasteBtnText}>Pegar mensajes pendientes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              pendientes.map((item) => {
                const isProcessing = processingId === item.id;
                const isExpanded = expandedId === item.id;
                const currentCat = selectedCategories[item.id] || item.categoriaSugerida || 'Salidas 1';
                const currentAcc = selectedAccounts[item.id] || (item.cuentaSugerida as 'nomina' | 'bonos') || 'nomina';

                const isItemTC = item.cuentaSugerida === 'tarjeta_credito' || item.categoriaSugerida === 'Deudas tarjetas' || /t\.cred|tarjeta de credito/i.test(item.textoOriginal);

                return (
                  <View key={item.id} style={styles.itemCard}>
                    {/* ENCABEZADO DE TARJETA */}
                    <View style={styles.itemHeader}>
                      <View style={styles.itemTagRow}>
                        <View style={styles.entityTag}>
                          <Text style={styles.entityTagText}>{item.entidad}</Text>
                        </View>
                        <Text style={styles.itemDateText}>{item.fechaHora}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.expandToggleBtn}
                        onPress={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <Text style={styles.expandToggleText}>
                          {isExpanded ? 'Ocultar SMS' : 'Ver SMS'}
                        </Text>
                        {isExpanded ? <ChevronUp size={13} color="#94A3B8" /> : <ChevronDown size={13} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>

                    {/* DETALLE PRINCIPAL */}
                    <View style={styles.itemBody}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemAmount}>{formatCOP(item.monto)}</Text>
                        <Text style={styles.itemCommerce}>
                          {item.comercio || 'Comercio no especificado'}
                        </Text>
                      </View>

                      {/* SELECTOR CUENTA O BADGE DE TARJETA */}
                      {isItemTC ? (
                        <View style={styles.tcBadgeBox}>
                          <CreditCard size={13} color="#F59E0B" />
                          <Text style={styles.tcBadgeText}>Tarjeta Infinity</Text>
                        </View>
                      ) : (
                        <View style={styles.accountPillBox}>
                          <TouchableOpacity
                            style={[styles.accountPill, currentAcc === 'nomina' && styles.accountPillActive]}
                            onPress={() => setSelectedAccounts(prev => ({ ...prev, [item.id]: 'nomina' }))}
                          >
                            <Text style={[styles.accountPillText, currentAcc === 'nomina' && styles.accountPillTextActive]}>
                              Nómina
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.accountPill, currentAcc === 'bonos' && styles.accountPillActive]}
                            onPress={() => setSelectedAccounts(prev => ({ ...prev, [item.id]: 'bonos' }))}
                          >
                            <Text style={[styles.accountPillText, currentAcc === 'bonos' && styles.accountPillTextActive]}>
                              Bonos
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* SELECTOR RÁPIDO DE CATEGORÍA O AVISO TC */}
                    {isItemTC ? (
                      <View style={styles.tcNoticeRow}>
                        <Text style={styles.tcNoticeRowText}>
                          🛡️ Suma a Deuda en celda I8 (Fila 8). No descuenta de Manejo.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.categorySelectRow}>
                        <Text style={styles.catLabel}>Categoría:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                          {['Salidas 1', 'Salidas 2', 'Subs', 'Comida', 'Gatos', 'Fondo Ocasional'].map(c => (
                            <TouchableOpacity
                              key={c}
                              style={[styles.catChip, currentCat === c && styles.catChipActive]}
                              onPress={() => setSelectedCategories(prev => ({ ...prev, [item.id]: c }))}
                            >
                              <Text style={[styles.catChipText, currentCat === c && styles.catChipTextActive]}>
                                {c}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* TEXTO ORIGINAL COLAPSABLE */}
                    {isExpanded && (
                      <View style={styles.smsRawBox}>
                        <Text style={styles.smsRawText}>{item.textoOriginal}</Text>
                      </View>
                    )}

                    {/* ACCIONES INFERIORES */}
                    <View style={styles.itemActionsRow}>
                      <TouchableOpacity
                        style={styles.discardBtn}
                        onPress={() => handleDescartarItem(item)}
                        disabled={isProcessing}
                      >
                        <X size={15} color="#EF4444" />
                        <Text style={styles.discardBtnText}>Descartar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleAprobarItem(item)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#06181D" />
                        ) : (
                          <>
                            <Check size={16} color="#06181D" />
                            <Text style={styles.approveBtnText}>Aprobar Gasto</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#0A252C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800'
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  approveAllBtn: {
    backgroundColor: CONFIG.COLORS.accentMint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  approveAllBtnText: {
    color: '#06181D',
    fontSize: 12,
    fontWeight: '800'
  },
  toolTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  toolTabBtnActive: {
    borderColor: CONFIG.COLORS.accentMint,
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  toolTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  toolTabTextActive: {
    color: CONFIG.COLORS.accentMint,
    fontWeight: '700'
  },
  expandableBox: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0F3741',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  expandableTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  expandableDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10
  },
  batchTextInput: {
    backgroundColor: '#06181D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F1F5F9',
    padding: 10,
    fontSize: 12,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  cancelBatchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  cancelBatchBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  submitBatchBtn: {
    backgroundColor: CONFIG.COLORS.accentMint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  submitBatchBtnText: {
    color: '#06181D',
    fontSize: 12,
    fontWeight: '700'
  },
  guideStepBox: {
    backgroundColor: '#06181D',
    padding: 12,
    borderRadius: 10,
    gap: 6,
    marginBottom: 8
  },
  guideStepText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17
  },
  urlBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  urlText: {
    color: CONFIG.COLORS.accentGold,
    fontSize: 10,
    fontFamily: 'monospace'
  },
  guideFooterNote: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16
  },
  listScroll: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  emptyTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20
  },
  emptyPasteBtn: {
    backgroundColor: CONFIG.COLORS.accentMint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  emptyPasteBtnText: {
    color: '#06181D',
    fontSize: 13,
    fontWeight: '700'
  },
  itemCard: {
    backgroundColor: '#0F3741',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  itemTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  entityTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  entityTagText: {
    color: '#F1F5F9',
    fontSize: 11,
    fontWeight: '700'
  },
  itemDateText: {
    color: '#64748B',
    fontSize: 10
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  expandToggleText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600'
  },
  itemBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  itemAmount: {
    color: '#34D399',
    fontSize: 20,
    fontWeight: '800'
  },
  itemCommerce: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  accountPillBox: {
    flexDirection: 'row',
    backgroundColor: '#06181D',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  accountPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  accountPillActive: {
    backgroundColor: CONFIG.COLORS.accentMint
  },
  accountPillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600'
  },
  accountPillTextActive: {
    color: '#06181D',
    fontWeight: '800'
  },
  categorySelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  catLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  catChip: {
    backgroundColor: '#06181D',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  catChipActive: {
    borderColor: CONFIG.COLORS.accentMint,
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  catChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600'
  },
  catChipTextActive: {
    color: CONFIG.COLORS.accentMint,
    fontWeight: '700'
  },
  smsRawBox: {
    backgroundColor: '#06181D',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  smsRawText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace'
  },
  itemActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)'
  },
  discardBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700'
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: CONFIG.COLORS.accentMint
  },
  approveBtnText: {
    color: '#06181D',
    fontSize: 11,
    fontWeight: '800'
  },
  tcBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  tcBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700'
  },
  tcNoticeRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)'
  },
  tcNoticeRowText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '600'
  }
});
