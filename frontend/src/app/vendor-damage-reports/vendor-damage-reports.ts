import { 
  Component, 
  OnInit, 
  ChangeDetectorRef 
} from '@angular/core'; 
 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
 
import { ApiService } from '../services/api'; 
 
@Component({ 
  selector: 'app-vendor-damage-reports', 
  imports: [ 
    CommonModule, 
    FormsModule 
  ], 
  templateUrl: './vendor-damage-reports.html', 
  styleUrl: './vendor-damage-reports.css' 
}) 
export class VendorDamageReports implements OnInit { 
 
  Number = Number; 
 
  reports: any[] = []; 
  filteredReports: any[] = []; 
 
  issues: any[] = []; 
  filteredIssues: any[] = []; 
 
  processingIssueId: number | null = null; 
 
  selectedIssueStatus = 'all'; 
  issueSearchText = ''; 
 
  showIssueResolutionForm = false; 
  selectedIssue: any = null; 
 
  resolutionNote = ''; 
  issueAction = ''; 
 
  processingIssue = false; 
  issueError = ''; 
 
  loading = true; 
 
  errorMessage = ''; 
  successMessage = ''; 
 
  searchText = ''; 
  selectedStatus = 'all'; 
 
  constructor( 
    private api: ApiService, 
    private cdr: ChangeDetectorRef 
  ) {} 
 
  ngOnInit(): void { 
    this.loadData(); 
  } 
 
  loadData(): void { 
 
    this.loading = true; 
    this.errorMessage = ''; 
 
    this.api.getDamageReports().subscribe({ 
      next: (response: any) => { 
 
        console.log('Damage reports:', response); 
 
        this.reports = Array.isArray(response) 
          ? response 
          : (response?.results || []); 
 
        this.applyFilters(); 
 
        this.loading = false; 
 
        this.loadIssues(); 
 
        this.cdr.detectChanges(); 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Damage reports loading error:', 
          error 
        ); 
 
        this.loading = false; 
 
        this.errorMessage = 
          this.getApiErrorMessage(error) || 
          'Unable to load damage reports.'; 
 
        this.cdr.detectChanges(); 
 
      } 
    }); 
 
  } 
 
 
  // ========================================= 
  // LOAD CUSTOMER ISSUES 
  // ========================================= 
 
  loadIssues(): void { 
 
    this.api.getDamageIssues().subscribe({ 
 
      next: (response: any) => { 
 
        console.log('Damage issues:', response); 
 
        this.issues = Array.isArray(response) 
          ? response 
          : (response?.results || []); 
 
        this.applyIssueFilters(); 
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Damage issues loading error:', 
          error 
        ); 
 
        this.issues = []; 
        this.filteredIssues = []; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 
 
  // ========================================= 
  // FILTER CUSTOMER ISSUES 
  // ========================================= 
 
  applyIssueFilters(): void { 
 
    const search = 
      this.issueSearchText.trim().toLowerCase(); 
 
    this.filteredIssues = this.issues.filter( 
      (issue: any) => { 
 
        const matchesSearch = 
          !search || 
          String(issue.id).includes(search) || 
          String(issue.damage_report).includes(search) || 
          issue.customer_name 
            ?.toLowerCase() 
            .includes(search) || 
          issue.equipment_name 
            ?.toLowerCase() 
            .includes(search) || 
          issue.description 
            ?.toLowerCase() 
            .includes(search); 
 
        const matchesStatus = 
          this.selectedIssueStatus === 'all' || 
          issue.status?.toLowerCase() === 
          this.selectedIssueStatus.toLowerCase(); 
 
        return matchesSearch && matchesStatus; 
 
      } 
    ); 
 
  } 
 
 
  // ========================================= 
  // ISSUE STATUS CLASS 
  // ========================================= 
 
  getIssueStatusClass(status: string): string { 
 
    switch (status?.toLowerCase()) { 
 
      case 'pending': 
        return 'text-bg-warning'; 
 
      case 'reviewed': 
        return 'text-bg-info'; 
 
      case 'resolved': 
        return 'text-bg-success'; 
 
      case 'rejected': 
        return 'text-bg-danger'; 
 
      default: 
        return 'text-bg-secondary'; 
 
    } 
 
  } 
 
 
  // ========================================= 
  // ISSUE STATUS TEXT 
  // ========================================= 
 
  formatIssueStatus(status: string): string { 
 
    if (!status) { 
      return 'Unknown'; 
    } 
 
    switch (status.toLowerCase()) { 
 
      case 'pending': 
        return 'Pending'; 
 
      case 'reviewed': 
        return 'Under Review'; 
 
      case 'resolved': 
        return 'Resolved'; 
 
      case 'rejected': 
        return 'Rejected'; 
 
      default: 
        return this.formatStatus(status); 
 
    } 
 
  } 
 
 
  // ========================================= 
  // REVIEW ISSUE 
  // ========================================= 
 
  reviewIssue(issue: any): void { 
 
    if (!issue?.id) { 
      return; 
    } 
 
    this.updateIssueStatus( 
      issue, 
      'reviewed' 
    ); 
 
  } 
 
 
  // ========================================= 
  // OPEN ISSUE RESOLUTION 
  // ========================================= 
 
  openIssueAction( 
    issue: any, 
    action: string 
  ): void { 
 
    if (!issue?.id) { 
      return; 
    } 
 
    this.selectedIssue = issue; 
    this.issueAction = action; 
    this.resolutionNote = ''; 
    this.issueError = ''; 
 
    this.showIssueResolutionForm = true; 
 
  } 
 
 
  // ========================================= 
  // CLOSE ISSUE RESOLUTION 
  // ========================================= 
 
  closeIssueResolutionForm(): void { 
 
    if (this.processingIssue) { 
      return; 
    } 
 
    this.showIssueResolutionForm = false; 
    this.selectedIssue = null; 
    this.resolutionNote = ''; 
    this.issueAction = ''; 
    this.issueError = ''; 
 
  } 
 
 
  // ========================================= 
  // UPDATE ISSUE STATUS 
  // ========================================= 
 
  updateIssueStatus( 
    issue: any, 
    status: string, 
    resolutionNote: string = '' 
  ): void { 
 
    if (!issue?.id) { 
      return; 
    } 
 
    this.processingIssueId = issue.id; 
 
    this.errorMessage = ''; 
    this.successMessage = ''; 
 
    this.api.updateDamageIssueStatus( 
      issue.id, 
      status, 
      resolutionNote 
    ).subscribe({ 
 
      next: (response: any) => { 
 
        console.log( 
          'Damage issue updated:', 
          response 
        ); 
 
        Object.assign(issue, response); 
 
        this.processingIssueId = null; 
 
        this.applyIssueFilters(); 
 
        this.successMessage = 
          `Issue #${issue.id} marked as ${this.formatIssueStatus(status)}.`; 
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Damage issue status error:', 
          error 
        ); 
 
        this.processingIssueId = null; 
 
        this.errorMessage = 
          this.getApiErrorMessage(error) || 
          'Unable to update the issue.'; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 
 
  // ========================================= 
  // SAVE ISSUE ACTION 
  // ========================================= 
 
  saveIssueAction(): void { 
 
    this.issueError = ''; 
 
    if (!this.selectedIssue?.id) { 
 
      this.issueError = 
        'Issue could not be identified.'; 
 
      return; 
 
    } 
 
    if (!this.resolutionNote.trim()) { 
 
      this.issueError = 
        'Please enter a resolution note.'; 
 
      return; 
 
    } 
 
    this.processingIssue = true; 
 
    const status = 
      this.issueAction === 'resolve' 
        ? 'resolved' 
        : 'rejected'; 
 
    this.api.updateDamageIssueStatus( 
      this.selectedIssue.id, 
      status, 
      this.resolutionNote.trim() 
    ).subscribe({ 
 
      next: (response: any) => { 
 
        Object.assign( 
          this.selectedIssue, 
          response 
        ); 
 
        this.processingIssue = false; 
 
        this.showIssueResolutionForm = false; 
 
        this.successMessage = 
          status === 'resolved' 
            ? 'Customer issue resolved successfully.' 
            : 'Customer issue rejected successfully.'; 
 
        this.selectedIssue = null; 
        this.resolutionNote = ''; 
        this.issueAction = ''; 
 
        this.applyIssueFilters(); 
 
        this.cdr.detectChanges(); 
 
      }, 
 
      error: (error) => { 
 
        console.error( 
          'Issue action error:', 
          error 
        ); 
 
        this.processingIssue = false; 
 
        this.issueError = 
          this.getApiErrorMessage(error) || 
          'Unable to update the issue.'; 
 
        this.cdr.detectChanges(); 
 
      } 
 
    }); 
 
  } 
 
 
  // ========================================= 
  // FILTER DAMAGE REPORTS 
  // ========================================= 
 
  applyFilters(): void { 
 
    const search = this.searchText 
      .trim() 
      .toLowerCase(); 
 
    this.filteredReports = this.reports.filter( 
      (report: any) => { 
 
        const matchesSearch = 
          !search || 
          String(report.id).includes(search) || 
          String(report.booking).includes(search) || 
          report.description 
            ?.toLowerCase() 
            .includes(search); 
 
        const matchesStatus = 
          this.selectedStatus === 'all' || 
          report.status?.toLowerCase() === 
          this.selectedStatus.toLowerCase(); 
 
        return matchesSearch && matchesStatus; 
 
      } 
    ); 
 
  } 
 
 
  // ========================================= 
  // REPORT COUNTS 
  // ========================================= 
 
  getTotalReports(): number { 
 
    return this.reports.length; 
 
  } 
 
 
  getReportedCount(): number { 
 
    return this.reports.filter( 
      report => 
        report.status?.toLowerCase() === 'reported' 
    ).length; 
 
  } 
 
 
  getReviewedCount(): number { 
 
    return this.reports.filter( 
      report => 
        report.status?.toLowerCase() === 'reviewed' 
    ).length; 
 
  } 
 
 
  getResolvedCount(): number { 
 
    return this.reports.filter( 
      report => 
        report.status?.toLowerCase() === 'resolved' 
    ).length; 
 
  } 
 
 
  getTotalDamage(): number { 
 
    return this.reports.reduce( 
      (total, report) => 
        total + Number(report.damage_amount || 0), 
      0 
    ); 
 
  } 
 
 
  // ========================================= 
  // REPORT STATUS CLASS 
  // ========================================= 
 
  getStatusClass(status: string): string { 
 
    switch (status?.toLowerCase()) { 
 
      case 'reported': 
        return 'text-bg-warning'; 
 
      case 'reviewed': 
        return 'text-bg-info'; 
 
      case 'resolved': 
        return 'text-bg-success'; 
 
      default: 
        return 'text-bg-secondary'; 
 
    } 
 
  } 
 
 
  // ========================================= 
  // FORMAT STATUS 
  // ========================================= 
 
  formatStatus(status: string): string { 
 
    if (!status) { 
      return 'Unknown'; 
    } 
 
    return status 
      .charAt(0).toUpperCase() + 
      status.slice(1); 
 
  } 
 
 
  // ========================================= 
  // FORMAT AMOUNT 
  // ========================================= 
 
  formatAmount(amount: any): string { 
 
    return Number(amount || 0).toLocaleString( 
      'en-IN', 
      { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      } 
    ); 
 
  } 
 
 
  // ========================================= 
  // API ERROR MESSAGE 
  // ========================================= 
 
  getApiErrorMessage(error: any): string { 
 
    if (!error?.error) { 
      return ''; 
    } 
 
    if (typeof error.error === 'string') { 
      return error.error; 
    } 
 
    if (error.error.detail) { 
      return error.error.detail; 
    } 
 
    const values = Object.values( 
      error.error 
    ); 
 
    return values 
      .flat() 
      .join(' '); 
 
  } 
 
} 