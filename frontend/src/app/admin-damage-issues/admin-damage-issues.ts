import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-admin-damage-issues',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-damage-issues.html',
  styleUrls: ['./admin-damage-issues.css']
})
export class AdminDamageIssues implements OnInit {

  issues: any[] = [];
  filteredIssues: any[] = [];

  loading = true;
  processing = false;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedStatus = 'all';

  selectedIssue: any = null;
  showDetails = false;

  resolutionNote = '';
  selectedNewStatus = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadIssues();
  }

  // ================= LOAD ISSUES =================

  loadIssues(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getAdminDamageIssues().subscribe({
      next: (response: any) => {

        this.issues = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.sortIssues();
        this.applyFilters();

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Admin damage issues loading error:', error);

        this.issues = [];
        this.filteredIssues = [];

        this.loading = false;
        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to load damage issues. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }

  // ================= SORT =================

  sortIssues(): void {
    this.issues.sort((a: any, b: any) => {

      const dateA = a.created_at
        ? new Date(a.created_at).getTime()
        : 0;

      const dateB = b.created_at
        ? new Date(b.created_at).getTime()
        : 0;

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return Number(a.id || 0) - Number(b.id || 0);
    });
  }

  // ================= FILTER =================

  applyFilters(): void {

    const search = this.searchText.trim().toLowerCase();

    this.filteredIssues = this.issues.filter((issue: any) => {

      const customerName =
        issue.customer_name ||
        issue.customer?.username ||
        '';

      const equipmentName =
        issue.equipment_name ||
        '';

      const issueType =
        this.getIssueTypeLabel(issue.issue_type);

      const matchesSearch =
        !search ||
        String(issue.id || '').includes(search) ||
        String(issue.damage_report_id || '').includes(search) ||
        customerName.toLowerCase().includes(search) ||
        equipmentName.toLowerCase().includes(search) ||
        issueType.toLowerCase().includes(search) ||
        String(issue.description || '').toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'all' ||
        String(issue.status || '').toLowerCase() ===
        this.selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }

  // ================= SEARCH =================

  onSearch(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  // ================= STATISTICS =================

  get totalIssues(): number {
    return this.issues.length;
  }

  get pendingIssues(): number {
    return this.issues.filter(
      issue => issue.status === 'pending'
    ).length;
  }

  get reviewedIssues(): number {
    return this.issues.filter(
      issue => issue.status === 'reviewed'
    ).length;
  }

  get resolvedIssues(): number {
    return this.issues.filter(
      issue => issue.status === 'resolved'
    ).length;
  }

  get rejectedIssues(): number {
    return this.issues.filter(
      issue => issue.status === 'rejected'
    ).length;
  }

  // ================= DETAILS =================

  openDetails(issue: any): void {

    this.selectedIssue = issue;

    this.selectedNewStatus = issue.status || 'pending';

    this.resolutionNote =
      issue.resolution_note || '';

    this.errorMessage = '';
    this.successMessage = '';

    this.showDetails = true;

    document.body.style.overflow = 'hidden';
  }

  closeDetails(): void {

    if (this.processing) {
      return;
    }

    this.showDetails = false;
    this.selectedIssue = null;
    this.resolutionNote = '';
    this.selectedNewStatus = '';

    document.body.style.overflow = '';
  }

  // ================= UPDATE STATUS =================

  updateStatus(): void {

    if (!this.selectedIssue) {
      return;
    }

    const newStatus = this.selectedNewStatus;

    if (!newStatus) {
      this.errorMessage = 'Please select a status.';
      return;
    }

    if (
      this.selectedIssue.status === 'resolved' &&
      newStatus !== 'resolved'
    ) {
      this.errorMessage =
        'A resolved issue cannot be changed.';
      return;
    }

    if (
      this.selectedIssue.status === 'rejected' &&
      newStatus !== 'rejected'
    ) {
      this.errorMessage =
        'A rejected issue cannot be changed.';
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.updateAdminDamageIssueStatus(
      this.selectedIssue.id,
      newStatus,
      this.resolutionNote.trim()
    ).subscribe({

      next: (response: any) => {

        const index = this.issues.findIndex(
          issue => issue.id === this.selectedIssue.id
        );

        if (index !== -1) {

          this.issues[index] = {
            ...this.issues[index],
            ...(response || {}),
            status: newStatus,
            resolution_note: this.resolutionNote.trim()
          };

          this.selectedIssue = this.issues[index];
        }

        this.sortIssues();
        this.applyFilters();

        this.processing = false;
        this.successMessage =
          'Issue status updated successfully.';

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Damage issue status update error:',
          error
        );

        this.processing = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to update issue status.';

        this.cdr.detectChanges();
      }
    });
  }

  // ================= HELPERS =================

  getCustomerName(issue: any): string {

    if (issue.customer_name) {
      return issue.customer_name;
    }

    if (issue.customer) {

      const fullName =
        `${issue.customer.first_name || ''} ${issue.customer.last_name || ''}`
          .trim();

      return fullName ||
        issue.customer.username ||
        'Unknown Customer';
    }

    return 'Unknown Customer';
  }

  getEquipmentName(issue: any): string {

    return issue.equipment_name ||
      'Unknown Equipment';
  }

  getIssueTypeLabel(type: string): string {

    const labels: any = {
      incorrect_damage: 'Incorrect Damage Amount',
      not_caused: 'I Did Not Cause This Damage',
      already_damaged: 'Item Was Already Damaged',
      incorrect_deposit: 'Incorrect Deposit Deduction',
      other: 'Other'
    };

    return labels[type] || type || 'Unknown';
  }

  getStatusLabel(status: string): string {

    const labels: any = {
      pending: 'Pending',
      reviewed: 'Reviewed',
      resolved: 'Resolved',
      rejected: 'Rejected'
    };

    return labels[status] || status || 'Unknown';
  }

  getStatusClass(status: string): string {

    switch (status?.toLowerCase()) {

      case 'pending':
        return 'status-pending';

      case 'reviewed':
        return 'status-reviewed';

      case 'resolved':
        return 'status-resolved';

      case 'rejected':
        return 'status-rejected';

      default:
        return 'status-default';
    }
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