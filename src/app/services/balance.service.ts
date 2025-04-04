import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BudgetData } from '../models/budget.model';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {
  balance$ = new BehaviorSubject<BudgetData[]>([]);

  constructor() { }
}
