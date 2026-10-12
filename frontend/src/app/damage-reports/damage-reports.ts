import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api';

import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '../stripe.config';

@Component({
  selector: 'app-damage-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './damage-reports.html',
  styleUrl: './damage-reports.css'
})
export class DamageReports implements OnInit {

  // =========================================
  // STRIPE
  // =========================================

  @ViewChild('damagePaymentElement')
  damagePaymentElement!: ElementRef;

  stripeInstance: any = null;
  stripeElements: any = null;
  stripePaymentElement: any = null;

  showStripePayment = false;

  stripe = loadStripe(
    STRIPE_PUBLISHABLE_KEY
  );

  selectedStripePayment: any = null;

  // =========================================
  // DAMAGE REPORTS
  // =========================================

  damageReports: any[] = [];
  issues: any[] = [];

  // =========================================
  // PAYMENTS
  // =========================================

  payments: any[] = [];
  damagePayments: any[] = [];

  processingPaymentId: number | null = null;

  // =========================================
  // LOADING & MESSAGES
  // =========================================

  loading = false;

  successMessage = '';
  errorMessage = '';

  // =========================================
  // ISSUE MODAL
  // =========================================

  showIssueModal = false;

  selectedDamageReport: any = null;

  issueType = '';
  issueDescription = '';

  issueError = '';
  submittingIssue = false;

  // =========================================
  // CONSTRUCTOR
  // =========================================

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  // =========================================
  // INITIALIZE
  // =========================================

  ngOnInit(): void {

    this.loadDamageReports();

    const returnedPaymentId = Number(
      new URLSearchParams(window.location.search)
        .get('damage_payment_id')
    );

    if (Number.isInteger(returnedPaymentId) && returnedPaymentId > 0) {
      this.verifyReturnedDamagePayment(returnedPaymentId);
    }

  }

  // =========================================
  // USER ROLE
  // =========================================

  getUserRole(): string {

    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      return '';
    }

    try {

      const user = JSON.parse(savedUser);

      return user?.role || '';

    } catch (error) {

      console.error(
        'Unable to read user role:',
        error
      );

      return '';

    }

  }

  // =========================================
  // CHECK CUSTOMER
  // =========================================

  isCustomer(): boolean {

    return this.getUserRole() === 'customer';

  }

  // =========================================
  // CHECK VENDOR
  // =========================================

  isVendor(): boolean {

    return this.getUserRole() === 'vendor';

  }

  // =========================================
  // CHECK ADMIN
  // =========================================

  isAdmin(): boolean {

    return this.getUserRole() === 'admin';

  }

  // =========================================
  // LOAD DAMAGE REPORTS
  // =========================================

  loadDamageReports(): void {

    this.loading = true;

    this.errorMessage = '';

    this.api.getDamageReports().subscribe({

      next: (response: any) => {

        this.damageReports = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.loading = false;

        if (this.damageReports.length > 0) {

          this.loadPayments();

          this.loadDamagePayments();

          this.loadIssues();

        }

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Damage reports loading error:',
          error
        );

        this.damageReports = [];

        this.loading = false;

        this.errorMessage =
          'Unable to load damage reports. Please try again.';

        this.cdr.detectChanges();

      }

    });

  }

  // =========================================
  // LOAD NORMAL PAYMENTS
  // =========================================

  loadPayments(): void {

    this.api.getPayments().subscribe({

      next: (response: any) => {

        this.payments = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Payments loading error:',
          error
        );

        this.payments = [];

        this.cdr.detectChanges();

      }

    });

  }

  // =========================================
  // LOAD DAMAGE PAYMENTS
  // =========================================

  loadDamagePayments(): void {

    this.api.getDamagePayments().subscribe({

      next: (response: any) => {

        this.damagePayments = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Damage payments loading error:',
          error
        );

        this.damagePayments = [];

        this.cdr.detectChanges();

      }

    });

  }

  // =========================================
  // GET PAYMENT FOR BOOKING
  // =========================================

  getPaymentForBooking(
    bookingId: number
  ): any | null {

    return this.payments.find(
      payment =>
        Number(payment.booking) ===
        Number(bookingId)
    ) || null;

  }

  // =========================================
  // GET DAMAGE PAYMENT
  // =========================================

  getDamagePayment(
    reportId: number
  ): any | null {

    return this.damagePayments.find(
      payment =>
        Number(payment.damage_report) ===
        Number(reportId)
    ) || null;

  }

  // =========================================
  // CHECK ADDITIONAL PAYMENT
  // =========================================

  isAdditionalPaymentRequired(
    report: any
  ): boolean {

    return Number(
      report?.additional_amount || 0
    ) > 0;

  }

  // =========================================
  // SETTLEMENT MESSAGE
  // =========================================

  getSettlementMessage(report: any): string {
    const damageAmount = Number(report?.damage_amount || 0);
    const depositDeducted = Number(report?.deposit_deducted || 0);
    const additionalAmount = Number(report?.additional_amount || 0);
    const refundableAmount = Number(report?.refundable_amount || 0);
    const payment = this.getPaymentForBooking(report?.booking);
    const damagePayment = this.getDamagePayment(report?.id);
    const depositRefunded = payment?.refund_provider_reference_valid
      ? Number(payment?.deposit_refunded || 0)
      : 0;
    const refundIsComplete = payment?.refund_provider_reference_valid && [
      'refunded',
      'partially_refunded'
    ].includes(payment?.refund_status);

    if (additionalAmount > 0) {
      if (damagePayment?.payment_status === 'paid') {
        return `The additional payment of ₹${this.formatAmount(additionalAmount)} has been verified and completed.`;
      }
      return `₹${this.formatAmount(depositDeducted)} was allocated from your security deposit and an additional payment of ₹${this.formatAmount(additionalAmount)} is due.`;
    }

    if (payment?.refund_status === 'failed') {
      return 'The deposit refund did not complete. The balance remains unpaid and requires another verified attempt.';
    }

    if (payment?.refund_transaction_id && !payment?.refund_provider_reference_valid) {
      return 'This refund record could not be verified with Stripe and requires manual reconciliation.';
    }

    const pendingRefund = this.getPendingRefundAmount(report);
    if (pendingRefund > 0 && !refundIsComplete) {
      return `₹${this.formatAmount(depositDeducted)} was allocated for damage. A refundable balance of ₹${this.formatAmount(pendingRefund)} is pending and has not yet been processed.`;
    }

    if (refundableAmount > 0 && refundIsComplete) {
      return `₹${this.formatAmount(depositRefunded)} of your security deposit has been refunded.`;
    }

    if (damageAmount > 0 && depositDeducted > 0) {
      return 'Your security deposit was fully allocated to cover the damage.';
    }

    if (refundIsComplete && depositRefunded > 0) {
      return `Your security deposit of ₹${this.formatAmount(depositRefunded)} has been refunded.`;
    }

    return 'No additional payment or refundable deposit balance is due.';
  }

  getPendingRefundAmount(report: any): number {
    const payment = this.getPaymentForBooking(report?.booking);
    const verifiedRefunded = payment?.refund_provider_reference_valid
      ? Number(payment.deposit_refunded || 0)
      : 0;
    return Math.max(
      Number(report?.refundable_amount || 0) - verifiedRefunded,
      0
    );
  }

  getVerifiedRefundedAmount(report: any): number {
    const payment = this.getPaymentForBooking(report?.booking);
    return payment?.refund_provider_reference_valid
      ? Number(payment.deposit_refunded || 0)
      : 0;
  }

  getRefundStatusLabel(report: any): string {
    const payment = this.getPaymentForBooking(report?.booking);
    if (Number(report?.refundable_amount || 0) <= 0) {
      return 'No refund due';
    }
    if (payment?.refund_status === 'failed') {
      return 'Refund failed';
    }
    if (
      payment?.refund_provider_reference_valid &&
      ['refunded', 'partially_refunded'].includes(payment.refund_status)
    ) {
      return 'Refund completed';
    }
    if (payment?.refund_transaction_id && !payment.refund_provider_reference_valid) {
      return 'Refund needs verification';
    }
    return 'Refund pending';
  }

  private verifyReturnedDamagePayment(paymentId: number): void {
    this.processingPaymentId = paymentId;
    this.api.confirmDamagePayment(paymentId).subscribe({
      next: (response: any) => {
        this.applyVerifiedPayment(response);
        this.clearDamagePaymentReturnParameter();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.processingPaymentId = null;
        this.errorMessage = error?.error?.detail ||
          'Payment could not be verified. Contact support before trying again.';
        this.clearDamagePaymentReturnParameter();
        this.loadDamagePayments();
        this.cdr.detectChanges();
      }
    });
  }

  private clearDamagePaymentReturnParameter(): void {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('damage_payment_id');
    window.history.replaceState({}, '', currentUrl.toString());
  }

  private applyVerifiedPayment(response: any): void {
    this.processingPaymentId = null;
    if (response?.payment_status !== 'paid') {
      this.errorMessage = 'Stripe has not confirmed this payment.';
      return;
    }

    const paymentIndex = this.damagePayments.findIndex(
      item => Number(item.id) === Number(response.payment_id)
    );
    const paymentAmount = response.amount || (
      paymentIndex >= 0
        ? this.damagePayments[paymentIndex].amount
        : 0
    );
    if (paymentIndex >= 0) {
      this.damagePayments[paymentIndex] = {
        ...this.damagePayments[paymentIndex],
        ...response,
        payment_status: 'paid'
      };
    } else {
      this.damagePayments = [
        ...this.damagePayments,
        { ...response, payment_status: 'paid' }
      ];
    }

    this.successMessage = 'Additional damage payment verified and completed.';
    this.closeStripeDamagePayment();
    this.loadDamagePayments();
    if (paymentAmount) {
      this.successMessage =
        `Additional damage payment of ₹${this.formatAmount(paymentAmount)} was verified and completed.`;
    }
  }
  // CREATE DAMAGE PAYMENT
  // =========================================

  createDamagePayment(
    report: any
  ): void {

    if (!report?.id) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.api.createDamagePayment(
      report.id
    ).subscribe({

      next: (response: any) => {

        this.successMessage =
          'Additional payment has been created successfully.';

        this.loadDamagePayments();

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Create damage payment error:',
          error
        );

        this.errorMessage =
          error?.error?.detail ||
          error?.error?.message ||
          'Unable to create additional payment.';

        this.cdr.detectChanges();

      }

    });

  }

  // =========================================
  // PROCESS DAMAGE PAYMENT
  // =========================================

  processDamagePayment(
    payment: any
  ): void {

    if (!payment?.id || this.processingPaymentId !== null) {
      return;
    }

    if (
      payment.payment_status === 'paid'
    ) {
      return;
    }

    this.processingPaymentId =
      payment.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.api.processDamagePayment(
      payment.id
    ).subscribe({

      next: async (response: any) => {

        console.log(
          'Damage Stripe PaymentIntent created:',
          response
        );

        if (response?.payment_status === 'paid') {
          this.applyVerifiedPayment(response);
          this.cdr.detectChanges();
          return;
        }

        if (response?.stripe_status === 'succeeded') {
          this.api.confirmDamagePayment(payment.id).subscribe({
            next: (confirmation: any) => {
              this.applyVerifiedPayment(confirmation);
              this.cdr.detectChanges();
            },
            error: (error) => {
              this.processingPaymentId = null;
              this.errorMessage = error?.error?.detail ||
                'Stripe completed the attempt, but backend verification is pending.';
              this.cdr.detectChanges();
            }
          });
          return;
        }

        const stripe =
          await this.stripe;

        if (!stripe) {

          this.processingPaymentId = null;

          this.errorMessage =
            'Unable to load Stripe payment.';

          this.cdr.detectChanges();

          return;

        }

        if (!response?.client_secret) {

          this.processingPaymentId = null;

          this.errorMessage =
            'Stripe client secret was not received.';

          this.cdr.detectChanges();

          return;

        }

        this.stripeInstance =
          stripe;

        this.stripeElements =
          stripe.elements({
            clientSecret:
              response.client_secret
          });

        this.stripePaymentElement =
          this.stripeElements.create(
            'payment'
          );

        this.selectedStripePayment =
          payment;

        this.showStripePayment = true;

        this.processingPaymentId = null;

        this.cdr.detectChanges();

        setTimeout(() => {

          if (
            this.damagePaymentElement &&
            this.stripePaymentElement
          ) {

            this.stripePaymentElement.mount(
              this.damagePaymentElement.nativeElement
            );

          }

        }, 100);

      },

      error: (error) => {

        console.error(
          'Damage payment processing error:',
          error
        );

        this.processingPaymentId = null;

        this.errorMessage =
          error?.error?.detail ||
          error?.error?.message ||
          'Unable to start the payment. Please try again.';

        this.cdr.detectChanges();

      }

    });

  }

  // =========================================
  // CONFIRM STRIPE DAMAGE PAYMENT
  // =========================================

  async confirmStripeDamagePayment(
    payment: any
  ): Promise<void> {

    this.errorMessage = '';
    this.successMessage = '';

    if (
      !payment ||
      !this.stripeInstance ||
      !this.stripeElements
    ) {

      return;

    }

    this.processingPaymentId =
      payment.id;

    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set(
      'damage_payment_id',
      String(payment.id)
    );

    let result: any;
    try {
      result = await this.stripeInstance.confirmPayment({

        elements:
          this.stripeElements,

        confirmParams: {
          return_url: returnUrl.toString()
        },

        redirect: 'if_required'

      });
    } catch (error: any) {
      this.processingPaymentId = null;
      this.errorMessage = error?.message || 'Unable to confirm the Stripe payment.';
      this.cdr.detectChanges();
      return;
    }

    if (result.error) {

      console.error(
        'Stripe damage payment error:',
        result.error
      );

      this.processingPaymentId = null;

      this.errorMessage =
        result.error.message ||
        'Payment failed. Please try again.';

      this.cdr.detectChanges();

      return;

    }

    this.api
      .confirmDamagePayment(
        payment.id
      )
      .subscribe({

        next: (response: any) => {
          this.applyVerifiedPayment(response);
          this.clearDamagePaymentReturnParameter();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.processingPaymentId = null;
          this.errorMessage = error?.error?.detail ||
            'Payment has not been verified. It will remain unpaid until Stripe confirms it.';
          this.loadDamagePayments();
          this.cdr.detectChanges();
        }
      });

  }

  // =========================================
  // CLOSE STRIPE DAMAGE PAYMENT
  // =========================================

  closeStripeDamagePayment(): void {

    if (
      this.stripePaymentElement
    ) {

      this.stripePaymentElement.unmount();

    }

    this.showStripePayment = false;

    this.stripePaymentElement = null;

    this.stripeElements = null;

    this.stripeInstance = null;

    this.selectedStripePayment = null;

    this.processingPaymentId = null;

  }

  // =========================================
  // STATUS CLASS
  // =========================================

  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'reported':

        return 'bg-warning text-dark';

      case 'reviewed':

        return 'bg-info text-dark';

      case 'resolved':

        return 'bg-success';

      default:

        return 'bg-secondary';

    }

  }

  // =========================================
  // FORMAT STATUS
  // =========================================

  formatStatus(
    status: string
  ): string {

    if (!status) {
      return '';
    }

    return status
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        char => char.toUpperCase()
      );

  }

  // =========================================
  // FORMAT AMOUNT
  // =========================================

  formatAmount(amount: any): string {
    const value = Number(amount || 0);
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  loadIssues(): void {
    this.api.getDamageIssues().subscribe({
      next: (response: any) => {
        this.issues = Array.isArray(response)
          ? response
          : (response?.results || []);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Damage issues loading error:', error);
        this.issues = [];
        this.cdr.detectChanges();
      }
    });
  }

  hasIssue(reportId: number): boolean {
    return this.issues.some(
      issue => Number(issue.damage_report) === Number(reportId)
    );
  }

  getIssueForReport(reportId: number): any | null {
    return this.issues.find(
      issue => Number(issue.damage_report) === Number(reportId)
    ) || null;
  }

  getIssueStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Issue Submitted';
      case 'reviewed':
        return 'Issue Under Review';
      case 'resolved':
        return 'Issue Resolved';
      case 'rejected':
        return 'Issue Rejected';
      default:
        return status;
    }
  }

  // =========================================
  // GET ISSUE STATUS CLASS
  // =========================================

  getIssueStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'resolved':
        return 'issue-resolved';

      case 'under_review':
        return 'issue-under-review';

      case 'rejected':
        return 'issue-rejected';

      default:
        return 'issue-default';

    }

  }

  // =========================================
  // OPEN ISSUE FORM
  // =========================================

  openIssueForm(
    report: any
  ): void {

    this.selectedDamageReport =
      report;

    this.issueType = '';

    this.issueDescription = '';

    this.issueError = '';

    this.showIssueModal = true;

  }

  // =========================================
  // CLOSE ISSUE FORM
  // =========================================

  closeIssueForm(): void {

    if (this.submittingIssue) {
      return;
    }

    this.showIssueModal = false;

    this.selectedDamageReport =
      null;

    this.issueType = '';

    this.issueDescription = '';

    this.issueError = '';

  }

  // =========================================
  // SUBMIT ISSUE
  // =========================================

  submitIssue(): void {

    this.issueError = '';

    if (!this.selectedDamageReport?.id) {

      this.issueError =
        'Damage report could not be identified.';

      return;

    }

    if (!this.issueType) {

      this.issueError =
        'Please select an issue type.';

      return;

    }

    if (
      !this.issueDescription ||
      !this.issueDescription.trim()
    ) {

      this.issueError =
        'Please describe your issue.';

      return;

    }

    this.submittingIssue = true;

    this.api.createDamageIssue(
      this.selectedDamageReport.id,
      this.issueType,
      this.issueDescription.trim()
    ).subscribe({

      next: (response: any) => {

        this.submittingIssue = false;

        this.issues.unshift(
          response
        );

        this.successMessage =
          'Your issue has been submitted successfully.';

        this.closeIssueForm();

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Create damage issue error:',
          error
        );

        console.error(
          'Status:',
          error?.status
        );

        console.error(
          'Response:',
          error?.error
        );

        this.submittingIssue = false;

        const backendError =
          error?.error;

        if (
          typeof backendError === 'string'
        ) {

          this.issueError =
            backendError;

        } else if (
          backendError?.detail
        ) {

          this.issueError =
            backendError.detail;

        } else if (
          backendError?.non_field_errors?.length
        ) {

          this.issueError =
            backendError.non_field_errors[0];

        } else if (
          backendError
        ) {

          const values =
            Object.values(
              backendError
            ).flat();

          this.issueError =
            values.length > 0
              ? values.join(' ')
              : 'Unable to submit the issue. Please try again.';

        } else {

          this.issueError =
            'Unable to submit the issue. Please try again.';

        }

        this.cdr.detectChanges();

      }

    });

  }

}