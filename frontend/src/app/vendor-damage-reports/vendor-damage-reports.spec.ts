import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorDamageReports } from './vendor-damage-reports';

describe('VendorDamageReports', () => {
  let component: VendorDamageReports;
  let fixture: ComponentFixture<VendorDamageReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorDamageReports],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorDamageReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
