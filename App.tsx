import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Design System & Theme
import { theme } from './src/theme';

// Custom Hooks (Decoupled State & Modals)
import { useDashboardData, useModalManager } from './src/hooks';

// Common Primitives
import { ScreenHeader, FloatingTabBar, TabKey } from './src/components/common';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

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

  if (loading && !dashboardData) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar style="light" />
          <ActivityIndicator size="large" color={theme.colors.accentMint} />
          <Text style={styles.loadingText}>Sincronizando con Google Sheets...</Text>
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
    color: theme.colors.textSecondary,
    marginTop: 14,
    fontSize: theme.typography.fontSizes.sm
  },
  screenContainer: {
    flex: 1,
    position: 'relative'
  }
});
