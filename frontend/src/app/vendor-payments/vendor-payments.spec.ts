import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorPayments } from './vendor-payments';

describe('VendorPayments', () => {
  let component: VendorPayments;
  let fixture: ComponentFixture<VendorPayments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorPayments],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorPayments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
