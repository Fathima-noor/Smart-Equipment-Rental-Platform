import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../services/api';

import { Operations } from './operations';

describe('Operations', () => {
  let component: Operations;
  let fixture: ComponentFixture<Operations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Operations],
      providers: [
        { provide: ApiService, useValue: { getBookings: () => of([]) } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Operations);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calculates dashboard counts from backend booking fields', () => {
    component.bookings = [
      { status: 'approved', equipment_workflow_status: 'booked' },
      {
        status: 'approved',
        equipment_workflow_status: 'received',
        payment_status: 'paid',
      },
      { status: 'approved', equipment_workflow_status: 'awaiting_inspection' },
      {
        status: 'approved',
        equipment_workflow_status: 'damaged',
        maintenance_status: 'in_progress',
      },
      { status: 'completed', equipment_workflow_status: 'returned_to_vendor' },
      {
        status: 'completed',
        equipment_workflow_status: 'damaged',
        maintenance_status: 'completed',
      },
      { status: 'cancelled', equipment_workflow_status: 'booked' },
    ];

    component.calculateDashboard();

    expect(component.totalBookings).toBe(7);
    expect(component.awaitingReceiving).toBe(1);
    expect(component.awaitingHandover).toBe(1);
    expect(component.awaitingInspection).toBe(1);
    expect(component.damagedReturns).toBe(1);
    expect(component.completedReturns).toBe(2);
  });

  it('displays the workflow status returned by the API', () => {
    component.bookings = [{
      id: 1,
      status: 'approved',
      payment_status: 'paid',
      equipment_workflow_status: 'awaiting_inspection',
    }];
    component.calculateDashboard();
    fixture.detectChanges();

    const workflowCell = fixture.nativeElement.querySelector(
      'tbody tr td:nth-child(5)',
    ) as HTMLElement;

    expect(workflowCell.textContent).toContain('Awaiting Inspection');
  });
});
