import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorEquipment } from './vendor-equipment';

describe('VendorEquipment', () => {
  let component: VendorEquipment;
  let fixture: ComponentFixture<VendorEquipment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorEquipment],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorEquipment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
