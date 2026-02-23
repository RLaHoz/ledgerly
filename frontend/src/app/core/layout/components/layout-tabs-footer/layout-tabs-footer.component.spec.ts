import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutTabsFooterComponent } from './layout-tabs-footer.component';
import { provideRouter } from '@angular/router';

describe('LayoutTabsFooterComponent', () => {
  let component: LayoutTabsFooterComponent;
  let fixture: ComponentFixture<LayoutTabsFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutTabsFooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutTabsFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
