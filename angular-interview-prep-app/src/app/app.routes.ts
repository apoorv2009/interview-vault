import { Routes } from '@angular/router';
import { JitAotComponent } from './concepts/jit-aot/jit-aot.component';
import { ChangeDetectionComponent } from './concepts/change-detection/change-detection.component';

export const routes: Routes = [
  { path: '', redirectTo: '/jit-aot', pathMatch: 'full' },
  // CONCEPT #1: JIT vs AOT Compilation
  { path: 'jit-aot', component: JitAotComponent },
  // CONCEPT #2: Change Detection
  { path: 'change-detection', component: ChangeDetectionComponent }
];
