import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorRequest } from './vendor-request';

describe('VendorRequest', () => {
  let component: VendorRequest;
  let fixture: ComponentFixture<VendorRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorRequest],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
