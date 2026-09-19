import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Keyboard
} from 'react-native';
import { Send, Sparkles, CheckCircle2, XCircle, ArrowRight, CornerDownRight, Mic, X } from 'lucide-react-native';
import { CONFIG } from '../config';
import { theme } from '../theme';
import { MivotryAPI, DashboardResponse } from '../services/api';
import { VoiceService } from '../services/voiceService';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  actionCard?: {
    type: 'confirm_expense' | 'confirm_credit_card';
    cuenta: 'nomina' | 'bonos';
    categoria: string;
    monto: number;
    concepto: string;
    tarjeta?: string;       // nombre de la tarjeta de crédito (solo para confirm_credit_card)
    tarjetaFila?: number;   // fila en el Sheet (solo para confirm_credit_card)
    confirmed?: boolean;
    cancelled?: boolean;
  };
}

interface Props {
  dashboardData: DashboardResponse | null;
  onExpenseRegistered: () => void;
}

const QUICK_PROMPTS = [
  { label: '⛽ Gasolina 50k', template: 'Gasolina 50k' },
  { label: '🍽️ Almuerzo 25k', template: 'Almuerzo 25k' },
  { label: '🛒 Pricesmart 100k', template: 'Pricesmart 100k de bonos' },
  { label: '🥬 D1 30k', template: 'D1 30k de bonos' },
  { label: '🍿 Cine 40k', template: 'Salidas 40k' },
  { label: '🐱 Gatos 50k', template: 'Gatos 50k de bonos' }
];

export const ChatAssistant: React.FC<Props> = ({ dashboardData, onExpenseRegistered }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: '¡Hola! 🐾 Soy tu asistente Mivotry. Puedes decirme cosas como:\n• "Gasté 45.000 en gasolina"\n• "Compré 120k en PriceSmart con bonos"\n• "Mauro me abonó 50 mil"\n• "Gasto tarjeta crédito Infinity 18000"\n• "¿Cuánto me queda en salidas?"',
      time: 'Ahora'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitor keyboard height to push input bar above keyboard on Android
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const tooltipSlide = useRef(new Animated.Value(10)).current;

  // Pulse animation while listening to voice
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isListening) {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.6);
      animation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.35,
              duration: 750,
              useNativeDriver: true
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 750,
              useNativeDriver: true
            })
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.15,
              duration: 750,
              useNativeDriver: true
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 750,
              useNativeDriver: true
            })
          ])
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.6);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isListening, pulseAnim, pulseOpacity]);

  // Clean up timers and voice listeners on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
      VoiceService.stopListening();
    };
  }, []);

  const dismissTooltip = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(tooltipSlide, {
        toValue: 10,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowTooltip(false);
    });
  };

  const triggerTooltip = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    setShowTooltip(true);
    tooltipAnim.setValue(0);
    tooltipSlide.setValue(10);
    Animated.parallel([
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(tooltipSlide, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })
    ]).start();

    tooltipTimerRef.current = setTimeout(() => {
      dismissTooltip();
    }, 5000);
  };

  const handleMicPress = () => {
    if (VoiceService.isVoiceSupported()) {
      if (isListening) {
        VoiceService.stopListening();
        setIsListening(false);
      } else {
        const started = VoiceService.startListening(
          (transcript: string) => {
            setInputText(transcript);
          },
          (error: string) => {
            setIsListening(false);
            console.warn('Voice recognition error:', error);
          },
          () => {
            setIsListening(false);
          }
        );
        if (started) {
          setIsListening(true);
        }
      }
    } else {
      // In native / Expo Go where Web Speech API is not available
      inputRef.current?.focus();
      triggerTooltip();
    }
  };

  const formatCOP = (val: number = 0) => '$' + Math.round(val).toLocaleString('es-CO');

  const handleSend = async (customText?: string) => {
    const text = (typeof customText === 'string' ? customText : inputText).trim();
    if (!text || processing) return;

    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setProcessing(true);

    try {
      // 1. Interpretar intención
      const lower = text.toLowerCase();

      // CONSULTA DE SALDO
      if (lower.includes('cuanto me queda') || lower.includes('cuánto me queda') || lower.includes('saldo')) {
        let matched = false;
        let responseText = '';

        // Buscar en nómina
        dashboardData?.nomina.gastos.forEach(g => {
          if (lower.includes(g.nombre.toLowerCase())) {
            matched = true;
            responseText = `Te quedan ${formatCOP(g.manejoActual)} disponibles en ${g.nombre} (de un presupuesto de ${formatCOP(g.presupuestoTotal)}).`;
          }
        });

        // Buscar en bonos
        dashboardData?.bonos.gastos.forEach(g => {
          if (lower.includes(g.nombre.toLowerCase())) {
            matched = true;
            responseText = `En la Tarjeta de Bonos te quedan ${formatCOP(g.manejoActual)} en ${g.nombre}.`;
          }
        });

        if (!matched) {
          responseText = 'No identifiqué la categoría. Puedes preguntarme por: Gasolina, Salidas, PriceSmart, Verduras, Gatos, etc.';
        }

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: responseText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setProcessing(false);
        return;
      }

      // REGISTRO DE GASTO (LENGUAJE NATURAL)
      // Extraer monto
      let monto = 0;
      // 1. Casos con k o mil (ej: 45k, 50 mil, 12.5k, 12,5 mil)
      const kMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:k|mil(?:es)?)\b/i);

      if (kMatch && kMatch[1]) {
        const base = parseFloat(kMatch[1].replace(',', '.'));
        monto = Math.round(base * 1000);
      } else {
        // 2. Montos formateados con separadores (ej: 716.200, 3´200.000, 716,200) o enteros directos (ej: 716200)
        const standardMatch = text.match(/(?:\$|COP)?\s*\b([0-9]{1,3}(?:['´.,][0-9]{3})+|[0-9]+)\b/i);
        if (standardMatch && standardMatch[1]) {
          monto = parseInt(standardMatch[1].replace(/[^0-9]/g, ''), 10);
        }
      }

      if (monto > 0) {
        // ── TARJETA DE CRÉDITO ─────────────────────────────────────
        // Detectar si el mensaje menciona una tarjeta de crédito
        const esTarjetaCredito =
          lower.includes('tarjeta credito') ||
          lower.includes('tarjeta de credito') ||
          lower.includes('tarjeta de crédito') ||
          lower.includes('tarjeta crédito') ||
          /\btc\b/.test(lower);

        // Buscar coincidencia con nombres de tarjetas del dashboard
        const tarjetasDisponibles = dashboardData?.deudas?.tarjetasDetalle ?? [];
        let tarjetaMatch = tarjetasDisponibles.find(t =>
          lower.includes(t.nombre.toLowerCase())
        );

        // Si aún no hay coincidencia pero el mensaje suena a tarjeta de crédito,
        // tomar la primera tarjeta disponible como fallback (y notificar al usuario)
        const esTarjeta = esTarjetaCredito || !!tarjetaMatch;

        if (esTarjeta) {
          const tarjetaNombre = tarjetaMatch?.nombre ?? (tarjetasDisponibles[0]?.nombre ?? 'Sin especificar');
          const tarjetaFila = tarjetaMatch?.fila ?? tarjetasDisponibles[0]?.fila;
          const esAmbigua = !tarjetaMatch && tarjetasDisponibles.length > 1;

          const msgConfirm = esAmbigua
            ? `Entendido. Voy a registrar un consumo de ${formatCOP(monto)} en Tarjeta de Crédito. No identifiqué cuál tarjeta; usaré "${tarjetaNombre}" por defecto. ¿Confirmas?`
            : `Entendido. Registraré un consumo de ${formatCOP(monto)} en la Tarjeta ${tarjetaNombre}. ¿Confirmas?`;

          setMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: 'assistant',
              text: msgConfirm,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actionCard: {
                type: 'confirm_credit_card',
                cuenta: 'nomina',   // no aplica para TC, pero se requiere por tipo
                categoria: 'Tarjeta de Crédito',
                monto: monto,
                concepto: text,
                tarjeta: tarjetaNombre,
                tarjetaFila: tarjetaFila
              }
            }
          ]);
          setProcessing(false);
          return;
        }

        // ── GASTO NORMAL (NÓMINA / BONOS) ──────────────────────────
        let cuenta: 'nomina' | 'bonos' = 'nomina';

        let categoria = 'Salidas';

        // Detectar bonos vs nómina
        if (lower.includes('bono') || lower.includes('peoplepass') || lower.includes('paycash') || lower.includes('sodexo') || lower.includes('pluxee')) {
          cuenta = 'bonos';
        }

        // Detectar categoría
        if (lower.includes('gasolina') || lower.includes('lavar') || lower.includes('tanquear') || lower.includes('terpel') || lower.includes('texaco') || lower.includes('primax')) {
          categoria = 'Gasolina/Lavar';
        } else if (lower.includes('pricesmart') || lower.includes('price smart')) {
          categoria = 'Pricesmart';
          cuenta = 'bonos';
        } else if (lower.includes('verdura') || lower.includes('mercado') || lower.includes('super') || lower.includes('d1') || lower.includes('exito') || lower.includes('olimpica') || lower.includes('jumbo') || lower.includes('carulla')) {
          categoria = 'Verduras y demas';
          cuenta = 'bonos';
        } else if (lower.includes('gato') || lower.includes('veterin') || lower.includes('comida gato') || lower.includes('michis')) {
          categoria = 'Gatos';
          cuenta = 'bonos';
        } else if (lower.includes('salida') || lower.includes('cine') || lower.includes('restaurante') || lower.includes('bar') || lower.includes('almuerzo') || lower.includes('comida') || lower.includes('cafe')) {
          if (cuenta === 'bonos') {
            const hasSalidas1 = dashboardData?.bonos?.gastos?.some(g => g.nombre.toLowerCase().includes('salidas 1'));
            categoria = hasSalidas1 ? 'Salidas 1' : 'Salidas';
          } else {
            categoria = 'Salidas';
          }
        } else if (lower.includes('rappi')) {
          categoria = 'Rappi';
        }

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: `Entendido. Identifiqué un gasto de ${formatCOP(monto)} para ${categoria} (${cuenta === 'bonos' ? 'Tarjeta Bonos' : 'Nómina'}). ¿Confirmas registrarlo en Google Sheets?`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionCard: {
              type: 'confirm_expense',
              cuenta: cuenta,
              categoria: categoria,
              monto: monto,
              concepto: text
            }
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: 'No logré identificar el monto del gasto. Intenta escribiendo algo como: "Gasté 35.000 en gasolina" o "15k en almuerzo".',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Ocurrió un inconveniente al procesar tu solicitud: ' + err.message,
          time: 'Error'
        }
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickPrompt = (template: string) => {
    setInputText(template);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  };

  const handleConfirmAction = async (msgId: string, actionCard: NonNullable<Message['actionCard']>) => {
    try {
      setProcessing(true);

      // ── TARJETA DE CRÉDITO ──────────────────────────────────────
      if (actionCard.type === 'confirm_credit_card') {
        const res = await MivotryAPI.actualizarSaldoTarjetaCredito({
          tarjeta: actionCard.tarjeta ?? '',
          monto: actionCard.monto,
          operacion: 'sumar',
          concepto: actionCard.concepto,
          fila: actionCard.tarjetaFila
        });

        if (res.success) {
          setMessages(prev =>
            prev.map(m =>
              m.id === msgId && m.actionCard
                ? { ...m, actionCard: { ...m.actionCard, confirmed: true } }
                : m
            )
          );
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'assistant',
              text: `✅ ¡Listo! Se sumaron ${formatCOP(actionCard.monto)} al saldo de la Tarjeta ${actionCard.tarjeta}. Nuevo saldo: ${formatCOP(res.nuevoSaldo)}.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          onExpenseRegistered();
        } else {
          Alert.alert('Error', res.error || 'No se pudo registrar el consumo en la tarjeta');
        }
        return;
      }

      // ── GASTO NORMAL (NÓMINA / BONOS) ──────────────────────────
      const res = await MivotryAPI.registrarGasto({
        cuenta: actionCard.cuenta,
        categoria: actionCard.categoria,
        monto: actionCard.monto,
        concepto: actionCard.concepto,
        origen: 'chat'
      });

      if (res.success) {
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId && m.actionCard
              ? {
                  ...m,
                  actionCard: { ...m.actionCard, confirmed: true }
                }
              : m
          )
        );

        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'assistant',
            text: `✅ ¡Listo! Se descontaron ${formatCOP(actionCard.monto)} de ${actionCard.categoria}. Nuevo saldo en Manejo: ${formatCOP(res.nuevoSaldo)}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        onExpenseRegistered();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcessing(false);
    }
  };


  const handleCancelAction = (msgId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId && m.actionCard
          ? {
              ...m,
              actionCard: { ...m.actionCard, cancelled: true }
            }
          : m
      )
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={[styles.container, Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[styles.messageBubbleContainer, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
              <View style={[styles.bubble, isUser ? styles.bubbleUserStyle : styles.bubbleAssistantStyle]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
                  {item.text}
                </Text>
                <Text style={styles.bubbleTime}>{item.time}</Text>

                {/* TARJETA INTERACTIVA DE CONFIRMACIÓN */}
                {item.actionCard && !item.actionCard.confirmed && !item.actionCard.cancelled && (
                  <View style={styles.confirmCard}>
                    <View style={styles.confirmHeader}>
                      <Sparkles size={14} color={CONFIG.COLORS.accentMint} />
                      <Text style={styles.confirmTitle}>Confirmar Registro</Text>
                    </View>
                    <View style={styles.confirmDetails}>
                      <Text style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>Monto: </Text>
                        <Text style={styles.confirmValue}>{formatCOP(item.actionCard.monto)}</Text>
                      </Text>
                      <Text style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>Rubro: </Text>
                        <Text style={styles.confirmValue}>{item.actionCard.categoria}</Text>
                      </Text>
                      <Text style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>
                          {item.actionCard.type === 'confirm_credit_card' ? 'Tarjeta: ' : 'Cuenta: '}
                        </Text>
                        <Text style={styles.confirmValue}>
                          {item.actionCard.type === 'confirm_credit_card'
                            ? `💳 ${item.actionCard.tarjeta}`
                            : item.actionCard.cuenta === 'bonos'
                            ? 'Tarjeta Bonos'
                            : 'Nómina'}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelAction(item.id)}
                      >
                        <XCircle size={14} color="#EF4444" />
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleConfirmAction(item.id, item.actionCard!)}
                      >
                        <CheckCircle2 size={14} color="#06181D" />
                        <Text style={styles.confirmBtnText}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* BADGE DE CONFIRMADO */}
                {item.actionCard?.confirmed && (
                  <View style={styles.statusBadgeSuccess}>
                    <CheckCircle2 size={12} color="#10B981" />
                    <Text style={styles.statusBadgeTextSuccess}>
                      {item.actionCard.type === 'confirm_credit_card'
                        ? 'Consumo TC registrado en Sheets'
                        : 'Gasto registrado en Sheets'}
                    </Text>
                  </View>
                )}

                {/* BADGE DE CANCELADO */}
                {item.actionCard?.cancelled && (
                  <View style={styles.statusBadgeCancelled}>
                    <Text style={styles.statusBadgeTextCancelled}>Operación cancelada</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* BANNER ANIMADO DE DICTADO PARA TECLADO MÓVIL */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltipBanner,
            {
              opacity: tooltipAnim,
              transform: [{ translateY: tooltipSlide }]
            }
          ]}
        >
          <Text style={styles.tooltipText}>
            🎙️ Dicta usando el micrófono de tu teclado (Gboard o iOS) para registrar al instante.
          </Text>
          <TouchableOpacity
            onPress={dismissTooltip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.tooltipCloseBtn}
          >
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* CHIPS RÁPIDOS DE ENTRADA */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_PROMPTS.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickChip}
              onPress={() => handleQuickPrompt(chip.template)}
              activeOpacity={0.7}
              disabled={processing}
            >
              <Text style={styles.quickChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* INPUT INFERIOR DE MENSAJES */}
      <View style={[styles.inputBar, keyboardHeight === 0 && styles.inputBarWithTab]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Escribe un gasto o consulta..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />

        {/* BOTÓN DE MICRÓFONO */}
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={handleMicPress}
          activeOpacity={0.7}
          accessibilityLabel="Dictar por voz"
        >
          {isListening && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity
                }
              ]}
            />
          )}
          <Mic size={18} color={isListening ? '#FFFFFF' : '#94A3B8'} />
        </TouchableOpacity>

        {/* BOTÓN DE ENVIAR */}
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || processing) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#06181D" />
          ) : (
            <Send size={18} color="#06181D" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  listContent: {
    padding: 16,
    paddingBottom: 20
  },
  messageBubbleContainer: {
    marginBottom: 14,
    maxWidth: '84%'
  },
  bubbleUser: {
    alignSelf: 'flex-end'
  },
  bubbleAssistant: {
    alignSelf: 'flex-start'
  },
  bubble: {
    borderRadius: 18,
    padding: 14
  },
  bubbleUserStyle: {
    backgroundColor: '#0B2B33',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  bubbleAssistantStyle: {
    backgroundColor: '#0F3741',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  bubbleText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    lineHeight: 20
  },
  bubbleTextUser: {
    fontFamily: theme.fonts.medium,
    color: '#F8FAFC'
  },
  bubbleTextAssistant: {
    color: '#F8FAFC'
  },
  bubbleTime: {
    fontFamily: theme.fonts.regular,
    color: '#94A3B8',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4
  },
  confirmCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  confirmTitle: {
    fontFamily: theme.fonts.bold,
    color: '#10B981',
    fontSize: 12
  },
  confirmDetails: {
    gap: 3,
    marginBottom: 10
  },
  confirmRow: {
    fontFamily: theme.fonts.regular,
    fontSize: 12
  },
  confirmLabel: {
    fontFamily: theme.fonts.medium,
    color: '#94A3B8'
  },
  confirmValue: {
    fontFamily: theme.fonts.semiBold,
    color: '#F8FAFC'
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  cancelBtnText: {
    fontFamily: theme.fonts.semiBold,
    color: '#EF4444',
    fontSize: 11
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#10B981'
  },
  confirmBtnText: {
    fontFamily: theme.fonts.bold,
    color: '#060D0F',
    fontSize: 11
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  statusBadgeTextSuccess: {
    fontFamily: theme.fonts.semiBold,
    color: '#10B981',
    fontSize: 10
  },
  statusBadgeCancelled: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  statusBadgeTextCancelled: {
    fontFamily: theme.fonts.regular,
    color: '#94A3B8',
    fontSize: 10
  },
  tooltipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3741',
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  tooltipText: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    color: '#F8FAFC',
    fontSize: 12,
    lineHeight: 16
  },
  tooltipCloseBtn: {
    padding: 4
  },
  chipsWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#081419',
    paddingTop: 8,
    paddingBottom: 4
  },
  chipsScrollContent: {
    paddingHorizontal: 12,
    gap: 8
  },
  quickChip: {
    backgroundColor: '#0C242C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  quickChipText: {
    fontFamily: theme.fonts.medium,
    color: '#E2E8F0',
    fontSize: 12
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#081419',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: 8
  },
  inputBarWithTab: {
    paddingBottom: Platform.OS === 'ios' ? 88 : 82
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    backgroundColor: '#0C242C',
    color: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0C242C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.45)',
    borderWidth: 2,
    borderColor: '#EF4444'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  }
});
