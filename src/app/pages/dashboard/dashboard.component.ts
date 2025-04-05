import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { BuilderComponent } from '../components/builder/builder.component';
import { BalanceComponent } from '../components/balance/balance.component';
import { DateRangeComponent } from "../components/date-range/date-range.component";
import { BalanceService } from '../../services/balance.service';
import { Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeaderComponent, BuilderComponent, BalanceComponent, DateRangeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  header = 'Budget Builder';
  triggerObservables = {
    income$: new Subject<number>(),
    expense$: new Subject<number>(),
  };

  constructor(private balance: BalanceService) {}

  ngOnInit(): void {
    this.handleEventApplyAllBudget();
  }

  private handleEventApplyAllBudget(): void {
    this.balance.actionApplyAllBudget$.pipe(
      tap((currentCellValue) => {
        this.triggerObservables.income$.next(currentCellValue);
        this.triggerObservables.expense$.next(currentCellValue);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
