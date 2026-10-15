import { describe, it, expect, vi } from 'vitest';
import { triggerHapticFeedback, syncNativeStatusBar, registerBackButtonHandler } from '../utils/nativePlatform';

describe('Native Platform Integration Seam Tests', () => {
  it('triggers haptic vibration without throwing in browser and mobile environments', async () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true,
    });

    await expect(triggerHapticFeedback()).resolves.not.toThrow();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it('syncs status bar theme safely without throwing', async () => {
    await expect(syncNativeStatusBar('dark')).resolves.not.toThrow();
    await expect(syncNativeStatusBar('light')).resolves.not.toThrow();
  });

  it('registers and unregisters hardware back button listener', () => {
    const handleBack = vi.fn().mockReturnValue(true);
    const unregister = registerBackButtonHandler(handleBack);
    expect(typeof unregister).toBe('function');
    expect(() => unregister()).not.toThrow();
  });
});
