import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartSelectionComponent } from './chart-selection.component';

describe('ChartSelectionComponent', () => {
  let component: ChartSelectionComponent;
  let fixture: ComponentFixture<ChartSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
