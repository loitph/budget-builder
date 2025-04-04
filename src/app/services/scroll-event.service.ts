import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScrollEventService {
  scrollPosition$ = new BehaviorSubject<number>(0);

  constructor() { }
}
