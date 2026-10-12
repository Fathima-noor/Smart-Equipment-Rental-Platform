import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-admin-vendor-requests',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './admin-vendor-requests.html',

  styleUrl: './admin-vendor-requests.css'
})
export class AdminVendorRequests implements OnInit {

  vendorRequests: any[] = [];

  filteredVendorRequests: any[] = [];

  loading = true;

  processing = false;

  errorMessage = '';

  successMessage = '';

  searchText = '';

  selectedStatus = 'all';

  selectedRequest: any = null;

  showDetails = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

    ngOnInit(): void {

    this.loadVendorRequests();

  }

  loadVendorRequests(): void {

    this.loading = true;

    this.api.getAdminVendorRequests().subscribe({

      next: (response: any) => {

        this.vendorRequests = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.filteredVendorRequests = [...this.vendorRequests];

        this.loading = false;

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Vendor requests loading error:',
          error
        );

        this.vendorRequests = [];

        this.filteredVendorRequests = [];

        this.loading = false;

        this.errorMessage =
          'Unable to load vendor requests.';

        this.cdr.detectChanges();

      }

    });

  }


    applyFilters(): void {

    const search = this.searchText.toLowerCase().trim();

    this.filteredVendorRequests = this.vendorRequests.filter(
      (request: any) => {

        const matchesSearch =
          !search ||
          String(request.id).includes(search) ||
          (request.user_name || '').toLowerCase().includes(search) ||
          (request.user_email || '').toLowerCase().includes(search) ||
          (request.reason || '').toLowerCase().includes(search) ||
          (request.equipment_category || '').toLowerCase().includes(search);

        const matchesStatus =
          this.selectedStatus === 'all' ||
          request.status === this.selectedStatus;

        return matchesSearch && matchesStatus;

      }
    );

  }

  onSearch(): void {

    this.applyFilters();

  }

  onFilterChange(): void {

    this.applyFilters();

  }

  clearFilters(): void {

    this.searchText = '';

    this.selectedStatus = 'all';

    this.applyFilters();

  }


    updateVendorRequestStatus(
    vendorRequest: any,
    action: 'approve' | 'reject'
  ): void {

    if (this.processing) {
      return;
    }

    const actionText =
      action === 'approve' ? 'approve' : 'reject';

    const confirmed = confirm(
      `Are you sure you want to ${actionText} this vendor request?`
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;

    this.errorMessage = '';

    this.successMessage = '';

    this.api.updateVendorRequestStatus(
      vendorRequest.id,
      action
    ).subscribe({

      next: (response: any) => {

        vendorRequest.status = response.status;

        this.processing = false;

        this.successMessage =
          response.message ||
          `Vendor request ${actionText}d successfully.`;

        this.applyFilters();

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Vendor request update error:',
          error
        );

        this.processing = false;

        this.errorMessage =
          error?.error?.error ||
          'Unable to update vendor request.';

        this.cdr.detectChanges();

      }

    });

  }

    openDetails(vendorRequest: any): void {

    this.selectedRequest = vendorRequest;

    this.showDetails = true;

  }

  closeDetails(): void {

    this.selectedRequest = null;

    this.showDetails = false;

  }

  getStatusClass(status: string): string {

    switch (status?.toLowerCase()) {

      case 'pending':
        return 'status-pending';

      case 'approved':
        return 'status-approved';

      case 'rejected':
        return 'status-rejected';

      default:
        return 'status-default';

    }

  }

  formatDate(date: string): string {

    if (!date) {
      return 'N/A';
    }

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  }

  formatDateTime(date: string): string {

    if (!date) {
      return 'N/A';
    }

    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  }




}

