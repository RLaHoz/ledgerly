import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates selected month when ion-datetime emits an ISO date', () => {
    component.onMonthSelected('2026-03-15');
    fixture.detectChanges();

    expect(component.monthLabel()).toBe('March 2026');
  });

  it('ignores empty month selection', () => {
    const initialLabel = component.monthLabel();

    component.onMonthSelected('');
    fixture.detectChanges();

    expect(component.monthLabel()).toBe(initialLabel);
  });
});
