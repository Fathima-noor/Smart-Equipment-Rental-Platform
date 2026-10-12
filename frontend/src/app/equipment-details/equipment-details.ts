import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-equipment-details',
  imports: [
    FormsModule,
    RouterLink,
    DecimalPipe,CommonModule
  ],
  templateUrl: './equipment-details.html',
  styleUrl: './equipment-details.css'
})
export class EquipmentDetails implements OnInit {

  equipment: any = null;

  startDate = '';
  endDate = '';

  rentalDays = 0;
  rentalAmount = 0;
  totalAmount = 0;
  depositAmount = 0;

  loading = true;
  bookingLoading = false;

  errorMessage = '';
  bookingMessage = '';

  today = new Date().toISOString().split('T')[0];


  availabilityLoading = false;
  availabilityAvailable: boolean | null = null;
  availabilityMessage = '';

private availabilitySubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!id) {
      this.errorMessage = 'Invalid equipment.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadEquipment(id);
  }

  loadEquipment(id: number): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getEquipmentById(id).subscribe({

      next: (data: any) => {

        console.log('Equipment details:', data);

        this.equipment = data;
        this.loading = false;

        // Force Angular to update the page immediately
        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Equipment details error:',
          error
        );

        this.errorMessage =
          'Unable to load equipment details.';

        this.loading = false;

        this.cdr.detectChanges();
      }
    });
  }


calculateTotal(): void {

  this.rentalDays = 0;
  this.rentalAmount = 0;
  this.totalAmount = 0;
  this.depositAmount = 0;

  if (!this.startDate || !this.endDate) {
    return;
  }

  const start = new Date(this.startDate);
  const end = new Date(this.endDate);

  if (end < start) {
    return;
  }

  const difference =
    end.getTime() - start.getTime();

  this.rentalDays =
    Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ) + 1;

  // Calculate rental amount
  this.rentalAmount =
    Number(this.equipment?.price_per_day || 0) *
    this.rentalDays;

  // Calculate 20% security deposit
  this.depositAmount =
    this.rentalAmount * 0.20;

  // Rent + Deposit
  this.totalAmount =
    this.rentalAmount + this.depositAmount;
}

  onStartDateChange(): void {
  if (
    this.endDate &&
    this.endDate < this.startDate
  ) {
    this.endDate = '';
  }

  this.calculateTotal();
  this.checkAvailability();
}

  onEndDateChange(): void {
  this.calculateTotal();
  this.checkAvailability();
}

checkAvailability(): void {
  this.availabilitySubscription?.unsubscribe();

  this.availabilityAvailable = null;
  this.availabilityMessage = '';
  this.availabilityLoading = false;

  if (!this.startDate || !this.endDate || !this.equipment?.id) {
    return;
  }

  if (this.endDate < this.startDate) {
    return;
  }

  if (!this.equipment.is_available || this.equipment.quantity <= 0) {
    this.availabilityAvailable = false;
    this.availabilityMessage =
      'This equipment is currently unavailable.';
    return;
  }

  this.availabilityLoading = true;

  console.log('Checking availability:', this.equipment.id, this.startDate, this.endDate);

  this.availabilitySubscription =
    this.api.checkEquipmentAvailability(
      this.equipment.id,
      this.startDate,
      this.endDate
    ).subscribe({
      next: (response: any) => {
        console.log('Availability API response:', response);

        this.availabilityAvailable = response.available;
        this.availabilityMessage = response.message;
        this.availabilityLoading = false;
      },
      error: (error) => {
        console.error('Availability check error:', error);

        this.availabilityAvailable = null;
        this.availabilityMessage =
          'Unable to check availability. Please try again.';
        this.availabilityLoading = false;
      }
    });
}

  bookEquipment(): void {

    this.bookingMessage = '';

    if (!this.startDate || !this.endDate) {

      this.bookingMessage =
        'Please select both start and end dates.';

      return;
    }

    if (this.rentalDays <= 0) {

      this.bookingMessage =
        'Please select valid rental dates.';

      return;
    }

    if (
      !this.equipment?.is_available ||
      this.equipment?.quantity <= 0
    ) {

      this.bookingMessage =
        'This equipment is currently unavailable.';

      return;
    }

    this.bookingLoading = true;

    if (this.availabilityLoading) {
  this.bookingMessage =
    'Please wait while checking equipment availability.';
  return;
}

if (this.availabilityAvailable !== true) {
  this.bookingMessage =
    this.availabilityMessage ||
    'Please select dates and check availability.';
  return;
}

    const bookingData = {
      equipment: this.equipment.id,
      start_date: this.startDate,
      end_date: this.endDate,
    };

    this.api.createBooking(bookingData).subscribe({

      next: (response: any) => {

        console.log(
          'Booking created:',
          response
        );

        this.bookingLoading = false;


        this.router.navigate(['/bookings']);
      },

      error: (error) => {

        console.error(
          'Booking error:',
          error
        );

        this.bookingLoading = false;

        if (error?.error?.detail) {

          this.bookingMessage =
            error.error.detail;

        } else if (error?.error) {

          const messages =
            Object.values(error.error)
              .flat()
              .join(' ');

          this.bookingMessage =
            messages ||
            'Unable to create booking.';

        } else {

          this.bookingMessage =
            'Unable to create booking. Please try again.';
        }

      }
    });
  }

  getEquipmentIcon(category: string): string {

    switch (category?.toLowerCase()) {

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

  getImageUrl(image: string | null): string {

    if (!image) {
      return '';
    }

    if (image.startsWith('http')) {
      return image;
    }

    return `http://127.0.0.1:8000${image}`;
  }
}