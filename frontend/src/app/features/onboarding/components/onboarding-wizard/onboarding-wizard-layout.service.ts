import { DOCUMENT } from '@angular/common';
import { DestroyRef, ElementRef, Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import type { IonContent } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class OnboardingWizardLayoutService {
  private readonly document = inject(DOCUMENT);

  lockBodyScroll(destroyRef: DestroyRef): void {
    this.document.body.classList.add('onboarding-layout-lock');
    destroyRef.onDestroy(() => {
      this.document.body.classList.remove('onboarding-layout-lock');
    });
  }

  installDesktopFocusGuard(input: {
    destroyRef: DestroyRef;
    hostElement: ElementRef<HTMLElement>;
    getIonContent: () => IonContent | undefined;
  }): void {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') {
      return;
    }

    const scrollAnchorY = window.scrollY;
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (!input.hostElement.nativeElement.contains(target)) {
        return;
      }

      requestAnimationFrame(() => {
        this.restoreIonContentScrollTop(input.getIonContent());

        if (window.scrollY !== scrollAnchorY) {
          window.scrollTo({ top: scrollAnchorY, left: 0, behavior: 'auto' });
        }
      });
    };

    this.document.addEventListener('focusin', handleFocusIn, true);
    input.destroyRef.onDestroy(() => {
      this.document.removeEventListener('focusin', handleFocusIn, true);
    });
  }

  private restoreIonContentScrollTop(content: IonContent | undefined): void {
    if (!content) {
      return;
    }

    void content
      .getScrollElement()
      .then((scrollElement) => {
        if (scrollElement.scrollTop !== 0) {
          scrollElement.scrollTop = 0;
          return;
        }

        return content.scrollToTop(0);
      })
      .catch(() => undefined);
  }
}
