
import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api';
import { finalize } from 'rxjs/operators';
import { timeout } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-admin-settings',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css'
})


export class AdminSettings implements OnInit {

  activeSection = 'profile';

  // ================= PROFILE =================

  adminName = '';
  adminEmail = '';
  adminPhone = '';

  username = '';
  firstName = '';
  lastName = '';

  userId: number | null = null;
  userRole = '';

  // ================= NOTIFICATIONS =================

  emailNotifications = true;
  bookingNotifications = true;
  damageNotifications = true;

  // ================= PASSWORD =================

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // ================= MESSAGES =================

  successMessage = '';
  errorMessage = '';

  isLoadingProfile = false;
  isSavingProfile = false;
  isChangingPassword = false;
  isSavingNotifications = false;


  constructor(
    private apiService: ApiService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  ngOnInit(): void {

    this.loadProfile();
    this.loadNotificationPreferences();

  }


  // ================= LOAD PROFILE =================

  loadProfile(): void {

    this.isLoadingProfile = true;

    this.resetMessages();

    this.apiService.getProfile().subscribe({

      next: (response: any) => {

        this.userId = response.id;

        this.username = response.username || '';

        this.firstName = response.first_name || '';

        this.lastName = response.last_name || '';

        this.adminEmail = response.email || '';

        this.userRole = response.role || '';

        this.adminName = [
          this.firstName,
          this.lastName
        ]
          .filter(name => name.trim() !== '')
          .join(' ');

        this.isLoadingProfile = false;

      },

      error: (error) => {

        console.error(
          'Profile loading error:',
          error
        );

        this.errorMessage =
          'Unable to load your profile. Please try again.';

        this.isLoadingProfile = false;

      }

    });

  }


  loadNotificationPreferences(): void {
  this.apiService.getNotificationPreferences()
    .subscribe({
      next: (response: any) => {
        this.emailNotifications =
          response.email_notifications ?? true;

        this.bookingNotifications =
          response.booking_notifications ?? true;

        this.damageNotifications =
          response.damage_notifications ?? true;
      },

      error: (error: any) => {
        console.error(
          'Unable to load notification preferences:',
          error
        );
      }
    });
}


  // ================= SECTION =================

  selectSection(section: string): void {

    this.activeSection = section;

    this.resetMessages();

  }


  // ================= SAVE PROFILE =================
  saveProfile(): void {
  this.successMessage = '';
  this.errorMessage = '';

  if (!this.adminName.trim()) {
    this.errorMessage = 'Full name is required.';
    return;
  }

  if (!this.adminEmail.trim()) {
    this.errorMessage = 'Email address is required.';
    return;
  }

  const nameParts = this.adminName.trim().split(/\s+/);

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const profileData = {
    first_name: firstName,
    last_name: lastName,
    email: this.adminEmail.trim()
  };

  this.isSavingProfile = true;

  this.apiService.updateProfile(profileData)
    .pipe(
      timeout(10000),
      finalize(() => {
        this.isSavingProfile = false;
        this.changeDetectorRef.detectChanges();
      })
    )
    .subscribe({
      next: (response: any) => {
  console.log('Profile update successful:', response);

  this.successMessage =
    response.message || 'Profile updated successfully.';

  this.errorMessage = '';
},

error: (error: any) => {
  console.error('Profile update error:', error);

  this.errorMessage =
    'Unable to update profile. Please try again.';

  this.successMessage = '';
  this.changeDetectorRef.detectChanges();
}
    });
}
  // ================= NOTIFICATIONS =================

   saveNotifications(): void {
  this.successMessage = '';
  this.errorMessage = '';

  const notificationData = {
    email_notifications: this.emailNotifications,
    booking_notifications: this.bookingNotifications,
    damage_notifications: this.damageNotifications
  };

  this.isSavingNotifications = true;

  this.apiService.updateNotificationPreferences(notificationData)
    .pipe(
      timeout(10000),
      finalize(() => {
        this.isSavingNotifications = false;
        this.changeDetectorRef.detectChanges();
      })
    )
    .subscribe({
      next: (response: any) => {
        this.successMessage =
          response.message ||
          'Notification settings updated successfully.';

        this.errorMessage = '';
      },

      error: (error: any) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to update notification settings.'
        );

        this.successMessage = '';

        console.error(
          'Notification settings error:',
          error
        );
      }
    });
}

  // ================= CHANGE PASSWORD =================

  changePassword(): void {
  this.successMessage = '';
  this.errorMessage = '';

  if (
    !this.currentPassword ||
    !this.newPassword ||
    !this.confirmPassword
  ) {
    this.errorMessage = 'Please fill in all password fields.';
    return;
  }

  if (this.newPassword.length < 8) {
    this.errorMessage =
      'New password must contain at least 8 characters.';
    return;
  }

  if (this.newPassword !== this.confirmPassword) {
    this.errorMessage =
      'New password and confirm password do not match.';
    return;
  }

  if (this.currentPassword === this.newPassword) {
    this.errorMessage =
      'New password must be different from current password.';
    return;
  }

  const passwordData = {
    current_password: this.currentPassword,
    new_password: this.newPassword,
    confirm_password: this.confirmPassword
  };

  this.isChangingPassword = true;

  this.apiService.changePassword(passwordData)
    .pipe(
      timeout(10000),
      finalize(() => {
        this.isChangingPassword = false;
        this.changeDetectorRef.detectChanges();
      })
    )
    .subscribe({
      next: (response: any) => {
        this.successMessage =
          response.message || 'Password changed successfully.';

        this.errorMessage = '';

        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';

        this.changeDetectorRef.detectChanges();
      },

      error: (error: any) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to change password. Please try again.'
        );

        this.successMessage = '';

        console.error('Password change error:', error);
      }
    });
}
  


  // ================= ERROR HANDLING =================

  getErrorMessage(
    error: any,
    defaultMessage: string
  ): string {

    const errorData = error?.error;

    if (!errorData) {

      return defaultMessage;

    }


    if (typeof errorData === 'string') {

      return errorData;

    }


    if (errorData.error) {

      return errorData.error;

    }


    if (errorData.detail) {

      return errorData.detail;

    }


    if (errorData.message) {

      return errorData.message;

    }


    const firstKey = Object.keys(errorData)[0];

    if (firstKey) {

      const firstValue = errorData[firstKey];

      if (Array.isArray(firstValue)) {

        return firstValue[0];

      }

      if (typeof firstValue === 'string') {

        return firstValue;

      }

    }


    return defaultMessage;

  }


  // ================= RESET MESSAGES =================

  resetMessages(): void {

    this.successMessage = '';

    this.errorMessage = '';

  }

}