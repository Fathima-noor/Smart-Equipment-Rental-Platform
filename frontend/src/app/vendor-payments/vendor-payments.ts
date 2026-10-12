
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-vendor-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-payments.html',
  styleUrl: './vendor-payments.css'
})
export class VendorPaymentsComponent implements OnInit {

  payments: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadVendorPayments();
  }

  loadVendorPayments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getVendorPayments().subscribe({
      next: (response: any) => {
        console.log('Vendor Payments Response:', response);

        this.payments = Array.isArray(response)
          ? response
          : (response?.results ?? []);

        this.isLoading = false;
        this.cdr.detectChanges();

        console.log('Payments loaded:', this.payments.length);
      },
      error: (error) => {
        console.error('Error loading vendor payments:', error);

        this.errorMessage = 'Unable to load vendor payments.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}