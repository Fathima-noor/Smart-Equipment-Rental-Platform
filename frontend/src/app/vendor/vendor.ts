import {
  Component,
  DestroyRef,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../services/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';

@Component({
  selector: 'app-vendor',
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './vendor.html',
  styleUrl: './vendor.css'
})
export class Vendor implements OnInit {

  equipment: any[] = [];
  bookings: any[] = [];
  damageReports: any[] = [];

  loading = true;
  errorMessage = '';

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
        this.cdr.detectChanges();
      });

    this.loadDashboard();
  }

  loadDashboard(): void {

    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      equipment: this.api.getEquipment(),
      bookings: this.api.getBookings(),
      damageReports: this.api.getDamageReports()
    }).subscribe({

      next: (response: any) => {

        console.log('Vendor dashboard data:', response);

        this.equipment = Array.isArray(response.equipment)
          ? response.equipment
          : (response.equipment?.results || []);

        this.bookings = Array.isArray(response.bookings)
          ? response.bookings
          : (response.bookings?.results || []);

        this.damageReports = Array.isArray(response.damageReports)
          ? response.damageReports
          : (response.damageReports?.results || []);

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Vendor dashboard loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load vendor dashboard.';

        this.cdr.detectChanges();
      }
    });
  }

  getPendingBookings(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'pending'
    ).length;
  }

  getApprovedBookings(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'approved'
    ).length;
  }

  getCompletedBookings(): number {

    return this.bookings.filter(
      booking =>
        booking.status?.toLowerCase() === 'completed'
    ).length;
  }

  getPendingDamageReports(): number {

    return this.damageReports.filter(
      report =>
        report.status?.toLowerCase() !== 'resolved'
    ).length;
  }

  getRecentBookings(): any[] {

    return [...this.bookings]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }

  getBookingStatusClass(status: string): string {

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
}