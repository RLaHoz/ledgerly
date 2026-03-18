import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

@Injectable({ providedIn: 'root' })
export class NativeKeyboardUiGuardService {
  private readonly document = inject(DOCUMENT);
  private initialized = false;
  private listenerHandles: PluginListenerHandle[] = [];

  init(destroyRef: DestroyRef): void {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    this.initialized = true;
    void this.attachListeners(destroyRef);
  }

  private async attachListeners(destroyRef: DestroyRef): Promise<void> {
    const addKeyboardOpenClass = () => {
      this.document.body.classList.add('keyboard-open');
    };
    const removeKeyboardOpenClass = () => {
      this.document.body.classList.remove('keyboard-open');
    };

    this.listenerHandles = await Promise.all([
      Keyboard.addListener('keyboardWillShow', addKeyboardOpenClass),
      Keyboard.addListener('keyboardWillHide', removeKeyboardOpenClass),
      Keyboard.addListener('keyboardDidHide', removeKeyboardOpenClass),
    ]);

    destroyRef.onDestroy(() => {
      removeKeyboardOpenClass();
      for (const handle of this.listenerHandles) {
        void handle.remove();
      }
      this.listenerHandles = [];
      this.initialized = false;
    });
  }
}
