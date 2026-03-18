import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthConnectBankPage } from './auth-connect-bank.page';
import { AuthStore } from '../../store/auth.store';
import { BankLinkCoordinatorService } from '../../services/banking/bank-link-coordinator.service';

describe('AuthConnectBankPage', () => {
  let fixture: ComponentFixture<AuthConnectBankPage>;
  let component: AuthConnectBankPage;
  let coordinator: jasmine.SpyObj<BankLinkCoordinatorService>;
  let bankConnectionState: 'never_connected' | 'connected' | 'reconnect_required';

  beforeEach(async () => {
    coordinator = jasmine.createSpyObj<BankLinkCoordinatorService>('BankLinkCoordinatorService', [
      'startBankLink',
    ]);
    bankConnectionState = 'never_connected';

    await TestBed.configureTestingModule({
      imports: [AuthConnectBankPage],
      providers: [
        { provide: BankLinkCoordinatorService, useValue: coordinator },
        {
          provide: AuthStore,
          useValue: {
            isLoading: () => false,
            isSuccess: () => false,
            isError: () => false,
            error: () => null,
            bankConnectionState: () => bankConnectionState,
          },
        },
      ],
    })
      .overrideComponent(AuthConnectBankPage, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuthConnectBankPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts bank link from the primary CTA', () => {
    component.connectBank();

    expect(coordinator.startBankLink).toHaveBeenCalledTimes(1);
  });

  it('does not allow starting bank link when the bank is already connected', () => {
    bankConnectionState = 'connected';

    component.connectBank();

    expect(coordinator.startBankLink).not.toHaveBeenCalled();
    expect(component.isConnected()).toBeTrue();
  });
});
