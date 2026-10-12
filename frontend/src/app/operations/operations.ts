import { Component, DestroyRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';
@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './operations.html',
  styleUrl: './operations.css'
})
export class Operations implements OnInit {

  bookings: any[] = [];
  recentBookings: any[] = [];

  loading = true;
  errorMessage = '';

  totalBookings = 0;
  awaitingReceiving = 0;
  awaitingInspection = 0;
  damagedReturns = 0;
  awaitingHandover = 0;
  completedReturns = 0;

  constructor(
    private api: ApiService,
    private router: Router,
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
        this.calculateDashboard();
        this.cdr.detectChanges();
      });

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getBookings().subscribe({
      next: (response: any) => {
        this.bookings = Array.isArray(response)
          ? response
          : response?.results ?? [];

        this.calculateDashboard();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading operations dashboard:', error);
        this.errorMessage =
          error?.error?.detail ||
          'Unable to load dashboard data. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateDashboard(): void {
    this.totalBookings = this.bookings.length;

    this.awaitingReceiving = this.bookings.filter(
      booking =>
        booking.status === 'approved' &&
        booking.equipment_workflow_status === 'booked'
    ).length;

    this.awaitingHandover = this.bookings.filter(
      booking =>
        booking.status === 'approved' &&
        booking.equipment_workflow_status === 'received' &&
        booking.payment_status === 'paid'
    ).length;

    this.awaitingInspection = this.bookings.filter(
      booking => booking.equipment_workflow_status === 'awaiting_inspection'
    ).length;

    this.damagedReturns = this.bookings.filter(
      booking =>
        booking.equipment_workflow_status === 'damaged' &&
        booking.maintenance_status !== 'completed'
    ).length;

    this.completedReturns = this.bookings.filter(
      booking => booking.status === 'completed'
    ).length;

    this.recentBookings = [...this.bookings]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.id || 0).getTime();
        const dateB = new Date(b.created_at || b.id || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }

  openWorkflow(): void {
    this.router.navigate(['/operations/workflow']);
  }

  getStatusLabel(status: string | null | undefined): string {
    if (!status) {
      return 'Not available';
    }

    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  getEquipmentName(booking: any): string {
    return booking.equipment_name ||
      booking.equipment?.name ||
      'Equipment';
  }

  getCustomerName(booking: any): string {
    return booking.customer_name ||
      booking.customer?.username ||
      booking.customer?.name ||
      'Customer';
  }
}