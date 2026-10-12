import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-payments.html',
  styleUrls: ['./admin-payments.css']
})
export class AdminPayments implements OnInit {

  payments: any[] = [];
  filteredPayments: any[] = [];

  loading = true;
  processing = false;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedPaymentStatus = 'all';
  selectedRefundStatus = 'all';

  selectedPayment: any = null;
  showDetailsModal = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  // ==============================
  // LOAD PAYMENTS
  // ==============================

  loadPayments(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getAdminPayments().subscribe({

      next: (response: any) => {

        this.payments = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Admin payments loading error:', error);

        this.payments = [];
        this.filteredPayments = [];

        this.loading = false;

        this.errorMessage =
          'Unable to load payments. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }


  // ==============================
  // FILTER
  // ==============================

  applyFilters(): void {

    const search = this.searchText.trim().toLowerCase();

    this.filteredPayments = this.payments.filter(
      (payment: any) => {

        const paymentId =
          String(payment.id || '').toLowerCase();

        const bookingId =
          String(payment.booking || '').toLowerCase();

        const customerName =
          String(payment.customer_name || '').toLowerCase();

        const equipment =
          String(payment.booking_equipment || '').toLowerCase();

        const matchesSearch =
          !search ||
          paymentId.includes(search) ||
          bookingId.includes(search) ||
          customerName.includes(search) ||
          equipment.includes(search);

        const matchesPaymentStatus =
          this.selectedPaymentStatus === 'all' ||
          String(payment.payment_status || '').toLowerCase() ===
          this.selectedPaymentStatus.toLowerCase();

        const matchesRefundStatus =
          this.selectedRefundStatus === 'all' ||
          String(payment.refund_status || '').toLowerCase() ===
          this.selectedRefundStatus.toLowerCase();

        return (
          matchesSearch &&
          matchesPaymentStatus &&
          matchesRefundStatus
        );
      }
    );

    // Sort payments by date: newest first
  this.filteredPayments.sort((a: any, b: any) => {
    const dateA = new Date(
      a.payment_date || a.created_at || 0
    ).getTime();

    const dateB = new Date(
      b.payment_date || b.created_at || 0
    ).getTime();

    return dateB - dateA;
  });

  }


  onSearch(): void {
    this.applyFilters();
  }


  // ==============================
  // VIEW PAYMENT
  // ==============================

  viewPayment(payment: any): void {

    this.errorMessage = '';
    this.successMessage = '';

    this.api.getAdminPayment(payment.id).subscribe({

      next: (response: any) => {

        this.selectedPayment = response;
        this.showDetailsModal = true;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Payment details error:', error);

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to load payment details.';

        this.cdr.detectChanges();
      }

    });
  }


  // ==============================
  // CLOSE MODAL
  // ==============================

  closeDetails(): void {

    if (this.processing) {
      return;
    }

    this.showDetailsModal = false;
    this.selectedPayment = null;
  }


  // ==============================
  // PAYMENT STATUS
  // ==============================

  getPaymentStatusClass(status: string): string {

    switch (
      String(status || '').toLowerCase()
    ) {

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


  getPaymentStatusLabel(status: string): string {

    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase() +
      status.slice(1);
  }


  // ==============================
  // REFUND STATUS
  // ==============================

  getRefundStatusClass(status: string): string {

    switch (
      String(status || '').toLowerCase()
    ) {

      case 'refunded':
        return 'refund-refunded';

      case 'pending':
        return 'refund-pending';

      case 'partially_refunded':
        return 'refund-partial';

      case 'not_applicable':
        return 'refund-na';

      default:
        return 'refund-default';
    }
  }


  getRefundStatusLabel(status: string): string {

    if (!status) {
      return 'Not Applicable';
    }

    if (status === 'not_applicable') {
      return 'Not Applicable';
    }

    if (status === 'partially_refunded') {
      return 'Partially Refunded';
    }

    return status.charAt(0).toUpperCase() +
      status.slice(1);
  }


  // ==============================
  // CUSTOMER
  // ==============================

  getCustomerName(payment: any): string {

    return payment?.customer_name ||
      payment?.customer ||
      'Unknown Customer';
  }


  // ==============================
  // DATE
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


  formatDateTime(date: string): string {

    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  // ==============================
  // AMOUNT
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
  // SUMMARY
  // ==============================

  getPaidCount(): number {

    return this.payments.filter(
      payment => payment.payment_status === 'paid'
    ).length;
  }


  getPendingCount(): number {

    return this.payments.filter(
      payment => payment.payment_status === 'pending'
    ).length;
  }


  getRefundedCount(): number {

    return this.payments.filter(
      payment => payment.refund_status === 'refunded'
    ).length;
  }


  getTotalCollected(): number {

    return this.payments
      .filter(
        payment =>
          payment.payment_status === 'paid'
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.total_amount || 0),
        0
      );
  }


  // ==============================
  // ERROR
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