import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminVendorRequests } from './admin-vendor-requests';

describe('AdminVendorRequests', () => {
  let component: AdminVendorRequests;
  let fixture: ComponentFixture<AdminVendorRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminVendorRequests],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminVendorRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
