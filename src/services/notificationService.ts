// expo-notifications removido — no se usa en esta versión.
// Stub vacío para que los imports existentes no rompan durante la migración.

export const NotificationService = {
  async requestPermissions(): Promise<boolean> { return false; },
  async getPermissionStatus(): Promise<'granted' | 'undetermined' | 'denied'> { return 'undetermined'; },
  async setupChannels(): Promise<void> {},
  async sendTestNotification(): Promise<string> { return ''; },
  async syncScheduledReminders(_dashboard: unknown): Promise<number> { return 0; },
};

export default NotificationService;
