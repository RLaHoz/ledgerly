import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BudgetDetailsComponent } from './budget-details.component';

describe('BudgetDetailsComponent', () => {
  let fixture: ComponentFixture<BudgetDetailsComponent>;

  function createComponent(categoryType: string): ComponentFixture<BudgetDetailsComponent> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ type: categoryType }),
            },
          },
        },
      ],
    });

    const created = TestBed.createComponent(BudgetDetailsComponent);
    created.detectChanges();

    return created;
  }

  it('should render category details when route type exists (happy path)', () => {
    fixture = createComponent('entertainment');
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('.title-copy h2')?.textContent).toContain('Entertainment Budget');
    expect(native.querySelector('.summary-card')).toBeTruthy();
  });

  it('should render fallback card when route type is missing (edge case)', () => {
    fixture = createComponent('unknown');
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('.missing-card')).toBeTruthy();
    expect(native.textContent).toContain('Budget not found');
  });

  it('should keep save disabled when adjust input is invalid (error case)', () => {
    fixture = createComponent('entertainment');
    const component = fixture.componentInstance;

    component.openAdjustModal();
    component.adjustAmountInput.set('0');

    expect(component.canSaveAdjust()).toBeFalse();
  });
});
