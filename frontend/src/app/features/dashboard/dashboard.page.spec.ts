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

  it('moves to the next month', () => {
    component.onNextMonth();
    fixture.detectChanges();

    expect(component.monthLabel()).toBe('March 2026');
  });

  it('moves to the previous month', () => {
    component.onPreviousMonth();
    fixture.detectChanges();

    expect(component.monthLabel()).toBe('January 2026');
  });
});
