import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemFlowSection } from './system-flow-section';

describe('SystemFlowSection', () => {
  let component: SystemFlowSection;
  let fixture: ComponentFixture<SystemFlowSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemFlowSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemFlowSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

