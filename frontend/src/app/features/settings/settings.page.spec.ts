import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    localStorage.removeItem('ledgerly.settings.v1');

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
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
});
