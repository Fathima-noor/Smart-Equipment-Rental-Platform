import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDamageIssues } from './admin-damage-issues';

describe('AdminDamageIssues', () => {
  let component: AdminDamageIssues;
  let fixture: ComponentFixture<AdminDamageIssues>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDamageIssues],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDamageIssues);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
