import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { BudgetData } from '../models/budget.model';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {
  balance$ = new BehaviorSubject<BudgetData[]>([]);
  actionApplyAllBudget$ = new Subject<number>();

  constructor() { }
}
