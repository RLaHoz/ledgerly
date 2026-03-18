import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthSignupPage } from './auth-signup.page';
import { GoogleAuthCoordinatorService } from '../../services/google/google-auth-coordinator.service';
import { AuthStore } from '../../store/auth.store';

describe('AuthSignupPage', () => {
  let fixture: ComponentFixture<AuthSignupPage>;
  let component: AuthSignupPage;
  let coordinator: jasmine.SpyObj<GoogleAuthCoordinatorService>;

  beforeEach(async () => {
    coordinator = jasmine.createSpyObj<GoogleAuthCoordinatorService>('GoogleAuthCoordinatorService', [
      'startGoogleAuth',
    ]);

    await TestBed.configureTestingModule({
      imports: [AuthSignupPage],
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
      .overrideComponent(AuthSignupPage, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuthSignupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts Google auth from the primary supported CTA', () => {
    component.continueWithGoogle();

    expect(coordinator.startGoogleAuth).toHaveBeenCalledTimes(1);
  });
});
