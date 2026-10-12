from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from bookings.models import Booking
from damage_reports.models import DamagePayment, DamageReport, MaintenanceReport
from equipment.models import Equipment
from notifications.models import Notification
from payments.models import Payment


User = get_user_model()


class MaintenanceCompletionNotificationTests(APITestCase):

	def setUp(self):
		self.vendor = User.objects.create_user(
			username='vendor',
			password='test-password',
			role='vendor'
		)
		self.customer = User.objects.create_user(
			username='customer',
			password='test-password',
			first_name='Casey',
			last_name='Customer',
			role='customer'
		)
		self.maintenance_staff = User.objects.create_user(
			username='maintenance',
			password='test-password',
			role='maintenance_staff'
		)
		self.other_maintenance_staff = User.objects.create_user(
			username='other-maintenance',
			password='test-password',
			role='maintenance_staff'
		)
		self.admins = [
			User.objects.create_user(
				username='admin-one',
				password='test-password',
				role='admin'
			),
			User.objects.create_user(
				username='admin-two',
				password='test-password',
				role='admin'
			),
		]
		self.equipment = Equipment.objects.create(
			name='Test Camera',
			category='camera',
			description='Camera used for maintenance workflow tests.',
			price_per_day=Decimal('25.00'),
			quantity=1,
			vendor=self.vendor
		)
		self.booking = Booking.objects.create(
			customer=self.customer,
			equipment=self.equipment,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=1),
			total_amount=Decimal('50.00'),
			deposit=Decimal('10.00'),
			status='approved',
			payment_status='paid',
			equipment_workflow_status='damaged'
		)
		self.report = MaintenanceReport.objects.create(
			booking=self.booking,
			maintenance_staff=self.maintenance_staff,
			description='Replaced the damaged lens assembly.',
			repair_cost=Decimal('35.00'),
			status='in_progress'
		)
		self.status_url = reverse(
			'maintenance-report-status',
			kwargs={'pk': self.report.pk}
		)

	def complete_as(self, user):
		client = APIClient()
		client.force_authenticate(user=user)
		return client.patch(
			self.status_url,
			{'status': 'completed'},
			format='json'
		)

	def test_completion_notifies_all_admins_and_preserves_vendor_notice(self):
		response = self.complete_as(self.maintenance_staff)

		self.assertEqual(response.status_code, 200)
		self.report.refresh_from_db()
		self.assertEqual(self.report.status, 'completed')

		for admin in self.admins:
			notification = Notification.objects.get(
				user=admin,
				title='Maintenance Completed'
			)
			self.assertFalse(notification.is_read)
			self.assertIn(f'booking #{self.booking.id}', notification.message)
			self.assertIn('Test Camera', notification.message)
			self.assertIn('Casey Customer', notification.message)
			self.assertIn('Replaced the damaged lens assembly.', notification.message)
			self.assertIn('35.00', notification.message)

		self.assertEqual(
			Notification.objects.filter(
				user=self.vendor,
				title='Maintenance Completed'
			).count(),
			1
		)

		admin_client = APIClient()
		admin_client.force_authenticate(user=self.admins[0])
		notifications_response = admin_client.get(
			reverse('admin-notification-list')
		)
		self.assertEqual(notifications_response.status_code, 200)
		self.assertTrue(any(
			item['title'] == 'Maintenance Completed'
			and item['user'] == self.admins[0].id
			and not item['is_read']
			for item in notifications_response.data
		))

	def test_repeated_completion_is_idempotent(self):
		first_response = self.complete_as(self.maintenance_staff)
		retry_response = self.complete_as(self.maintenance_staff)

		self.assertEqual(first_response.status_code, 200)
		self.assertEqual(retry_response.status_code, 200)
		self.assertEqual(
			Notification.objects.filter(
				user__role='admin',
				title='Maintenance Completed'
			).count(),
			len(self.admins)
		)
		self.assertEqual(
			Notification.objects.filter(
				user=self.vendor,
				title='Maintenance Completed'
			).count(),
			1
		)

	def test_unassigned_staff_and_other_roles_cannot_complete_report(self):
		unauthorized_users = [
			self.other_maintenance_staff,
			self.customer,
			self.vendor,
		]

		for user in unauthorized_users:
			with self.subTest(role=user.role, username=user.username):
				response = self.complete_as(user)
				self.assertEqual(response.status_code, 404)

		self.report.refresh_from_db()
		self.assertEqual(self.report.status, 'in_progress')
		self.assertFalse(
			Notification.objects.filter(
				title='Maintenance Completed'
			).exists()
		)

	def create_booking_candidate(
		self,
		*,
		status='completed',
		payment_status='paid',
		workflow_status='damaged',
		maintenance_status='completed',
		with_damage_report=False,
		deposit=Decimal('10.00')
	):
		booking = Booking.objects.create(
			customer=self.customer,
			equipment=self.equipment,
			start_date=date.today(),
			end_date=date.today() + timedelta(days=1),
			total_amount=Decimal('50.00'),
			deposit=deposit,
			status=status,
			payment_status=payment_status,
			equipment_workflow_status=workflow_status,
			equipment_condition_after='damaged',
			damage_description='Confirmed crack on returned equipment.'
		)
		Payment.objects.create(
			booking=booking,
			customer=self.customer,
			rental_amount=Decimal('50.00'),
			deposit_amount=deposit,
			total_amount=Decimal('50.00') + deposit,
			payment_status=payment_status
		)
		if maintenance_status is not None:
			MaintenanceReport.objects.create(
				booking=booking,
				maintenance_staff=self.maintenance_staff,
				description='Repaired the equipment.',
				repair_cost=Decimal('35.00'),
				status=maintenance_status
			)
		if with_damage_report:
			DamageReport.objects.create(
				booking=booking,
				reported_by=self.admins[0],
				description='Existing official report.',
				damage_amount=Decimal('35.00')
			)
		return booking

	def test_admin_eligible_bookings_endpoint_returns_only_eligible_rows(self):
		eligible = self.create_booking_candidate()
		self.create_booking_candidate(status='approved')
		self.create_booking_candidate(payment_status='pending')
		self.create_booking_candidate(workflow_status='no_damage')
		self.create_booking_candidate(maintenance_status='in_progress')
		self.create_booking_candidate(maintenance_status=None)
		self.create_booking_candidate(with_damage_report=True)

		client = APIClient()
		client.force_authenticate(user=self.admins[0])
		response = client.get(reverse('admin-eligible-damage-bookings'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual([row['id'] for row in response.data], [eligible.id])
		self.assertEqual(response.data[0]['equipment_name'], 'Test Camera')
		self.assertEqual(response.data[0]['customer_name'], 'Casey Customer')
		self.assertEqual(response.data[0]['maintenance_status'], 'completed')
		self.assertEqual(
			response.data[0]['maintenance_description'],
			'Repaired the equipment.'
		)
		self.assertEqual(response.data[0]['maintenance_repair_cost'], '35.00')
		self.assertEqual(
			response.data[0]['damage_description'],
			'Confirmed crack on returned equipment.'
		)

	def test_eligible_bookings_endpoint_is_admin_only(self):
		client = APIClient()
		client.force_authenticate(user=self.maintenance_staff)

		response = client.get(reverse('admin-eligible-damage-bookings'))

		self.assertEqual(response.status_code, 403)

	def test_report_creation_rejects_incomplete_prerequisites(self):
		incomplete_candidates = [
			self.create_booking_candidate(status='approved'),
			self.create_booking_candidate(workflow_status='no_damage'),
			self.create_booking_candidate(maintenance_status='in_progress'),
			self.create_booking_candidate(maintenance_status=None),
		]
		client = APIClient()
		client.force_authenticate(user=self.admins[0])

		for booking in incomplete_candidates:
			with self.subTest(booking_id=booking.id):
				response = client.post(
					'/api/damage-reports/',
					{
						'booking': booking.id,
						'description': 'Damage details.',
						'damage_amount': '10.00'
					},
					format='json'
				)
				self.assertEqual(response.status_code, 400)
				self.assertFalse(
					DamageReport.objects.filter(booking=booking).exists()
				)

	def test_report_creation_and_duplicate_retry(self):
		booking = self.create_booking_candidate()
		client = APIClient()
		client.force_authenticate(user=self.admins[0])
		payload = {
			'booking': booking.id,
			'description': 'Admin-confirmed final damage details.',
			'damage_amount': '35.00'
		}

		first_response = client.post(
			'/api/damage-reports/', payload, format='json'
		)
		duplicate_response = client.post(
			'/api/damage-reports/', payload, format='json'
		)

		self.assertEqual(first_response.status_code, 201)
		self.assertEqual(duplicate_response.status_code, 400)
		self.assertIn(
			'A damage report already exists for this booking.',
			str(duplicate_response.data)
		)
		self.assertEqual(
			DamageReport.objects.filter(booking=booking).count(),
			1
		)
		with self.assertRaises(DjangoValidationError):
			DamageReport.objects.create(
				booking=booking,
				reported_by=self.admins[0],
				description='Duplicate direct creation attempt.',
				damage_amount=Decimal('35.00')
			)

	def test_deposit_settlement_uses_decimal_calculations(self):
		cases = [
			(Decimal('3000.00'), Decimal('1000.00'), Decimal('1000.00'), Decimal('0.00'), Decimal('2000.00')),
			(Decimal('3000.00'), Decimal('3000.00'), Decimal('3000.00'), Decimal('0.00'), Decimal('0.00')),
			(Decimal('1000.00'), Decimal('2500.00'), Decimal('1000.00'), Decimal('1500.00'), Decimal('0.00')),
		]
		client = APIClient()
		client.force_authenticate(user=self.admins[0])

		for deposit, damage, expected_deduction, expected_additional, expected_refund in cases:
			with self.subTest(deposit=deposit, damage=damage):
				booking = self.create_booking_candidate(deposit=deposit)
				response = client.post(
					'/api/damage-reports/',
					{
						'booking': booking.id,
						'description': 'Final damage assessment.',
						'damage_amount': str(damage)
					},
					format='json'
				)
				self.assertEqual(response.status_code, 201)
				report = DamageReport.objects.get(booking=booking)
				payment = Payment.objects.get(booking=booking)
				self.assertEqual(report.damage_amount, damage)
				self.assertEqual(report.deposit_deducted, expected_deduction)
				self.assertEqual(report.additional_amount, expected_additional)
				self.assertEqual(report.refundable_amount, expected_refund)
				self.assertEqual(payment.deposit_deducted, expected_deduction)
				self.assertEqual(payment.additional_damage_payment, expected_additional)
				self.assertEqual(payment.deposit_refunded, Decimal('0.00'))
				if expected_refund > 0:
					self.assertEqual(payment.refund_status, 'pending')
					self.assertIsNone(payment.refund_transaction_id)

	def test_invalid_damage_amounts_and_blank_description_are_rejected(self):
		client = APIClient()
		client.force_authenticate(user=self.admins[0])
		invalid_payloads = [
			{'description': 'Valid description.', 'damage_amount': '-1.00'},
			{'description': 'Valid description.', 'damage_amount': '1.001'},
			{'description': '   ', 'damage_amount': '1.00'},
			{'description': 'Valid description.'},
		]

		for payload in invalid_payloads:
			with self.subTest(payload=payload):
				booking = self.create_booking_candidate()
				response = client.post(
					'/api/damage-reports/',
					{'booking': booking.id, **payload},
					format='json'
				)
				self.assertEqual(response.status_code, 400)
				self.assertFalse(
					DamageReport.objects.filter(booking=booking).exists()
				)

	def test_creation_notification_explains_additional_amount_and_pending_refund(self):
		client = APIClient()
		client.force_authenticate(user=self.admins[0])
		additional_booking = self.create_booking_candidate(
			deposit=Decimal('1000.00')
		)
		refund_booking = self.create_booking_candidate(
			deposit=Decimal('3000.00')
		)

		additional_response = client.post(
			'/api/damage-reports/',
			{
				'booking': additional_booking.id,
				'description': 'Damage exceeds the deposit.',
				'damage_amount': '2500.00'
			},
			format='json'
		)
		refund_response = client.post(
			'/api/damage-reports/',
			{
				'booking': refund_booking.id,
				'description': 'Damage is below the deposit.',
				'damage_amount': '1000.00'
			},
			format='json'
		)

		self.assertEqual(additional_response.status_code, 201)
		self.assertEqual(refund_response.status_code, 201)
		notifications = list(Notification.objects.filter(
			user=self.customer,
			title='Damage Report Created'
		).order_by('id'))
		self.assertEqual(len(notifications), 2)
		self.assertIn('Additional payment due: ₹1500.00', notifications[0].message)
		self.assertNotIn('Refundable deposit balance', notifications[0].message)
		self.assertIn('Refundable deposit balance: ₹2000.00 is pending', notifications[1].message)
		self.assertNotIn('refund has been processed', notifications[1].message.lower())

	def test_notification_failure_rolls_back_report_and_payment_allocation(self):
		booking = self.create_booking_candidate(deposit=Decimal('1000.00'))
		payment = Payment.objects.get(booking=booking)
		client = APIClient()
		client.force_authenticate(user=self.admins[0])
		client.raise_request_exception = False

		with patch(
			'damage_reports.views.Notification.objects.create',
			side_effect=RuntimeError('Notification store unavailable')
		):
			response = client.post(
				'/api/damage-reports/',
				{
					'booking': booking.id,
					'description': 'Final damage assessment.',
					'damage_amount': '2500.00'
				},
				format='json'
			)

		self.assertEqual(response.status_code, 500)
		self.assertFalse(DamageReport.objects.filter(booking=booking).exists())
		payment.refresh_from_db()
		self.assertEqual(payment.deposit_deducted, Decimal('0.00'))
		self.assertEqual(payment.additional_damage_payment, Decimal('0.00'))
		self.assertEqual(payment.deposit_refunded, Decimal('0.00'))
		self.assertEqual(payment.refund_status, 'not_applicable')


class DamagePaymentAndRefundTests(APITestCase):

	def setUp(self):
		self.vendor = User.objects.create_user(
			username='refund-vendor', password='test-password', role='vendor'
		)
		self.customer = User.objects.create_user(
			username='damage-customer', password='test-password', role='customer'
		)
		self.other_customer = User.objects.create_user(
			username='other-customer', password='test-password', role='customer'
		)
		self.admin = User.objects.create_user(
			username='refund-admin', password='test-password', role='admin'
		)
		self.equipment = Equipment.objects.create(
			name='Refund Test Camera',
			category='camera',
			description='Refund integration test equipment.',
			price_per_day=Decimal('100.00'),
			quantity=1,
			vendor=self.vendor
		)
		self.report, self.booking, self.rental_payment = self.create_report(
			customer=self.customer,
			additional_amount=Decimal('150.00'),
			refundable_amount=Decimal('0.00'),
			deposit_deducted=Decimal('100.00')
		)

	def create_report(
		self,
		*,
		customer,
		additional_amount,
		refundable_amount,
		deposit_deducted,
		deposit=Decimal('100.00')
	):
		booking = Booking.objects.create(
			customer=customer,
			equipment=self.equipment,
			start_date=date.today() - timedelta(days=2),
			end_date=date.today() - timedelta(days=1),
			total_amount=Decimal('500.00'),
			deposit=deposit,
			status='completed',
			payment_status='paid',
			equipment_workflow_status='damaged'
		)
		payment = Payment.objects.create(
			booking=booking,
			customer=customer,
			rental_amount=Decimal('500.00'),
			deposit_amount=deposit,
			total_amount=Decimal('500.00') + deposit,
			payment_status='paid',
			transaction_id='pi_original_rental'
		)
		report = DamageReport.objects.create(
			booking=booking,
			reported_by=self.admin,
			description='Final verified damage assessment.',
			damage_amount=(deposit_deducted + additional_amount),
			deposit_deducted=deposit_deducted,
			additional_amount=additional_amount,
			refundable_amount=refundable_amount,
			status='resolved'
		)
		payment.deposit_deducted = deposit_deducted
		payment.additional_damage_payment = additional_amount
		payment.refund_status = 'pending' if refundable_amount > 0 else 'not_applicable'
		payment.save(update_fields=[
			'deposit_deducted',
			'additional_damage_payment',
			'refund_status'
		])
		return report, booking, payment

	def customer_client(self, customer=None):
		client = APIClient()
		client.force_authenticate(user=customer or self.customer)
		return client

	def test_customer_report_list_contains_only_their_own_reports(self):
		other_report, _, _ = self.create_report(
			customer=self.other_customer,
			additional_amount=Decimal('0.00'),
			refundable_amount=Decimal('10.00'),
			deposit_deducted=Decimal('90.00')
		)

		response = self.customer_client().get('/api/damage-reports/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(
			{row['id'] for row in response.data},
			{self.report.id}
		)
		self.assertNotIn(other_report.id, {row['id'] for row in response.data})

	def test_payment_record_creation_is_idempotent(self):
		client = self.customer_client()
		payload = {'damage_report': self.report.id}

		first = client.post(
			'/api/damage-reports/payments/', payload, format='json'
		)
		retry = client.post(
			'/api/damage-reports/payments/', payload, format='json'
		)

		self.assertEqual(first.status_code, 201)
		self.assertEqual(retry.status_code, 200)
		self.assertEqual(first.data['id'], retry.data['id'])
		self.assertEqual(
			DamagePayment.objects.filter(damage_report=self.report).count(),
			1
		)
		self.assertEqual(
			Payment.objects.get(pk=self.rental_payment.pk).transaction_id,
			'pi_original_rental'
		)

	def test_other_customer_cannot_create_or_process_damage_payment(self):
		payment = DamagePayment.objects.create(
			damage_report=self.report,
			customer=self.customer,
			amount=Decimal('150.00')
		)
		other_client = self.customer_client(self.other_customer)

		create_response = other_client.post(
			'/api/damage-reports/payments/',
			{'damage_report': self.report.id},
			format='json'
		)
		process_response = other_client.patch(
			f'/api/damage-reports/payments/{payment.id}/process/',
			{},
			format='json'
		)

		self.assertEqual(create_response.status_code, 400)
		self.assertEqual(process_response.status_code, 404)
		self.assertEqual(
			DamagePayment.objects.filter(damage_report=self.report).count(),
			1
		)

	def test_payment_intent_is_reused_for_repeated_process_requests(self):
		payment = DamagePayment.objects.create(
			damage_report=self.report,
			customer=self.customer,
			amount=Decimal('150.00')
		)
		intent = SimpleNamespace(
			id='pi_damage_charge',
			client_secret='secret_damage_charge',
			status='requires_payment_method'
		)
		client = self.customer_client()

		with patch(
			'damage_reports.views.stripe.PaymentIntent.create',
			return_value=intent
		) as create_intent, patch(
			'damage_reports.views.stripe.PaymentIntent.retrieve',
			return_value=intent
		) as retrieve_intent:
			first = client.patch(
				f'/api/damage-reports/payments/{payment.id}/process/', {}, format='json'
			)
			retry = client.patch(
				f'/api/damage-reports/payments/{payment.id}/process/', {}, format='json'
			)

		self.assertEqual(first.status_code, 200)
		self.assertEqual(retry.status_code, 200)
		self.assertEqual(create_intent.call_count, 1)
		self.assertEqual(retrieve_intent.call_count, 1)
		self.assertEqual(
			create_intent.call_args.kwargs['idempotency_key'],
			f'damage-payment-{payment.id}'
		)
		payment.refresh_from_db()
		self.assertEqual(payment.transaction_id, 'pi_damage_charge')

	def test_payment_verification_only_marks_paid_after_stripe_success(self):
		payment = DamagePayment.objects.create(
			damage_report=self.report,
			customer=self.customer,
			amount=Decimal('150.00'),
			transaction_id='pi_damage_charge'
		)
		client = self.customer_client()

		with patch(
			'damage_reports.views.stripe.PaymentIntent.retrieve',
			return_value=SimpleNamespace(status='requires_payment_method')
		):
			failed = client.patch(
				f'/api/damage-reports/payments/{payment.id}/confirm/', {}, format='json'
			)

		self.assertEqual(failed.status_code, 400)
		payment.refresh_from_db()
		self.assertEqual(payment.payment_status, 'pending')
		self.assertFalse(Notification.objects.filter(
			user=self.customer,
			title='Additional Damage Payment Completed'
		).exists())

		with patch(
			'damage_reports.views.stripe.PaymentIntent.retrieve',
			return_value=SimpleNamespace(
				status='succeeded',
				amount=15000,
				currency='inr',
				metadata={'damage_payment_id': str(payment.id)}
			)
		) as retrieve_intent:
			verified = client.patch(
				f'/api/damage-reports/payments/{payment.id}/confirm/', {}, format='json'
			)
			retry = client.patch(
				f'/api/damage-reports/payments/{payment.id}/confirm/', {}, format='json'
			)

		self.assertEqual(verified.status_code, 200)
		self.assertEqual(retry.status_code, 200)
		self.assertEqual(verified.data['payment_status'], 'paid')
		self.assertEqual(retrieve_intent.call_count, 1)
		payment.refresh_from_db()
		self.assertEqual(payment.payment_status, 'paid')
		self.assertEqual(
			Notification.objects.filter(
				user=self.customer,
				title='Additional Damage Payment Completed'
			).count(),
			1
		)
		self.booking.refresh_from_db()
		self.rental_payment.refresh_from_db()
		self.assertEqual(self.booking.payment_status, 'paid')
		self.assertEqual(self.rental_payment.payment_status, 'paid')
		self.assertEqual(self.rental_payment.transaction_id, 'pi_original_rental')

	def test_refund_stays_pending_until_stripe_confirms_and_is_idempotent(self):
		refund_report, booking, payment = self.create_report(
			customer=self.customer,
			additional_amount=Decimal('0.00'),
			refundable_amount=Decimal('200.00'),
			deposit_deducted=Decimal('800.00'),
			deposit=Decimal('1000.00')
		)
		admin_client = APIClient()
		admin_client.force_authenticate(user=self.admin)
		url = f'/api/damage-reports/admin/reports/{refund_report.id}/refund/'
		pending_refund = SimpleNamespace(
			id='re_damage_deposit',
			status='pending',
			amount=20000
		)
		completed_refund = SimpleNamespace(
			id='re_damage_deposit',
			status='succeeded',
			amount=20000
		)
		original_intent = SimpleNamespace(
			status='succeeded',
			amount=150000,
			amount_received=150000,
			currency='inr'
		)

		with patch(
			'damage_reports.views.stripe.Refund.create',
			return_value=pending_refund
		) as create_refund, patch(
			'damage_reports.views.stripe.PaymentIntent.retrieve',
			return_value=original_intent
		):
			pending = admin_client.patch(url, {}, format='json')

		self.assertEqual(pending.status_code, 200)
		self.assertEqual(pending.data['refund_status'], 'pending')
		self.assertEqual(create_refund.call_count, 1)
		self.assertEqual(
			create_refund.call_args.kwargs['payment_intent'],
			'pi_original_rental'
		)
		payment.refresh_from_db()
		self.assertEqual(payment.deposit_refunded, Decimal('0.00'))
		self.assertEqual(payment.refund_status, 'pending')

		customer_client = self.customer_client()
		customer_reports = customer_client.get('/api/damage-reports/')
		self.assertEqual(customer_reports.status_code, 200)
		serialized_refund_report = next(
			row for row in customer_reports.data
			if row['id'] == refund_report.id
		)
		self.assertEqual(serialized_refund_report['refund_status'], 'pending')
		self.assertTrue(serialized_refund_report['refund_provider_reference_valid'])

		with patch(
			'damage_reports.views.stripe.Refund.retrieve',
			return_value=completed_refund
		) as retrieve_refund:
			completed = admin_client.patch(url, {}, format='json')
			retry = admin_client.patch(url, {}, format='json')

		self.assertEqual(completed.status_code, 200)
		self.assertEqual(completed.data['refund_status'], 'partially_refunded')
		self.assertEqual(retry.status_code, 200)
		self.assertEqual(retrieve_refund.call_count, 1)
		payment.refresh_from_db()
		self.assertEqual(payment.deposit_refunded, Decimal('200.00'))
		self.assertEqual(payment.refund_status, 'partially_refunded')
		self.assertEqual(payment.refund_transaction_id, 're_damage_deposit')
		self.assertEqual(
			Notification.objects.filter(
				user=self.customer,
				title='Deposit Refund Pending'
			).count(),
			1
		)
		self.assertEqual(
			Notification.objects.filter(
				user=self.customer,
				title='Deposit Refund Completed'
			).count(),
			1
		)
		booking.refresh_from_db()
		self.assertEqual(booking.payment_status, 'paid')

	def test_failed_provider_refund_is_not_recorded_as_completed(self):
		report, _, payment = self.create_report(
			customer=self.customer,
			additional_amount=Decimal('0.00'),
			refundable_amount=Decimal('10.00'),
			deposit_deducted=Decimal('90.00'),
			deposit=Decimal('100.00')
		)
		admin_client = APIClient()
		admin_client.force_authenticate(user=self.admin)
		failed_refund = SimpleNamespace(
			id='re_failed_refund',
			status='failed',
			amount=1000
		)

		with patch(
			'damage_reports.views.stripe.Refund.create',
			return_value=failed_refund
		), patch(
			'damage_reports.views.stripe.PaymentIntent.retrieve',
			return_value=SimpleNamespace(
				status='succeeded',
				amount=60000,
				amount_received=60000,
				currency='inr'
			)
		):
			response = admin_client.patch(
				f'/api/damage-reports/admin/reports/{report.id}/refund/',
				{},
				format='json'
			)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['refund_status'], 'failed')
		payment.refresh_from_db()
		self.assertEqual(payment.refund_status, 'failed')
		self.assertEqual(payment.deposit_refunded, Decimal('0.00'))
		self.assertEqual(payment.refund_transaction_id, 're_failed_refund')
		self.assertEqual(
			Notification.objects.filter(
				user=self.customer,
				title='Deposit Refund Failed'
			).count(),
			1
		)

	def test_customer_cannot_process_refund(self):
		refund_report, _, _ = self.create_report(
			customer=self.customer,
			additional_amount=Decimal('0.00'),
			refundable_amount=Decimal('10.00'),
			deposit_deducted=Decimal('90.00'),
			deposit=Decimal('100.00')
		)
		response = self.customer_client().patch(
			f'/api/damage-reports/admin/reports/{refund_report.id}/refund/',
			{},
			format='json'
		)
		self.assertEqual(response.status_code, 403)
