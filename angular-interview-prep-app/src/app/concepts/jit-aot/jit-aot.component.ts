// CONCEPT #1: JIT vs AOT Compilation
//
// This file IS the demo. The @Component decorator below is processed by the
// Angular AOT compiler during `ng serve`. Everything you see compiled and
// running in the browser came from build-time compilation, not runtime.
//
// Three live demos here:
//   1. Inspect the AOT-compiled component metadata (ɵcmp) Angular generates
//   2. Counter with type-checked template bindings — wrong type = BUILD error
//   3. Side-by-side bootstrap code: JIT (old) vs AOT (this project's main.ts)

import { Component } from '@angular/core';

// AOT validates at build time that every property referenced in the template
// exists on this class with a compatible type. Change 'count' to a string
// and [disabled]="count >= maxCount" will fail at BUILD, not in the browser.
@Component({
  selector: 'app-jit-aot',
  standalone: true,
  template: `
    <div class="demo-page">

      <div class="concept-tag">Concept #1 — JIT vs AOT Compilation</div>

      <!-- ── DEMO 1: Inspect the AOT-compiled component definition ── -->
      <section>
        <h2>Demo 1: What AOT compiles your component into</h2>
        <p>
          Every AOT-compiled component gets a static <code>&#123;ɵcmp&#125;</code> field injected
          by the compiler at build time. Click to inspect it in DevTools console.
        </p>

        <div class="demo-box">
          <button (click)="inspectCompiledDef()">
            Log JitAotComponent.ɵcmp → console
          </button>
          <p class="hint">
            Open DevTools → Console after clicking. You'll see the pre-compiled render
            instructions, selectors, and inputs — all generated at BUILD time, not in the browser.
            In JIT mode, this object would be created dynamically at runtime.
          </p>
        </div>

        <pre class="code">{{ inspectCode }}</pre>
      </section>

      <!-- ── DEMO 2: AOT template type-checking ── -->
      <section>
        <h2>Demo 2: AOT catches template type errors at build time</h2>
        <p>
          The counter uses a <code>number</code> property bound to <code>[disabled]</code>.
          AOT validates the type at BUILD time. See comment in source for how to break it.
        </p>

        <div class="demo-box">
          <div class="counter">
            <!-- AOT type-checks: count and maxCount are both number — valid comparison -->
            <button (click)="decrement()" [disabled]="count <= 0">−</button>
            <span class="count-display">{{ count }}</span>
            <button (click)="increment()" [disabled]="count >= maxCount">+</button>
          </div>
          <p class="hint">
            Max: {{ maxCount }}.
            Try changing <code>count: number = 0</code> to <code>count: string = '0'</code>
            in the source — <code>ng build</code> will fail with a type error in terminal
            before the browser ever sees the change.
          </p>
        </div>

        <pre class="code">{{ typeCheckCode }}</pre>
      </section>

      <!-- ── DEMO 3: Bootstrap code difference ── -->
      <section>
        <h2>Demo 3: The one line of code that shows JIT vs AOT</h2>
        <p>
          The most visible difference is in <code>main.ts</code>.
          AOT uses <code>bootstrapApplication</code> — no compiler shipped.
          JIT used <code>platformBrowserDynamic().bootstrapModule()</code> — compiler ran in browser.
        </p>

        <div class="split">
          <div class="split-panel jit-panel">
            <div class="panel-label">JIT — Legacy (Angular &lt; v9)</div>
            <pre class="code">{{ jitBootstrapCode }}</pre>
          </div>
          <div class="split-panel aot-panel">
            <div class="panel-label">AOT — This project's main.ts</div>
            <pre class="code">{{ aotBootstrapCode }}</pre>
          </div>
        </div>

        <p class="hint">
          Open <code>src/main.ts</code> in this project — you'll see the AOT version exactly.
          There is no Angular compiler in the dist/ bundle.
        </p>
      </section>

    </div>
  `,
  styles: [`
    .demo-page {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, sans-serif;
      color: #1e293b;
    }

    .concept-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #e94560;
      margin-bottom: 2rem;
    }

    h2 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.4rem;
      color: #0f172a;
    }

    section {
      margin-bottom: 2.5rem;
      border-left: 3px solid #e2e8f0;
      padding-left: 1.25rem;
    }

    section > p {
      font-size: 0.875rem;
      color: #475569;
      margin: 0 0 0.75rem;
      line-height: 1.55;
    }

    .demo-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
    }

    .demo-box button {
      background: #0f172a;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      font-family: inherit;

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #1e293b;
      }
    }

    .counter {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .counter button {
      width: 2rem;
      height: 2rem;
      padding: 0;
      font-size: 1.1rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .count-display {
      font-size: 1.75rem;
      font-weight: 700;
      font-family: monospace;
      min-width: 2.5rem;
      text-align: center;
      color: #0f172a;
    }

    .hint {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0.6rem 0 0;
      line-height: 1.5;
    }

    code {
      background: #f1f5f9;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.85em;
      color: #dc2626;
    }

    pre.code {
      background: #0f172a;
      color: #94a3b8;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
      font-size: 0.78rem;
      line-height: 1.65;
      margin: 0.5rem 0 0;
      overflow-x: auto;
      white-space: pre;
    }

    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    @media (max-width: 640px) {
      .split { grid-template-columns: 1fr; }
    }

    .split-panel {
      border-radius: 8px;
      overflow: hidden;
    }

    .panel-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.4rem 1rem;
    }

    .jit-panel .panel-label { background: #7c3aed; color: white; }
    .aot-panel .panel-label { background: #059669; color: white; }

    .split-panel pre.code { border-radius: 0; margin: 0; }
  `]
})
export class JitAotComponent {

  // ── Demo 2: type-checked counter ──────────────────────────────────────
  // 'count' is typed as number. AOT verifies [disabled]="count >= maxCount"
  // is a valid boolean expression at BUILD time.
  // Change count to `count: string = '0'` → ng build fails with type error.
  count: number = 0;
  maxCount: number = 10;

  increment(): void {
    if (this.count < this.maxCount) this.count++;
  }

  decrement(): void {
    if (this.count > 0) this.count--;
  }

  // ── Demo 1: inspect compiled component definition ─────────────────────
  // ɵcmp is a static field the AOT compiler injects at build time.
  // JIT would create this dynamically in the browser — AOT creates it before deployment.
  inspectCompiledDef(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compiled = (JitAotComponent as any)['ɵcmp'];
    console.group('AOT-compiled JitAotComponent.ɵcmp');
    console.log('selectors:', compiled.selectors);
    console.log('inputs:   ', compiled.inputs);
    console.log('outputs:  ', compiled.outputs);
    console.log('template fn (first 120 chars):', compiled.template.toString().slice(0, 120) + '...');
    console.log('full ɵcmp:', compiled);
    console.groupEnd();
  }

  // ── Code snippets shown as strings (avoids Angular parsing { } in templates) ──

  inspectCode =
`// Works because AOT injects ɵcmp at BUILD time — not in browser
const compiled = (JitAotComponent as any)['ɵcmp'];
console.log(compiled.selectors);       // [['app-jit-aot']]
console.log(compiled.inputs);          // {}
console.log(compiled.template + '');   // pre-compiled render function`;

  typeCheckCode =
`// Component class
count: number = 0;      // ✓ number → [disabled]="count >= maxCount" compiles fine
// count: string = '0'; // ✗ ng build FAILS:
//   Type 'string' is not assignable to type 'number'
//   Error appears in TERMINAL during build, not in browser console.
//   JIT would only catch this at runtime when the component renders.`;

  jitBootstrapCode =
`// main.ts (JIT, Angular < v9)
// platform-browser-dynamic ships the compiler to the browser (~1-2 MB)
import { platformBrowserDynamic }
  from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule);
// Compiler runs HERE, inside the user's browser at startup`;

  aotBootstrapCode =
`// main.ts (AOT — the actual file in this project)
// platform-browser has NO compiler — runtime only
import { bootstrapApplication }
  from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
// AppComponent already compiled — nothing to compile in browser`;
}
