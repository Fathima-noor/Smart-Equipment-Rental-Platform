import { Component, DestroyRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bookings.html',
  styleUrls: ['./admin-bookings.css']
})
export class AdminBookings implements OnInit {

  bookings: any[] = [];
  filteredBookings: any[] = [];

  loading = true;
  processing = false;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedStatus = 'all';
  selectedPaymentStatus = 'all';

  selectedBooking: any = null;
  showDetailsModal = false;

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

        if (
          this.selectedBooking &&
          Number(this.selectedBooking.id) === Number(change.booking['id'])
        ) {
          this.selectedBooking = {
            ...this.selectedBooking,
            ...change.booking
          };
        }

        this.applyFilters();
        this.cdr.detectChanges();
      });

    this.loadBookings();
  }

  // ==============================
  // LOAD BOOKINGS
  // ==============================

  loadBookings(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getAdminBookings().subscribe({

      next: (response: any) => {

        this.bookings = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Admin bookings loading error:', error);

        this.bookings = [];
        this.filteredBookings = [];

        this.loading = false;

        this.errorMessage =
          'Unable to load bookings. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }

  // ==============================
  // FILTER BOOKINGS
  // ==============================

  applyFilters(): void {

    const search = this.searchText.trim().toLowerCase();

    this.filteredBookings = this.bookings.filter((booking: any) => {

      const customerName =
        String(booking.customer_name || '').toLowerCase();

      const equipmentName =
        String(booking.equipment_name || '').toLowerCase();

      const bookingId =
        String(booking.id || '').toLowerCase();

      const matchesSearch =
        !search ||
        bookingId.includes(search) ||
        customerName.includes(search) ||
        equipmentName.includes(search);

      const matchesStatus =
        this.selectedStatus === 'all' ||
        String(booking.status || '').toLowerCase() ===
        this.selectedStatus.toLowerCase();

      const matchesPayment =
        this.selectedPaymentStatus === 'all' ||
        String(booking.payment_status || '').toLowerCase() ===
        this.selectedPaymentStatus.toLowerCase();

      return matchesSearch &&
             matchesStatus &&
             matchesPayment;
    })
   .sort((a: any, b: any) => {

    const dateA = new Date(
      a.created_at || a.booking_date || a.start_date || 0
    ).getTime();

    const dateB = new Date(
      b.created_at || b.booking_date || b.start_date || 0
    ).getTime();

    return dateB - dateA;
  });

    
  }

  // ==============================
  // SEARCH
  // ==============================

  onSearch(): void {
    this.applyFilters();
  }

  // ==============================
  // VIEW DETAILS
  // ==============================

  viewBooking(booking: any): void {

    this.errorMessage = '';
    this.successMessage = '';

    this.api.getAdminBooking(booking.id).subscribe({

      next: (response: any) => {
        console.log('Selected booking details:', response);

        this.selectedBooking = response;
        this.showDetailsModal = true;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Booking details error:', error);

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to load booking details.';

        this.cdr.detectChanges();
      }

    });
  }

  // ==============================
  // CLOSE DETAILS
  // ==============================

  closeDetails(): void {

    if (this.processing) {
      return;
    }

    this.showDetailsModal = false;
    this.selectedBooking = null;
  }

  // ==============================
  // UPDATE STATUS
  // ==============================

  updateStatus(booking: any, status: string): void {

    if (!booking?.id) {
      return;
    }

    const statusText = this.getStatusLabel(status);

    const confirmed = confirm(
      `Are you sure you want to change this booking to "${statusText}"?`
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.updateAdminBookingStatus(
      booking.id,
      status
    ).subscribe({

      next: (response: any) => {

        const index = this.bookings.findIndex(
          item => item.id === booking.id
        );

        if (index !== -1) {
          this.bookings[index] = response;
        }

        if (
          this.selectedBooking &&
          this.selectedBooking.id === booking.id
        ) {
          this.selectedBooking = response;
        }

        this.applyFilters();

        this.processing = false;

        this.successMessage =
          `Booking ${statusText.toLowerCase()} successfully.`;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Booking status update error:', error);

        this.processing = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to update booking status.';

        this.cdr.detectChanges();
      }

    });
  }


  // ==============================
  // DEPOSIT REFUND
  // ==============================

  canRefundDeposit(booking: any): boolean {

    const refundStatus =
      booking?.refund_status ||
      booking?.payment?.refund_status ||
      'not_applicable';

    const paymentStatus =
      booking?.payment_status ||
      booking?.payment?.payment_status;

    const paymentId =
      booking?.payment_id ||
      booking?.payment?.id;

    return booking?.status === 'completed' &&
           paymentStatus === 'paid' &&
           !!paymentId &&
           !['refunded', 'partially_refunded'].includes(refundStatus);
  }

  getRefundAmount(booking: any): number {

    const payment = booking?.payment || {};

    const deposit = Number(
      payment.deposit_amount ??
      booking?.deposit ??
      0
    );

    const deducted = Number(
      payment.deposit_deducted ??
      booking?.deposit_deducted ??
      0
    );

    const alreadyRefunded = Number(
      payment.deposit_refunded ??
      booking?.deposit_refunded ??
      0
    );

    return Math.max(deposit - deducted - alreadyRefunded, 0);
  }

  refundDeposit(booking: any): void {

    const paymentId =
      booking?.payment_id ||
      booking?.payment?.id;

    if (!paymentId || !this.canRefundDeposit(booking)) {
      this.errorMessage =
        'Refund is not available for this booking.';
      return;
    }

    const refundAmount = this.getRefundAmount(booking);

    if (refundAmount <= 0) {
      this.errorMessage =
        'No refundable deposit balance is available.';
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to refund ₹${this.formatAmount(refundAmount)} ` +
      `to ${this.getCustomerName(booking)} for Booking #${booking.id}?`
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.refundAdminDeposit(paymentId).subscribe({

      next: (response: any) => {

        this.processing = false;

        this.successMessage =
          response?.detail ||
          'Security deposit refund processed successfully.';

        // Update selected booking with refund response
        this.selectedBooking = {
          ...this.selectedBooking,
          refund_status: response.refund_status,
          deposit_refunded: response.deposit_refunded,
          deposit_deducted: response.deposit_deducted,
          additional_damage_payment:
            response.additional_damage_payment
        };

        // Update the booking in the table too
        const index = this.bookings.findIndex(
          item => Number(item.id) === Number(booking.id)
        );

        if (index !== -1) {
          this.bookings[index] = {
            ...this.bookings[index],
            refund_status: response.refund_status,
            deposit_refunded: response.deposit_refunded,
            deposit_deducted: response.deposit_deducted,
            additional_damage_payment:
              response.additional_damage_payment
          };
        }

        this.applyFilters();
        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Deposit refund error:', error);

        this.processing = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to process deposit refund.';

        this.cdr.detectChanges();
      }

    });
  }


  // ==============================
  // STATUS BUTTONS
  // ==============================

  canApprove(booking: any): boolean {
    return booking?.status === 'pending';
  }

  canReject(booking: any): boolean {
    return booking?.status === 'pending';
  }

  canCancel(booking: any): boolean {
    return booking?.status === 'pending' ||
           booking?.status === 'approved';
  }

  // ==============================
  // STATUS CLASS
  // ==============================

  getStatusClass(status: string): string {

    switch (String(status || '').toLowerCase()) {

      case 'pending':
        return 'status-pending';

      case 'approved':
        return 'status-approved';

      case 'rejected':
        return 'status-rejected';

      case 'completed':
        return 'status-completed';

      case 'cancelled':
        return 'status-cancelled';

      default:
        return 'status-default';
    }
  }

  getPaymentStatusClass(status: string): string {

    switch (String(status || '').toLowerCase()) {

      case 'paid':
        return 'payment-paid';

      case 'pending':
        return 'payment-pending';

      case 'failed':
        return 'payment-failed';

      default:
        return 'payment-default';
    }
  }

  // ==============================
  // STATUS LABEL
  // ==============================

  getStatusLabel(status: string): string {

    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase() +
           status.slice(1);
  }

  getPaymentStatusLabel(status: string): string {

    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase() +
           status.slice(1);
  }

  // ==============================
  // CUSTOMER NAME
  // ==============================

  getCustomerName(booking: any): string {

    return booking?.customer_name ||
           booking?.customer ||
           'Unknown Customer';
  }

  // ==============================
  // DATE FORMAT
  // ==============================

  formatDate(date: string): string {

    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  }

  // ==============================
  // CURRENCY
  // ==============================

  formatAmount(amount: any): string {

    const value = Number(amount || 0);

    return value.toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  // ==============================
  // API ERROR
  // ==============================

  getApiErrorMessage(error: any): string {

    const data = error?.error;

    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data.detail) {
      return data.detail;
    }

    if (data.message) {
      return data.message;
    }

    const firstKey = Object.keys(data)[0];

    if (firstKey) {

      const value = data[firstKey];

      if (Array.isArray(value)) {
        return value[0];
      }

      if (typeof value === 'string') {
        return value;
      }
    }

    return '';
  }

}