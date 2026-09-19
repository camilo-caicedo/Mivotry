import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from '@expo-google-fonts/plus-jakarta-sans';

// Design System & Theme
import { theme } from './src/theme';

// Custom Hooks (Decoupled State & Modals)
import { useDashboardData, useModalManager } from './src/hooks';

// Common Primitives
import { ScreenHeader, FloatingTabBar, TabKey, AnimatedPressable } from './src/components/common';
import { Plus } from 'lucide-react-native';

// Screen Views
import {
  DashboardScreen,
  ManejoScreen,
  BolsillosScreen,
  AdminScreen
} from './src/screens';

// Chat Assistant Screen
import { ChatAssistant } from './src/components/ChatAssistant';

// Modals
import { SMSDetectorModal } from './src/components/SMSDetectorModal';
import { NotificationsInboxModal } from './src/components/NotificationsInboxModal';
import { TransactionHistoryModal } from './src/components/TransactionHistoryModal';
import { SpendingChartsModal } from './src/components/SpendingChartsModal';
import { TransferOrAddMoneyModal } from './src/components/TransferOrAddMoneyModal';
import { SalidasDetailModal } from './src/components/SalidasDetailModal';
import { BonosDetailModal } from './src/components/BonosDetailModal';
import { QuickActionExecuteModal } from './src/components/QuickActionExecuteModal';
import { ManualExpenseModal } from './src/components/ManualExpenseModal';
import { PrimaInjectionModal } from './src/components/PrimaInjectionModal';
import { cacheService } from './src/services/cacheService';
import { GastoItem } from './src/services/api';
import { QuickActionItem } from './src/services/quickActionsService';
import { NotificationService } from './src/services/notificationService';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });

  const {
    loading,
    refreshing,
    dashboardData,
    activeQuincena,
    setActiveQuincena,
    activeAccount,
    setActiveAccount,
    onRefresh,
    fetchDashboard,
    handleCargarQuincena,
    totalManejoActual,
    salidasManejo,
    salidasPresupuestoQ,
    porcentajeManejo
  } = useDashboardData();

  // Solicitar permisos de notificaciones al arrancar (una sola vez, cuando las fuentes están listas)
  useEffect(() => {
    if (fontsLoaded) {
      NotificationService.requestPermissions().catch(() => {});
      NotificationService.setupChannels().catch(() => {});
    }
  }, [fontsLoaded]);

  const {
    smsModalVisible,
    inboxModalVisible,
    historyModalVisible,
    chartsModalVisible,
    transferModalVisible,
    salidasModalVisible,
    bonosModalVisible,
    quickActionModalVisible,
    primaModalVisible,
    gastoManualVisible,
    selectedGasto,
    transferOptions,
    quickActionOptions,
    openModal,
    closeModal
  } = useModalManager();

  const handleOpenManualExpense = (gasto: GastoItem, cuenta: 'nomina' | 'bonos') => {
    openModal('gastoManual', {
      nombre: gasto.nombre,
      cuenta,
      manejoActual: gasto.manejoActual,
      presupuestoTotal: gasto.presupuestoTotal
    });
  };

  const handleOpenFloatingExpense = () => {
    const list = activeAccount === 'nomina' ? dashboardData?.nomina?.gastos : dashboardData?.bonos?.gastos;
    const defaultGasto = list && list.length > 0 ? list[0] : null;
    if (defaultGasto) {
      handleOpenManualExpense(defaultGasto, activeAccount);
    } else {
      handleOpenManualExpense(
        { fila: 4, nombre: 'Salidas', presupuestoTotal: 600000, manejoActual: 240000 },
        'nomina'
      );
    }
  };

  const handleSelectQuickAction = (action: QuickActionItem) => {
    openModal('quickAction', { action, mode: 'execute' });
  };

  const handleCreateQuickAction = () => {
    openModal('quickAction', { action: null, mode: 'create' });
  };

  const handleClearCache = async () => {
    await cacheService.clearCache();
    await fetchDashboard(true);
  };

  if (!fontsLoaded || (loading && !dashboardData)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar style="light" />
          <ActivityIndicator size="large" color={theme.colors.accentMint} />
          <Text style={styles.loadingText}>
            {!fontsLoaded ? 'Cargando tipografía...' : 'Sincronizando con Google Sheets...'}
          </Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* CABECERA PRINCIPAL */}
        <ScreenHeader
          onCharts={() => openModal('charts')}
          onTransfer={() => openModal('transfer', { initialMode: 'transfer' })}
          onHistory={() => openModal('history')}
          onRefresh={onRefresh}
          onInbox={() => openModal('inbox')}
          unreadInboxCount={dashboardData?.totalNotificacionesPendientes || 0}
          refreshing={refreshing}
        />

        {/* PANTALLA ACTIVA */}
        <View style={styles.screenContainer}>
          {activeTab === 'dashboard' && (
            <DashboardScreen
              dashboardData={dashboardData}
              activeQuincena={activeQuincena}
              setActiveQuincena={setActiveQuincena}
              onCargarQuincena={handleCargarQuincena}
              onOpenInbox={() => openModal('inbox')}
              onOpenSalidas={() => openModal('salidas')}
              onOpenBonos={() => openModal('bonos')}
              onOpenPrima={() => openModal('prima')}
              onSelectQuickAction={handleSelectQuickAction}
              onNewQuickAction={handleCreateQuickAction}
              onExpenseCategoryPress={handleOpenManualExpense}
              totalManejoActual={totalManejoActual}
              porcentajeManejo={porcentajeManejo}
              salidasManejo={salidasManejo}
              salidasPresupuestoQ={salidasPresupuestoQ}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'manejo' && (
            <ManejoScreen
              dashboardData={dashboardData}
              activeAccount={activeAccount}
              setActiveAccount={setActiveAccount}
              onCategoryPress={handleOpenManualExpense}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'chat' && (
            <ChatAssistant
              dashboardData={dashboardData}
              onExpenseRegistered={() => fetchDashboard(false)}
            />
          )}

          {activeTab === 'bolsillos' && (
            <BolsillosScreen
              dashboardData={dashboardData}
              onOpenPrimaModal={() => openModal('prima')}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'admin' && (
            <AdminScreen
              dashboardData={dashboardData}
              onRefresh={() => fetchDashboard(true)}
              onClearCache={handleClearCache}
              refreshing={refreshing}
            />
          )}
        </View>

        {/* BOTÓN FLOTANTE (FAB) PARA REGISTRAR GASTO */}
        {(activeTab === 'dashboard' || activeTab === 'manejo') && (
          <AnimatedPressable
            style={styles.floatingActionButton}
            scale={0.92}
            onPress={handleOpenFloatingExpense}
            accessibilityLabel="Registrar nuevo gasto"
          >
            <Plus size={20} color="#060D0F" strokeWidth={2.8} />
            <Text style={styles.floatingActionText}>Gasto</Text>
          </AnimatedPressable>
        )}

        {/* BARRA DE NAVEGACIÓN FLOTANTE */}
        <FloatingTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* MODALES DEL SISTEMA */}
        <SMSDetectorModal
          visible={smsModalVisible}
          onClose={() => closeModal('sms')}
          dashboardData={dashboardData}
          onGastoRegistrado={() => fetchDashboard(false)}
        />

        <NotificationsInboxModal
          visible={inboxModalVisible}
          onClose={() => closeModal('inbox')}
          dashboardData={dashboardData}
          onGastosActualizados={() => fetchDashboard(false)}
        />

        <TransactionHistoryModal
          visible={historyModalVisible}
          onClose={() => closeModal('history')}
        />

        <SpendingChartsModal
          visible={chartsModalVisible}
          onClose={() => closeModal('charts')}
          dashboardData={dashboardData}
        />

        <TransferOrAddMoneyModal
          visible={transferModalVisible}
          onClose={() => closeModal('transfer')}
          onSuccess={() => fetchDashboard(false)}
          dashboardData={dashboardData}
          initialMode={transferOptions.initialMode}
          initialAccount={transferOptions.initialAccount}
          initialCategory={transferOptions.initialCategory}
        />

        <SalidasDetailModal
          visible={salidasModalVisible}
          onClose={() => closeModal('salidas')}
          salidasDisponible={salidasManejo}
          salidasPresupuesto={salidasPresupuestoQ}
          onAddExpense={() => {
            closeModal('salidas');
            const itemSalidas = dashboardData?.nomina?.gastos?.find(g =>
              g.nombre.toLowerCase().includes('salida')
            );
            if (itemSalidas) {
              handleOpenManualExpense(itemSalidas, 'nomina');
            }
          }}
        />

        <BonosDetailModal
          visible={bonosModalVisible}
          onClose={() => closeModal('bonos')}
          bonosData={dashboardData?.bonos}
          onPressCategory={(gasto) => {
            closeModal('bonos');
            handleOpenManualExpense(gasto, 'bonos');
          }}
          onRechargePress={() => {
            closeModal('bonos');
            openModal('transfer', { initialMode: 'add', initialAccount: 'bonos' });
          }}
          onQuickExpensePress={() => {
            closeModal('bonos');
            const firstBono = dashboardData?.bonos?.gastos?.[0] || {
              fila: 24,
              nombre: 'Pricesmart',
              presupuestoTotal: 700000,
              manejoActual: 0
            };
            handleOpenManualExpense(firstBono, 'bonos');
          }}
        />

        <QuickActionExecuteModal
          visible={quickActionModalVisible}
          onClose={() => closeModal('quickAction')}
          action={quickActionOptions.action}
          mode={quickActionOptions.mode}
          dashboardData={dashboardData}
          onSuccess={() => fetchDashboard(false)}
        />

        <ManualExpenseModal
          visible={gastoManualVisible}
          onClose={() => closeModal('gastoManual')}
          selectedGasto={selectedGasto}
          dashboardData={dashboardData}
          onSuccess={() => fetchDashboard(false)}
        />

        <PrimaInjectionModal
          visible={primaModalVisible}
          onClose={() => closeModal('prima')}
          pagosAnualesActual={dashboardData?.bolsillos?.pagosAnuales || 0}
          onSuccess={() => fetchDashboard(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginTop: 14,
    fontSize: theme.typography.fontSizes.sm
  },
  screenContainer: {
    flex: 1,
    position: 'relative'
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 86,
    right: 18,
    backgroundColor: theme.colors.accentMint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 60,
  },
  floatingActionText: {
    fontFamily: theme.fonts.extraBold,
    color: '#060D0F',
    fontSize: 14,
  }
});
