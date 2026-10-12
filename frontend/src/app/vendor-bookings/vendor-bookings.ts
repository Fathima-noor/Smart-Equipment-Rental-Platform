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
  selector: 'app-vendor-bookings',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './vendor-bookings.html',
  styleUrl: './vendor-bookings.css'
})
export class VendorBookings implements OnInit {

  bookings: any[] = [];
  filteredBookings: any[] = [];

  loading = true;

  processingBookingId: number | null = null;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedStatus = '';


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
        );
        this.applyFilters();
        this.cdr.detectChanges();
      });
    this.loadBookings();
  }


  loadBookings(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getBookings().subscribe({

      next: (response: any) => {

        console.log(
          'Vendor bookings response:',
          response
        );

        this.bookings = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Vendor bookings error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load bookings.';

        this.cdr.detectChanges();
      }
    });
  }


  applyFilters(): void {

    const search =
      this.searchText.trim().toLowerCase();

    this.filteredBookings =
      this.bookings.filter(booking => {

        const equipmentName =
          (
            booking.equipment_name ||
            ''
          ).toLowerCase();

        const category =
          (
            booking.equipment_category ||
            ''
          ).toLowerCase();

        const status =
          (
            booking.status ||
            ''
          ).toLowerCase();

        const matchesSearch =
          !search ||
          equipmentName.includes(search) ||
          category.includes(search) ||
          status.includes(search) ||
          String(booking.id).includes(search);

        const matchesStatus =
          !this.selectedStatus ||
          status === this.selectedStatus;

        return matchesSearch && matchesStatus;
      });
  }


  onSearchChange(): void {
    this.applyFilters();
  }


  onStatusChange(): void {
    this.applyFilters();
  }


  approveBooking(booking: any): void {

    this.updateStatus(
      booking,
      'approved'
    );
  }


  rejectBooking(booking: any): void {

    const confirmed =
      window.confirm(
        `Are you sure you want to reject booking #${booking.id}?`
      );

    if (!confirmed) {
      return;
    }

    this.updateStatus(
      booking,
      'rejected'
    );
  }


  updateStatus(
    booking: any,
    status: string
  ): void {

    if (
      !booking?.id ||
      this.processingBookingId !== null
    ) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.processingBookingId = booking.id;

    this.api.updateBookingStatus(
      booking.id,
      status
    ).subscribe({

      next: (response: any) => {

        console.log(
          'Booking status updated:',
          response
        );

        booking.status = status;

        this.processingBookingId = null;

        this.successMessage =
          `Booking #${booking.id} has been ${status}.`;

        this.applyFilters();

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Booking status update error:',
          error
        );

        this.processingBookingId = null;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to update booking status.';

        this.cdr.detectChanges();
      }
    });
  }


  getPendingCount(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'pending'
    ).length;
  }


  getApprovedCount(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'approved'
    ).length;
  }


  getCompletedCount(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'completed'
    ).length;
  }


  getRejectedCount(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'rejected'
    ).length;
  }


  getStatusClass(status: string): string {

    switch (status?.toLowerCase()) {

      case 'pending':
        return 'text-bg-warning';

      case 'approved':
        return 'text-bg-success';

      case 'rejected':
        return 'text-bg-danger';

      case 'completed':
        return 'text-bg-primary';

      case 'cancelled':
        return 'text-bg-secondary';

      default:
        return 'text-bg-secondary';
    }
  }


  formatStatus(status: string): string {

    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase()
      + status.slice(1);
  }


  formatAmount(amount: any): string {

    return Number(amount || 0).toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }


  getPaymentStatusClass(
    status: string
  ): string {

    switch (status?.toLowerCase()) {

      case 'paid':
        return 'text-bg-success';

      case 'pending':
        return 'text-bg-warning';

      case 'failed':
        return 'text-bg-danger';

      default:
        return 'text-bg-secondary';
    }
  }


  getApiErrorMessage(error: any): string {

    if (!error?.error) {
      return '';
    }

    if (error.error.detail) {
      return error.error.detail;
    }

    const values =
      Object.values(error.error);

    return values.flat().join(' ');
  }
}