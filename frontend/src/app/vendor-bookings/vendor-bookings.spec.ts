import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorBookings } from './vendor-bookings';

describe('VendorBookings', () => {
  let component: VendorBookings;
  let fixture: ComponentFixture<VendorBookings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorBookings],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorBookings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
