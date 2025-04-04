import { Component } from '@angular/core';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { BuilderComponent } from '../components/builder/builder.component';
import { BalanceComponent } from '../components/balance/balance.component';
import { DateRangeComponent } from "../components/date-range/date-range.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeaderComponent, BuilderComponent, BalanceComponent, DateRangeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  header = 'Budget Builder';
}
