import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BasiqConsentUiService } from './basiq-consent-ui.service';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';

describe('BasiqConsentUiService', () => {
  let service: BasiqConsentUiService;
  let runtimeConfigMock: Pick<RuntimeConfigService, 'getUniversalLinkOrigins'>;

  beforeEach(() => {
    runtimeConfigMock = {
      getUniversalLinkOrigins: () => [],
    };

    TestBed.configureTestingModule({
      providers: [
        BasiqConsentUiService,
        { provide: RuntimeConfigService, useValue: runtimeConfigMock },
      ],
    });

    service = TestBed.inject(BasiqConsentUiService);
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  it('should parse native callback URL', () => {
    const event = service.parseCallbackFromUrl(
      'ledgerly://auth/callback?state=s1&jobId=j1&jobIds=a,b',
    );

    expect(event).not.toBeNull();
    expect(event?.state).toBe('s1');
    expect(event?.jobId).toBe('j1');
    expect(event?.jobIds).toEqual(['a', 'b']);
  });

  it('should parse same-origin web callback URL', () => {
    const event = service.parseCallbackFromUrl(
      `${window.location.origin}/auth/callback?state=s2&jobIds=j2`,
    );

    expect(event).not.toBeNull();
    expect(event?.state).toBe('s2');
    expect(event?.jobIds).toEqual(['j2']);
  });

  it('should parse allowlisted universal-link callback URL', () => {
    runtimeConfigMock.getUniversalLinkOrigins = () => [
      'https://noncorporative-latoyia-huffier.ngrok-free.dev',
    ];

    const event = service.parseCallbackFromUrl(
      'https://noncorporative-latoyia-huffier.ngrok-free.dev/auth/callback?state=s3&jobIds=j3',
    );

    expect(event).not.toBeNull();
    expect(event?.state).toBe('s3');
    expect(event?.jobIds).toEqual(['j3']);
  });

  it('should reject non-allowlisted callback URL', () => {
    runtimeConfigMock.getUniversalLinkOrigins = () => [
      'https://noncorporative-latoyia-huffier.ngrok-free.dev',
    ];

    const event = service.parseCallbackFromUrl(
      'https://evil.example.com/auth/callback?state=s4&jobIds=j4',
    );

    expect(event).toBeNull();
  });

  it('should clear pending cancellation when callback arrives right after browserFinished', fakeAsync(() => {
    const callbacks: string[] = [];
    const cancellations: number[] = [];

    service.callback$.subscribe((event) => {
      callbacks.push(event.state ?? '');
    });
    service.cancelled$.subscribe(() => {
      cancellations.push(Date.now());
    });

    (service as any).scheduleBrowserFinishedCancellation();
    tick(200);
    (service as any).emitCallbackEvent({
      rawUrl: 'ledgerly://auth/callback?state=s5&jobId=j5',
      state: 's5',
      jobId: 'j5',
      jobIds: [],
    });
    tick(1000);

    expect(callbacks).toEqual(['s5']);
    expect(cancellations).toEqual([]);
  }));

  it('should emit cancelled when browserFinished is not followed by callback', fakeAsync(() => {
    const cancellations: number[] = [];

    service.cancelled$.subscribe(() => {
      cancellations.push(Date.now());
    });

    (service as any).scheduleBrowserFinishedCancellation();
    tick(749);
    expect(cancellations).toEqual([]);

    tick(1);
    expect(cancellations.length).toBe(1);
  }));
});
