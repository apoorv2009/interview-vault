// CONCEPT #3: Signals — input(), output(), model(), toSignal(), toObservable()
//
// Signals are Angular's reactive primitive (v16+). These APIs build on top of signal():
//
//  input()         — read-only signal set by the parent (replaces @Input)
//  output()        — emits events to parent (replaces @Output + EventEmitter)
//  model()         — two-way binding signal, readable AND writable (replaces @Input + @Output pair)
//  toSignal()      — wraps an RxJS Observable in a signal (auto-subscribes, auto-cleans up)
//  toObservable()  — exposes a signal as an RxJS Observable (lets you use pipe/operators)
//
// Four demos — each one is a working, interactive Angular component.

import { Component, computed, input, model, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, tap } from 'rxjs/operators';

// Shared child panel styles — declared before child components that reference it
const CHILD_STYLES = `
  .child-panel { border:2px solid; border-radius:8px; padding:1rem; }
  .blue-panel  { border-color:#3b82f6; background:#eff6ff; }
  .green-panel { border-color:#10b981; background:#f0fdf4; }
  .child-label { font-size:.65rem; font-weight:700; text-transform:uppercase;
                 letter-spacing:.06em; color:#6b7280; margin-bottom:.75rem; }
  .row  { display:flex; justify-content:space-between; align-items:center;
          margin-bottom:.5rem; font-size:.9rem; }
  .key  { color:#475569; }
  .big  { font-size:1.5rem; }
  .btn-row { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.5rem; }
  button { background:#0f172a; color:white; border:none; padding:.4rem .85rem;
           border-radius:6px; font-size:.8rem; cursor:pointer; font-family:inherit; }
  button:hover { background:#1e293b; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// DEMO 1 — input() and output()
// ─────────────────────────────────────────────────────────────────────────────

// This child receives a name via input() and emits its doubled length via output().
// input() creates a READ-ONLY signal — the child can read it, but cannot write it.
// output() creates an event emitter — no EventEmitter or Subject needed.
@Component({
  selector: 'app-signal-io-child',
  standalone: true,
  template: `
    <div class="child-panel blue-panel">
      <div class="child-label">Child Component (app-signal-io-child)</div>

      <!-- Reading input() signal — same syntax as any other signal: name() -->
      <div class="row">
        <span class="key">name (input signal)</span>
        <strong>{{ name() }}</strong>
      </div>

      <!-- computed() auto-derives from name(). Re-runs only when name() changes. -->
      <div class="row">
        <span class="key">nameLength (computed)</span>
        <strong>{{ nameLength() }}</strong>
      </div>

      <!-- output() fires the event to parent — no EventEmitter needed -->
      <button (click)="emitDoubled()">
        output.emit(doubled length → {{ nameLength() * 2 }})
      </button>
    </div>
  `,
  styles: [CHILD_STYLES]
})
export class SignalIoChild {
  // Replaces: @Input() name: string = 'World';
  // 'World' is the default — used if parent doesn't bind [name]
  name = input('World');

  // Replaces: @Output() doubled = new EventEmitter<number>();
  doubled = output<number>();

  // computed() — derived from input signal. Recalculates automatically.
  nameLength = computed(() => this.name().length);

  emitDoubled(): void {
    this.doubled.emit(this.nameLength() * 2);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO 2 — model()
// ─────────────────────────────────────────────────────────────────────────────

// model() is a WritableSignal that is ALSO an @Input/@Output pair combined.
// The child can read AND write it. Writing the model updates the parent's binding.
// Replaces the verbose pattern: @Input() value + @Output() valueChange = new EventEmitter()
@Component({
  selector: 'app-signal-model-child',
  standalone: true,
  template: `
    <div class="child-panel green-panel">
      <div class="child-label">Child Component (app-signal-model-child)</div>

      <!-- model() is a writable signal — read it like count() -->
      <div class="row">
        <span class="key">count (model signal)</span>
        <strong class="big">{{ count() }}</strong>
      </div>

      <!-- Writing the model via .update() syncs back to the parent automatically -->
      <div class="btn-row">
        <button (click)="increment()">Child +1</button>
        <button (click)="decrement()">Child −1</button>
        <button (click)="count.set(0)">Child reset</button>
      </div>
    </div>
  `,
  styles: [CHILD_STYLES]
})
export class SignalModelChild {
  // Replaces: @Input() count = 0; + @Output() countChange = new EventEmitter<number>();
  // model() binds two-way: parent reads AND child writes, both stay in sync.
  count = model(0);

  increment(): void { this.count.update(v => v + 1); }
  decrement(): void { this.count.update(v => v - 1); }
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-signals',
  standalone: true,
  imports: [SignalIoChild, SignalModelChild],
  template: `
    <div class="demo-page">
      <div class="concept-tag">Concept #3 — Signals: input · output · model · toSignal · toObservable</div>

      <!-- ── DEMO 1: input() and output() ──────────────────────────────── -->
      <section>
        <h2>Demo 1: input() and output()</h2>
        <p>
          <code>input()</code> replaces <code>&#64;Input()</code> — gives you a read-only signal set by the parent.<br>
          <code>output()</code> replaces <code>&#64;Output() + EventEmitter</code> — emits typed events to the parent.
        </p>

        <div class="demo-box">
          <!-- Parent controls what the child receives -->
          <div class="parent-row">
            <span class="parent-label">Parent</span>
            <input
              class="text-input"
              [value]="parentName()"
              (input)="setParentName($event)"
              placeholder="type a name..." />
            <span class="parent-label">received from child: <strong>{{ receivedDoubled() ?? '—' }}</strong></span>
          </div>

          <!-- Child gets [name] as input signal, emits (doubled) output -->
          <app-signal-io-child
            [name]="parentName()"
            (doubled)="receivedDoubled.set($event)" />
        </div>

        <pre class="code">{{ demo1Code }}</pre>
      </section>

      <!-- ── DEMO 2: model() ────────────────────────────────────────────── -->
      <section>
        <h2>Demo 2: model() — two-way binding signal</h2>
        <p>
          <code>model()</code> is a <strong>WritableSignal</strong> that acts as both <code>&#64;Input</code> and <code>&#64;Output</code>.
          Parent and child share the same value — either side can update it.
        </p>

        <div class="demo-box">
          <div class="parent-row">
            <span class="parent-label">Parent</span>
            <strong class="big-num">{{ sharedCount() }}</strong>
            <button (click)="sharedCount.set(sharedCount() + 10)">Parent +10</button>
            <button (click)="sharedCount.set(0)">Parent reset</button>
          </div>

          <!-- Two-way binding: child writes update parent's sharedCount signal -->
          <!-- [count]="sharedCount()" passes the value; (countChange) updates parent -->
          <app-signal-model-child
            [count]="sharedCount()"
            (countChange)="sharedCount.set($event)" />
        </div>

        <pre class="code">{{ demo2Code }}</pre>
      </section>

      <!-- ── DEMO 3: toSignal() ─────────────────────────────────────────── -->
      <section>
        <h2>Demo 3: toSignal() — Observable → Signal</h2>
        <p>
          <code>toSignal(obs$)</code> subscribes to an Observable and exposes its latest value as a signal.
          Angular auto-unsubscribes when the component is destroyed. No <code>async</code> pipe or <code>ngOnDestroy</code> needed.
        </p>

        <div class="demo-box">
          <div class="signal-grid">
            <div class="sig-cell">
              <div class="sig-label">interval(1000) → toSignal()</div>
              <!-- timerCount is a signal — reads the latest Observable emission -->
              <div class="sig-val">{{ timerCount() }}s</div>
            </div>
            <div class="sig-cell">
              <div class="sig-label">doubled (computed from toSignal)</div>
              <div class="sig-val">{{ timerDoubled() }}s</div>
            </div>
          </div>
        </div>

        <pre class="code">{{ demo3Code }}</pre>
      </section>

      <!-- ── DEMO 4: toObservable() ─────────────────────────────────────── -->
      <section>
        <h2>Demo 4: toObservable() — Signal → Observable → RxJS → Signal</h2>
        <p>
          <code>toObservable(sig)</code> converts a signal to an Observable so you can apply RxJS operators.
          Classic pattern: signal → debounce → distinctUntilChanged → back to signal.
        </p>

        <div class="demo-box">
          <input
            class="text-input full-width"
            (input)="setSearch($event)"
            placeholder="Type to search (watch debounce in action)..." />

          <div class="signal-grid" style="margin-top:.75rem">
            <div class="sig-cell">
              <div class="sig-label">searchTerm signal (raw)</div>
              <!-- Updates on every keystroke -->
              <div class="sig-val small-val">{{ searchTerm() || '—' }}</div>
            </div>
            <div class="sig-cell">
              <div class="sig-label">debouncedTerm (400ms)</div>
              <!-- Only updates 400ms after you stop typing -->
              <div class="sig-val small-val">{{ debouncedTerm() || '—' }}</div>
            </div>
            <div class="sig-cell">
              <div class="sig-label">debounce fired</div>
              <!-- Shows how many fewer updates the Observable sees -->
              <div class="sig-val">{{ debounceFireCount() }}×</div>
            </div>
          </div>
        </div>

        <pre class="code">{{ demo4Code }}</pre>
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
      font-size: .7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #e94560;
      margin-bottom: 2rem;
    }

    h2 { font-size: 1rem; font-weight: 600; margin: 0 0 .4rem; color: #0f172a; }

    section {
      margin-bottom: 2.5rem;
      border-left: 3px solid #e2e8f0;
      padding-left: 1.25rem;
    }

    section > p {
      font-size: .875rem;
      color: #475569;
      margin: 0 0 .75rem;
      line-height: 1.6;
    }

    .demo-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: .75rem;
    }

    .parent-row {
      display: flex;
      align-items: center;
      gap: .75rem;
      flex-wrap: wrap;
      margin-bottom: .75rem;
      padding-bottom: .75rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .parent-label {
      font-size: .75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .text-input {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: .35rem .65rem;
      font-size: .875rem;
      font-family: inherit;
      outline: none;
      color: #0f172a;

      &:focus { border-color: #3b82f6; }
    }

    .full-width { width: 100%; box-sizing: border-box; }

    button {
      background: #0f172a;
      color: white;
      border: none;
      padding: .4rem .85rem;
      border-radius: 6px;
      font-size: .8rem;
      cursor: pointer;
      font-family: inherit;

      &:hover { background: #1e293b; }
    }

    .big-num { font-size: 1.5rem; font-weight: 700; }

    code {
      background: #f1f5f9;
      padding: .1rem .3rem;
      border-radius: 3px;
      font-family: monospace;
      font-size: .83em;
      color: #dc2626;
    }

    pre.code {
      background: #0f172a;
      color: #94a3b8;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
      font-size: .78rem;
      line-height: 1.65;
      margin: .5rem 0 0;
      overflow-x: auto;
      white-space: pre;
    }

    .signal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: .75rem;
    }

    .sig-cell {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: .75rem;
      text-align: center;
    }

    .sig-label {
      font-size: .65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #6b7280;
      margin-bottom: .3rem;
    }

    .sig-val { font-size: 1.75rem; font-weight: 700; color: #0f172a; }
    .small-val { font-size: 1rem; word-break: break-all; }
  `]
})
export class SignalsComponent {

  // ── Demo 1: input() + output() ───────────────────────────────────────────
  parentName    = signal('Angular');
  receivedDoubled = signal<number | null>(null);

  setParentName(event: Event): void {
    this.parentName.set((event.target as HTMLInputElement).value);
  }

  // ── Demo 2: model() ──────────────────────────────────────────────────────
  // sharedCount is owned by the parent but model() lets the child write it too
  sharedCount = signal(0);

  // ── Demo 3: toSignal() ───────────────────────────────────────────────────
  // interval(1000) emits 0, 1, 2... every second — wrap it in toSignal()
  // toSignal() subscribes automatically and unsubscribes on component destroy
  timerCount = toSignal(
    interval(1000).pipe(map(n => n + 1)),
    { initialValue: 0 }
  );

  // computed() works on toSignal results just like any other signal
  timerDoubled = computed(() => this.timerCount() * 2);

  // ── Demo 4: toObservable() ───────────────────────────────────────────────
  searchTerm = signal('');

  // Step 1: signal → Observable (so we can use RxJS operators)
  private searchTerm$ = toObservable(this.searchTerm);

  // Track debounce fires via tap() inside the pipe
  debounceFireCount = signal(0);

  // Step 2: apply RxJS operators | Step 3: back to signal via toSignal()
  debouncedTerm = toSignal(
    this.searchTerm$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(() => this.debounceFireCount.update(n => n + 1))
    ),
    { initialValue: '' }
  );

  setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  // ── Code snippets ────────────────────────────────────────────────────────

  demo1Code =
`// Child — uses input() and output()
import { input, output, computed } from '@angular/core';

export class SignalIoChild {
  name     = input('World');          // read-only signal; parent sets via [name]
  doubled  = output<number>();        // replaces @Output() doubled = new EventEmitter<number>()
  nameLength = computed(() => this.name().length); // auto-recalculates when name() changes

  emitDoubled() { this.doubled.emit(this.nameLength() * 2); }
}

// Parent template
<app-signal-io-child
  [name]="parentName()"        // pass signal value
  (doubled)="onDoubled($event)" />  // listen to output()`;

  demo2Code =
`// Child — uses model() for two-way binding
import { model } from '@angular/core';

export class SignalModelChild {
  // Replaces: @Input() count + @Output() countChange = new EventEmitter<number>()
  count = model(0);   // WritableSignal — child can read AND write
  increment() { this.count.update(v => v + 1); }  // writing syncs back to parent
}

// Parent template — explicit two-way binding
<app-signal-model-child
  [count]="sharedCount()"               // read: pass current value
  (countChange)="sharedCount.set($event)" />  // write: child update → parent signal

// Alternative (Angular 17.2+): shorthand two-way syntax
// <app-signal-model-child [(count)]="sharedCount" />`;

  demo3Code =
`// toSignal() — wrap any Observable in a signal
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

export class MyComponent {
  // interval(1000) emits 0, 1, 2... every second
  // toSignal() subscribes and exposes latest value as a signal
  // Auto-unsubscribes when component is destroyed — no ngOnDestroy needed
  timerCount = toSignal(interval(1000), { initialValue: 0 });

  // computed() works on toSignal results — reactive chain preserved
  timerDoubled = computed(() => this.timerCount() * 2);
}

// Template — read like any signal
<div>{{ timerCount() }}s</div>
<div>{{ timerDoubled() }}s</div>`;

  demo4Code =
`// toObservable() — convert signal to Observable, use RxJS operators, convert back
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export class SearchComponent {
  searchTerm = signal('');

  // Step 1: signal → Observable (gain access to full RxJS operator library)
  private searchTerm$ = toObservable(this.searchTerm);

  // Step 2: apply operators   Step 3: back to signal for the template
  debouncedTerm = toSignal(
    this.searchTerm$.pipe(
      debounceTime(400),          // wait 400ms after last keystroke
      distinctUntilChanged()      // skip if value hasn't changed
    ),
    { initialValue: '' }
  );
}

// Template
<input (input)="setSearch($event)" />
<div>raw:      {{ searchTerm() }}</div>    // updates on every keystroke
<div>debounced: {{ debouncedTerm() }}</div> // updates 400ms after typing stops`;
}
