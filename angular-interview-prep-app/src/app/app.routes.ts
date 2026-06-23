import { Routes } from '@angular/router';
import { JitAotComponent } from './concepts/jit-aot/jit-aot.component';

export const routes: Routes = [
  { path: '', redirectTo: '/jit-aot', pathMatch: 'full' },
  // CONCEPT #1: JIT vs AOT Compilation
  { path: 'jit-aot', component: JitAotComponent }
];
