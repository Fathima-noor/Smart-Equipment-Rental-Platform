import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ApiService } from '../../services/api';
import { ThemeService } from '../../services/theme.service';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {

  user: any = null;

  userName = 'User';
  userRole = '';

  notifications: any[] = [];
  notificationCount = 0;

  loadingUser = false;
  loadingNotifications = false;

  constructor(
    private api: ApiService,
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadNotifications();

  }

  loadCurrentUser(): void {

    

    this.loadingUser = true;

    /*
     * First try to use the currently saved user.
     */
    const savedUser = localStorage.getItem('user');

    if (savedUser) {

      try {

        this.user = JSON.parse(savedUser);

        this.setUserDetails(this.user);

      } catch (error) {

        console.error(
          'Invalid saved user data:',
          error
        );

        localStorage.removeItem('user');
      }
    }

    /*
     * Always get the current user from Django.
     * This prevents an old customer's name from
     * appearing when another user logs in.
     */
    if (this.auth.isLoggedIn()) {

      this.api.getProfile().subscribe({

        next: (response: any) => {

          console.log(
            'Current logged-in user:',
            response
          );

          this.user = response;

          localStorage.setItem(
            'user',
            JSON.stringify(response)
          );

          this.setUserDetails(response);

          this.loadingUser = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Unable to load current user:',
            error
          );

          this.loadingUser = false;

          /*
           * If the profile API fails but we already
           * have saved user information, keep it.
           */
          this.cdr.detectChanges();
        }

      });

    } else {

      this.loadingUser = false;
    }
  }

  setUserDetails(user: any): void {

    if (!user) {
      this.userName = 'User';
      this.userRole = '';
      return;
    }

    /*
     * Create full name from first_name + last_name.
     */
    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`
        .trim();

    /*
     * Show full name first.
     * If full name is unavailable, show username.
     */
    this.userName =
      fullName ||
      user.username ||
      'User';

    this.userRole =
      user.role ||
      '';
  }

  getDisplayRole(): string {

    if (!this.userRole) {
      return '';
    }

    return this.userRole
      .charAt(0)
      .toUpperCase() +
      this.userRole.slice(1);
  }

  getInitial(): string {

    if (!this.userName) {
      return 'U';
    }

    return this.userName
      .charAt(0)
      .toUpperCase();
  }

  goToProfile(): void {

    /*
     * Profile page can be added later.
     * For now, route according to the logged-in role.
     */

    if (this.userRole === 'vendor') {
      this.router.navigate(['/vendor']);
      return;
    }

    if (this.userRole === 'admin') {
      this.router.navigate(['/admin']);
      return;
    }

    this.router.navigate(['/customer']);
  }

  goToDashboard(): void {

    if (this.userRole === 'vendor') {

      this.router.navigate(['/vendor']);

    } else if (this.userRole === 'admin') {

      this.router.navigate(['/admin']);

    } else {

      this.router.navigate(['/customer']);
    }
  }
  setLightTheme(): void {
  this.themeService.setLightTheme();
  }

  setDarkTheme(): void {
  this.themeService.setDarkTheme();
  }

  logout(): void {

  this.auth.logout();

  this.user = null;
  this.userName = 'User';
  this.userRole = '';

  this.notifications = [];
  this.notificationCount = 0;

  this.router.navigate(['/login']);
}


  loadNotifications(): void {

  this.loadingNotifications = true;

  this.api.getNotifications().subscribe({

    next: (response: any) => {

      console.log(
        'Notifications:',
        response
      );

      this.notifications = Array.isArray(response)
        ? response
        : (response?.results || []);

      this.updateNotificationCount();

      this.loadingNotifications = false;

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Notifications loading error:',
        error
      );

      this.notifications = [];

      this.notificationCount = 0;

      this.loadingNotifications = false;

      this.cdr.detectChanges();
    }
  });
}
  updateNotificationCount(): void {

  this.notificationCount =
    this.notifications.filter(
      notification => !notification.is_read
    ).length;
}

  readNotification(notification: any): void {

  if (!notification?.id) {
    return;
  }

  if (notification.is_read) {
    return;
  }

  this.api.markNotificationAsRead(
    notification.id
  ).subscribe({

    next: () => {

      notification.is_read = true;

      this.updateNotificationCount();

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Unable to mark notification as read:',
        error
      );
    }
  });
}

  markAllAsRead(): void {

  if (this.notificationCount === 0) {
    return;
  }

  this.api.markAllNotificationsAsRead().subscribe({

    next: () => {

      this.notifications.forEach(
        notification => {
          notification.is_read = true;
        }
      );

      this.notificationCount = 0;

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Unable to mark notifications as read:',
        error
      );
    }
  });
}

viewAllNotifications(): void {
  this.router.navigate(['/notifications']);
}

}