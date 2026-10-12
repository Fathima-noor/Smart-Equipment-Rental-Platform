import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationsWorkflow } from './operations-workflow';

describe('OperationsWorkflow', () => {
  let component: OperationsWorkflow;
  let fixture: ComponentFixture<OperationsWorkflow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsWorkflow],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsWorkflow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
