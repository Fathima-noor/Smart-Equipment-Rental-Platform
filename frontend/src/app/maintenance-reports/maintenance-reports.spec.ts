import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceReports } from './maintenance-reports';

describe('MaintenanceReports', () => {
  let component: MaintenanceReports;
  let fixture: ComponentFixture<MaintenanceReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaintenanceReports],
    }).compileComponents();

    fixture = TestBed.createComponent(MaintenanceReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
