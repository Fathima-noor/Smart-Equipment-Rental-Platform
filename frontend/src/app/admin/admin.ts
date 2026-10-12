import { Component, DestroyRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink} from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../services/api';
import { ThemeService } from '../services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStateService } from '../services/booking-state';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
    
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {

  sidebarOpen = false;

  /* ======================================================
     MAIN STATISTICS
  ====================================================== */
  todayDate: string = new Date().toISOString().split('T')[0];
  totalUsers = 0;
  totalEquipment = 0;
  equipmentCategoryCounts = {
  camera: 0,
  laptop: 0,
  projector: 0,
  drone: 0
};
  totalBookings = 0;
  totalRevenue = 0;

  totalDamageReports = 0;
  totalDamageIssues = 0;
  totalNotifications = 0;

  /* ======================================================
     BOOKING STATISTICS
  ====================================================== */

  pendingBookings = 0;
  approvedBookings = 0;
  completedBookings = 0;
  bookings: any[] = [];

  /* ======================================================
     NOTIFICATION STATISTICS
  ====================================================== */

  unreadNotifications = 0;

  /* ======================================================
     DAMAGE STATISTICS
  ====================================================== */

  pendingDamageReports = 0;
  pendingDamageIssues = 0;

  /* ======================================================
     RECENT ACTIVITY
  ====================================================== */

  recentActivities: any[] = [];
  monthlyOverview: any[] = [];

  /* ======================================================
     LOADING / ERROR
  ====================================================== */

  loading = true;
  errorMessage = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
    private bookingState: BookingStateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.bookingState.bookingChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(change => {
        this.bookings = this.bookingState.applyChange(
          this.bookings,
          change
        );
        this.updateBookingCounts();

        const status =
          change.booking['status'] ||
          change.booking['equipment_workflow_status'] ||
          change.booking['payment_status'];
        const activity = {
          bookingId: change.booking['id'],
          type: 'booking',
          icon: 'bi-calendar-check',
          title: change.created ? 'New booking' : 'Booking updated',
          description: change.created
            ? `Booking #${change.booking['id']} was created.`
            : `Booking #${change.booking['id']} is now ${String(status || 'updated').replace(/_/g, ' ')}.`,
          date: new Date()
        };

        this.recentActivities = [
          activity,
          ...this.recentActivities.filter(
            item => item.bookingId !== activity.bookingId
          )
        ].slice(0, 6);

        this.cdr.detectChanges();
      });

    this.loadDashboardData();
  }

  /* ======================================================
     LOAD DASHBOARD DATA
  ====================================================== */

  loadDashboardData(): void {

    this.loading = true;
    this.errorMessage = '';

    forkJoin({

      users: this.api.getAdminUsers(),

      equipment: this.api.getAdminEquipment(),

      bookings: this.api.getAdminBookings(),

      payments: this.api.getAdminPayments(),

      damageReports: this.api.getAdminDamageReports(),

      damageIssues: this.api.getAdminDamageIssues(),

      notifications: this.api.getAdminNotifications()

    }).subscribe({

      next: (response: any) => {

        /* ==================================================
           USERS
        ================================================== */

        const users = this.getArray(response.users);

        this.totalUsers = users.length;


        /* ==================================================
           EQUIPMENT
        ================================================== */

        const equipment = this.getArray(response.equipment);

       this.totalEquipment = equipment.length;

       this.equipmentCategoryCounts = {
       camera: equipment.filter(
       (item: any) => item.category?.toLowerCase() === 'camera'
       ).length,

      laptop: equipment.filter(
      (item: any) => item.category?.toLowerCase() === 'laptop'
       ).length,

      projector: equipment.filter(
     (item: any) => item.category?.toLowerCase() === 'projector'
     ).length,

     drone: equipment.filter(
     (item: any) => item.category?.toLowerCase() === 'drone'
     ).length
     };


        /* ==================================================
           BOOKINGS
        ================================================== */

        this.bookings = this.getArray(response.bookings);
        this.updateBookingCounts();


        /* ==================================================
           PAYMENTS / REVENUE
        ================================================== */

        const payments = this.getArray(response.payments);

        this.totalRevenue = payments
          .filter(
            (payment: any) =>
              payment.payment_status?.toLowerCase() === 'paid'
          )
          .reduce(
            (total: number, payment: any) =>
              total + Number(payment.total_amount || 0),
            0
          );


        /* ==================================================
           DAMAGE REPORTS
        ================================================== */

        const damageReports =
          this.getArray(response.damageReports);

        this.totalDamageReports = damageReports.length;

        this.pendingDamageReports = damageReports.filter(
          (report: any) =>
            report.status?.toLowerCase() === 'reported'
        ).length;


        /* ==================================================
           DAMAGE ISSUES
        ================================================== */

        const damageIssues =
          this.getArray(response.damageIssues);

        this.totalDamageIssues = damageIssues.length;

        this.pendingDamageIssues = damageIssues.filter(
          (issue: any) =>
            issue.status?.toLowerCase() === 'pending'
        ).length;


        /* ==================================================
           NOTIFICATIONS
        ================================================== */

        const notifications =
          this.getArray(response.notifications);

        this.totalNotifications = notifications.length;

        this.unreadNotifications =
          notifications.filter(
            (notification: any) =>
              !notification.is_read
          ).length;


        /* ==================================================
           RECENT ACTIVITY
        ================================================== */

          const bookings = this.bookings;

        this.buildRecentActivities(
          users,
          bookings,
          payments,
          damageReports,
          damageIssues
        );

        this.buildMonthlyOverview(bookings, payments);


        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Admin dashboard loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load dashboard data. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }


  /* ======================================================
     CONVERT API RESPONSE TO ARRAY
  ====================================================== */

  getArray(response: any): any[] {

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.results)) {
      return response.results;
    }

    return [];
  }

  private updateBookingCounts(): void {
    this.totalBookings = this.bookings.length;
    this.pendingBookings = this.bookings.filter(
      booking => booking.status?.toLowerCase() === 'pending'
    ).length;
    this.approvedBookings = this.bookings.filter(
      booking => booking.status?.toLowerCase() === 'approved'
    ).length;
    this.completedBookings = this.bookings.filter(
      booking => booking.status?.toLowerCase() === 'completed'
    ).length;
  }


  /* ======================================================
     RECENT ACTIVITY
  ====================================================== */

  buildRecentActivities(
    users: any[],
    bookings: any[],
    payments: any[],
    damageReports: any[],
    damageIssues: any[]
  ): void {

    const activities: any[] = [];


    /* USERS */

    users.forEach((user: any) => {

      if (!user.created_at) {
        return;
      }

      activities.push({

        type: 'user',

        icon: 'bi-person-plus',

        title: 'New user registered',

        description:
          `${this.getUserName(user)} joined the platform.`,

        date: new Date(user.created_at)

      });

    });


    /* BOOKINGS */

    bookings.forEach((booking: any) => {

      if (!booking.created_at) {
        return;
      }

      activities.push({

        type: 'booking',
        bookingId: booking.id,

        icon: 'bi-calendar-check',

        title: 'New booking',

        description:
          `Booking #${booking.id} was created.`,

        date: new Date(booking.created_at)

      });

    });


    /* PAYMENTS */

    payments.forEach((payment: any) => {

      if (!payment.payment_date) {
        return;
      }

      activities.push({

        type: 'payment',

        icon: 'bi-credit-card',

        title: 'Payment received',

        description:
          `Payment for ${payment.booking_equipment || 'equipment'} was recorded.`,

        date: new Date(payment.payment_date)

      });

    });


    /* DAMAGE REPORTS */

    damageReports.forEach((report: any) => {

      if (!report.created_at) {
        return;
      }

      activities.push({

        type: 'damage',

        icon: 'bi-exclamation-triangle',

        title: 'Damage report created',

        description:
          `Damage report #${report.id} was created.`,

        date: new Date(report.created_at)

      });

    });


    /* DAMAGE ISSUES */

    damageIssues.forEach((issue: any) => {

      if (!issue.created_at) {
        return;
      }

      activities.push({

        type: 'issue',

        icon: 'bi-exclamation-circle',

        title: 'Customer issue submitted',

        description:
          `Issue #${issue.id} was submitted.`,

        date: new Date(issue.created_at)

      });

    });


    /* SORT NEWEST FIRST */

    activities.sort(
      (a: any, b: any) =>
        b.date.getTime() - a.date.getTime()
    );


    /* SHOW ONLY LATEST 6 */

    this.recentActivities =
      activities.slice(0, 6);
  }


  /* ======================================================
     USER NAME
  ====================================================== */

  getUserName(user: any): string {

    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`
        .trim();

    return (
      fullName ||
      user.username ||
      'User'
    );
  }


  /* ======================================================
     ACTIVITY DATE
  ====================================================== */

  formatActivityDate(date: Date): string {

    if (!date) {
      return '';
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  /* ======================================================
     QUICK NAVIGATION
  ====================================================== */
  goToDashboard(): void {
  this.router.navigate(['/admin']);
  }


  goToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  goToEquipment(): void {
    this.router.navigate(['/admin/equipment']);
  }

  goToBookings(): void {
    this.router.navigate(['/admin/bookings']);
  }

  goToPayments(): void {
    this.router.navigate(['/admin/payments']);
  }

  goToDamageReports(): void {
    this.router.navigate(['/admin/damage-reports']);
  }

  goToDamageIssues(): void {
    this.router.navigate(['/admin/damage-issues']);
  }

  goToNotifications(): void {
    this.router.navigate(['/admin/notifications']);
  }


  /* ======================================================
     SIDEBAR
  ====================================================== */

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }


  closeSidebar(): void {
    this.sidebarOpen = false;
  }
  setLightTheme(): void {
    this.themeService.setLightTheme();
}

  setDarkTheme(): void {
    this.themeService.setDarkTheme();
}

 buildMonthlyOverview(bookings: any[], payments: any[]) {
  const months = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - i,
      1
    );

    const monthName = date.toLocaleString('en-US', {
      month: 'short'
    });

    const year = date.getFullYear();
    const month = date.getMonth();

    const monthlyBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.created_at);

      return (
        bookingDate.getFullYear() === year &&
        bookingDate.getMonth() === month
      );
    });

    const monthlyPayments = payments.filter((payment: any) => {
  const paymentDate = new Date(
    payment.payment_date || payment.created_at
  );

  const paymentStatus = (
    payment.payment_status || payment.status || ''
  ).toLowerCase();

  return (
    paymentDate.getFullYear() === year &&
    paymentDate.getMonth() === month &&
    paymentStatus === 'paid'
  );
});

    const revenue = monthlyPayments.reduce(
  (total: number, payment: any) =>
    total + Number(
      payment.total_amount || payment.amount || 0
    ),
  0
);

    months.push({
      month: monthName,
      bookings: monthlyBookings.length,
      revenue: revenue,
      bookingHeight: monthlyBookings.length,
      revenueHeight: revenue
    });
  }

  const maxBookings = Math.max(
    ...months.map((item: any) => item.bookings),
    1
  );

  const maxRevenue = Math.max(
    ...months.map((item: any) => item.revenue),
    1
  );

  this.monthlyOverview = months.map((item: any) => ({
    ...item,
    bookingHeight: (item.bookings / maxBookings) * 100,
    revenueHeight: (item.revenue / maxRevenue) * 100
  }));
}

}