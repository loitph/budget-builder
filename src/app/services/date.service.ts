import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DateService {
  selectedYear$ = new Subject<number>();
  numberOfMonths$ = new Subject<number>();

  constructor() { }
}
