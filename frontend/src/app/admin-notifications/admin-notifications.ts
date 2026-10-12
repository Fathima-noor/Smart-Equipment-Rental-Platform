import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api';


@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-notifications.html',
  styleUrls: ['./admin-notifications.css']
})
export class AdminNotifications implements OnInit {

  notifications: any[] = [];
  filteredNotifications: any[] = [];

  vendorRequests: any[] = [];
  loadingVendorRequests = false;

  loading = true;
  processing = false;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedType = 'all';
  selectedStatus = 'all';

  selectedNotification: any = null;
  showDetails = false;


  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    this.loadNotifications();
    this.loadVendorRequests();
  }


  loadNotifications(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getAdminNotifications().subscribe({

      next: (response: any) => {

        this.notifications = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.sortNotifications();
        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Admin notifications loading error:',
          error
        );

        this.notifications = [];
        this.filteredNotifications = [];

        this.loading = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to load notifications. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }

  loadVendorRequests(): void {

  this.loadingVendorRequests = true;

  this.api.getAdminVendorRequests().subscribe({

    next: (response: any) => {

      this.vendorRequests = Array.isArray(response)
        ? response
        : (response?.results || []);

      this.loadingVendorRequests = false;

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Vendor requests loading error:',
        error
      );

      this.vendorRequests = [];
      this.loadingVendorRequests = false;

      this.cdr.detectChanges();
    }

  });
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

      vendorRequest.status =
        response.status;

      this.processing = false;

      this.successMessage =
        response.message ||
        `Vendor request ${actionText}d successfully.`;

      this.cdr.detectChanges();

    },

    error: (error) => {

      console.error(
        'Vendor request update error:',
        error
      );

      this.processing = false;

      this.errorMessage =
        this.getApiErrorMessage(error) ||
        'Unable to update vendor request.';

      this.cdr.detectChanges();

    }

  });
}
  getVendorRequestStatusClass(status: string): string {

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


  sortNotifications(): void {

    this.notifications.sort(
      (a: any, b: any) => {

        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return Number(a.id || 0) -
          Number(b.id || 0);
      }
    );
  }


  applyFilters(): void {

    const search =
      this.searchText.trim().toLowerCase();

    this.filteredNotifications =this.notifications.filter(
        (notification: any) => {


          const recipientName =
            notification.recipient_name || '';

          const username =
            notification.recipient_username || '';

          const title =
            notification.title || '';

          const message =
            notification.message || '';

          const type =
            this.getTypeLabel(
              notification.notification_type
            );

          const matchesSearch =
            !search ||
            String(notification.id || '')
              .includes(search) ||
            recipientName
              .toLowerCase()
              .includes(search) ||
            username
              .toLowerCase()
              .includes(search) ||
            title
              .toLowerCase()
              .includes(search) ||
            message
              .toLowerCase()
              .includes(search) ||
            type
              .toLowerCase()
              .includes(search);

          const matchesType =
            this.selectedType === 'all' ||
            notification.notification_type ===
              this.selectedType;

          const notificationStatus =
            notification.is_read
              ? 'read'
              : 'unread';

          const matchesStatus =
            this.selectedStatus === 'all' ||
            notificationStatus ===
              this.selectedStatus;

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus
          );
        }
    );

          // Latest notification first
    this.filteredNotifications.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() -
           new Date(a.created_at).getTime();


      });
  }


  onSearch(): void {
    this.applyFilters();
  }


  onFilterChange(): void {
    this.applyFilters();
  }


  clearFilters(): void {

    this.searchText = '';
    this.selectedType = 'all';
    this.selectedStatus = 'all';

    this.applyFilters();
  }


  get totalNotifications(): number {
    return this.notifications.length;
  }


  get unreadNotifications(): number {

    return this.notifications.filter(
      notification =>
        !notification.is_read
    ).length;
  }


  get readNotifications(): number {

    return this.notifications.filter(
      notification =>
        notification.is_read
    ).length;
  }


  openDetails(notification: any): void {

    this.selectedNotification =
      notification;

    this.showDetails = true;

    document.body.style.overflow =
      'hidden';
  }


  closeDetails(): void {

    if (this.processing) {
      return;
    }

    this.showDetails = false;
    this.selectedNotification = null;

    document.body.style.overflow = '';
  }


  markAsRead(notification: any): void {

    if (!notification || notification.is_read) {
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.markAdminNotificationAsRead(
      notification.id
    ).subscribe({

      next: (response: any) => {

        notification.is_read = true;

        this.applyFilters();

        this.processing = false;

        this.successMessage =
          'Notification marked as read.';

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Notification read error:',
          error
        );

        this.processing = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to mark notification as read.';

        this.cdr.detectChanges();
      }

    });
  }


  markAllAsRead(): void {

    if (this.unreadNotifications === 0) {
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.markAllAdminNotificationsAsRead()
      .subscribe({

        next: () => {

          this.notifications.forEach(
            notification => {
              notification.is_read = true;
            }
          );

          this.applyFilters();

          this.processing = false;

          this.successMessage =
            'All notifications marked as read.';

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Mark all notifications error:',
            error
          );

          this.processing = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to mark all notifications as read.';

          this.cdr.detectChanges();
        }

      });
  }


  getTypeLabel(type: string): string {

    const labels: any = {

      booking: 'Booking',
      payment: 'Payment',
      damage: 'Damage',
      equipment: 'Equipment',
      general: 'General'

    };

    return labels[type] ||
      type ||
      'General';
  }


  getTypeClass(type: string): string {

    switch (type?.toLowerCase()) {

      case 'booking':
        return 'type-booking';

      case 'payment':
        return 'type-payment';

      case 'damage':
        return 'type-damage';

      case 'equipment':
        return 'type-equipment';

      case 'general':
        return 'type-general';

      default:
        return 'type-default';
    }
  }


  getRecipientClass(role: string): string {

    switch (role?.toLowerCase()) {

      case 'customer':
        return 'role-customer';

      case 'vendor':
        return 'role-vendor';

      case 'admin':
        return 'role-admin';

      default:
        return 'role-default';
    }
  }


  getRecipientInitial(
    notification: any
  ): string {

    const name =
      notification.recipient_name ||
      notification.recipient_username ||
      'U';

    return name
      .charAt(0)
      .toUpperCase();
  }


  formatDate(date: string): string {

    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleDateString(
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

    return new Date(date).toLocaleString(
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

    const firstKey =
      Object.keys(data)[0];

    if (firstKey) {

      const value =
        data[firstKey];

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