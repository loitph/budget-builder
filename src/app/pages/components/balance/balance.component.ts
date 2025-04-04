import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { MonthPattern } from '../../../shared/constant';
import { Subject, takeUntil, tap } from 'rxjs';
import { ScrollEventService } from '../../../services/scroll-event.service';
import { BalanceService } from '../../../services/balance.service';
import { BudgetData } from '../../../models/budget.model';
import { DateService } from '../../../services/date.service';

@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [],
  templateUrl: './balance.component.html',
  styleUrl: './balance.component.scss',
})
export class BalanceComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  @ViewChild('scrollableTable') scrollableTable!: ElementRef<HTMLDivElement>;

  months = signal<string[]>([...MonthPattern]);
  profitNLoss = signal<number[]>([]);
  opening = signal<number[]>(Array(this.months().length).fill(0));
  closing = signal<number[]>(Array(this.months().length).fill(0));

  constructor(
    private scrollEvent: ScrollEventService,
    private balance: BalanceService,
    private date: DateService
  ) {}

  ngOnInit(): void {
    this.handleBalanceData();
    this.handleDisplayNumberOfMonths();
  }

  ngAfterViewInit(): void {
    this.syncScrollToLeft();
  }

  private updateTotalList(initArray: number[], num: number): number[] {
    const length = initArray.length;

    if (num <= length) {
      return initArray.slice(0, num);
    } else {
      const newArray = [...initArray];
      for (let i = length + 1; i < num; i++) {
        newArray.push(0);
      }

      newArray.push(+num); // added selected number
      return newArray;
    }
  }

  private handleDisplayNumberOfMonths(): void {
    this.date.numberOfMonths$
      .pipe(
        tap((numberOfMonths) => {
          // updated months
          this.months.set(
            [...MonthPattern]
              .slice(0, numberOfMonths)
              .map((month) => `${month}`)
          );

          // updated pnl, opening, and closing
          const updatedPNL = [...this.profitNLoss()];
          const updatedOpening = [...this.opening()];
          const updatedClosing = [...this.closing()];
          this.profitNLoss.set(
            this.updateTotalList(updatedPNL, numberOfMonths)
          );
          this.opening.set(
            this.updateTotalList(updatedOpening, numberOfMonths)
          );
          this.closing.set(
            this.updateTotalList(updatedClosing, numberOfMonths)
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private handleBalanceData(): void {
    this.balance.balance$
      .pipe(
        tap((data) => {
          this.updateProfitNLoss(data);
          this.updateOpenNClose();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private updateProfitNLoss(balanceData: BudgetData[]): void {
    const totalIncome =
      balanceData.find((item) => item.type === 'income')?.total || [];
    const totalExpense =
      balanceData.find((item) => item.type === 'expense')?.total || [];

    if (totalIncome.length === 0 || totalExpense.length === 0) {
      this.profitNLoss.set(Array(this.months().length).fill(0));
    } else {
      this.profitNLoss.set(
        totalIncome.map((num, index) => num - totalExpense[index])
      );
    }
  }

  private updateOpenNClose(): void {
    const profitLoss = this.profitNLoss();
    let opening = [...this.opening()];
    let closing = [...this.closing()];

    // init opening balance
    opening = [0];

    for (let i = 0; i < profitLoss.length; i++) {
      // calculated closing balance
      closing[i] = opening[i] + profitLoss[i];

      // calculated opening balance for next month
      if (i < profitLoss.length - 1) {
        opening[i + 1] = closing[i];
      }
    }

    // set data
    this.opening.set(opening);
    this.closing.set(closing);
  }

  syncScroll(e: Event): void {
    const target = e.target as HTMLElement;
    this.scrollEvent.scrollPosition$.next(target.scrollLeft);
  }

  private syncScrollToLeft(): void {
    this.scrollEvent.scrollPosition$
      .pipe(
        tap(
          (scrollLeft) =>
            (this.scrollableTable.nativeElement.scrollLeft = scrollLeft)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
