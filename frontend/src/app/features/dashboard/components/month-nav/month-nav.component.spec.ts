import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthNavComponent } from './month-nav.component';

describe('MonthNavComponent', () => {
  let component: MonthNavComponent;
  let fixture: ComponentFixture<MonthNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonthNavComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Feb 2026');
    fixture.componentRef.setInput('selectedDate', '2026-02-18');
    fixture.componentRef.setInput('minDate', '2025-01-01');
    fixture.componentRef.setInput('maxDate', '2027-12-31');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit previous when clicking previous button', () => {
    const previousSpy = jasmine.createSpy('previous');
    component.previousRequested.subscribe(previousSpy);

    const previousButton = fixture.nativeElement.querySelector('.nav-button');
    previousButton.click();

    expect(previousSpy).toHaveBeenCalled();
  });

  it('should emit next when clicking next button', () => {
    const nextSpy = jasmine.createSpy('next');
    component.nextRequested.subscribe(nextSpy);

    const buttons = fixture.nativeElement.querySelectorAll('.nav-button');
    const nextButton = buttons[1] as HTMLButtonElement;
    nextButton.click();

    expect(nextSpy).toHaveBeenCalled();
  });

  it('should open picker when month trigger is clicked', () => {
    const triggerButton = fixture.nativeElement.querySelector('.month-trigger') as HTMLButtonElement;

    triggerButton.click();
    fixture.detectChanges();

    expect(component.isPickerOpen()).toBeTrue();
  });
});
