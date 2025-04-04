import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { DateService } from '../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-range',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './date-range.component.html',
  styleUrl: './date-range.component.scss'
})
export class DateRangeComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  months =  Array.from({ length: 12 }, (_, i) => i + 1);
  numberOfMonths = 12;

  years = Array.from({ length: 84 }, (_, i) => new Date().getFullYear() - i);
  selectedYear = new Date().getFullYear();

  constructor(private date: DateService) { }

  selectNumberOfMonths(): void {
    this.date.numberOfMonths$.next(this.numberOfMonths);
  }

  selectYears(): void {
    this.date.selectedYear$.next(this.selectedYear);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
