import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetItemComponent, BudgetItemViewModel } from './budget-item.component';

describe('BudgetItemComponent', () => {
  let fixture: ComponentFixture<BudgetItemComponent>;
  let component: BudgetItemComponent;

  const baseItem: BudgetItemViewModel = {
    id: 'home',
    name: 'Home',
    spentLabel: '$1,200',
    limitLabel: '$1,200',
    leftLabel: '$0 left',
    status: 'exceeded',
    progressPercent: 100,
    iconName: 'home-outline',
    iconTone: 'home',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('item', baseItem);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
  });

  it('renders budget labels and status for the happy path', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('Home');
    expect(native.textContent).toContain('$1,200 / $1,200');
    expect(native.textContent).toContain('$0 left');
    expect(native.textContent).toContain('Exceeded');
  });

  it('clamps progress percent for edge values above 100', () => {
    fixture.componentRef.setInput('item', {
      ...baseItem,
      progressPercent: 240,
    });
    fixture.detectChanges();

    const progressFill = (fixture.nativeElement as HTMLElement).querySelector('.progress-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('100%');
  });

  it('does not emit action when editable is false (error/guard case)', () => {
    const emitSpy = spyOn(component.itemAction, 'emit');

    component.onItemAction(new Event('click'));

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
