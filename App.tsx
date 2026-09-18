import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import {
  LayoutDashboard,
  Wallet,
  MessageSquare,
  TrendingUp,
  Settings,
  Bell,
  RefreshCw,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Utensils,
  X,
  Plus,
  ChevronDown
} from 'lucide-react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CONFIG } from './src/config';
import { MivotryAPI, DashboardResponse, GastoItem } from './src/services/api';
import { ChatAssistant } from './src/components/ChatAssistant';

const { width } = Dimensions.get('window');

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'manejo' | 'chat' | 'bolsillos' | 'admin'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [activeQuincena, setActiveQuincena] = useState<15 | 30>(15);
  const [activeAccount, setActiveAccount] = useState<'nomina' | 'bonos'>('nomina');

  // Estado para el Modal de Gasto Manual
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGasto, setSelectedGasto] = useState<{
    nombre: string;
    cuenta: 'nomina' | 'bonos';
    manejoActual: number;
    presupuestoTotal: number;
  } | null>(null);
  const [montoInput, setMontoInput] = useState('');
  const [conceptoInput, setConceptoInput] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await MivotryAPI.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error de conexión', 'No se pudo conectar con tu Google Sheet. Revisa tu conexión a internet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatCOP = (val: number = 0) => {
    return '$' + Math.round(val).toLocaleString('es-CO');
  };


  const handleRecargarBonos = () => {
    Alert.alert(
      'Recargar Tarjeta Bonos (Peoplepass)',
      '¿Deseas registrar la recarga mensual de $1.600.000 en Peoplepass Paycash? Se sumarán los presupuestos (PriceSmart, Verduras, Gatos, Salidas) al remanente actual de Manejo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Recarga',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await MivotryAPI.recargarBonos();
              Alert.alert('¡Éxito!', 'Tarjeta de Bonos Peoplepass recargada con éxito.');
              fetchDashboard();
            } catch (e: any) {
              Alert.alert('Error', e.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCargarQuincena = (q: 15 | 30) => {
    Alert.alert(
      'Cargar Quincena ' + q,
      '¿Deseas realizar el rollover de la Quincena ' + q + '? Se sumarán los valores presupuestados al saldo remanente que tengas en Manejo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Rollover',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await MivotryAPI.cargarQuincena(q);
              Alert.alert('¡Éxito!', 'Quincena ' + q + ' cargada correctamente.');
              fetchDashboard();
            } catch (e: any) {
              Alert.alert('Error', e.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleOpenExpenseModal = (gasto: GastoItem, cuenta: 'nomina' | 'bonos') => {
    setSelectedGasto({
      nombre: gasto.nombre,
      cuenta: cuenta,
      manejoActual: gasto.manejoActual,
      presupuestoTotal: gasto.presupuestoTotal
    });
    setMontoInput('');
    setConceptoInput('');
    setModalVisible(true);
  };

  const handleOpenFloatingExpense = () => {
    const list = activeAccount === 'nomina' ? dashboardData?.nomina.gastos : dashboardData?.bonos.gastos;
    const defaultGasto = list && list.length > 0 ? list[0] : null;
    if (defaultGasto) {
      handleOpenExpenseModal(defaultGasto, activeAccount);
    } else {
      handleOpenExpenseModal({ fila: 4, nombre: 'Salidas', presupuestoTotal: 600000, manejoActual: 240000 }, 'nomina');
    }
  };

  const handleSaveExpense = async () => {
    if (!selectedGasto) return;
    const monto = parseFloat(montoInput.replace(/[^0-9]/g, ''));
    if (!monto || monto <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero.');
      return;
    }

    try {
      setSubmittingExpense(true);
      const res = await MivotryAPI.registrarGasto({
        cuenta: selectedGasto.cuenta,
        categoria: selectedGasto.nombre,
        monto: monto,
        concepto: conceptoInput.trim() || `Gasto en ${selectedGasto.nombre}`,
        origen: 'manual'
      });

      if (res.success) {
        Alert.alert(
          'Gasto Registrado',
          `Se descontaron ${formatCOP(monto)} de ${selectedGasto.nombre}. Nuevo saldo: ${formatCOP(res.nuevoSaldo)}`
        );
        setModalVisible(false);
        fetchDashboard();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#06181D" />
        <Image
          source={require('./assets/icon.png')}
          style={{ width: 90, height: 90, borderRadius: 24, marginBottom: 20 }}
        />
        <ActivityIndicator size="large" color={CONFIG.COLORS.accentMint} />
        <Text style={styles.loadingText}>Conectando con tu Google Sheet...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Cálculos rápidos del Dashboard
  const nominaGastos = dashboardData?.nomina.gastos || [];
  const totalPresupuestadoQ = nominaGastos.reduce((acc, item) => {
    return acc + (activeQuincena === 15 ? (item.q15 || 0) : (item.q30 || 0));
  }, 0);
  // Total de Manejo: preferir celda F:21 del sheet ($585.000) o la sumatoria de rubros activos
  const totalManejoActual = dashboardData?.nomina.totalManejoF21 ?? nominaGastos.reduce((acc, item) => acc + (item.manejoActual || 0), 0);
  const porcentajeManejo = totalPresupuestadoQ > 0 ? Math.min(100, Math.round((totalManejoActual / totalPresupuestadoQ) * 100)) : 0;

  // Rubro Salidas (Gastos variables)
  const itemSalidas = nominaGastos.find(g => g.nombre.toLowerCase().includes('salida'));
  const salidasManejo = itemSalidas?.manejoActual ?? 240000;
  const salidasPresupuestoQ = (activeQuincena === 15 ? itemSalidas?.q15 : itemSalidas?.q30) ?? 300000;
  const salidasPorcentaje = salidasPresupuestoQ > 0 ? Math.min(100, Math.round((salidasManejo / salidasPresupuestoQ) * 100)) : 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06181D" />

      {/* CABECERA SUPERIOR */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.headerLogo}
          />
          <View>
            <Text style={styles.appName}>Mivotry</Text>
            <Text style={styles.appSubtitle}>Control Financiero Inteligente</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
            <RefreshCw size={19} color={CONFIG.COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={19} color={CONFIG.COLORS.textLight} />
            <View style={styles.badgeNotification} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL POR PESTAÑAS */}
      {activeTab === 'chat' ? (
        <ChatAssistant
          dashboardData={dashboardData}
          onExpenseRegistered={fetchDashboard}
        />
      ) : (
        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CONFIG.COLORS.accentMint} />
          }
        >
          {activeTab === 'dashboard' && (
          <View style={styles.tabContainer}>
            {/* HERO CARD DE SALDOS */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroLabel}>Disponible en Manejo (Te queda)</Text>
                <View style={styles.chipTag}>
                  <Text style={styles.chipText}>Quincena {activeQuincena}</Text>
                </View>
              </View>

              {/* CIFRA GIGANTE: SALDO DISPONIBLE VIVO */}
              <Text style={[styles.heroAmount, { color: CONFIG.COLORS.accentMint }]}>
                {formatCOP(totalManejoActual)}
              </Text>

              {/* BARRA DE PROGRESO & PRESUPUESTO BASE */}
              <View style={styles.progressSection}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressLabel}>
                    Base Q{activeQuincena}: {formatCOP(activeQuincena === 15 ? 4950000 : 4950000)}
                  </Text>
                  <Text style={styles.progressValue}>
                    {porcentajeManejo}% disponible
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(5, Math.min(100, porcentajeManejo))}%`,
                        backgroundColor:
                          porcentajeManejo > 40
                            ? CONFIG.COLORS.accentMint
                            : porcentajeManejo > 15
                            ? CONFIG.COLORS.accentGold
                            : CONFIG.COLORS.accentRed
                      }
                    ]}
                  />
                </View>
              </View>

              {/* BOTONES RÁPIDOS DE QUINCENA */}
              <View style={styles.heroActionsRow}>
                <TouchableOpacity
                  style={[styles.quincenaToggleBtn, activeQuincena === 15 && styles.quincenaToggleBtnActive]}
                  onPress={() => setActiveQuincena(15)}
                >
                  <Text style={[styles.quincenaToggleText, activeQuincena === 15 && styles.quincenaToggleTextActive]}>
                    Día 15
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quincenaToggleBtn, activeQuincena === 30 && styles.quincenaToggleBtnActive]}
                  onPress={() => setActiveQuincena(30)}
                >
                  <Text style={[styles.quincenaToggleText, activeQuincena === 30 && styles.quincenaToggleTextActive]}>
                    Día 30
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cargarBtn}
                  onPress={() => handleCargarQuincena(activeQuincena)}
                >
                  <Text style={styles.cargarBtnText}>Cargar Q{activeQuincena}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* TARJETA DEDICADA: FONDO DE SALIDAS (GASTOS VARIABLES) */}
            <View style={styles.salidasCard}>
              <View style={styles.salidasHeader}>
                <View style={styles.salidasHeaderLeft}>
                  <View style={styles.salidasIconBadge}>
                    <Utensils size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={styles.salidasTitle}>Fondo de Salidas & Ocio</Text>
                    <Text style={styles.salidasSubtitle}>Gastos variables quincenales</Text>
                  </View>
                </View>
                <View style={styles.salidasDisponibleBadge}>
                  <Text style={styles.salidasDisponibleBadgeText}>Disponible</Text>
                </View>
              </View>

              <View style={styles.salidasAmountsRow}>
                <View>
                  <Text style={styles.salidasAmountBig}>{formatCOP(salidasManejo)}</Text>
                  <Text style={styles.salidasAmountSub}>
                    de {formatCOP(salidasPresupuestoQ)} presupuestados (Q{activeQuincena})
                  </Text>
                </View>
                <View style={styles.salidasPercentCircle}>
                  <Text style={styles.salidasPercentText}>{salidasPorcentaje}%</Text>
                  <Text style={styles.salidasPercentLabel}>restante</Text>
                </View>
              </View>

              {/* BARRA DE CONSUMO DE SALIDAS */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(5, Math.min(100, salidasPorcentaje))}%`,
                      backgroundColor:
                        salidasPorcentaje > 40
                          ? CONFIG.COLORS.accentMint
                          : salidasPorcentaje > 15
                          ? CONFIG.COLORS.accentGold
                          : CONFIG.COLORS.accentRed
                    }
                  ]}
                />
              </View>

              <Text style={styles.salidasTipText}>
                💡 Registra salidas escribiendo en el chat: "Gasté 35k en restaurante"
              </Text>
            </View>

            {/* SECCIÓN BOLSILLOS & FLOAT EN VIVO */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Bolsillos & Rendimientos</Text>
              <TrendingUp size={18} color={CONFIG.COLORS.accentGold} />
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Bolsillo (I:30)</Text>
                <Text style={[styles.metricValue, { color: CONFIG.COLORS.accentGold }]}>
                  {formatCOP(dashboardData?.bolsillos.totalCompleto ?? dashboardData?.bolsillos.totalRendimientos ?? 7800000)}
                </Text>
                <Text style={styles.metricSub}>Ahorros: {formatCOP(dashboardData?.bolsillos.totalAhorros ?? 7800000)}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Fondo Ocasional (F:20)</Text>
                <Text style={[styles.metricValue, { color: CONFIG.COLORS.accentMint }]}>
                  {formatCOP(dashboardData?.nomina.fondoOcasional || 0)}
                </Text>
                <Text style={styles.metricSub}>Vacaciones / Extras</Text>
              </View>
            </View>

            {/* TARJETA DE DEUDAS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Deudas</Text>
                <CreditCard size={18} color={CONFIG.COLORS.textMuted} />
              </View>

              {/* CRÉDITO OCCIDENTE */}
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.debtName}>Crédito Occidente</Text>
                  <Text style={styles.debtMeta}>Corte: Día {dashboardData?.deudas.creditoOccidente.fechaPago || '15'}</Text>
                </View>
                <Text style={styles.debtAmount}>
                  {formatCOP(dashboardData?.deudas.creditoOccidente.saldo || 170588000)}
                </Text>
              </View>
              <View style={styles.debtDivider} />

              {/* CRÉDITO APTO */}
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.debtName}>Crédito Hipotecario Apto</Text>
                  <Text style={styles.debtMeta}>Corte: Día {dashboardData?.deudas.creditoApto.fechaPago || '30'}</Text>
                </View>
                <Text style={styles.debtAmount}>
                  {formatCOP(dashboardData?.deudas.creditoApto.saldo || 75300000)}
                </Text>
              </View>
              <View style={styles.debtDivider} />

              {/* TARJETAS DE CRÉDITO */}
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.debtName}>Tarjetas de Crédito</Text>
                  <Text style={styles.debtMeta}>Infinity (15) / Rappi (30) / Scotia (30)</Text>
                </View>
                <Text style={[styles.debtAmount, { color: (dashboardData?.deudas.totalDeudaTarjetas || 0) > 0 ? '#EF4444' : '#10B981' }]}>
                  {formatCOP(dashboardData?.deudas.totalDeudaTarjetas || 0)}
                </Text>
              </View>
            </View>

            {/* VISTA RÁPIDA DE SUSCRIPCIONES */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Streaming & Suscripciones</Text>
                <Tv size={18} color={CONFIG.COLORS.textMuted} />
              </View>
              <View style={styles.streamingTagsWrap}>
                {dashboardData?.streaming.lista.filter(s => s.valor > 0).map((s, idx) => (
                  <View key={idx} style={styles.streamingTag}>
                    <Text style={styles.streamingTagName}>{s.nombre}</Text>
                    <Text style={styles.streamingTagVal}>{formatCOP(s.valor)}</Text>
                    {s.banco ? <Text style={styles.streamingTagBank}>• {s.banco}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'manejo' && (
          <View style={styles.tabContainer}>
            {/* SELECTOR DE CUENTA (NÓMINA VS BONOS) */}
            <View style={styles.accountSelectorRow}>
              <TouchableOpacity
                style={[styles.accountTabBtn, activeAccount === 'nomina' && styles.accountTabBtnActive]}
                onPress={() => setActiveAccount('nomina')}
              >
                <Text style={[styles.accountTabText, activeAccount === 'nomina' && styles.accountTabTextActive]}>
                  Sueldo Nómina
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accountTabBtn, activeAccount === 'bonos' && styles.accountTabBtnActive]}
                onPress={() => setActiveAccount('bonos')}
              >
                <Text style={[styles.accountTabText, activeAccount === 'bonos' && styles.accountTabTextActive]}>
                  Tarjeta Bonos ($1.6M)
                </Text>
              </TouchableOpacity>
            </View>

                        {/* BANNER DE RECARGA PEOPLEPASS PAYCASH (DÍA 15) */}
            {activeAccount === 'bonos' && (
              <View style={styles.peoplepassBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.peoplepassTitle}>Peoplepass Paycash</Text>
                  <Text style={styles.peoplepassDesc}>Recarga mensual de $1.600.000 cada día 15</Text>
                </View>
                <TouchableOpacity
                  style={styles.recargarBonosBtn}
                  onPress={handleRecargarBonos}
                >
                  <Text style={styles.recargarBonosBtnText}>Recargar $1.6M</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionSubtitle}>
              Toca cualquier rubro para registrar un gasto o marcar su pago:
            </Text>

            {/* LISTA DE RUBROS EN MANEJO */}
            {(activeAccount === 'nomina' ? dashboardData?.nomina.gastos : dashboardData?.bonos.gastos)?.map((gasto, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.manejoItemCard}
                activeOpacity={0.7}
                onPress={() => handleOpenExpenseModal(gasto, activeAccount)}
              >
                <View style={styles.manejoTopRow}>
                  <Text style={styles.manejoItemName}>{gasto.nombre}</Text>
                  <Text style={styles.manejoItemBalance}>
                    {formatCOP(gasto.manejoActual)}
                  </Text>
                </View>
                <View style={styles.manejoBottomRow}>
                  <Text style={styles.manejoPresupuestoText}>
                    Presupuestado: {formatCOP(gasto.presupuestoTotal)}
                  </Text>
                  {gasto.manejoActual === 0 ? (
                    <View style={styles.statusBadgeCompleted}>
                      <CheckCircle2 size={13} color="#10B981" />
                      <Text style={styles.statusBadgeTextCompleted}>Al día / Pagado</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgePending}>
                      <Text style={styles.statusBadgeTextPending}>Disponible</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}



        {activeTab === 'bolsillos' && (
          <View style={styles.tabContainer}>
            {/* HERO TOTAL BOLSILLO I:30 */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroLabel}>Total Completo Bolsillo (I:30)</Text>
                <View style={styles.chipTag}>
                  <Text style={styles.chipText}>En Rendimiento</Text>
                </View>
              </View>
              <Text style={styles.heroAmount}>
                {formatCOP(dashboardData?.bolsillos.totalCompleto ?? dashboardData?.bolsillos.totalRendimientos ?? 7800000)}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>Total Ahorros (I:32):</Text>
                <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>
                  {formatCOP(dashboardData?.bolsillos.totalAhorros ?? 7800000)}
                </Text>
              </View>
            </View>

            {/* DESGLOSE DE CAPITAL GUARDADO */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Desglose de Ahorro Guardado</Text>
              <Text style={styles.cardDesc}>
                Capital resguardado en el bolsillo generando rendimientos diarios:
              </Text>
              <View style={styles.debtDivider} />
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.debtName}>Bolsillo Inversiones</Text>
                  <Text style={styles.debtMeta}>Capital a largo plazo</Text>
                </View>
                <Text style={[styles.debtAmount, { color: CONFIG.COLORS.accentGold }]}>
                  {formatCOP(dashboardData?.bolsillos.inversiones ?? 6800000)}
                </Text>
              </View>
              <View style={styles.debtDivider} />
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.debtName}>Ahorro Pagos Anuales</Text>
                  <Text style={styles.debtMeta}>Fondeado con primas semestrales</Text>
                </View>
                <Text style={[styles.debtAmount, { color: CONFIG.COLORS.accentMint }]}>
                  {formatCOP(dashboardData?.bolsillos.pagosAnuales ?? 1000000)}
                </Text>
              </View>
            </View>
          </View>
        )}
        </ScrollView>
      )}

      {/* BARRA DE NAVEGACIÓN INFERIOR (TABS) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} color={activeTab === 'dashboard' ? CONFIG.COLORS.accentMint : CONFIG.COLORS.textMuted} />
          <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'manejo' && styles.navItemActive]}
          onPress={() => setActiveTab('manejo')}
        >
          <Wallet size={20} color={activeTab === 'manejo' ? CONFIG.COLORS.accentMint : CONFIG.COLORS.textMuted} />
          <Text style={[styles.navLabel, activeTab === 'manejo' && styles.navLabelActive]}>Manejo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'chat' && styles.navItemActive]}
          onPress={() => setActiveTab('chat')}
        >
          <MessageSquare size={20} color={activeTab === 'chat' ? CONFIG.COLORS.accentMint : CONFIG.COLORS.textMuted} />
          <Text style={[styles.navLabel, activeTab === 'chat' && styles.navLabelActive]}>Chat IA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'bolsillos' && styles.navItemActive]}
          onPress={() => setActiveTab('bolsillos')}
        >
          <TrendingUp size={20} color={activeTab === 'bolsillos' ? CONFIG.COLORS.accentMint : CONFIG.COLORS.textMuted} />
          <Text style={[styles.navLabel, activeTab === 'bolsillos' && styles.navLabelActive]}>Bolsillos</Text>
        </TouchableOpacity>
      </View>

      {/* BOTÓN FLOTANTE (FAB) PARA REGISTRAR GASTO EN DASHBOARD Y MANEJO */}
      {(activeTab === 'dashboard' || activeTab === 'manejo') && (
        <TouchableOpacity
          style={styles.floatingActionButton}
          activeOpacity={0.85}
          onPress={handleOpenFloatingExpense}
        >
          <Plus size={24} color="#06181D" />
          <Text style={styles.floatingActionText}>Gasto</Text>
        </TouchableOpacity>
      )}

      {/* MODAL BOTTOM SHEET: REGISTRO MANUAL DE GASTO */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* CABECERA DEL MODAL */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalCategoryTitle}>{selectedGasto?.nombre}</Text>
                <Text style={styles.modalCategorySub}>
                  Cuenta: {selectedGasto?.cuenta === 'bonos' ? 'Tarjeta Bonos' : 'Sueldo Nómina'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* SELECTOR DE CUENTA DENTRO DEL MODAL */}
            <View style={styles.modalAccountToggleRow}>
              <TouchableOpacity
                style={[
                  styles.modalAccountToggleBtn,
                  selectedGasto?.cuenta === 'nomina' && styles.modalAccountToggleBtnActive
                ]}
                onPress={() => {
                  const firstNomina = dashboardData?.nomina.gastos[0];
                  if (firstNomina) {
                    setSelectedGasto({
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
                    selectedGasto?.cuenta === 'nomina' && styles.modalAccountToggleTextActive
                  ]}
                >
                  Sueldo Nómina
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalAccountToggleBtn,
                  selectedGasto?.cuenta === 'bonos' && styles.modalAccountToggleBtnActive
                ]}
                onPress={() => {
                  const firstBono = dashboardData?.bonos.gastos[0];
                  if (firstBono) {
                    setSelectedGasto({
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
                    selectedGasto?.cuenta === 'bonos' && styles.modalAccountToggleTextActive
                  ]}
                >
                  Tarjeta Bonos
                </Text>
              </TouchableOpacity>
            </View>

            {/* SELECTOR HORIZONTAL DE RUBRO RÁPIDO */}
            <Text style={styles.inputFieldLabel}>Cambiar categoría:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
              {(selectedGasto?.cuenta === 'bonos' ? dashboardData?.bonos.gastos : dashboardData?.nomina.gastos)?.map((g, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.categoryChip,
                    selectedGasto?.nombre === g.nombre && styles.categoryChipActive
                  ]}
                  onPress={() => {
                    setSelectedGasto({
                      nombre: g.nombre,
                      cuenta: selectedGasto?.cuenta || 'nomina',
                      manejoActual: g.manejoActual,
                      presupuestoTotal: g.presupuestoTotal
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedGasto?.nombre === g.nombre && styles.categoryChipTextActive
                    ]}
                  >
                    {g.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ESTADO DE SALDO ACTUAL */}
            <View style={styles.modalBalanceBox}>
              <Text style={styles.modalBalanceLabel}>Saldo disponible en Manejo:</Text>
              <Text style={styles.modalBalanceValue}>
                {formatCOP(selectedGasto?.manejoActual)}
              </Text>
            </View>

            {/* INPUT DE MONTO */}
            <Text style={styles.inputFieldLabel}>Monto a descontar ($ COP):</Text>
            <TextInput
              style={styles.modalInputMonto}
              placeholder="$0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={montoInput}
              onChangeText={setMontoInput}
              autoFocus={true}
            />

            {/* INPUT DE CONCEPTO / NOTA */}
            <Text style={styles.inputFieldLabel}>Concepto o detalle (opcional):</Text>
            <TextInput
              style={styles.modalInputConcepto}
              placeholder="Ej. Tanqueada, Almuerzo, etc."
              placeholderTextColor="#94A3B8"
              value={conceptoInput}
              onChangeText={setConceptoInput}
            />

            {/* BOTÓN DE CONFIRMACIÓN */}
            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                (!montoInput.trim() || submittingExpense) && styles.modalSubmitBtnDisabled
              ]}
              onPress={handleSaveExpense}
              disabled={!montoInput.trim() || submittingExpense}
            >
              {submittingExpense ? (
                <ActivityIndicator size="small" color="#06181D" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Registrar en Google Sheets</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06181D'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#06181D',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 14,
    fontSize: 14
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#06181D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10
  },
  appName: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  appSubtitle: {
    color: '#94A3B8',
    fontSize: 11
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F3741',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  badgeNotification: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981'
  },
  scrollContent: {
    flex: 1
  },
  tabContainer: {
    padding: 16,
    paddingBottom: 30
  },
  heroCard: {
    backgroundColor: '#0F3741',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  heroLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500'
  },
  chipTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  chipText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600'
  },
  heroAmount: {
    color: '#F1F5F9',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 16
  },
  progressSection: {
    marginBottom: 16
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  progressLabel: {
    color: '#94A3B8',
    fontSize: 12
  },
  progressValue: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '600'
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  quincenaToggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  quincenaToggleBtnActive: {
    backgroundColor: '#0B2B33',
    borderColor: '#10B981',
    borderWidth: 1
  },
  quincenaToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  quincenaToggleTextActive: {
    color: '#10B981'
  },
  cargarBtn: {
    marginLeft: 'auto',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  cargarBtnText: {
    color: '#06181D',
    fontSize: 12,
    fontWeight: '700'
  },
  salidasCard: {
    backgroundColor: '#0F3741',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  salidasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  salidasHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  salidasIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  salidasTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700'
  },
  salidasSubtitle: {
    color: '#94A3B8',
    fontSize: 11
  },
  salidasDisponibleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  salidasDisponibleBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600'
  },
  salidasAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10
  },
  salidasAmountBig: {
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: '800'
  },
  salidasAmountSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2
  },
  salidasPercentCircle: {
    alignItems: 'flex-end'
  },
  salidasPercentText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '700'
  },
  salidasPercentLabel: {
    color: '#94A3B8',
    fontSize: 10
  },
  salidasTipText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginTop: 10
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700'
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0F3741',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2
  },
  metricSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10
  },
  card: {
    backgroundColor: '#0F3741',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 14
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700'
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  debtName: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '500'
  },
  debtMeta: {
    color: '#94A3B8',
    fontSize: 11
  },
  debtAmount: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700'
  },
  debtDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginVertical: 6
  },
  streamingTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  streamingTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  streamingTagName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '600'
  },
  streamingTagVal: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700'
  },
  streamingTagBank: {
    color: '#94A3B8',
    fontSize: 10
  },
  peoplepassBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B2B33',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  peoplepassTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700'
  },
  peoplepassDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2
  },
  recargarBonosBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  recargarBonosBtnText: {
    color: '#06181D',
    fontSize: 12,
    fontWeight: '700'
  },
  accountSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#0F3741',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14
  },
  accountTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8
  },
  accountTabBtnActive: {
    backgroundColor: '#0B2B33'
  },
  accountTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  },
  accountTabTextActive: {
    color: '#10B981'
  },
  manejoItemCard: {
    backgroundColor: '#0F3741',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  manejoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  manejoItemName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600'
  },
  manejoItemBalance: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700'
  },
  manejoBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  manejoPresupuestoText: {
    color: '#94A3B8',
    fontSize: 11
  },
  statusBadgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeTextCompleted: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600'
  },
  statusBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeTextPending: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600'
  },
  chatPlaceholderCard: {
    backgroundColor: '#0F3741',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  chatTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8
  },
  chatDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18
  },
  chatExamplesBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  exampleItem: {
    color: '#10B981',
    fontSize: 13
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#06181D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  navItemActive: {
    transform: [{ scale: 1.05 }]
  },
  navLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500'
  },
  navLabelActive: {
    color: '#10B981',
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#0F3741',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  modalCategoryTitle: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700'
  },
  modalCategorySub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBalanceBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  modalBalanceLabel: {
    color: '#94A3B8',
    fontSize: 12
  },
  modalBalanceValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700'
  },
  inputFieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500'
  },
  modalInputMonto: {
    backgroundColor: '#0B2B33',
    borderRadius: 14,
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  modalInputConcepto: {
    backgroundColor: '#0B2B33',
    borderRadius: 14,
    color: '#F1F5F9',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  modalSubmitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  modalSubmitBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  modalSubmitBtnText: {
    color: '#06181D',
    fontSize: 15,
    fontWeight: '700'
  },
  modalAccountToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#06181D',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  modalAccountToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9
  },
  modalAccountToggleBtnActive: {
    backgroundColor: '#0F3741'
  },
  modalAccountToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  modalAccountToggleTextActive: {
    color: '#10B981',
    fontWeight: '700'
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 78,
    right: 18,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 9999
  },
  floatingActionText: {
    color: '#06181D',
    fontSize: 14,
    fontWeight: '800'
  },
  categoryChipsScroll: {
    marginBottom: 14
  },
  categoryChip: {
    backgroundColor: '#0B2B33',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  categoryChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981'
  },
  categoryChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500'
  },
  categoryChipTextActive: {
    color: '#10B981',
    fontWeight: '700'
  }
});
