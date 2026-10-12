import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipmentDetails } from './equipment-details';

describe('EquipmentDetails', () => {
  let component: EquipmentDetails;
  let fixture: ComponentFixture<EquipmentDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipmentDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(EquipmentDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
