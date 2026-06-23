import { Routes } from '@angular/router';
import { JitAotComponent } from './concepts/jit-aot/jit-aot.component';
import { ChangeDetectionComponent } from './concepts/change-detection/change-detection.component';
import { SignalsComponent } from './concepts/signals/signals.component';

export const routes: Routes = [
  { path: '', redirectTo: '/jit-aot', pathMatch: 'full' },
  // CONCEPT #1: JIT vs AOT Compilation
  { path: 'jit-aot', component: JitAotComponent },
  // CONCEPT #2: Change Detection
  { path: 'change-detection', component: ChangeDetectionComponent },
  // CONCEPT #3: Signals
  { path: 'signals', component: SignalsComponent }
];
