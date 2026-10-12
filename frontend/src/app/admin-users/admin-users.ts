import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css']
})
export class AdminUsers implements OnInit {

  users: any[] = [];
  filteredUsers: any[] = [];

  loading = true;
  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedRole = 'all';

  showUserForm = false;
  editingUser: any = null;

  userForm = {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'customer'
  };

  processing = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getAdminUsers().subscribe({

      next: (response: any) => {

        this.users = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Admin users loading error:', error);

        this.users = [];
        this.filteredUsers = [];

        this.loading = false;

        this.errorMessage =
          'Unable to load users. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }

  applyFilters(): void {

    const search = this.searchText
      .trim()
      .toLowerCase();

    this.filteredUsers = this.users.filter((user: any) => {

      const fullName =
        `${user.first_name || ''} ${user.last_name || ''}`
          .trim()
          .toLowerCase();

      const matchesSearch =
        !search ||
        String(user.id).includes(search) ||
        user.username?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        fullName.includes(search);

      const matchesRole =
        this.selectedRole === 'all' ||
        user.role?.toLowerCase() ===
        this.selectedRole.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }

  openAddUser(): void {

    this.editingUser = null;

    this.userForm = {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'customer'
    };

    this.errorMessage = '';

    this.showUserForm = true;

    this.cdr.detectChanges();
  }

  openEditUser(user: any): void {

    // Admin account is protected
    if (this.isAdminUser(user)) {
      return;
    }

    this.editingUser = user;

    this.userForm = {
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      role: user.role === 'vendor'
        ? 'vendor'
        : 'customer'
    };

    this.errorMessage = '';

    this.showUserForm = true;

    this.cdr.detectChanges();
  }

  closeUserForm(): void {

    if (this.processing) {
      return;
    }

    this.showUserForm = false;
    this.editingUser = null;

    this.userForm = {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'customer'
    };

    this.errorMessage = '';
  }

  saveUser(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.userForm.username.trim()) {
      this.errorMessage = 'Username is required.';
      return;
    }

    if (!this.userForm.email.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }

    if (
      !this.editingUser &&
      !this.userForm.password.trim()
    ) {
      this.errorMessage = 'Password is required.';
      return;
    }

    this.processing = true;

    const data: any = {
      username: this.userForm.username.trim(),
      first_name: this.userForm.first_name.trim(),
      last_name: this.userForm.last_name.trim(),
      email: this.userForm.email.trim(),
      role: this.userForm.role
    };

    // Password is sent when creating
    // or when admin enters a new password while editing.
    if (this.userForm.password.trim()) {
      data.password = this.userForm.password.trim();
    }

    if (this.editingUser) {

      this.api.updateAdminUser(
        this.editingUser.id,
        data
      ).subscribe({

        next: (response: any) => {

          const index = this.users.findIndex(
            user => user.id === this.editingUser.id
          );

          if (index !== -1) {
            this.users[index] = response;
          }

          this.applyFilters();

          this.processing = false;
          this.showUserForm = false;

          this.successMessage =
            'User updated successfully.';

          this.editingUser = null;

          this.resetForm();

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error('User update error:', error);

          this.processing = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to update user.';

          this.cdr.detectChanges();
        }

      });

    } else {

      this.api.createAdminUser(data).subscribe({

        next: (response: any) => {

          this.users.unshift(response);

          this.applyFilters();

          this.processing = false;
          this.showUserForm = false;

          this.successMessage =
            'User created successfully.';

          this.resetForm();

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error('User creation error:', error);

          this.processing = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to create user.';

          this.cdr.detectChanges();
        }

      });
    }
  }

  deleteUser(user: any): void {

    if (!user?.id) {
      return;
    }

    // Protect admin account
    if (this.isAdminUser(user)) {
      this.errorMessage =
        'The admin account cannot be deleted.';
      return;
    }

    const name =
      `${user.first_name || ''} ${user.last_name || ''}`
        .trim() ||
      user.username;

    const confirmed = confirm(
      `Are you sure you want to delete ${name}?`
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.deleteAdminUser(user.id).subscribe({

      next: () => {

        this.users = this.users.filter(
          item => item.id !== user.id
        );

        this.applyFilters();

        this.processing = false;

        this.successMessage =
          'User deleted successfully.';

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('User deletion error:', error);

        this.processing = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to delete user.';

        this.cdr.detectChanges();
      }

    });
  }

  isAdminUser(user: any): boolean {
    return user?.role?.toLowerCase() === 'admin';
  }

  resetForm(): void {

    this.userForm = {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'customer'
    };
  }

  getRoleClass(role: string): string {

    switch (role?.toLowerCase()) {

      case 'admin':
        return 'role-admin';

      case 'vendor':
        return 'role-vendor';

      case 'customer':
        return 'role-customer';

      default:
        return 'role-default';
    }
  }

  getUserName(user: any): string {

    const name =
      `${user.first_name || ''} ${user.last_name || ''}`
        .trim();

    return name || user.username || 'Unknown';
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