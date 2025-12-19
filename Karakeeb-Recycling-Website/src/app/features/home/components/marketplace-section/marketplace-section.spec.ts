import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketplaceSection } from './marketplace-section';

describe('MarketplaceSection', () => {
  let component: MarketplaceSection;
  let fixture: ComponentFixture<MarketplaceSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarketplaceSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
