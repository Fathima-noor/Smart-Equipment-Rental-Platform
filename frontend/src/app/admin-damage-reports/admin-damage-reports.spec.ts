import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiService } from '../services/api';
import { of, Subject, throwError } from 'rxjs';

import { AdminDamageReports } from './admin-damage-reports';

describe('AdminDamageReports', () => {
  let component: AdminDamageReports;
  let fixture: ComponentFixture<AdminDamageReports>;
  let apiMock: any;

  beforeEach(async () => {
    apiMock = {
      getAdminDamageReports: () => of([]),
      getAdminEligibleDamageBookings: () => of([]),
      createDamageReport: () => of({ id: 1 }),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDamageReports],
      providers: [
        { provide: ApiService, useValue: apiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDamageReports);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the loading state while eligible bookings are requested', () => {
    const response = new Subject<any>();
    apiMock.getAdminEligibleDamageBookings = () => response;

    component.openCreateModal();
    fixture.detectChanges();

    expect(component.loadingBookings).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Loading eligible bookings...'
    );

    response.next([]);
    response.complete();
    fixture.detectChanges();

    expect(component.loadingBookings).toBe(false);
  });

  it('shows the empty state when no eligible booking is returned', () => {
    apiMock.getAdminEligibleDamageBookings = () => of([]);

    component.openCreateModal();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No eligible bookings are available for a new damage report.'
    );
  });

  it('uses backend booking names in the dropdown', () => {
    apiMock.getAdminEligibleDamageBookings = () => of([{
      id: 42,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      maintenance_status: 'completed',
    }]);

    component.openCreateModal();
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('select option')
    ) as HTMLOptionElement[];

    expect(options.some(option =>
      option.textContent?.includes('Booking #42') &&
      option.textContent.includes('Field Camera') &&
      option.textContent.includes('Jordan Customer')
    )).toBe(true);
  });

  it('loads maintenance data from a manually entered eligible booking ID', () => {
    const booking = {
      id: 6,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      equipment_condition_after: 'damaged',
      damage_description: 'Lens cracked on return',
      maintenance_status: 'completed',
      maintenance_description: 'Replaced and calibrated lens assembly',
      maintenance_repair_cost: '1250.00',
    };
    let requests = 0;
    apiMock.getAdminEligibleDamageBookings = () => {
      requests += 1;
      return of([booking]);
    };

    component.openCreateModal();
    component.onManualBookingIdChange('6');

    expect(component.selectedBooking).toEqual(booking);
    expect(component.createForm.booking).toBe('6');
    expect(component.manualBookingId).toBe('6');
    expect(component.createForm.description).toBe(
      'Replaced and calibrated lens assembly'
    );
    expect(component.createForm.damage_amount).toBe('1250.00');
    expect(component.maintenanceRepairCost).toBe(1250);
    expect(requests).toBe(1);
  });

  it('uses the same selection logic for dropdown and manual entry', () => {
    const booking = {
      id: 6,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      equipment_condition_after: 'damaged',
      damage_description: 'Lens cracked on return',
      maintenance_status: 'completed',
      maintenance_description: 'Replaced lens assembly',
      maintenance_repair_cost: '1250.00',
    };
    component.bookings = [booking];

    component.createForm.booking = '6';
    component.onBookingChange();

    expect(component.selectedBooking).toEqual(booking);
    expect(component.manualBookingId).toBe('6');
    expect(component.createForm.description).toBe('Replaced lens assembly');

    component.onManualBookingIdChange('6');
    expect(component.selectedBooking).toEqual(booking);
    expect(component.createForm.booking).toBe('6');
  });

  it('clears stale selection details and reports invalid manual IDs', () => {
    const booking = {
      id: 6,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      maintenance_description: 'Replaced lens assembly',
      maintenance_repair_cost: '1250.00',
    };
    component.bookings = [booking];
    component.onManualBookingIdChange('6');
    expect(component.selectedBooking).toEqual(booking);

    component.onManualBookingIdChange('six');

    expect(component.selectedBooking).toBeNull();
    expect(component.createForm.booking).toBe('');
    expect(component.createForm.description).toBe('');
    expect(component.createForm.damage_amount).toBe('');
    expect(component.bookingSelectionError).toBe(
      'Enter a valid numeric Booking ID.'
    );

    component.onManualBookingIdChange('999');
    expect(component.selectedBooking).toBeNull();
    expect(component.bookingSelectionError).toContain(
      'was not found in eligible damaged bookings'
    );

    component.onManualBookingIdChange('');
    expect(component.bookingSelectionError).toContain(
      'Enter a Booking ID or select one'
    );
  });

  it('does not overwrite edits when the currently selected ID is re-entered', () => {
    const booking = {
      id: 6,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      maintenance_description: 'Maintenance description',
      maintenance_repair_cost: '1250.00',
    };
    component.bookings = [booking];
    component.onManualBookingIdChange('6');
    component.createForm.description = 'Admin adjusted description';
    component.createForm.damage_amount = '1300.00';

    component.onManualBookingIdChange('6');

    expect(component.createForm.description).toBe('Admin adjusted description');
    expect(component.createForm.damage_amount).toBe('1300.00');
  });

  it('shows an error when eligible bookings fail to load', () => {
    apiMock.getAdminEligibleDamageBookings = () =>
      throwError(() => ({ error: { detail: 'Unable to reach eligibility API.' } }));

    component.openCreateModal();
    fixture.detectChanges();

    expect(component.bookingsError).toBe('Unable to reach eligibility API.');
    expect(fixture.nativeElement.textContent).toContain(
      'Unable to reach eligibility API.'
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'No eligible bookings are available for a new damage report.'
    );
  });

  it('refreshes eligible bookings after a report is created', () => {
    const booking = {
      id: 42,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      maintenance_status: 'completed',
    };
    let eligibilityRequests = 0;
    let reportRequests = 0;
    let submittedData: any;
    apiMock.getAdminDamageReports = () => {
      reportRequests += 1;
      return of([]);
    };
    apiMock.getAdminEligibleDamageBookings = () => {
      eligibilityRequests += 1;
      return of([booking]);
    };
    apiMock.createDamageReport = (data: any) => {
      submittedData = data;
      return of({ id: 7 });
    };

    component.openCreateModal();
    component.createForm = {
      booking: String(booking.id),
      description: 'Confirmed damage details',
      damage_amount: '35.00',
    };
    component.selectedBooking = booking;
    component.maintenanceRepairCost = 35;

    component.createDamageReport();

    expect(component.successMessage).toBe(
      'Damage report created successfully.'
    );
    expect(submittedData).toEqual({
      booking: booking.id,
      description: 'Confirmed damage details',
      damage_amount: '35.00',
    });
    expect(eligibilityRequests).toBe(2);
    expect(reportRequests).toBe(2);
  });

  it('allows an eligible booking with zero repair cost', () => {
    const booking = {
      id: 42,
      equipment_name: 'Field Camera',
      customer_name: 'Jordan Customer',
      maintenance_status: 'completed',
    };
    apiMock.createDamageReport = () => of({ id: 7 });
    component.createForm = {
      booking: String(booking.id),
      description: 'Damage repaired at no cost',
      damage_amount: '0.00',
    };
    component.selectedBooking = booking;
    component.maintenanceRepairCost = 0;

    component.createDamageReport();

    expect(component.createError).toBe('');
    expect(component.successMessage).toBe(
      'Damage report created successfully.'
    );
  });
});
