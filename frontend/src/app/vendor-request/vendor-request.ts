import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-vendor-request',
  imports: [FormsModule, RouterLink],
  templateUrl: './vendor-request.html',
  styleUrl: './vendor-request.css',
})
export class VendorRequest {

  reason = '';
  equipment_category = '';
  additional_details = '';

  errorMessage = '';
  successMessage = '';

  constructor(private router: Router,private apiService: ApiService) {}

      submitRequest(): void {
  this.errorMessage = '';
  this.successMessage = '';

  if (!this.reason.trim()) {
    this.errorMessage =
      'Please enter a reason for becoming a vendor.';
    return;
  }

  if (!this.equipment_category) {
    this.errorMessage =
      'Please select an equipment category.';
    return;
  }

  const requestData = {
    reason: this.reason,
    equipment_category: this.equipment_category,
    additional_details: this.additional_details
  };

  this.apiService.submitVendorRequest(requestData).subscribe({
    next: (response: any) => {
      this.successMessage =
        response.message 
        'Your vendor request has been submitted successfully!';

      this.reason = '';
      this.equipment_category = '';
      this.additional_details = '';
    },

    error: (error) => {
      console.error('Vendor request error:', error);

      if (error.error?.error) {
        this.errorMessage = error.error.error;
      } else if (error.error?.detail) {
        this.errorMessage = error.error.detail;
      } else {
        this.errorMessage =
          'Something went wrong. Please try again.';
      }
    }
  });
}
}

