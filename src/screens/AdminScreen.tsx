import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Settings,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Layers,
  Cpu,
  ShieldCheck,
  Activity,
  Sparkles,
  Server,
  Zap,
  Bell,
  Calendar,
} from 'lucide-react-native';
import { CONFIG } from '../config';
import { cacheService } from '../services/cacheService';
import { DashboardResponse } from '../services/api';

import { theme } from '../theme';

export interface AdminScreenProps {
  dashboardData: DashboardResponse | null;
  onRefresh: () => void;
  onClearCache: () => void;
  refreshing?: boolean;
  scrollable?: boolean;
}

/** Haptic feedback wrapper with platform safety */
const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(style).catch(() => {});
    } catch {
      // Haptics unavailable on current device/environment
    }
  }
};

export const AdminScreen: React.FC<AdminScreenProps> = ({
  dashboardData,
  onRefresh,
  onClearCache,
  refreshing = false,
  scrollable = true,
}) => {
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState<number | null>(null);
  const [lastSyncFormatted, setLastSyncFormatted] = useState<string | null>(null);

  // Leer estado del caché offline
  useEffect(() => {
    let isMounted = true;
    const fetchCacheMeta = async () => {
      try {
        const cached = await cacheService.getCachedDashboard();
        if (cached && isMounted) {
          setCacheAgeMinutes(cached.ageMinutes);
          if (cached.timestamp > 0) {
            const date = new Date(cached.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
            setLastSyncFormatted(`${timeStr} • ${dateStr}`);
          }
        }
      } catch (err) {
        console.error('Error al cargar metadatos de caché:', err);
      }
    };

    fetchCacheMeta();
    return () => {
      isMounted = false;
    };
  }, [dashboardData, refreshing]);

  // Contadores de registros sincronizados
  const recordCounts = useMemo(() => {
    return {
      nomina: dashboardData?.nomina?.gastos?.length ?? 0,
      bonos: dashboardData?.bonos?.gastos?.length ?? 0,
      pagosAnuales: dashboardData?.pagosAnuales?.length ?? 0,
      streaming: dashboardData?.streaming?.lista?.length ?? 0,
      tarjetas: dashboardData?.deudas?.tarjetasDetalle?.length ?? 0,
      notificaciones: dashboardData?.totalNotificacionesPendientes ?? 0,
    };
  }, [dashboardData]);

  // Manejo de confirmación para limpiar caché
  const handleClearCacheConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Limpiar Caché Local',
      '¿Deseas eliminar los datos almacenados en AsyncStorage? Esto forzará una sincronización completa con Google Sheets en la próxima recarga.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar Caché',
          style: 'destructive',
          onPress: () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            onClearCache();
          },
        },
      ]
    );
  };

  const handleManualSync = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onRefresh();
  };

  const handleScheduleReminders = () => {
    Alert.alert('No disponible', 'Las notificaciones fueron removidas de esta versión.');
  };

  const handleSendTestNotification = () => {
    Alert.alert('No disponible', 'Las notificaciones fueron removidas de esta versión.');
  };


  const maskedApiUrl = useMemo(() => {
    try {
      const url = CONFIG.API_URL;
      const parts = url.split('/s/');
      if (parts.length > 1) {
        const idPart = parts[1].split('/')[0];
        const maskedId = `${idPart.slice(0, 8)}...${idPart.slice(-6)}`;
        return `script.google.com/macros/s/${maskedId}/exec`;
      }
      return url;
    } catch {
      return 'Google Apps Script Web App';
    }
  }, []);

  const content = (
    <View style={styles.container}>
      {/* 1. HEADER DE LA PANTALLA */}
      <View style={styles.headerSection}>
        <View style={styles.headerIconBox}>
          <Settings size={22} color={theme.colors.accentMint} />
        </View>
        <View style={styles.headerTitles}>
          <Text style={styles.screenPreTitle}>SISTEMA & OPERACIONES</Text>
          <Text style={styles.screenTitle}>Configuración y Diagnósticos</Text>
          <Text style={styles.screenSubtitle}>
            Supervisión del backend, sincronización y almacenamiento
          </Text>
        </View>
      </View>

      {/* 2. GOOGLE SHEETS STATUS CARD (DOUBLE-BEZEL DESIGN) */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Estado de Google Sheets</Text>
          <Text style={styles.sectionSubtitle}>Conexión con el libro contable principal</Text>
        </View>
        <Activity size={18} color={theme.colors.accentMint} />
      </View>

      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          {/* TOP STATUS ROW */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.serviceInfoRow}>
              <View style={styles.sheetIconBox}>
                <FileSpreadsheet size={20} color={theme.colors.accentMint} />
              </View>
              <View>
                <Text style={styles.serviceName}>Google Apps Script API</Text>
                <Text style={styles.serviceEndpoint}>{maskedApiUrl}</Text>
              </View>
            </View>
            <View style={styles.statusLiveBadge}>
              <View style={styles.statusLiveDot} />
              <Text style={styles.statusLiveText}>Conectado</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ÚLTIMA SINCRONIZACIÓN */}
          <View style={styles.syncMetaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncMetaLabel}>Última sincronización</Text>
              <Text style={styles.syncMetaValue}>
                {lastSyncFormatted ? lastSyncFormatted : 'Sincronizado recientemente'}
              </Text>
            </View>
            <View style={styles.cacheAgeBadge}>
              <Text style={styles.cacheAgeText}>
                {cacheAgeMinutes !== null
                  ? cacheAgeMinutes === 0
                    ? 'Hace unos segundos'
                    : `Hace ${cacheAgeMinutes} min`
                  : 'Caché en vivo'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* REGISTROS SINCRONIZADOS: GRID DE MÉTRICAS */}
          <Text style={styles.recordsGridTitle}>Registros Sincronizados</Text>
          <View style={styles.recordsGrid}>
            <View style={styles.recordPill}>
              <Text style={styles.recordPillVal}>{recordCounts.nomina}</Text>
              <Text style={styles.recordPillLabel}>Rubros Nómina</Text>
            </View>
            <View style={styles.recordPill}>
              <Text style={styles.recordPillVal}>{recordCounts.bonos}</Text>
              <Text style={styles.recordPillLabel}>Rubros Bonos</Text>
            </View>
            <View style={styles.recordPill}>
              <Text style={styles.recordPillVal}>{recordCounts.pagosAnuales}</Text>
              <Text style={styles.recordPillLabel}>Compromisos Anuales</Text>
            </View>
            <View style={styles.recordPill}>
              <Text style={styles.recordPillVal}>{recordCounts.streaming}</Text>
              <Text style={styles.recordPillLabel}>Streaming</Text>
            </View>
            <View style={styles.recordPill}>
              <Text style={styles.recordPillVal}>{recordCounts.tarjetas}</Text>
              <Text style={styles.recordPillLabel}>Tarjetas Crédito</Text>
            </View>
            <View style={styles.recordPill}>
              <Text
                style={[
                  styles.recordPillVal,
                  recordCounts.notificaciones > 0 && { color: theme.colors.accentGold },
                ]}
              >
                {recordCounts.notificaciones}
              </Text>
              <Text style={styles.recordPillLabel}>Notif. Pendientes</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. ACCIONES DEL SISTEMA */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Acciones del Sistema</Text>
          <Text style={styles.sectionSubtitle}>Mantenimiento y sincronización manual</Text>
        </View>
        <Zap size={18} color={theme.colors.accentGold} />
      </View>

      {/* BOTÓN SINCRONIZAR AHORA */}
      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          <View style={styles.actionCardTop}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.accentMintMuted }]}>
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.colors.accentMint} />
              ) : (
                <RefreshCw size={18} color={theme.colors.accentMint} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Sincronizar ahora</Text>
              <Text style={styles.actionCardDesc}>
                Descarga de inmediato los datos más recientes desde Google Sheets y actualiza la
                caché local.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryActionBtn, refreshing && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={handleManualSync}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#06181D" />
            ) : (
              <RefreshCw size={14} color="#06181D" />
            )}
            <Text style={styles.primaryActionBtnText}>
              {refreshing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BOTÓN LIMPIAR CACHÉ */}
      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          <View style={styles.actionCardTop}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.accentRoseMuted }]}>
              <Trash2 size={18} color={theme.colors.accentRose} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Limpiar caché local</Text>
              <Text style={styles.actionCardDesc}>
                Elimina los registros almacenados en AsyncStorage para forzar una sincronización
                limpia sin historial residual.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dangerActionBtn}
            activeOpacity={0.8}
            onPress={handleClearCacheConfirm}
          >
            <Trash2 size={14} color={theme.colors.accentRose} />
            <Text style={styles.dangerActionBtnText}>Limpiar Caché Local</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. NOTIFICACIONES PUSH DEL DISPOSITIVO */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Notificaciones Push</Text>
          <Text style={styles.sectionSubtitle}>Alertas automáticas de cortes y quincenas</Text>
        </View>
        <Bell size={18} color={theme.colors.accentMint} />
      </View>

      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          <View style={styles.actionCardTop}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.accentMintMuted }]}>
              <Bell size={18} color={theme.colors.accentMint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Recordatorios en el Teléfono</Text>
              <Text style={styles.actionCardDesc}>
                Programa alertas locales para avisarte 1 día antes del corte de tus tarjetas de crédito y del cierre de quincena.
              </Text>
            </View>
          </View>

          <View style={styles.notificationActionGrid}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              activeOpacity={0.8}
              onPress={handleScheduleReminders}
            >
              <Calendar size={14} color="#06181D" />
              <Text style={styles.primaryActionBtnText}>Programar Alertas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              activeOpacity={0.8}
              onPress={handleSendTestNotification}
            >
              <Sparkles size={14} color={theme.colors.accentMint} />
              <Text style={styles.secondaryActionBtnText}>Probar Notificación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 5. METADATOS DE LA APP */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Metadatos de la App</Text>
          <Text style={styles.sectionSubtitle}>Especificaciones técnicas del entorno de ejecución</Text>
        </View>
        <Cpu size={18} color={theme.colors.accentVioletLight} />
      </View>

      <View style={styles.doubleBezelOuter}>
        <View style={styles.doubleBezelInner}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Versión de la App</Text>
            <View style={styles.metaBadgeMuted}>
              <Text style={styles.metaBadgeTextMuted}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Expo SDK</Text>
            <View style={styles.metaBadgeMuted}>
              <Text style={styles.metaBadgeTextMuted}>57.0.0</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Arquitectura React Native</Text>
            <View style={styles.metaBadgeMint}>
              <CheckCircle2 size={11} color={theme.colors.accentMint} />
              <Text style={styles.metaBadgeTextMint}>New Architecture Activa</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Plataforma</Text>
            <View style={styles.metaBadgeMuted}>
              <Text style={styles.metaBadgeTextMuted}>{Platform.OS.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Motor JavaScript</Text>
            <View style={styles.metaBadgeMuted}>
              <Text style={styles.metaBadgeTextMuted}>Hermes Engine</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (!scrollable) {
    return content;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accentMint}
            colors={[theme.colors.accentMint]}
          />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  container: {
    padding: theme.spacing.lg,
  },

  // HEADER DE LA PANTALLA
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentMintMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  headerTitles: {
    flex: 1,
  },
  screenPreTitle: {
    color: theme.colors.accentMint,
    fontSize: 10,
    fontWeight: theme.fontWeights.bold,
    letterSpacing: theme.letterSpacing.wider,
    marginBottom: 2,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
  },
  screenSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 2,
  },

  // DOUBLE-BEZEL DESIGN PATTERN
  doubleBezelOuter: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.xl, // 22px
    padding: 6, // 6px gap
    marginBottom: theme.spacing.md,
  },
  doubleBezelInner: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },

  // SECCIONES
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.bold,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    marginTop: 1,
  },

  // STATUS CARD
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
    marginRight: 8,
  },
  sheetIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentMintMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
  },
  serviceEndpoint: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  statusLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentMint,
  },
  statusLiveText: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },

  // SYNC ROW
  syncMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncMetaLabel: {
    color: theme.colors.textTertiary,
    fontSize: theme.fontSizes.xs,
    marginBottom: 2,
  },
  syncMetaValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.semiBold,
  },
  cacheAgeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  cacheAgeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
  },

  // RECORDS GRID
  recordsGridTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recordPill: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  recordPillVal: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.bold,
    marginBottom: 2,
  },
  recordPillLabel: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
  },

  // ACCIONES
  actionCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
    marginBottom: 2,
  },
  actionCardDesc: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.xs,
    lineHeight: 17,
  },
  notificationActionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentMint,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
  },
  primaryActionBtnText: {
    fontFamily: theme.fonts.bold,
    color: '#060D0F',
    fontSize: theme.fontSizes.sm,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 11,
    borderRadius: theme.radius.md,
  },
  secondaryActionBtnText: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.sm,
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentRoseMuted,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    paddingVertical: 11,
    borderRadius: theme.radius.md,
  },
  dangerActionBtnText: {
    color: theme.colors.accentRose,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // METADATOS APP
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  metaLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.sm,
  },
  metaBadgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  metaBadgeTextMuted: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
  },
  metaBadgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentMintMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  metaBadgeTextMint: {
    color: theme.colors.accentMint,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semiBold,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: theme.spacing.md,
  },
});

export default AdminScreen;
