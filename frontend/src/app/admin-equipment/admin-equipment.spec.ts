import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEquipment } from './admin-equipment';

describe('AdminEquipment', () => {
  let component: AdminEquipment;
  let fixture: ComponentFixture<AdminEquipment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEquipment],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEquipment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
