import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsSection } from './steps-section';

describe('StepsSection', () => {
  let component: StepsSection;
  let fixture: ComponentFixture<StepsSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepsSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
