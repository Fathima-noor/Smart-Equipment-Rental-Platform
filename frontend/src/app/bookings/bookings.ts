import { 
  Component, 
  DestroyRef,
  OnInit, 
  ChangeDetectorRef 
} from '@angular/core'; 
 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router'; 
 
import { ApiService } from '../services/api'; 
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';
 
@Component({ 
  selector: 'app-bookings', 
  imports: [ 
    CommonModule, FormsModule,
    RouterLink 
  ], 
  templateUrl: './bookings.html', 
  styleUrl: './bookings.css' 
}) 
export class Bookings implements OnInit { 
 
  bookings: any[] = []; 
 
  loading = true; 
  errorMessage = ''; 
 
  // Return equipment
  showReturnModal = false;
  selectedBooking: any = null;
  returnCondition: 'good' | 'damaged' = 'good';
  returnError = '';
  returnSuccess = '';
  returning = false;

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

    this.loadBookings(); 
  } 
 
  loadBookings(): void { 
 
    this.loading = true; 
    this.errorMessage = ''; 
 
    this.api.getBookings().subscribe({ 
 
      next: (response: any) => { 
 
        console.log('Bookings API response:', response); 
 
        this.bookings = Array.isArray(response) 
          ? response 
          : (response?.results || []);

 
        this.loading = false; 
 
        this.cdr.detectChanges(); 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Bookings loading error:', 
          error 
        ); 
 
        this.loading = false; 
        this.errorMessage = 
          'Unable to load your bookings.'; 
 
        this.cdr.detectChanges(); 
      } 
    }); 
  } 
 
  getEquipmentName(booking: any): string { 
 
    return booking.equipment_name 
      || `Equipment #${booking.equipment}`; 
  } 
 
  getEquipmentIcon(booking: any): string { 
 
    switch ( 
      booking.equipment_category?.toLowerCase() 
    ) { 
 
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
 
  getRentalDays( 
    startDate: string, 
    endDate: string 
  ): number { 
 
    if (!startDate || !endDate) { 
      return 0; 
    } 
 
    const start = new Date(startDate); 
    const end = new Date(endDate); 
 
    const difference = 
      end.getTime() - start.getTime(); 
 
    return ( 
      Math.floor( 
        difference / 
        (1000 * 60 * 60 * 24) 
      ) + 1 
    ); 
  } 
 
  getStatusClass(status: string): string { 
 
    switch (status?.toLowerCase()) { 
 
      case 'approved': 
        return 'text-bg-success'; 
 
      case 'pending': 
        return 'text-bg-warning'; 
 
      case 'completed': 
        return 'text-bg-primary'; 
 
      case 'rejected': 
      case 'cancelled': 
        return 'text-bg-danger'; 
 
      default: 
        return 'text-bg-secondary'; 
    } 
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


  // ==============================
  // RETURN EQUIPMENT
  // ==============================
 
  isReturnAvailable(booking: any): boolean {
  if (
    booking?.status?.toLowerCase() !== 'approved' ||
    booking?.payment_status?.toLowerCase() !== 'paid' ||
    booking?.equipment_workflow_status?.toLowerCase() !== 'handed_over' ||
    !booking?.end_date
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(booking.end_date);
  endDate.setHours(0, 0, 0, 0);

  return endDate <= today;
}





  openReturnModal(booking: any): void {

    this.selectedBooking = booking;

    this.returnCondition = 'good';

    this.returnError = '';

    this.returnSuccess = '';

    this.showReturnModal = true;
  }


  closeReturnModal(): void {

    if (this.returning) {
      return;
    }

    this.showReturnModal = false;

    this.selectedBooking = null;

    this.returnCondition = 'good';

    this.returnError = '';
  }


  submitReturn(): void {

    if (!this.selectedBooking?.id) {
      return;
    }

    this.returnError = '';
    this.returnSuccess = '';
    this.returning = true;

    this.api.returnEquipment(
      this.selectedBooking.id,
      this.returnCondition
    ).subscribe({

      next: (response: any) => {

        console.log(
          'Equipment return response:',
          response
        );

        this.returning = false;

        

        this.selectedBooking = null;

        this.returnSuccess =
          'Equipment returned successfully.';

        this.showReturnModal = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Equipment return error:',
          error
        );

        this.returning = false;

        const backendError = error?.error;

        this.returnError =
          backendError?.non_field_errors?.[0] ||
          backendError?.detail ||
          backendError?.message ||
          'Unable to return the equipment. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }
}