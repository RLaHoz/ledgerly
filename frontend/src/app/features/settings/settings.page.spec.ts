import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/store/auth.store';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let authStoreMock: { logout: jasmine.Spy };
  let routerMock: { navigateByUrl: jasmine.Spy };

  beforeEach(async () => {
    localStorage.removeItem('ledgerly.settings.v1');
    authStoreMock = {
      logout: jasmine.createSpy('logout'),
    };
    routerMock = {
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: AuthStore, useValue: authStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render tab switcher', () => {
    const profileCard = fixture.nativeElement.querySelector('app-user-profile-info');
    const dataSourceCard = fixture.nativeElement.querySelector('app-data-source-info');
    const notificationsCard = fixture.nativeElement.querySelector('app-nontifications');
    const preferencesCard = fixture.nativeElement.querySelector('app-preferences');

    expect(profileCard).toBeTruthy();
    expect(dataSourceCard).toBeTruthy();
    expect(notificationsCard).toBeTruthy();
    expect(preferencesCard).toBeTruthy();
  });

  it('should logout from profile card', () => {
    const logoutButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.profile-logout-button',
    );

    expect(logoutButton).toBeTruthy();

    logoutButton?.click();

    expect(authStoreMock.logout).toHaveBeenCalledTimes(1);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/auth', { replaceUrl: true });
  });
});
