import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-maintenance',
  imports: [
    CommonModule
  ],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css'
})
export class Maintenance implements OnInit {

  reports: any[] = [];

  loading = true;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }


  loadReports(): void {

    this.loading = true;

    this.api.getMaintenanceReports().subscribe({

      next: (response: any) => {

        this.reports = Array.isArray(response)
          ? response
          : (response?.results || []);

        console.log('Maintenance reports:', this.reports);

        console.log(
          'Report statuses:',
          this.reports.map(report => ({
            id: report.id,
            status: report.status
          }))
        );

        this.loading = false;

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Maintenance reports loading error:',
          error
        );

        this.loading = false;

        this.cdr.detectChanges();

      }

    });

  }

  getCount(status: string): number {

    return this.reports.filter(
      report => report.status === status.toLowerCase()
    ).length;

  }

}