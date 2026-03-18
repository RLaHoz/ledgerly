import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthLoginPage } from './auth-login.page';
import { GoogleAuthCoordinatorService } from '../../services/google/google-auth-coordinator.service';
import { AuthStore } from '../../store/auth.store';

describe('AuthLoginPage', () => {
  let fixture: ComponentFixture<AuthLoginPage>;
  let component: AuthLoginPage;
  let coordinator: jasmine.SpyObj<GoogleAuthCoordinatorService>;

  beforeEach(async () => {
    coordinator = jasmine.createSpyObj<GoogleAuthCoordinatorService>('GoogleAuthCoordinatorService', [
      'startGoogleAuth',
    ]);

    await TestBed.configureTestingModule({
      imports: [AuthLoginPage],
      providers: [
        { provide: GoogleAuthCoordinatorService, useValue: coordinator },
        {
          provide: AuthStore,
          useValue: {
            isLoading: () => false,
            isError: () => false,
            error: () => null,
          },
        },
      ],
    })
      .overrideComponent(AuthLoginPage, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuthLoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts Google auth from sign in CTA', () => {
    component.continueWithGoogle();

    expect(coordinator.startGoogleAuth).toHaveBeenCalledTimes(1);
  });
});
