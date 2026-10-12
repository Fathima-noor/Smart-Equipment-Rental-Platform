import {Component,OnInit,ChangeDetectorRef,ElementRef,ViewChild} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '../stripe.config';

@Component({
  selector: 'app-payments',
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.css'
})



export class Payments implements OnInit {

  @ViewChild('paymentElement')
  paymentElement!: ElementRef;

  stripeInstance: any = null;
  elements: any = null;
  stripePaymentElement: any = null;

  showStripePayment = false;
  
  stripe = loadStripe(
    STRIPE_PUBLISHABLE_KEY
  );

  payments: any[] = [];
  

  selectedBookingId: number | null = null;
  selectedPayment: any = null;

  loading = true;
  creatingPayment = false;

  processingPaymentId: number | null = null;

  errorMessage = '';
  successMessage = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {

    this.route.queryParamMap.subscribe(params => {

      const bookingId = params.get('booking');

      this.selectedBookingId =
        bookingId ? Number(bookingId) : null;

      this.loadPayments();
    });

    const paymentId = Number(
      new URLSearchParams(
        window.location.search
      ).get('payment_id')
    );

    if (paymentId) {

      this.api
        .confirmPayment(paymentId)
        .subscribe({

          next: (response: any) => {

            if (
              response?.payment_status === 'paid'
            ) {

              this.successMessage =
                'Payment completed successfully.';

              this.loadPayments();

            }

          },

          error: (error) => {

            console.log(
              'Stripe return payment status:',
              error
            );

            this.errorMessage =
              'Payment was not completed. Please try again.';

            this.loadPayments();

          }

        });

    }

  }



  loadPayments(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getPayments().subscribe({

      next: (response: any) => {

        console.log(
          'Payments API response:',
          response
        );

        this.payments = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.loading = false;

        this.findSelectedPayment();

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Payments loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load your payments.';

        this.cdr.detectChanges();
      }
    });
  }

  findSelectedPayment(): void {

    if (!this.selectedBookingId) {
      this.selectedPayment = null;
      return;
    }

    this.selectedPayment =
      this.payments.find(
        payment =>
          Number(payment.booking) ===
          this.selectedBookingId
      ) || null;

    if (this.selectedPayment) {

      console.log(
        'Existing payment found:',
        this.selectedPayment
      );

      return;
    }

    console.log(
      'No payment found. Creating payment for booking:',
      this.selectedBookingId
    );

    this.createPaymentForBooking();
  }

  createPaymentForBooking(): void {

    if (
      !this.selectedBookingId ||
      this.creatingPayment
    ) {
      return;
    }

    this.creatingPayment = true;
    this.errorMessage = '';

    this.api
      .createPayment(this.selectedBookingId)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Payment created:',
            response
          );

          this.selectedPayment = response;

          this.payments = [
            response,
            ...this.payments
          ];

          this.creatingPayment = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Payment creation error:',
            error
          );

          this.creatingPayment = false;

          this.errorMessage =
            error?.error?.detail ||
            this.getApiErrorMessage(error) ||
            'Unable to create payment.';

          this.cdr.detectChanges();
        }
      });
  }


  async processPayment(payment: any): Promise<void> {

    this.errorMessage = '';
    this.successMessage = '';

    if (
      !payment ||
      payment.payment_status === 'paid'
    ) {
      return;
    }

    this.processingPaymentId = payment.id;

    this.api
      .processPayment(payment.id)
      .subscribe({

        next: async (response: any) => {

          console.log(
            'Stripe PaymentIntent created:',
            response
          );

          const stripe = await this.stripe;

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

          this.stripeInstance = stripe;

          this.elements =
            stripe.elements({
              clientSecret:
                response.client_secret
            });

          this.stripePaymentElement =
            this.elements.create(
              'payment'
            );

          this.selectedPayment = payment;

          this.showStripePayment = true;

          this.processingPaymentId = null;

          this.cdr.detectChanges();

          setTimeout(() => {

            if (this.paymentElement) {

              this.stripePaymentElement.mount(
                this.paymentElement.nativeElement
              );

            }

          }, 100);

        },

        error: (error) => {

          console.error(
            'PaymentIntent creation error:',
            error
          );

          this.processingPaymentId = null;

          this.errorMessage =
            error?.error?.detail ||
            'Unable to start payment. Please try again.';

          this.cdr.detectChanges();
        }
      });
  }


  async confirmStripePayment(payment: any): Promise<void> {

    this.errorMessage = '';
    this.successMessage = '';

    if (
      !payment ||
      !this.stripeInstance ||
      !this.elements
    ) {
      return;
    }

    this.processingPaymentId = payment.id;

    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('payment_id', String(payment.id));

    const result =
      await this.stripeInstance.confirmPayment({
        elements: this.elements,

        confirmParams: {
          return_url: returnUrl.toString()
        },
        

        redirect: 'if_required'
      });

    if (result.error) {

      console.error(
        'Stripe payment error:',
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
      .confirmPayment(payment.id)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Payment confirmed:',
            response
          );

          this.processingPaymentId = null;

          payment.payment_status = 'paid';

          this.successMessage =
            'Payment of ₹' +
            this.formatAmount(
              payment.total_amount
            ) +
            ' completed successfully.';

          this.showStripePayment = false;

          this.stripePaymentElement = null;
          this.elements = null;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Payment confirmation error:',
            error
          );

          this.processingPaymentId = null;

          this.errorMessage =
            error?.error?.detail ||
            'Payment was completed, but confirmation failed.';

          this.cdr.detectChanges();
        }
      });
  }


  closeStripePayment(): void {

    if (this.stripePaymentElement) {

      this.stripePaymentElement.unmount();

    }

    this.showStripePayment = false;

    this.stripePaymentElement = null;
    this.elements = null;
    this.stripeInstance = null;

    this.selectedPayment = null;

    this.processingPaymentId = null;

    this.errorMessage = '';

  }



  getApiErrorMessage(error: any): string {

    if (!error?.error) {
      return '';
    }

    const values = Object.values(error.error);

    return values
      .flat()
      .join(' ');
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

  formatStatus(status: string): string {

    if (!status) {
      return 'Unknown';
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  getTotalPaid(): number {

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

  getPendingAmount(): number {

    return this.payments
      .filter(
        payment =>
          payment.payment_status === 'pending'
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.total_amount || 0),
        0
      );
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