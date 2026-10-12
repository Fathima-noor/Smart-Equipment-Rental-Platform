import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiService } from '../services/api';
import { of } from 'rxjs';

import { DamageReports } from './damage-reports';

describe('DamageReports', () => {
  let component: DamageReports;
  let fixture: ComponentFixture<DamageReports>;
  let apiMock: any;

  beforeEach(async () => {
    apiMock = {
      getDamageReports: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [DamageReports],
      providers: [
        { provide: ApiService, useValue: apiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DamageReports);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not show a refundable balance as complete before Stripe verification', () => {
    component.payments = [{
      booking: 12,
      deposit_refunded: '0.00',
      refund_status: 'pending',
      refund_transaction_id: 're_pending',
      refund_provider_reference_valid: true,
    }];
    const report = {
      booking: 12,
      damage_amount: '80.00',
      deposit_deducted: '80.00',
      additional_amount: '0.00',
      refundable_amount: '20.00',
    };

    expect(component.getPendingRefundAmount(report)).toBe(20);
    expect(component.getRefundStatusLabel(report)).toBe('Refund pending');
    expect(component.getSettlementMessage(report)).toContain(
      'has not yet been processed'
    );

    component.payments[0].deposit_refunded = '20.00';
    component.payments[0].refund_status = 'partially_refunded';

    expect(component.getPendingRefundAmount(report)).toBe(0);
    expect(component.getRefundStatusLabel(report)).toBe('Refund completed');
    expect(component.getSettlementMessage(report)).toContain(
      'has been refunded'
    );
  });

  it('clearly states when the deposit covers damage and no extra charge is due', () => {
    const report = {
      booking: 20,
      damage_amount: '100.00',
      deposit_deducted: '100.00',
      additional_amount: '0.00',
      refundable_amount: '0.00',
    };

    expect(component.getSettlementMessage(report)).toContain(
      'fully allocated to cover the damage'
    );
  });
});
