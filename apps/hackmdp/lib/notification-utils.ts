/**
 * Notification utilities for equipment alerts and reminders
 */

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Check if browser supports notifications
 */
export const supportsNotifications = (): boolean => {
  return 'Notification' in window;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!supportsNotifications()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Show browser notification
 */
export const showNotification = (config: NotificationConfig): Notification | null => {
  if (!supportsNotifications()) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(config.title, {
      body: config.body,
      icon: config.icon || '/icon-192.png',
      tag: config.tag,
      requireInteraction: config.requireInteraction || false,
    });

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

/**
 * Calculate days until date
 */
export const daysUntil = (date: string | Date): number => {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Check if alert is urgent (less than 3 days or overdue)
 */
export const isAlertUrgent = (fechaLimite: string | null | undefined): boolean => {
  if (!fechaLimite) return false;

  const days = daysUntil(fechaLimite);
  return days <= 3;
};

/**
 * Get urgency level for alert
 */
export const getAlertUrgency = (fechaLimite: string | null | undefined): 'overdue' | 'urgent' | 'soon' | 'normal' => {
  if (!fechaLimite) return 'normal';

  const days = daysUntil(fechaLimite);

  if (days < 0) return 'overdue';
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'soon';
  return 'normal';
};

/**
 * Format urgency message
 */
export const getUrgencyMessage = (fechaLimite: string | null | undefined): string => {
  if (!fechaLimite) return '';

  const days = daysUntil(fechaLimite);

  if (days < 0) return `Vencida hace ${Math.abs(days)} días`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 7) return `Vence en ${days} días`;
  if (days <= 30) return `Vence en ${days} días`;

  return '';
};

/**
 * Check alerts and show notifications for urgent ones
 */
export const checkAndNotifyUrgentAlerts = (alertas: any[]): void => {
  if (!supportsNotifications() || Notification.permission !== 'granted') {
    return;
  }

  const pendingAlertas = alertas.filter(a => a.estado === 'pendiente' || a.estado === 'en_proceso');
  const urgentAlertas = pendingAlertas.filter(a => isAlertUrgent(a.fecha_limite));

  if (urgentAlertas.length === 0) {
    return;
  }

  // Show notification for most urgent alert
  const mostUrgent = urgentAlertas.sort((a, b) => {
    const daysA = daysUntil(a.fecha_limite);
    const daysB = daysUntil(b.fecha_limite);
    return daysA - daysB;
  })[0];

  const urgency = getAlertUrgency(mostUrgent.fecha_limite);
  const message = getUrgencyMessage(mostUrgent.fecha_limite);

  let title = '🔔 Alerta Urgente';
  if (urgency === 'overdue') title = '⚠️ Alerta Vencida';

  showNotification({
    title,
    body: `${mostUrgent.titulo}\n${message}\n\n${urgentAlertas.length} alertas urgentes en total`,
    tag: 'urgent-alerts',
    requireInteraction: urgency === 'overdue',
  });
};

/**
 * Setup periodic alert checking (every 5 minutes)
 */
export const setupAlertNotifications = (fetchAlertas: () => Promise<any[]>): () => void => {
  let intervalId: NodeJS.Timeout;

  const checkAlerts = async () => {
    try {
      const alertas = await fetchAlertas();
      checkAndNotifyUrgentAlerts(alertas);
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  // Check immediately
  checkAlerts();

  // Then check every 5 minutes
  intervalId = setInterval(checkAlerts, 5 * 60 * 1000);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};
