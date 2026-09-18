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
  Alert
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
  AlertTriangle
} from 'lucide-react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CONFIG } from './src/config';
import { MivotryAPI, DashboardResponse, GastoItem } from './src/services/api';

const { width } = Dimensions.get('window');

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'manejo' | 'chat' | 'bolsillos' | 'admin'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [activeQuincena, setActiveQuincena] = useState<15 | 30>(15);
  const [activeAccount, setActiveAccount] = useState<'nomina' | 'bonos'>('nomina');

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
  const totalManejoActual = nominaGastos.reduce((acc, item) => acc + (item.manejoActual || 0), 0);
  const porcentajeManejo = totalPresupuestadoQ > 0 ? Math.min(100, Math.round((totalManejoActual / totalPresupuestadoQ) * 100)) : 0;

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
                <Text style={styles.heroLabel}>Presupuesto Quincenal Base</Text>
                <View style={styles.chipTag}>
                  <Text style={styles.chipText}>Quincena {activeQuincena}</Text>
                </View>
              </View>
              <Text style={styles.heroAmount}>
                {formatCOP(dashboardData?.nomina.quincenaBase || 4950000)}
              </Text>

              {/* BARRA DE PROGRESO DE MANEJO */}
              <View style={styles.progressSection}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressLabel}>Disponible en Manejo</Text>
                  <Text style={styles.progressValue}>
                    {formatCOP(totalManejoActual)} ({porcentajeManejo}%)
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

            {/* SECCIÓN BOLSILLOS & FLOAT EN VIVO */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Bolsillos & Rendimientos</Text>
              <TrendingUp size={18} color={CONFIG.COLORS.accentGold} />
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Ahorrado en Bolsillos</Text>
                <Text style={[styles.metricValue, { color: CONFIG.COLORS.accentGold }]}>
                  {formatCOP(dashboardData?.bolsillos.totalRendimientos || 7800000)}
                </Text>
                <Text style={styles.metricSub}>Bolsillos (Inversiones + Pagos anuales)</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Fondo Ocasional (F:20)</Text>
                <Text style={[styles.metricValue, { color: CONFIG.COLORS.accentMint }]}>
                  {formatCOP(dashboardData?.nomina.fondoOcasional || 0)}
                </Text>
                <Text style={styles.metricSub}>Vacaciones / Extras</Text>
              </View>
            </View>

            {/* TARJETA DE CRÉDITOS Y DEUDAS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Créditos Principales</Text>
                <CreditCard size={18} color={CONFIG.COLORS.textMuted} />
              </View>
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
              <View style={styles.debtRow}>
                <View>
                  <Text style={styles.debtName}>Crédito Hipotecario Apto</Text>
                  <Text style={styles.debtMeta}>Corte: Día {dashboardData?.deudas.creditoApto.fechaPago || '30'}</Text>
                </View>
                <Text style={styles.debtAmount}>
                  {formatCOP(dashboardData?.deudas.creditoApto.saldo || 75300000)}
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

            <Text style={styles.sectionSubtitle}>
              Toca cualquier rubro para registrar un gasto o marcar su pago:
            </Text>

            {/* LISTA DE RUBROS EN MANEJO */}
            {(activeAccount === 'nomina' ? dashboardData?.nomina.gastos : dashboardData?.bonos.gastos)?.map((gasto, idx) => (
              <View key={idx} style={styles.manejoItemCard}>
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
              </View>
            ))}
          </View>
        )}

        {activeTab === 'chat' && (
          <View style={styles.tabContainer}>
            <View style={styles.chatPlaceholderCard}>
              <MessageSquare size={36} color={CONFIG.COLORS.accentMint} style={{ marginBottom: 12 }} />
              <Text style={styles.chatTitle}>Asistente Financiero Mivotry</Text>
              <Text style={styles.chatDesc}>
                Escribe en lenguaje cotidiano para registrar gastos instantáneamente en tu Google Sheet:
              </Text>
              <View style={styles.chatExamplesBox}>
                <Text style={styles.exampleItem}>💬 "Gasté 45.000 en gasolina"</Text>
                <Text style={styles.exampleItem}>💬 "Compré 120k en PriceSmart con bonos"</Text>
                <Text style={styles.exampleItem}>💬 "Mauro me pagó 50 mil"</Text>
                <Text style={styles.exampleItem}>💬 "¿Cuánto me queda para salidas?"</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'bolsillos' && (
          <View style={styles.tabContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ahorro en Bolsillos & Rendimientos</Text>
              <Text style={styles.cardDesc}>
                Fondos resguardados en bolsillos remunerados (el rendimiento se genera en la entidad bancaria, aquí se controla el capital ahorrado).
              </Text>
              <View style={styles.debtDivider} />
              <View style={styles.debtRow}>
                <Text style={styles.debtName}>Ahorro en Inversiones</Text>
                <Text style={[styles.debtAmount, { color: CONFIG.COLORS.accentGold }]}>
                  {formatCOP(dashboardData?.bolsillos.inversiones || 6800000)}
                </Text>
              </View>
              <View style={styles.debtDivider} />
              <View style={styles.debtRow}>
                <Text style={styles.debtName}>Ahorro Pagos Anuales (Fondeado)</Text>
                <Text style={[styles.debtAmount, { color: CONFIG.COLORS.accentMint }]}>
                  {formatCOP(dashboardData?.bolsillos.pagosAnuales || 1000000)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

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
  }
});
