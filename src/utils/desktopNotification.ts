/**
 * Desktop Notification Manager for Form Submissions
 * Utilizes the browser Notification API with user permission controls,
 * deduplication, and privacy-first notification content.
 */

const NOTIF_ENABLED_KEY = 'eventform_desktop_notifications_enabled';
const NOTIFIED_IDS_KEY = 'eventform_notified_sub_ids';

function getNotifiedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFIED_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markIdAsNotified(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getNotifiedIds();
    set.add(id);
    // Keep max 200 IDs to avoid memory leaks
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(arr));
  } catch {}
}

/**
 * Check if the browser supports Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Check if the user has explicitly enabled desktop notifications in application settings
 */
export function isDesktopNotificationEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  try {
    const pref = localStorage.getItem(NOTIF_ENABLED_KEY);
    return pref === 'true' && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Enable or disable desktop notifications with permission prompt
 */
export async function toggleDesktopNotifications(targetState?: boolean): Promise<{
  enabled: boolean;
  permission: NotificationPermission | 'unsupported';
  message: string;
}> {
  if (!isNotificationSupported()) {
    return {
      enabled: false,
      permission: 'unsupported',
      message: 'Desktop notifications are not supported in this browser.',
    };
  }

  const currentPermission = Notification.permission;

  if (targetState === false) {
    localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    return {
      enabled: false,
      permission: currentPermission,
      message: 'Desktop notifications have been turned off.',
    };
  }

  if (currentPermission === 'denied') {
    localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    return {
      enabled: false,
      permission: 'denied',
      message:
        'Notifications are blocked in your browser settings. Please allow notifications for this site in your browser address bar.',
    };
  }

  if (currentPermission === 'default') {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
        return {
          enabled: true,
          permission: 'granted',
          message: 'Desktop notifications enabled successfully!',
        };
      } else {
        localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
        return {
          enabled: false,
          permission: result,
          message: 'Notification permission was not granted.',
        };
      }
    } catch (err) {
      return {
        enabled: false,
        permission: 'default',
        message: 'Could not request notification permission.',
      };
    }
  }

  // Already granted
  const shouldEnable = targetState !== undefined ? targetState : !isDesktopNotificationEnabled();
  localStorage.setItem(NOTIF_ENABLED_KEY, shouldEnable ? 'true' : 'false');
  return {
    enabled: shouldEnable,
    permission: 'granted',
    message: shouldEnable
      ? 'Desktop notifications enabled for new registrations.'
      : 'Desktop notifications turned off.',
  };
}

/**
 * Send a notification for a new form submission
 * Enforces deduplication and privacy safeguards.
 */
export function sendSubmissionNotification(params: {
  submissionId: string;
  formTitle: string;
  formId?: string;
  onClick?: () => void;
}): boolean {
  if (!isNotificationSupported()) return false;
  if (!isDesktopNotificationEnabled()) return false;
  if (Notification.permission !== 'granted') return false;

  const { submissionId, formTitle, onClick } = params;

  // Prevent duplicate notifications for the same submission
  const notified = getNotifiedIds();
  if (notified.has(submissionId)) {
    return false;
  }
  markIdAsNotified(submissionId);

  try {
    const title = `New Registration: ${formTitle || 'Event Form'}`;
    const options: NotificationOptions = {
      body: `A new participant registered for "${formTitle || 'your event'}". Click to view response.`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `submission-${submissionId}`,
      requireInteraction: false,
      silent: false,
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
      try {
        window.focus();
        onClick?.();
        notification.close();
      } catch (e) {
        console.warn('Notification click handler error:', e);
      }
    };

    return true;
  } catch (err) {
    console.warn('Failed to display desktop notification:', err);
    return false;
  }
}
