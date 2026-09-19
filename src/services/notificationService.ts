import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DashboardResponse } from './api';

// Configurar comportamiento para mostrar banners y reproducir sonido en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  /**
   * Solicita permisos de notificación al usuario en iOS y Android
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('Error al solicitar permisos de notificación:', err);
      return false;
    }
  },

  /**
   * Obtiene el estado actual de los permisos de notificación
   */
  async getPermissionStatus(): Promise<'granted' | 'undetermined' | 'denied'> {
    if (Platform.OS === 'web') return 'undetermined';
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch {
      return 'undetermined';
    }
  },

  /**
   * Configura canales de notificación en Android (requerido en Android 8+)
   */
  async setupChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mivotry-reminders', {
        name: 'Alertas y Recordatorios Mivotry',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }
  },

  /**
   * Envía una notificación de prueba instantánea para validar que el sistema de alertas funciona
   */
  async sendTestNotification(): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Permiso de notificaciones denegado. Habilítalo en los ajustes de tu dispositivo.');
    }
    await this.setupChannels();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Mivotry - Alertas Activas',
        body: 'Las notificaciones de cortes de tarjeta y recordatorios de quincena están funcionando correctamente.',
        data: { screen: 'dashboard' },
      },
      trigger: null, // Inmediato
    });
    return id;
  },

  /**
   * Programa recordatorios locales de cortes de tarjetas y cierres de quincena
   * basándose en la información en vivo de Google Sheets
   */
  async syncScheduledReminders(dashboard: DashboardResponse): Promise<number> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return 0;
    await this.setupChannels();

    // Limpiar programaciones anteriores para evitar duplicados
    await Notifications.cancelAllScheduledNotificationsAsync();

    let scheduledCount = 0;
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Recordatorios de Cierre de Quincena (Día 14 y Día 29 a las 9:00 AM)
    const quincenas = [
      { day: 14, label: 'Quincena 15' },
      { day: 29, label: 'Quincena 30' }
    ];

    for (const q of quincenas) {
      if (currentDay < q.day) {
        const targetDate = new Date(currentYear, currentMonth, q.day, 9, 0, 0);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🗓️ Mañana: Cierre de ${q.label}`,
            body: 'Revisa tu disponible en Manejo y asegúrate de registrar tus gastos antes del corte.',
            data: { type: 'quincena', target: q.day },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetDate,
          },
        });
        scheduledCount++;
      }
    }

    // 2. Recordatorios de Cortes de Tarjetas de Crédito
    const tarjetas = dashboard?.deudas?.tarjetasDetalle || [];
    for (const tc of tarjetas) {
      const corteDia = parseInt(tc.fechaPago || '15', 10);
      if (!isNaN(corteDia) && corteDia > 1) {
        const avisoDia = corteDia - 1; // Avisar 1 día antes del corte
        if (currentDay < avisoDia) {
          const targetDate = new Date(currentYear, currentMonth, avisoDia, 10, 0, 0);
          const saldoFormatted = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
          }).format(tc.saldo);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `💳 Corte próximo: ${tc.nombre}`,
              body: `El corte de tu tarjeta es mañana (Día ${corteDia}). Saldo actual: ${saldoFormatted}.`,
              data: { type: 'tarjeta', nombre: tc.nombre },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: targetDate,
            },
          });
          scheduledCount++;
        }
      }
    }

    return scheduledCount;
  }
};
