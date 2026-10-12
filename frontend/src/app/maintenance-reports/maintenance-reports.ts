import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-maintenance-reports',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './maintenance-reports.html',
  styleUrl: './maintenance-reports.css'
})
export class MaintenanceReports implements OnInit {

  reports: any[] = [];
  damagedBookings: any[] = [];

  loading = true;

  processingReportId: number | null = null;

  errorMessage = '';
  successMessage = '';

  showCreateForm = false;

  bookingId: number | null = null;
  description = '';
  repairCost: number | null = null;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReports();
    this.loadDamagedBookings();
  }

  loadReports(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getMaintenanceReports().subscribe({

      next: (response: any) => {

        this.reports = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.loading = false;

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Maintenance reports loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          error?.error?.detail ||
          'Unable to load maintenance reports.';

        this.cdr.detectChanges();

      }

    });

  }

  loadDamagedBookings(): void {

    this.api.getMaintenanceDamagedBookings().subscribe({

      next: (response: any) => {

        this.damagedBookings = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Damaged bookings loading error:',
          error
        );

        this.damagedBookings = [];

        this.cdr.detectChanges();

      }

    });

  }

  createReport(): void {

    if (
      !this.bookingId ||
      !this.description.trim() ||
      this.repairCost === null ||
      this.repairCost < 0
    ) {

      this.errorMessage =
        'Please enter all maintenance report details.';

      return;

    }

    this.errorMessage = '';
    this.successMessage = '';

    this.api.createMaintenanceReport(
      this.bookingId,
      this.description,
      this.repairCost
    ).subscribe({

      next: () => {

        this.successMessage =
          'Maintenance report created successfully.';

        this.showCreateForm = false;

        this.bookingId = null;
        this.description = '';
        this.repairCost = null;

        this.loadReports();
        this.loadDamagedBookings();

      },

      error: (error) => {

        console.error(
          'Maintenance report creation error:',
          error
        );

        this.errorMessage =
          error?.error?.detail ||
          error?.error?.booking?.[0] ||
          'Unable to create maintenance report.';

        this.cdr.detectChanges();

      }

    });

  }


  closeCreateForm(): void {

    this.showCreateForm = false;

    this.bookingId = null;
    this.description = '';
    this.repairCost = null;

    this.errorMessage = '';

  }

  updateStatus(
    report: any,
    status: string
  ): void {

    this.processingReportId = report.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.api.updateMaintenanceReportStatus(
      report.id,
      status
    ).subscribe({

      next: () => {

        this.processingReportId = null;

        this.successMessage =
          'Maintenance report status updated successfully.';

        this.loadReports();

      },

      error: (error) => {

        console.error(
          'Maintenance status update error:',
          error
        );

        this.processingReportId = null;

        this.errorMessage =
          error?.error?.detail ||
          'Unable to update report status.';

        this.cdr.detectChanges();

      }

    });

  }

  getStatusLabel(status: string): string {

    return status
      ?.replace(/_/g, ' ')
      .replace(/\b\w/g, (letter: string) =>
        letter.toUpperCase()
      ) || '';

  }

}