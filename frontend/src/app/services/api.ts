
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { BookingStateService } from './booking-state';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient,
    private bookingState: BookingStateService
  ) {}


  // =====================================================
  // 1. COMMON - BOOKING STATE
  // =====================================================

  private publishBookingChange(
    bookingId: number | null | undefined,
    response: any,
    changes: Record<string, any> = {},
    created = false
  ): void {

    const responseBooking =
      response && typeof response === 'object' ? response : {};

    const id = Number(responseBooking.id || bookingId);

    if (!id) {
      return;
    }

    this.bookingState.publish({
      booking: {
        ...changes,
        ...responseBooking,
        id
      },
      created
    });
  }


  // =====================================================
  // 2. AUTHENTICATION
  // =====================================================

  register(data: any) {
    return this.http.post(
      `${this.baseUrl}/auth/register/`,
      data
    );
  }

  login(data: any) {
    return this.http.post(
      `${this.baseUrl}/auth/login/`,
      data
    );
  }

  refreshToken(refresh: string) {
    return this.http.post(
      `${this.baseUrl}/auth/token/refresh/`,
      {
        refresh: refresh
      }
    );
  }


  // =====================================================
  // 3. USER PROFILE
  // =====================================================

  getProfile() {
    return this.http.get(
      `${this.baseUrl}/auth/profile/`
    );
  }

  updateProfile(data: any) {
    return this.http.patch(
      `${this.baseUrl}/auth/profile/`,
      data
    );
  }

  changePassword(data: any) {
    return this.http.post(
      `${this.baseUrl}/auth/profile/change-password/`,
      data
    );
  }


  // =====================================================
  // 4. NOTIFICATION PREFERENCES
  // =====================================================

  getNotificationPreferences() {
    return this.http.get(
      `${this.baseUrl}/auth/profile/notification-preferences/`
    );
  }

  updateNotificationPreferences(data: any) {
    return this.http.patch(
      `${this.baseUrl}/auth/profile/notification-preferences/`,
      data
    );
  }


  // =====================================================
  // 5. VENDOR REQUEST
  // =====================================================

  submitVendorRequest(data: any) {
    return this.http.post(
      `${this.baseUrl}/auth/vendor-request/`,
      data
    );
  }


  // =====================================================
  // 6. EQUIPMENT - CUSTOMER AND VENDOR
  // =====================================================

  getEquipment() {
    return this.http.get(
      `${this.baseUrl}/equipment/`
    );
  }

  getEquipmentById(id: number) {
    return this.http.get(
      `${this.baseUrl}/equipment/${id}/`
    );
  }

  createEquipment(data: FormData) {
    return this.http.post(
      `${this.baseUrl}/equipment/`,
      data
    );
  }

  updateEquipment(id: number, data: FormData) {
    return this.http.patch(
      `${this.baseUrl}/equipment/${id}/`,
      data
    );
  }

  deleteEquipment(id: number) {
    return this.http.delete(
      `${this.baseUrl}/equipment/${id}/`
    );
  }


  // =====================================================
  // 7. EQUIPMENT AVAILABILITY
  // =====================================================

  checkEquipmentAvailability(
    equipmentId: number,
    startDate: string,
    endDate: string
  ) {
    return this.http.get(
      `${this.baseUrl}/bookings/availability/${equipmentId}/`,
      {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      }
    );
  }


  // =====================================================
  // 8. BOOKINGS - CUSTOMER
  // =====================================================

  createBooking(data: any) {
    return this.http.post(
      `${this.baseUrl}/bookings/`,
      data
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          response?.id,
          response,
          {},
          true
        )
      )
    );
  }

  getBookings() {
    return this.http.get(
      `${this.baseUrl}/bookings/`
    );
  }

  returnEquipment(
    bookingId: number,
    condition: 'good' | 'damaged'
  ) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${bookingId}/return/`,
      {
        equipment_condition_after: condition
      }
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          bookingId,
          response,
          {
            equipment_workflow_status: 'awaiting_inspection',
            equipment_condition_after: condition
          }
        )
      )
    );
  }

  // Kept as a separate method for components
  // that use the returnBooking() name.
  returnBooking(
    bookingId: number,
    condition: string
  ) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${bookingId}/return/`,
      {
        equipment_condition_after: condition
      }
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          bookingId,
          response,
          {
            equipment_workflow_status: 'awaiting_inspection',
            equipment_condition_after: condition
          }
        )
      )
    );
  }


  // =====================================================
  // 9. BOOKINGS - VENDOR AND OPERATIONS
  // =====================================================

  getOperationsBookings() {
    return this.http.get(
      `${this.baseUrl}/bookings/`
    );
  }

  updateBookingStatus(
    bookingId: number,
    status: string
  ) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${bookingId}/status/`,
      {
        status: status
      }
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          bookingId,
          response,
          { status }
        )
      )
    );
  }


  // =====================================================
  // 10. OPERATIONS - EQUIPMENT COLLECTION
  // =====================================================

  receiveEquipment(id: number) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${id}/receive/`,
      {}
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          id,
          response,
          {
            equipment_workflow_status: 'received'
          }
        )
      )
    );
  }


  // =====================================================
  // 11. OPERATIONS - HANDOVER TO CUSTOMER
  // =====================================================

  handoverEquipment(id: number) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${id}/handover/`,
      {}
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          id,
          response,
          {
            equipment_workflow_status: 'handed_over'
          }
        )
      )
    );
  }


  // =====================================================
  // 12. OPERATIONS - EQUIPMENT INSPECTION
  // =====================================================

  inspectEquipment(
    id: number,
    condition: string,
    damageDescription: string = ''
  ) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${id}/inspect/`,
      {
        condition: condition,
        damage_description: damageDescription
      }
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          id,
          response,
          {
            equipment_workflow_status:
              condition === 'damaged' ? 'damaged' : 'no_damage',

            equipment_condition_after:
              condition === 'damaged' ? 'damaged' : 'good',

            damage_description:
              condition === 'damaged' ? damageDescription : null
          }
        )
      )
    );
  }


  // =====================================================
  // 13. OPERATIONS - RETURN EQUIPMENT TO VENDOR
  // =====================================================

  returnEquipmentToVendor(id: number) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${id}/return-to-vendor/`,
      {}
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          id,
          response,
          {
            status: 'completed',
            equipment_workflow_status: 'returned_to_vendor'
          }
        )
      )
    );
  }

  completeDamagedEquipment(bookingId: number) {
    return this.http.patch(
      `${this.baseUrl}/bookings/${bookingId}/complete-damaged/`,
      {}
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          bookingId,
          response,
          {
            status: 'completed'
          }
        )
      )
    );
  }


  // =====================================================
  // 14. PAYMENTS - CUSTOMER
  // =====================================================

  getPayments() {
    return this.http.get(
      `${this.baseUrl}/payments/`
    );
  }

  createPayment(bookingId: number) {
    return this.http.post(
      `${this.baseUrl}/payments/`,
      {
        booking: bookingId
      }
    );
  }

  processPayment(id: number) {
    return this.http.patch(
      `${this.baseUrl}/payments/${id}/process/`,
      {}
    );
  }

  confirmPayment(id: number) {
    return this.http.patch(
      `${this.baseUrl}/payments/${id}/confirm/`,
      {}
    ).pipe(
      tap((response: any) => {
        if (response?.booking_id) {
          this.publishBookingChange(
            response.booking_id,
            response,
            {
              payment_status: response.payment_status
            }
          );
        }
      })
    );
  }


  // =====================================================
  // 15. MAINTENANCE - REPORTS
  // =====================================================

  getMaintenanceReports() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/maintenance-reports/`
    );
  }

  createMaintenanceReport(
    bookingId: number,
    description: string,
    repairCost: number
  ) {
    return this.http.post(
      `${this.baseUrl}/damage-reports/maintenance-reports/`,
      {
        booking: bookingId,
        description: description,
        repair_cost: repairCost
      }
    );
  }

  updateMaintenanceReportStatus(
    id: number,
    status: string
  ) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/maintenance-reports/${id}/status/`,
      {
        status: status
      }
    );
  }

  getMaintenanceDamagedBookings() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/maintenance/damaged-bookings/`
    );
  }


  // =====================================================
  // 16. DAMAGE REPORTS - CUSTOMER AND VENDOR
  // =====================================================

  getDamageReports() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/`
    );
  }

  createDamageReport(data: {
    booking: number;
    description: string;
    damage_amount: string;
  }) {
    return this.http.post(
      `${this.baseUrl}/damage-reports/`,
      data
    );
  }

  updateDamageReport(
    id: number,
    description: string,
    damageAmount: number
  ) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/${id}/edit/`,
      {
        description: description,
        damage_amount: damageAmount
      }
    );
  }

  updateDamageReportStatus(
    reportId: number,
    status: string
  ) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/${reportId}/status/`,
      {
        status: status
      }
    );
  }


  // =====================================================
  // 17. DAMAGE REPORTS - ADMIN
  // =====================================================

  getAdminEligibleDamageBookings() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/admin/eligible-bookings/`
    );
  }

  getAdminDamageReports() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/admin/reports/`
    );
  }

  getAdminDamageReport(id: number) {
    return this.http.get(
      `${this.baseUrl}/damage-reports/admin/${id}/`
    );
  }

  processDamageReportRefund(reportId: number) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/admin/reports/${reportId}/refund/`,
      {}
    );
  }


  // =====================================================
  // 18. DAMAGE PAYMENTS
  // =====================================================

  getDamagePayments() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/payments/`
    );
  }

  createDamagePayment(reportId: number) {
    return this.http.post(
      `${this.baseUrl}/damage-reports/payments/`,
      {
        damage_report: reportId
      }
    );
  }

  processDamagePayment(paymentId: number) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/payments/${paymentId}/process/`,
      {}
    );
  }

  confirmDamagePayment(paymentId: number) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/payments/${paymentId}/confirm/`,
      {}
    );
  }


  // =====================================================
  // 19. DAMAGE ISSUES - CUSTOMER AND VENDOR
  // =====================================================

  createDamageIssue(
    damageReportId: number,
    issueType: string,
    description: string
  ) {
    return this.http.post(
      `${this.baseUrl}/damage-reports/issues/`,
      {
        damage_report: damageReportId,
        issue_type: issueType,
        description: description
      }
    );
  }

  getDamageIssues() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/issues/`
    );
  }

  updateDamageIssueStatus(
    issueId: number,
    status: string,
    resolutionNote: string = ''
  ) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/issues/${issueId}/status/`,
      {
        status: status,
        resolution_note: resolutionNote
      }
    );
  }


  // =====================================================
  // 20. NOTIFICATIONS - CUSTOMER AND USERS
  // =====================================================

  getNotifications() {
    return this.http.get(
      `${this.baseUrl}/notifications/`
    );
  }

  markNotificationAsRead(notificationId: number) {
    return this.http.patch(
      `${this.baseUrl}/notifications/${notificationId}/read/`,
      {}
    );
  }

  markAllNotificationsAsRead() {
    return this.http.patch(
      `${this.baseUrl}/notifications/mark-all-read/`,
      {}
    );
  }


  // =====================================================
  // 21. ADMIN - USERS
  // =====================================================

  getAdminUsers() {
    return this.http.get(
      `${this.baseUrl}/auth/admin/users/`
    );
  }

  createAdminUser(data: any) {
    return this.http.post(
      `${this.baseUrl}/auth/admin/users/`,
      data
    );
  }

  updateAdminUser(id: number, data: any) {
    return this.http.patch(
      `${this.baseUrl}/auth/admin/users/${id}/`,
      data
    );
  }

  deleteAdminUser(id: number) {
    return this.http.delete(
      `${this.baseUrl}/auth/admin/users/${id}/`
    );
  }


  // =====================================================
  // 22. ADMIN - VENDOR REQUESTS
  // =====================================================

  getAdminVendorRequests() {
    return this.http.get(
      `${this.baseUrl}/auth/admin/vendor-requests/`
    );
  }

  updateVendorRequestStatus(
    requestId: number,
    action: 'approve' | 'reject'
  ) {
    return this.http.patch(
      `${this.baseUrl}/auth/admin/vendor-requests/${requestId}/`,
      {
        action: action
      }
    );
  }


  // =====================================================
  // 23. ADMIN - EQUIPMENT
  // =====================================================

  getAdminEquipment() {
    return this.http.get(
      `${this.baseUrl}/equipment/admin/`
    );
  }

  createAdminEquipment(data: FormData) {
    return this.http.post(
      `${this.baseUrl}/equipment/admin/`,
      data
    );
  }

  updateAdminEquipment(id: number, data: FormData) {
    return this.http.patch(
      `${this.baseUrl}/equipment/admin/${id}/`,
      data
    );
  }

  deleteAdminEquipment(id: number) {
    return this.http.delete(
      `${this.baseUrl}/equipment/admin/${id}/`
    );
  }


  // =====================================================
  // 24. ADMIN - BOOKINGS
  // =====================================================

  getAdminBookings() {
    return this.http.get(
      `${this.baseUrl}/bookings/admin/`
    );
  }

  getAdminBooking(id: number) {
    return this.http.get(
      `${this.baseUrl}/bookings/admin/${id}/`
    );
  }

  updateAdminBookingStatus(
    id: number,
    status: string
  ) {
    return this.http.patch(
      `${this.baseUrl}/bookings/admin/${id}/status/`,
      {
        status: status
      }
    ).pipe(
      tap((response: any) =>
        this.publishBookingChange(
          id,
          response,
          { status }
        )
      )
    );
  }


  // =====================================================
  // 25. ADMIN - PAYMENTS
  // =====================================================

  getAdminPayments() {
    return this.http.get(
      `${this.baseUrl}/payments/admin/`
    );
  }

  getAdminPayment(id: number) {
    return this.http.get(
      `${this.baseUrl}/payments/admin/${id}/`
    );
  }

  refundAdminDeposit(paymentId: number) {
    return this.http.post<any>(
      `${this.baseUrl}/payments/admin/${paymentId}/refund-deposit/`,
      {}
    );
  }

  getVendorPayments(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/payments/vendor/`
    );
  }


  // =====================================================
  // 26. ADMIN - DAMAGE ISSUES
  // =====================================================

  getAdminDamageIssues() {
    return this.http.get(
      `${this.baseUrl}/damage-reports/issues/`
    );
  }

  updateAdminDamageIssueStatus(
    issueId: number,
    status: string,
    resolutionNote: string = ''
  ) {
    return this.http.patch(
      `${this.baseUrl}/damage-reports/issues/${issueId}/status/`,
      {
        status: status,
        resolution_note: resolutionNote
      }
    );
  }


  // =====================================================
  // 27. ADMIN - NOTIFICATIONS
  // =====================================================

  getAdminNotifications() {
    return this.http.get(
      `${this.baseUrl}/notifications/admin/`
    );
  }

  getAdminNotification(id: number) {
    return this.http.get(
      `${this.baseUrl}/notifications/admin/${id}/`
    );
  }

  markAdminNotificationAsRead(notificationId: number) {
    return this.http.patch(
      `${this.baseUrl}/notifications/admin/${notificationId}/read/`,
      {}
    );
  }

  markAllAdminNotificationsAsRead() {
    return this.http.patch(
      `${this.baseUrl}/notifications/admin/mark-all-read/`,
      {}
    );
  }

}