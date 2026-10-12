import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { ApiService } from '../services/api'; 
 
@Component({ 
  selector: 'app-admin-damage-reports', 
  standalone: true, 
  imports: [CommonModule, FormsModule], 
  templateUrl: './admin-damage-reports.html', 
  styleUrls: ['./admin-damage-reports.css'] 
}) 
export class AdminDamageReports implements OnInit { 
 
  reports: any[] = []; 
  filteredReports: any[] = []; 
  bookings: any[] = []; 
 
  Number = Number; 
 
  loading = true; 
  loadingBookings = false; 
  creatingReport = false; 
  bookingsError = '';
  processingRefundReportId: number | null = null;
 
  errorMessage = ''; 
  successMessage = ''; 
  createError = ''; 
 
  searchText = ''; 
  selectedStatus = 'all'; 
 
  selectedReport: any = null; 
  showDetailsModal = false; 
 
  showCreateModal = false; 
 
  createForm = { 
    booking: '', 
    description: '',
    damage_amount: ''
  }; 
 
  manualBookingId = '';
  bookingSelectionError = '';
  bookingSelectionTouched = false;
  selectedBooking: any = null; 
  maintenanceRepairCost = 0; 
 
 
  constructor( 
    private api: ApiService, 
    private cdr: ChangeDetectorRef 
  ) {} 
 
 
  ngOnInit(): void { 
 
    this.loadReports(); 
 
  } 
 
 
  // ======================================== 
  // LOAD REPORTS 
  // ======================================== 
 
  loadReports(): void { 
 
    this.loading = true; 
    this.errorMessage = ''; 
 
    this.api.getAdminDamageReports().subscribe({ 
 
      next: (response: any) => { 
 
        this.reports = Array.isArray(response) 
          ? response 
          : (response?.results || []); 
 
        this.applyFilters(); 
 
        this.loading = false; 
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Admin damage reports loading error:', 
          error 
        ); 
 
        this.reports = []; 
        this.filteredReports = []; 
 
        this.loading = false; 
 
        this.errorMessage = 
          this.getApiErrorMessage(error) || 
          'Unable to load damage reports. Please try again.'; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 
 
  // ======================================== 
  // LOAD ELIGIBLE BOOKINGS 
  // ======================================== 
 
  loadBookings(): void { 

    if (this.loadingBookings) {
      return;
    }
 
    this.loadingBookings = true; 
    this.bookingsError = ''; 
 
    this.api.getAdminEligibleDamageBookings().subscribe({ 
 
      next: (response: any) => { 
 
        this.bookings = Array.isArray(response) 
          ? response 
          : (Array.isArray(response?.results) ? response.results : []); 
 
        this.loadingBookings = false; 
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Bookings loading error:', 
          error 
        ); 
 
        this.bookings = []; 
 
        this.loadingBookings = false; 
 
        this.bookingsError = 
          this.getApiErrorMessage(error) || 
          'Unable to load eligible bookings.'; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 
 
  // ======================================== 
  // OPEN CREATE MODAL 
  // ======================================== 
 
  openCreateModal(): void { 
 
    this.errorMessage = ''; 
    this.successMessage = ''; 
    this.createError = ''; 
 
    this.createForm = { 
      booking: '', 
      description: '',
      damage_amount: ''
    }; 
    this.manualBookingId = '';
    this.bookingSelectionError = '';
    this.bookingSelectionTouched = false;
 
    this.selectedBooking = null; 
    this.maintenanceRepairCost = 0; 
 
    this.showCreateModal = true; 
 
    this.loadBookings(); 
 
    this.cdr.detectChanges(); 
 
  } 
 
 
  // ======================================== 
  // CLOSE CREATE MODAL 
  // ======================================== 
 
  closeCreateModal(): void { 
 
    if (this.creatingReport) { 
      return; 
    } 
 
    this.showCreateModal = false; 
 
    this.createForm = { 
      booking: '', 
      description: '',
      damage_amount: ''
    }; 
    this.manualBookingId = '';
    this.bookingSelectionError = '';
    this.bookingSelectionTouched = false;
 
    this.selectedBooking = null; 
    this.maintenanceRepairCost = 0; 
    this.createError = ''; 
 
    this.cdr.detectChanges(); 
 
  } 
 
 
  // ======================================== 
  // BOOKING SELECT 
  // ======================================== 
 
  onBookingChange(): void { 
    this.selectEligibleBooking(this.createForm.booking, 'dropdown');
  }
 
  onManualBookingIdChange(value: string): void {
    this.selectEligibleBooking(value, 'manual');
  }
 
  private selectEligibleBooking(
    value: string | number,
    source: 'manual' | 'dropdown'
  ): void {
    const bookingIdText = String(value ?? '').trim();
    this.bookingSelectionTouched = true;
    this.bookingSelectionError = '';
    this.createError = '';

    if (source === 'manual') {
      this.manualBookingId = bookingIdText;
    } else {
      this.manualBookingId = bookingIdText;
    }
    this.createForm.booking = bookingIdText;

    if (!bookingIdText) {
      this.clearSelectedBooking();
      this.bookingSelectionError =
        'Enter a Booking ID or select one from the dropdown.';
      this.cdr.detectChanges();
      return;
    }

    if (!/^\d+$/.test(bookingIdText) || Number(bookingIdText) <= 0) {
      this.clearSelectedBooking();
      this.bookingSelectionError = 'Enter a valid numeric Booking ID.';
      this.cdr.detectChanges();
      return;
    }

    if (this.loadingBookings) {
      this.clearSelectedBooking();
      this.bookingSelectionError =
        'Eligible booking details are still loading.';
      this.cdr.detectChanges();
      return;
    }
 
    const booking = this.bookings.find(
      (candidate: any) => Number(candidate.id) === Number(bookingIdText)
    );
 
    if (!booking) {
      this.clearSelectedBooking();
      this.bookingSelectionError =
        `Booking ID ${bookingIdText} was not found in eligible damaged bookings. Confirmed damage, completed maintenance, and no existing damage report are required.`;
      this.cdr.detectChanges();
      return;
    }
 
    const isSameBooking =
      Number(this.selectedBooking?.id) === Number(booking.id);
    this.selectedBooking = booking;
    this.createForm.booking = String(booking.id);
    this.manualBookingId = String(booking.id);

    if (!isSameBooking) {
      const repairCost = String(booking.maintenance_repair_cost ?? '0.00');
      this.maintenanceRepairCost = Number(repairCost);
      this.createForm.damage_amount = repairCost;
      this.createForm.description =
        String(booking.maintenance_description || '').trim();
    }

    this.cdr.detectChanges();
  }

  private clearSelectedBooking(): void {
    this.selectedBooking = null;
    this.maintenanceRepairCost = 0;
    this.createForm.damage_amount = '';
    this.createForm.description = '';
    this.createForm.booking = '';
  }
 
 
  // ======================================== 
  // CREATE DAMAGE REPORT 
  // ======================================== 
 
  createDamageReport(): void { 
 
    this.createError = ''; 
    this.errorMessage = ''; 
    this.successMessage = ''; 

    if (this.loadingBookings) {
      this.createError = 'Wait for eligible bookings to finish loading.';
      return;
    }

    if (this.bookingSelectionError) {
      this.createError = this.bookingSelectionError;
      return;
    }
 
    if (!this.createForm.booking) { 
 
      this.createError = 
        'Please select a booking.'; 
 
      return; 
 
    } 
 
    const description = this.createForm.description.trim();

    if (!description) { 
 
      this.createError = 
        'Please enter the damage description.'; 
 
      return; 
 
    } 
 
    if (!this.selectedBooking) { 
 
      this.createError = 
        'Selected booking could not be found.'; 
 
      return; 
 
    } 
 
    const damageAmount = this.createForm.damage_amount.trim();
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(damageAmount)) {
 
      this.createError = 
        'Enter a valid non-negative damage amount with up to two decimal places.'; 
 
      return; 
 
    } 
 
    this.creatingReport = true; 
 
    this.cdr.detectChanges(); 
 
    const data = { 
      booking: Number(this.createForm.booking), 
      description,
      damage_amount: damageAmount
    }; 
 
    this.api.createDamageReport(data).subscribe({ 
 
      next: (response: any) => { 
 
        console.log( 
          'Damage report created:', 
          response 
        ); 
 
        this.creatingReport = false; 
 
        this.showCreateModal = false; 
 
        this.createForm = { 
          booking: '', 
          description: '',
          damage_amount: ''
        }; 
        this.manualBookingId = '';
        this.bookingSelectionError = '';
        this.bookingSelectionTouched = false;
 
        this.selectedBooking = null; 
        this.maintenanceRepairCost = 0; 
 
        this.successMessage = 
          'Damage report created successfully.'; 
 
        this.loadReports(); 
        this.loadBookings();
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Damage report creation error:', 
          error 
        ); 
 
        this.creatingReport = false; 
 
        this.createError = 
          this.getApiErrorMessage(error) || 
          'Unable to create damage report.'; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 


 
  // ======================================== 
  // FILTERS 
  // ======================================== 
 
  applyFilters(): void { 
 
    const search = 
      this.searchText.trim().toLowerCase(); 
 
    this.filteredReports = 
      this.reports.filter((report: any) => { 
 
        const reportId = 
          String(report.id || '').toLowerCase(); 
 
        const bookingId = 
          String(report.booking || '').toLowerCase(); 
 
        const customer = 
          String(report.customer_name || '').toLowerCase(); 
 
        const equipment = 
          String(report.equipment_name || '').toLowerCase(); 
 
        const description = 
          String(report.description || '').toLowerCase(); 
 
        const matchesSearch = 
          !search || 
          reportId.includes(search) || 
          bookingId.includes(search) || 
          customer.includes(search) || 
          equipment.includes(search) || 
          description.includes(search); 
 
        const matchesStatus = 
          this.selectedStatus === 'all' || 
          String(report.status || '').toLowerCase() === 
          this.selectedStatus.toLowerCase(); 
 
        return matchesSearch && matchesStatus; 
 
      }); 


  // Sort damage reports by date: newest first
  this.filteredReports.sort((a: any, b: any) => {
    const dateA = new Date(
      a.created_at || a.reported_at || a.date || 0
    ).getTime();

    const dateB = new Date(
      b.created_at || b.reported_at || b.date || 0
    ).getTime();

    return dateB - dateA;
  });
 
  } 
 
 
  onSearch(): void { 
 
    this.applyFilters(); 
 
  } 
 
 
  // ======================================== 
  // VIEW DETAILS 
  // ======================================== 
 
  viewReport(report: any): void { 
 
    this.errorMessage = ''; 
 
    this.api.getAdminDamageReport(report.id).subscribe({ 
 
      next: (response: any) => { 
 
        this.selectedReport = response; 
        this.showDetailsModal = true; 
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Damage report details error:', 
          error 
        ); 
 
        this.errorMessage = 
          this.getApiErrorMessage(error) || 
          'Unable to load damage report details.'; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 
 
  // ======================================== 
  // CLOSE DETAILS 
  // ======================================== 
 
  closeDetails(): void { 
 
    this.showDetailsModal = false; 
    this.selectedReport = null; 
 
  } 

  processDepositRefund(report: any): void {
    if (!report?.id || this.processingRefundReportId !== null) {
      return;
    }

    this.processingRefundReportId = report.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.processDamageReportRefund(report.id).subscribe({
      next: (response: any) => {
        const updated = { ...report, ...response };
        const index = this.reports.findIndex(
          item => Number(item.id) === Number(report.id)
        );
        if (index >= 0) {
          this.reports[index] = updated;
          this.applyFilters();
        }
        this.selectedReport = updated;
        this.processingRefundReportId = null;
        this.successMessage = response.refund_status === 'refunded' ||
          response.refund_status === 'partially_refunded'
          ? 'Stripe confirmed the deposit refund.'
          : response.refund_status === 'failed'
            ? 'Stripe did not complete the refund. It remains unpaid.'
            : 'Refund submitted to Stripe and is pending confirmation.';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.processingRefundReportId = null;
        this.errorMessage = this.getApiErrorMessage(error) ||
          'Unable to process or verify the deposit refund.';
        this.cdr.detectChanges();
      }
    });
  }
 

  // ========================================
  // RESOLVE DAMAGE REPORT
  // ========================================
  resolveDamageReport(report: any): void {
    if (!report?.id || report.status === 'resolved') {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.api.updateDamageReportStatus(
      report.id,
      'resolved'
    ).subscribe({
      next: (response: any) => {
        const updated = {
          ...report,
          ...response,
          status: 'resolved'
        };

        const index = this.reports.findIndex(
          item => Number(item.id) === Number(report.id)
        );

        if (index >= 0) {
          this.reports[index] = updated;
        }

        if (
          Number(this.selectedReport?.id) === Number(report.id)
        ) {
          this.selectedReport = updated;
        }

        this.applyFilters();

        this.successMessage =
          'Damage report resolved successfully.';

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(
          'Damage report resolve error:',
          error
        );

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to resolve damage report.';

        this.cdr.detectChanges();
      }
    });
  }
 
  // ======================================== 
  // STATUS 
  // ======================================== 
 
  getStatusClass(status: string): string { 
 
    switch ( 
      String(status || '').toLowerCase() 
    ) { 
 
      case 'reported': 
        return 'status-reported'; 
 
      case 'reviewed': 
        return 'status-reviewed'; 
 
      case 'resolved': 
        return 'status-resolved'; 
 
      default: 
        return 'status-default'; 
 
    } 
 
  } 
 
 
  getStatusLabel(status: string): string { 
 
    if (!status) { 
      return 'Unknown'; 
    } 
 
    return status.charAt(0).toUpperCase() + 
      status.slice(1); 
 
  } 
 
 
  // ======================================== 
  // CUSTOMER 
  // ======================================== 
 
  getCustomerName(report: any): string { 
 
    return report?.customer_name || 
      report?.reported_by || 
      'Unknown Customer'; 
 
  } 
 
 
  // ======================================== 
  // AMOUNT 
  // ======================================== 
 
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
 
 
  // ======================================== 
  // DATE 
  // ======================================== 
 
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
 
 
  // ======================================== 
  // SUMMARY 
  // ======================================== 
 
  getReportedCount(): number { 
 
    return this.reports.filter( 
      report => 
        String(report.status || '').toLowerCase() === 
        'reported' 
    ).length; 
 
  } 
 
 
  getReviewedCount(): number { 
 
    return this.reports.filter( 
      report => 
        String(report.status || '').toLowerCase() === 
        'reviewed' 
    ).length; 
 
  } 
 
 
  getResolvedCount(): number { 
 
    return this.reports.filter( 
      report => 
        String(report.status || '').toLowerCase() === 
        'resolved' 
    ).length; 
 
  } 
 
 
  getTotalDamageAmount(): number { 
 
    return this.reports.reduce( 
      (total, report) => 
        total + Number(report.damage_amount || 0), 
      0 
    ); 
 
  } 
 
 
  getTotalAdditionalAmount(): number { 
 
    return this.reports.reduce( 
      (total, report) => 
        total + Number(report.additional_amount || 0), 
      0 
    ); 
 
  } 
 
 
  // ======================================== 
  // API ERROR 
  // ======================================== 
 
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