import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutPage } from './layout.page';

describe('LayoutPage', () => {
  let fixture: ComponentFixture<LayoutPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPage],
      providers: [provideRouter([])], // ✅ ActivatedRoute/Router
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
