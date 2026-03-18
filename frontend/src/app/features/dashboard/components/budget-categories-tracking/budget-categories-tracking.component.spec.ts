import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BudgetCategoriesTrackingComponent, BudgetTrackingItemViewModel } from './budget-categories-tracking.component';

describe('BudgetCategoriesTrackingComponent', () => {
  let fixture: ComponentFixture<BudgetCategoriesTrackingComponent>;
  let component: BudgetCategoriesTrackingComponent;
  let router: jasmine.SpyObj<Router>;

  const items: readonly BudgetTrackingItemViewModel[] = [
    {
      id: 'home',
      name: 'Home',
      spentLabel: '$1,200',
      limitLabel: '$1,200',
      leftLabel: '$0 left',
      status: 'exceeded',
      progressPercent: 100,
      iconName: 'home-outline',
      iconTone: 'home',
      detailSummary: 'Budget fully used',
      detailRecommendation: 'Increase budget by $50 or review spending',
    },
  ];

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [BudgetCategoriesTrackingComponent],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetCategoriesTrackingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  });

  it('expands the clicked category row', () => {
    const trigger = fixture.nativeElement.querySelector('.dashboard-category-trigger');

    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dashboard-category-detail-summary')?.textContent).toContain('Budget fully used');
  });

  it('collapses the category row when clicked again', () => {
    const trigger = fixture.nativeElement.querySelector('.dashboard-category-trigger');

    trigger.click();
    fixture.detectChanges();
    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dashboard-category-detail')).toBeNull();
  });

  it('navigates to the category details route when view details is clicked', async () => {
    component.onItemToggle('home');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.dashboard-category-detail-link');
    await component.onViewDetails(new MouseEvent('click'), items[0]);

    expect(link).not.toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/budgets/detail/home');
  });
});
