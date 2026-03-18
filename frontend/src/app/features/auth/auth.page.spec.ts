import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthPage } from './auth.page';
import { BankLinkCoordinatorService } from './services/banking/bank-link-coordinator.service';
import { GoogleAuthCoordinatorService } from './services/google/google-auth-coordinator.service';

describe('AuthPage', () => {
  let component: AuthPage;
  let fixture: ComponentFixture<AuthPage>;
  let bankCoordinator: jasmine.SpyObj<BankLinkCoordinatorService>;
  let googleCoordinator: jasmine.SpyObj<GoogleAuthCoordinatorService>;

  beforeEach(async () => {
    bankCoordinator = jasmine.createSpyObj<BankLinkCoordinatorService>('BankLinkCoordinatorService', [
      'init',
    ]);
    googleCoordinator = jasmine.createSpyObj<GoogleAuthCoordinatorService>(
      'GoogleAuthCoordinatorService',
      ['init'],
    );

    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [
        { provide: BankLinkCoordinatorService, useValue: bankCoordinator },
        { provide: GoogleAuthCoordinatorService, useValue: googleCoordinator },
      ],
    })
      .overrideComponent(AuthPage, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes auth coordinators once auth shell loads', () => {
    expect(bankCoordinator.init).toHaveBeenCalledTimes(1);
    expect(googleCoordinator.init).toHaveBeenCalledTimes(1);
  });
});
