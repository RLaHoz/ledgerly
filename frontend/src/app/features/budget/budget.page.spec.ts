import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BudgetPage } from './budget.page';

describe('BudgetPage', () => {
  let component: BudgetPage;
  let fixture: ComponentFixture<BudgetPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(BudgetPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render overview, signals and category components', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('app-budget-overview')).toBeTruthy();
    expect(native.querySelector('app-budget-signals')).toBeTruthy();
    expect(native.querySelector('app-budget-category')).toBeTruthy();
  });

  it('should render new budget modal shell', () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('ion-modal.new-budget-modal')).toBeTruthy();
  });
});
