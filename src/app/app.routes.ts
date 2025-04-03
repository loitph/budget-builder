import { Routes } from '@angular/router';
import { PageUrl } from './shared/constant';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: PageUrl.dashboard,
    pathMatch: 'full'
  },
  {
    path: PageUrl.dashboard,
    component: DashboardComponent
  },
];
