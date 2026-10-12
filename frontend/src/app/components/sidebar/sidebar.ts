import { Component } from '@angular/core';
import { RouterLink,RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink,RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  userRole = localStorage.getItem('userRole') ?? 'customer';
  customerMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-grid-1x2-fill',
      route: '/customer'
    },
    
    {
      label: 'Equipment',
      icon: 'bi-camera',
      route: '/equipment'
    },
    {
      label: 'Bookings',
      icon: 'bi-calendar-check',
      route: '/bookings'
    },
    {
      label: 'Payments',
      icon: 'bi-credit-card',
      route: '/payments'
    },
    {
      label: 'Damage Reports',
      icon: 'bi-exclamation-triangle',
      route: '/damage-reports'
    }
  ];

  vendorMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-grid-1x2-fill',
      route: '/vendor'
    },
    {
      label: 'My Equipment',
      icon: 'bi-camera',
      route: '/vendor/equipment'
    },
    {
      label: 'Bookings',
      icon: 'bi-calendar-check',
      route: '/vendor/bookings'
    },
    {
      label: 'Payments',
      icon: 'bi-credit-card',
      route: '/vendor/payments'
    },
    {
      label: 'Damage Reports',
      icon: 'bi-exclamation-triangle',
      route: '/vendor/damage-reports'
    }
    
  ];

  adminMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      route: '/admin'
    },
    {
      label: 'Users',
      icon: 'bi-people',
      route: '/admin/users'
    },
    {
      label: 'Equipment',
      icon: 'bi-camera',
      route: '/admin/equipment'
    },
    {
      label: 'Bookings',
      icon: 'bi-calendar-check',
      route: '/admin/bookings'
    },
    {
      label: 'Payments',
      icon: 'bi-credit-card',
      route: '/admin/payments'
    },
    {
      label: 'Damage Reports',
      icon: 'bi-exclamation-triangle',
      route: '/admin/damage-reports'
    },
    {
    label: 'Damage Issues',
    icon: 'bi-exclamation-circle',
    route: '/admin/damage-issues'
    },
    {
    label: 'Notifications',
    icon: 'bi-bell',
    route: '/admin/notifications'
    },
    {
    label: 'Vendor Requests',
    icon: 'bi-person-check',
    route: '/admin/vendor-requests'
    },
    {
    label: 'Settings',
    icon: 'bi-gear',
    route: '/admin/settings'
    }
  ];

  operationsMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      route: '/operations'
    },
    {
      label: 'Equipment Workflow',
      icon: 'bi-arrow-left-right',
      route: '/operations/workflow'
    }
  ];

  maintenanceMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      route: '/maintenance'
    },
    {
      label: 'Maintenance Reports',
      icon: 'bi-tools',
      route: '/maintenance/reports'
    }
  ];




  get menuItems(): MenuItem[] {
    if (this.userRole === 'admin') {
      return this.adminMenu;
    }

    if (this.userRole === 'vendor') {
      return this.vendorMenu;
    }

    if (this.userRole === 'operations_staff') {
      return this.operationsMenu;
    }

    if (this.userRole === 'maintenance_staff') {
      return this.maintenanceMenu;
    }

    return this.customerMenu;
  }
}
