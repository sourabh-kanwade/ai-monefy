import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn(),
    setBackgroundColor: vi.fn(),
  },
  Style: {
    Dark: 'DARK',
    Light: 'LIGHT',
    Default: 'DEFAULT',
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
  },
}));

import {
  triggerHapticFeedback,
  syncNativeStatusBar,
  registerBackButtonHandler,
  Capacitor,
  Haptics,
  StatusBar,
  App,
  ImpactStyle,
  Style,
} from '../utils/nativePlatform';

describe('Native Platform Integration Seam Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers haptic vibration on web with navigator.vibrate fallback', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true,
    });

    await triggerHapticFeedback();
    expect(vibrateSpy).toHaveBeenCalledWith(10);

    // Error handling branch
    vibrateSpy.mockImplementation(() => {
      throw new Error('Vibrate unsupported');
    });
    await expect(triggerHapticFeedback()).resolves.not.toThrow();
  });

  it('triggers native haptics when on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const impactSpy = vi.spyOn(Haptics, 'impact').mockResolvedValue(undefined as any);

    await triggerHapticFeedback();
    expect(impactSpy).toHaveBeenCalledWith({ style: ImpactStyle.Light });

    // Catch error branch
    impactSpy.mockRejectedValue(new Error('Haptics fail'));
    await expect(triggerHapticFeedback()).resolves.not.toThrow();
  });

  it('syncs status bar styling on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const styleSpy = vi.spyOn(StatusBar, 'setStyle').mockResolvedValue(undefined as any);
    const bgSpy = vi.spyOn(StatusBar, 'setBackgroundColor').mockResolvedValue(undefined as any);

    await syncNativeStatusBar('dark');
    expect(styleSpy).toHaveBeenCalledWith({ style: Style.Dark });
    expect(bgSpy).toHaveBeenCalledWith({ color: '#0E121B' });

    await syncNativeStatusBar('light');
    expect(styleSpy).toHaveBeenCalledWith({ style: Style.Light });
    expect(bgSpy).toHaveBeenCalledWith({ color: '#F8FAFC' });

    // Error branch
    styleSpy.mockRejectedValue(new Error('Status bar unsupported'));
    await expect(syncNativeStatusBar('dark')).resolves.not.toThrow();
  });

  it('registers and invokes hardware back button listener on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    let registeredCallback: ((event: { canGoBack: boolean }) => void) | null = null;
    const removeSpy = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(App, 'addListener').mockImplementation((event: string, callback: any) => {
      if (event === 'backButton') {
        registeredCallback = callback;
      }
      return Promise.resolve({ remove: removeSpy }) as any;
    });

    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    // Case 1: onBack returns true (handled)
    const onBackTrue = vi.fn().mockReturnValue(true);
    const unregister1 = registerBackButtonHandler(onBackTrue);
    expect(registeredCallback).not.toBeNull();
    registeredCallback!({ canGoBack: true });
    expect(onBackTrue).toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
    unregister1();

    // Case 2: onBack returns false and canGoBack is true -> calls window.history.back()
    const onBackFalse = vi.fn().mockReturnValue(false);
    const unregister2 = registerBackButtonHandler(onBackFalse);
    registeredCallback!({ canGoBack: true });
    expect(onBackFalse).toHaveBeenCalled();
    expect(backSpy).toHaveBeenCalled();
    unregister2();

    // Case 3: onBack returns false and canGoBack is false
    backSpy.mockClear();
    registeredCallback!({ canGoBack: false });
    expect(backSpy).not.toHaveBeenCalled();

    // Case 4: non-native returns noop
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const unregisterWeb = registerBackButtonHandler(onBackFalse);
    expect(typeof unregisterWeb).toBe('function');
    unregisterWeb();
  });
});
