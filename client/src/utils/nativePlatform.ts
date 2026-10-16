import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export { Capacitor, Haptics, StatusBar, App, ImpactStyle, Style };

/**
 * Triggers native device haptic feedback on keypad button presses,
 * falling back to browser vibration API if supported.
 */
export async function triggerHapticFeedback(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  } catch {
    // Ignore unsupported environment errors
  }
}

/**
 * Synchronizes native mobile status bar styling with the active theme.
 */
export async function syncNativeStatusBar(theme: 'dark' | 'light'): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light,
      });
      await StatusBar.setBackgroundColor({
        color: theme === 'dark' ? '#0E121B' : '#F8FAFC',
      });
    }
  } catch {
    // Ignore unsupported environment errors
  }
}

/**
 * Registers Android hardware back-button listener.
 */
export function registerBackButtonHandler(onBack: () => boolean): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const listenerHandle = App.addListener('backButton', ({ canGoBack }) => {
    // If onBack returns true, the back event was handled (e.g. modal closed)
    const handled = onBack();
    if (!handled && canGoBack) {
      window.history.back();
    }
  });

  return () => {
    listenerHandle.then((h) => h.remove()).catch(() => {});
  };
}
