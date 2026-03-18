import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../store/auth.store';
import { SessionIdleTimeoutService } from './session-idle-timeout.service';
import { environment } from 'src/environments/environment';

describe('SessionIdleTimeoutService', () => {
  const idleMs = environment.sessionIdleTimeoutMs;

  let hasSession = true;
  let bankConnectionState: 'connected' | 'never_connected' | 'reconnect_required' = 'connected';
  let expireSessionByInactivity: jasmine.Spy;
  let visibilityStateSpy: jasmine.Spy<() => DocumentVisibilityState>;

  beforeEach(() => {
    jasmine.clock().install();
    hasSession = true;
    bankConnectionState = 'connected';
    expireSessionByInactivity = jasmine.createSpy('expireSessionByInactivity');
    visibilityStateSpy = spyOnProperty(document, 'visibilityState', 'get').and.returnValue(
      'visible',
    );

    TestBed.configureTestingModule({
      providers: [
        SessionIdleTimeoutService,
        {
          provide: AuthStore,
          useValue: {
            hasSession: () => hasSession,
            bankConnectionState: () => bankConnectionState,
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
    bankConnectionState = 'reconnect_required';
    const service = TestBed.inject(SessionIdleTimeoutService);
    service.init();

    jasmine.clock().tick(idleMs);

    expect(expireSessionByInactivity).not.toHaveBeenCalled();
  });

  it('does not treat hidden visibility changes as user activity', () => {
    const service = TestBed.inject(SessionIdleTimeoutService);
    service.init();

    jasmine.clock().tick(idleMs - 1000);
    visibilityStateSpy.and.returnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    jasmine.clock().tick(1000);

    expect(expireSessionByInactivity).toHaveBeenCalledTimes(1);
  });

  it('treats returning to visible as user activity', () => {
    const service = TestBed.inject(SessionIdleTimeoutService);
    service.init();

    jasmine.clock().tick(idleMs - 1000);
    visibilityStateSpy.and.returnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    jasmine.clock().tick(1000);

    expect(expireSessionByInactivity).not.toHaveBeenCalled();

    jasmine.clock().tick(idleMs);

    expect(expireSessionByInactivity).toHaveBeenCalledTimes(1);
  });
});
