import { Component, DestroyRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api';
import { DecimalPipe,DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';

@Component({
  selector: 'app-customer',
  imports: [RouterLink,DecimalPipe,DatePipe],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
})
export class Customer implements OnInit  {

  bookings: any[] = [];
  payments: any[] = [];
  damageReports: any[] = [];

  totalBookings = 0;
  activeRentals = 0;
  totalPayments = 0;
  totalDamageReports = 0;

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
        this.totalBookings = this.bookings.length;
        this.activeRentals = this.bookings.filter(
          booking => booking.status === 'approved'
        ).length;
        this.cdr.detectChanges();
      });

    this.loadDashboard();
  }

  loadDashboard(): void {

    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      bookings: this.api.getBookings(),
      payments: this.api.getPayments(),
      damageReports: this.api.getDamageReports()
    }).subscribe({

      next: (data: any) => {

        // Bookings
        this.bookings = Array.isArray(data.bookings)
          ? data.bookings
          : (data.bookings?.results || []);

        this.totalBookings = this.bookings.length;

        this.activeRentals = this.bookings.filter(
          (booking: any) => booking.status === 'approved'
        ).length;


        // Payments
        this.payments = Array.isArray(data.payments)
          ? data.payments
          : (data.payments?.results || []);

        this.totalPayments = this.payments.reduce(
          (total: number, payment: any) =>
            total + Number(payment.amount || 0),
          0
        );


        // Damage reports
        this.damageReports = Array.isArray(data.damageReports)
          ? data.damageReports
          : (data.damageReports?.results || []);

        this.totalDamageReports = this.damageReports.length;


        // Stop loading
        this.loading = false;

        // Tell Angular to update the UI
        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Dashboard error:', error);

        this.errorMessage = 'Unable to load dashboard data.';
        this.loading = false;

        // Update UI even when an error occurs
        this.cdr.detectChanges();
      }

    });
  }


  getRecentBookings(): any[] {
    return [...this.bookings]
      .sort((first, second) => Number(second.id) - Number(first.id))
      .slice(0, 3);
  }


  getEquipmentName(booking: any): string {
    return booking.equipment_name || 'Equipment';
  }


  getEquipmentIcon(booking: any): string {

    switch (booking.equipment_category?.toLowerCase()) {

      case 'camera':
        return 'bi-camera';

      case 'laptop':
        return 'bi-laptop';

      case 'projector':
        return 'bi-projector';

      case 'drone':
        return 'bi-send';

      default:
        return 'bi-box-seam';
    }
  }


  getStatusClass(status: string): string {

    switch (status?.toLowerCase()) {

      case 'approved':
        return 'text-bg-success';

      case 'completed':
        return 'text-bg-primary';

      case 'cancelled':
        return 'text-bg-danger';

      case 'rejected':
        return 'text-bg-danger';

      case 'pending':
        return 'text-bg-warning';

      default:
        return 'text-bg-secondary';
    }
  }


  formatStatus(status: string): string {

    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}