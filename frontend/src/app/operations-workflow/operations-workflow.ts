import {
  Component,
  DestroyRef,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';

@Component({
  selector: 'app-operations-workflow',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './operations-workflow.html',
  styleUrl: './operations-workflow.css'
})
export class OperationsWorkflow implements OnInit {

  bookings: any[] = [];

  loading = true;
  processingBookingId: number | null = null;

  errorMessage = '';
  successMessage = '';

  private bookingsRequestInFlight = false;
  private hasLoadedBookings = false;

  selectedBookingId: number | null = null;
  damageDescription = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private bookingState: BookingStateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.bookingState.bookingChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(change => {
        this.bookings = this.bookingState.applyChange(
          this.bookings,
          change
        ).sort((first, second) => Number(second.id) - Number(first.id));
        this.cdr.detectChanges();
      });
      this.loadBookings();
  }

  loadBookings(): void {
    if (this.bookingsRequestInFlight) {
      return;
    }

    this.bookingsRequestInFlight = true;
    this.loading = !this.hasLoadedBookings;
    this.errorMessage = '';

    this.api.getBookings().subscribe({
      next: (response: any) => {
        const bookings = Array.isArray(response)
          ? response
          : (Array.isArray(response?.results) ? response.results : []);

        this.bookings = bookings.sort(
          (first: any, second: any) => Number(second.id) - Number(first.id)
        );

        this.hasLoadedBookings = true;
        this.bookingsRequestInFlight = false;
        this.loading = false;
        this.processingBookingId = null;
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error(
          'Operations bookings loading error:',
          error
        );

        this.bookingsRequestInFlight = false;
        this.loading = false;
        this.processingBookingId = null;
        this.errorMessage =
          error?.error?.detail ||
          'Unable to load bookings.';

        this.cdr.detectChanges();
      }
    });
  }

  receiveEquipment(booking: any): void {
    this.processBooking(
      booking,
      () => this.api.receiveEquipment(booking.id),
      'Equipment received successfully.',
      { equipment_workflow_status: 'received' }
    );
  }

  handoverEquipment(booking: any): void {
    this.processBooking(
      booking,
      () => this.api.handoverEquipment(booking.id),
      'Equipment handed over successfully.',
      { equipment_workflow_status: 'handed_over' }
    );
  }

  inspectEquipment(
    booking: any,
    condition: string
  ): void {
    if (condition === 'damaged') {
      this.openDamageForm(booking);
      return;
    }

    this.processBooking(
      booking,
      () => this.api.inspectEquipment(
        booking.id,
        'no_damage'
      ),
      'Equipment inspected with no damage.',
      {
        equipment_workflow_status: 'no_damage',
        equipment_condition_after: 'good',
        damage_description: null
      }
    );
  }

  openDamageForm(booking: any): void {
    this.selectedBookingId = booking.id;
    this.damageDescription = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDamageForm(): void {
    this.selectedBookingId = null;
    this.damageDescription = '';
    this.errorMessage = '';
  }

  submitDamagedInspection(booking: any): void {
    if (this.processingBookingId !== null || this.bookingsRequestInFlight) {
      return;
    }

    const description = this.damageDescription.trim();

    if (!description) {
      this.errorMessage =
        'Please enter the damage description.';
      return;
    }

    this.processingBookingId = booking.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.inspectEquipment(
      booking.id,
      'damaged',
      description
    ).subscribe({
      next: () => {
        this.successMessage =
          'Equipment marked as damaged.';

        this.closeDamageForm();
      },

      error: (error: any) => {
        console.error(
          'Damaged inspection error:',
          error
        );

        this.processingBookingId = null;
        this.errorMessage =
          error?.error?.detail ||
          error?.error?.damage_description?.[0] ||
          error?.error?.condition?.[0] ||
          'Unable to complete this action.';

        this.cdr.detectChanges();
      }
    });
  }

  returnToVendor(booking: any): void {
    this.processBooking(
      booking,
      () => this.api.returnEquipmentToVendor(
        booking.id
      ),
      'Equipment returned to vendor successfully.',
      {
        status: 'completed',
        equipment_workflow_status: 'returned_to_vendor'
      }
    );
  }

  completeDamagedEquipment(booking: any): void {
    this.processBooking(
      booking,
      () => this.api.completeDamagedEquipment(
        booking.id
      ),
      'Damaged equipment process completed successfully.',
      { status: 'completed' }
    );
  }

  processBooking(
    booking: any,
    request: () => any,
    message: string,
    updates: Record<string, unknown> = {}
  ): void {
    if (this.processingBookingId !== null || this.bookingsRequestInFlight) {
      return;
    }

    this.processingBookingId = booking.id;
    this.errorMessage = '';
    this.successMessage = '';

    request().subscribe({
      next: (response: any) => {
        if (response && typeof response === 'object') {
          Object.assign(booking, response);
        }
        Object.assign(booking, updates);
        this.successMessage = message;
      },

      error: (error: any) => {
        console.error(
          'Workflow action error:',
          error
        );

        this.processingBookingId = null;
        this.errorMessage =
          error?.error?.detail ||
          'Unable to complete this action.';

        this.cdr.detectChanges();
      }
    });
  }

  getStatusLabel(status: string): string {
    return status
      ?.replace(/_/g, ' ')
      .replace(/\b\w/g, (letter: string) =>
        letter.toUpperCase()
      ) || '';
  }
}