import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Register } from './register/register';
import { Login } from './login/login';
import { Customer } from './customer/customer';
import { Vendor } from './vendor/vendor';
import { Admin } from './admin/admin';
import { Equipment } from './equipment/equipment';
import { DashboardLayout } from './components/dashboard-layout/dashboard-layout';
import { EquipmentDetails } from './equipment-details/equipment-details';
import { Bookings } from './bookings/bookings';
import { Payments } from './payments/payments';
import { DamageReports } from './damage-reports/damage-reports';
import { VendorEquipment } from './vendor-equipment/vendor-equipment';
import { VendorBookings } from './vendor-bookings/vendor-bookings';
import { VendorDamageReports } from './vendor-damage-reports/vendor-damage-reports';
import { AdminUsers } from './admin-users/admin-users';
import { AdminEquipment } from './admin-equipment/admin-equipment';
import { AdminBookings } from './admin-bookings/admin-bookings';
import { AdminPayments } from './admin-payments/admin-payments';
import { AdminDamageReports } from './admin-damage-reports/admin-damage-reports';
import { AdminDamageIssues } from './admin-damage-issues/admin-damage-issues';
import { AdminNotifications } from './admin-notifications/admin-notifications';
import { AdminSettings } from './admin-settings/admin-settings';
import { VendorRequest } from './vendor-request/vendor-request';
import { AdminVendorRequests } from './admin-vendor-requests/admin-vendor-requests';

import { Operations } from './operations/operations';
import { OperationsWorkflow } from './operations-workflow/operations-workflow';
import { Maintenance } from './maintenance/maintenance';
import { MaintenanceReports } from './maintenance-reports/maintenance-reports';
import { VendorPaymentsComponent } from './vendor-payments/vendor-payments';
export const routes: Routes = [

  {
    path: '',
    component: Home,
    pathMatch: 'full'
  },

  {
  path: 'register',
  component: Register
  },

  { path: 'login', 
    component: Login },

  {
    path: 'customer',
    component: DashboardLayout,
    children: [
      { path: '', component: Customer }
    ]
  },
  {
  path: 'vendor-request',
  component: VendorRequest
  },

  {
    path: 'equipment',
    component: DashboardLayout,
    children: [
      { path: '', component: Equipment },
      { path: ':id', component: EquipmentDetails }
    ]
  },
  {
  path: 'bookings',
  component: DashboardLayout,
  children: [
    { path: '', component: Bookings }
  ]
},
  {
    path:'payments',
    component:DashboardLayout,
    children:[
      {path :'',component:Payments}
    ]
  },
  {
  path: 'damage-reports',
  component: DashboardLayout,
  children: [
    {
      path: '',
      component: DamageReports
    }
  ]
},

  {
  path: 'vendor',
  component: DashboardLayout,
  children: [
    {
      path: '',
      component: Vendor
    },
    {
      path: 'equipment',
      component: VendorEquipment
    },
    {
      path: 'bookings',
      component: VendorBookings
    },
    {
  path: 'damage-reports',
  component: VendorDamageReports
   },
   {
  path: 'payments',
  component: VendorPaymentsComponent
   }
  ]
},

  {
    path: 'operations',
    component: DashboardLayout,
    children: [
      { path: '', component: Operations },
      { path: 'workflow', component: OperationsWorkflow }
    ]
  },


  {
    path: 'maintenance',
    component: DashboardLayout,
    children: [
      { path: '', component: Maintenance },
      { path: 'reports', component: MaintenanceReports }
    ]
  },  




  {
    path: 'admin',
    component: DashboardLayout,
    children: [
      { path: '', component: Admin },
      { path: 'users', component: AdminUsers },
      { path: 'equipment', component: AdminEquipment },
      { path: 'bookings',  component:AdminBookings},
      { path: 'payments', component: AdminPayments },
      { path: 'damage-reports', component: AdminDamageReports },
      { path: 'damage-issues', component: AdminDamageIssues },
      { path: 'notifications', component: AdminNotifications },
      { path: 'vendor-requests', component: AdminVendorRequests },

      { path: 'settings', component: AdminSettings }
    ]
  },

  { path: '', redirectTo: 'Home', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];