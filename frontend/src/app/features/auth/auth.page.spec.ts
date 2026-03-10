import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeStore } from 'src/app/core/store/theme/theme.store';
import { BankLinkCoordinatorService } from './services/banking/bank-link-coordinator.service';
import { AuthStore } from './store/auth.store';
import { AuthPage } from './auth.page';

describe('AuthPage', () => {
  let component: AuthPage;
  let fixture: ComponentFixture<AuthPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [
        {
          provide: ThemeStore,
          useValue: {
            toggleMode: jasmine.createSpy('toggleMode').and.callFake(() => undefined),
          },
        },
        {
          provide: AuthStore,
          useValue: {
            isLoading: () => false,
            isIdle: () => true,
            isError: () => false,
            isSuccess: () => false,
          },
        },
        {
          provide: BankLinkCoordinatorService,
          useValue: {
            init: jasmine.createSpy('init').and.callFake(() => undefined),
            startBankLink: jasmine.createSpy('startBankLink').and.callFake(() => undefined),
          },
        },
      ],
    })
      .overrideComponent(AuthPage, {
        set: {
          template: '<div></div>',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
