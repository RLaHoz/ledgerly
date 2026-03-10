import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../store/auth.store';
import { SessionIdleTimeoutService } from './session-idle-timeout.service';
import { environment } from 'src/environments/environment';

describe('SessionIdleTimeoutService', () => {
  const idleMs = environment.sessionIdleTimeoutMs;

  let isLoggedIn = true;
  let hasConnectedBank = true;
  let expireSessionByInactivity: jasmine.Spy;

  beforeEach(() => {
    jasmine.clock().install();
    isLoggedIn = true;
    hasConnectedBank = true;
    expireSessionByInactivity = jasmine.createSpy('expireSessionByInactivity');

    TestBed.configureTestingModule({
      providers: [
        SessionIdleTimeoutService,
        {
          provide: AuthStore,
          useValue: {
            isLoggedIn: () => isLoggedIn,
            hasConnectedBank: () => hasConnectedBank,
            expireSessionByInactivity,
          },
        },
      ],
    });
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('expires session after 5 minutes when user is logged in and bank connected', () => {
    const service = TestBed.inject(SessionIdleTimeoutService);
    service.init();

    jasmine.clock().tick(idleMs);

    expect(expireSessionByInactivity).toHaveBeenCalledTimes(1);
  });

  it('resets idle timer when there is user interaction', () => {
    const service = TestBed.inject(SessionIdleTimeoutService);
    service.init();

    jasmine.clock().tick(idleMs - 1000);
    window.dispatchEvent(new Event('pointerdown'));
    jasmine.clock().tick(1000);

    expect(expireSessionByInactivity).not.toHaveBeenCalled();

    jasmine.clock().tick(idleMs);

    expect(expireSessionByInactivity).toHaveBeenCalledTimes(1);
  });

  it('does not expire session when user has no connected bank', () => {
    hasConnectedBank = false;
    const service = TestBed.inject(SessionIdleTimeoutService);
    service.init();

    jasmine.clock().tick(idleMs);

    expect(expireSessionByInactivity).not.toHaveBeenCalled();
  });
});
