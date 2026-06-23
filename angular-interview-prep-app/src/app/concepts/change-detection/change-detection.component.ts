// CONCEPT #2: Change Detection
//
// Angular needs to know when component data changes so it can update the DOM.
// Change Detection (CD) is the mechanism that does this.
//
// Three demos:
//   1. Default vs OnPush  — mutation (same ref) vs new object reference
//   2. ChangeDetectorRef  — manually freeze, force-update, detach a component
//   3. Signals            — fine-grained reactivity that skips CD entirely

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO 1 helpers — two child components with different CD strategies
// ─────────────────────────────────────────────────────────────────────────────

// Default: Angular re-evaluates the template on EVERY CD cycle.
// Mutating item.value (same reference) is still visible here because Angular
// re-reads all bindings each time zone.js triggers a check.
@Component({
  selector: 'app-cd-default',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="child-box default-box">
      <div class="strat-label">Default</div>
      <div class="big-val">{{ item.value }}</div>
      <div class="small-meta">ngOnChanges (ref changes): {{ refChangeCount }}</div>
    </div>
  `,
  styles: [`
    .child-box { border:2px solid; border-radius:8px; padding:1rem; }
    .default-box { border-color:#3b82f6; background:#eff6ff; }
    .strat-label { font-size:.65rem; font-weight:700; text-transform:uppercase;
                   letter-spacing:.06em; color:#1d4ed8; margin-bottom:.4rem; }
    .big-val { font-size:2rem; font-weight:700; color:#0f172a; }
    .small-meta { font-size:.75rem; color:#64748b; margin-top:.25rem; }
  `]
})
export class CdDefaultChild implements OnChanges {
  @Input() item!: { value: number };
  refChangeCount = 0;
  // ngOnChanges fires only on reference change — same for both strategies.
  // The *extra* Default behaviour is re-rendering without any ngOnChanges call.
  ngOnChanges(): void { this.refChangeCount++; }
}

// OnPush: Angular checks this component ONLY when:
//   • an @Input() reference changes   (triggers ngOnChanges too)
//   • an event originates from this component or its children
//   • an async pipe inside emits a new value
//   • markForCheck() or detectChanges() is called explicitly
@Component({
  selector: 'app-cd-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="child-box onpush-box">
      <div class="strat-label">OnPush</div>
      <div class="big-val">{{ item.value }}</div>
      <div class="small-meta">ngOnChanges (ref changes): {{ refChangeCount }}</div>
    </div>
  `,
  styles: [`
    .child-box { border:2px solid; border-radius:8px; padding:1rem; }
    .onpush-box { border-color:#10b981; background:#f0fdf4; }
    .strat-label { font-size:.65rem; font-weight:700; text-transform:uppercase;
                   letter-spacing:.06em; color:#047857; margin-bottom:.4rem; }
    .big-val { font-size:2rem; font-weight:700; color:#0f172a; }
    .small-meta { font-size:.75rem; color:#64748b; margin-top:.25rem; }
  `]
})
export class CdOnPushChild implements OnChanges {
  @Input() item!: { value: number };
  refChangeCount = 0;
  ngOnChanges(): void { this.refChangeCount++; }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO 2 helper — OnPush component with an internal timer
// ─────────────────────────────────────────────────────────────────────────────

// This component is deliberately OnPush and has an internal setInterval.
// Zone.js patches setInterval, so CD runs every second — but this component
// is never marked dirty, so its view stays frozen at whatever value it last showed.
// The parent controls it via @ViewChild using the public methods below.
@Component({
  selector: 'app-cd-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timer-box" [class.detached-box]="isDetached">
      <div class="timer-val">{{ timerValue }}s</div>
      <div class="timer-label">
        {{ isDetached ? 'detached — completely frozen' : 'OnPush — frozen until you act' }}
      </div>
    </div>
  `,
  styles: [`
    .timer-box { border:2px solid #7c3aed; background:#f5f3ff;
                 border-radius:8px; padding:1rem; text-align:center; }
    .detached-box { border-color:#dc2626; background:#fef2f2; }
    .timer-val { font-size:2.5rem; font-weight:700; color:#0f172a; }
    .timer-label { font-size:.75rem; color:#6b7280; margin-top:.25rem; }
  `]
})
export class CdTimerChild implements OnInit, OnDestroy {
  timerValue = 0;
  isDetached = false;
  private intervalId!: ReturnType<typeof setInterval>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // setInterval fires every second → zone.js → ApplicationRef.tick() → CD runs.
    // CD reaches this OnPush component → not dirty → template skipped → frozen view.
    this.intervalId = setInterval(() => this.timerValue++, 1000);
  }

  ngOnDestroy(): void { clearInterval(this.intervalId); }

  // Public — called from parent via @ViewChild (parent button click does NOT
  // mark this OnPush component dirty, so view stays frozen without these calls).
  markForCheck(): void  { this.cdr.markForCheck(); }   // dirty flag → updates on next tick
  detectChanges(): void { this.cdr.detectChanges(); }  // sync update right now
  detach(): void {
    this.isDetached = true;
    this.cdr.detach();         // remove from CD tree entirely
    this.cdr.detectChanges();  // show the "detached" state immediately
  }
  reattach(): void {
    this.isDetached = false;
    this.cdr.reattach();       // re-add to CD tree
    this.cdr.detectChanges();  // show restored state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-change-detection',
  standalone: true,
  imports: [CdDefaultChild, CdOnPushChild, CdTimerChild],
  template: `
    <div class="demo-page">
      <div class="concept-tag">Concept #2 — Change Detection</div>

      <!-- ── DEMO 1: Default vs OnPush ─────────────────────────────────── -->
      <section>
        <h2>Demo 1: Default vs OnPush — mutation vs new reference</h2>
        <p>
          Both children receive the same <code>sharedItem</code> object as <code>&#64;Input</code>.
          Watch how each strategy responds to a mutation (same ref) vs a brand-new object.
        </p>

        <div class="demo-box">
          <div class="action-row">
            <button (click)="mutateItem()">
              Mutate → <code>sharedItem.value++</code>
            </button>
            <button (click)="replaceItem()">
              New ref → <code>sharedItem = &#123; value: ... &#125;</code>
            </button>
          </div>
          <div class="children-row">
            <!-- Both get [item]="sharedItem" -->
            <app-cd-default [item]="sharedItem" />
            <app-cd-onpush  [item]="sharedItem" />
          </div>
        </div>

        <pre class="code">{{ demo1Code }}</pre>
      </section>

      <!-- ── DEMO 2: ChangeDetectorRef ─────────────────────────────────── -->
      <section>
        <h2>Demo 2: ChangeDetectorRef — freeze, force-check, detach</h2>
        <p>
          The timer below is OnPush with a 1-second <code>setInterval</code>.
          Zone.js fires CD every second but the view stays frozen — the component is never dirty.
          The buttons control it from the parent via <code>&#64;ViewChild</code>.
        </p>

        <div class="demo-box">
          <app-cd-timer />

          <div class="action-row" style="margin-top:1rem">
            <button (click)="callMarkForCheck()">
              markForCheck() — dirty flag, updates on next tick
            </button>
            <button (click)="callDetectChanges()">
              detectChanges() — sync update right now
            </button>
            <button (click)="callDetach()">
              detach() — remove from CD tree
            </button>
            <button (click)="callReattach()">
              reattach() — re-add to CD tree
            </button>
          </div>
        </div>

        <pre class="code">{{ demo2Code }}</pre>
      </section>

      <!-- ── DEMO 3: Signals ───────────────────────────────────────────── -->
      <section>
        <h2>Demo 3: Signals — fine-grained reactivity</h2>
        <p>
          Signals are Angular's native reactive primitive (v16+). When a signal changes,
          only the specific template expressions that read it are updated — no full component
          re-render, no CD strategy needed, no zone.js dependency.
        </p>

        <div class="demo-box">
          <div class="signal-row">
            <div class="signal-cell">
              <div class="sig-label">count (signal)</div>
              <!-- Reading count() in the template creates a reactive subscription -->
              <div class="sig-val">{{ count() }}</div>
            </div>
            <div class="signal-cell">
              <div class="sig-label">doubled (computed)</div>
              <!-- computed() re-evaluates only when count() changes -->
              <div class="sig-val">{{ doubled() }}</div>
            </div>
            <div class="signal-cell">
              <div class="sig-label">label (computed)</div>
              <div class="sig-val small-text">{{ label() }}</div>
            </div>
          </div>

          <div class="action-row" style="margin-top:1rem">
            <button (click)="incrementCount()">
              count.set(n + 1)
            </button>
            <button (click)="doubleCount()">
              count.update(c => c * 2)
            </button>
            <button (click)="count.set(0)">
              count.set(0)
            </button>
          </div>
        </div>

        <pre class="code">{{ demo3Code }}</pre>
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
      line-height: 1.55;
    }

    .demo-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: .75rem;
    }

    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }

    .action-row button {
      background: #0f172a;
      color: white;
      border: none;
      padding: .45rem .9rem;
      border-radius: 6px;
      font-size: .8rem;
      cursor: pointer;
      font-family: inherit;
      white-space: nowrap;

      &:hover { background: #1e293b; }
    }

    .children-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .75rem;
      margin-top: .75rem;
    }

    @media (max-width: 560px) {
      .children-row { grid-template-columns: 1fr; }
    }

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

    /* Demo 3 signals */
    .signal-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .75rem;
    }

    .signal-cell {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: .75rem 1rem;
      text-align: center;
    }

    .sig-label { font-size: .65rem; font-weight: 700; text-transform: uppercase;
                 letter-spacing: .06em; color: #6b7280; margin-bottom: .25rem; }
    .sig-val   { font-size: 1.75rem; font-weight: 700; color: #0f172a; }
    .small-text { font-size: 1rem; }
  `]
})
export class ChangeDetectionComponent {

  // ── Demo 1: shared object passed as @Input to both children ─────────────
  sharedItem = { value: 0 };

  mutateItem(): void {
    // Same reference → Default re-renders (reads fresh value on every CD cycle).
    // OnPush does NOT re-render (reference unchanged → not marked dirty).
    this.sharedItem.value++;
  }

  replaceItem(): void {
    // New object reference → Angular detects reference change on BOTH children.
    // Both OnPush and Default re-render. ngOnChanges fires on both.
    this.sharedItem = { value: this.sharedItem.value + 1 };
  }

  // ── Demo 2: parent controls OnPush child via @ViewChild ─────────────────
  // Buttons are in the PARENT template → their click events do not mark the
  // OnPush child dirty. Only explicit ChangeDetectorRef calls do.
  @ViewChild(CdTimerChild) private timerChild!: CdTimerChild;

  callMarkForCheck(): void  { this.timerChild?.markForCheck(); }
  callDetectChanges(): void { this.timerChild?.detectChanges(); }
  callDetach(): void        { this.timerChild?.detach(); }
  callReattach(): void      { this.timerChild?.reattach(); }

  // ── Demo 3: Signals ──────────────────────────────────────────────────────
  // signal() — a writable reactive value
  count = signal(0);

  // computed() — a read-only derived signal; re-evaluates only when count() changes
  doubled = computed(() => this.count() * 2);
  label   = computed(() => this.count() === 0 ? 'zero' : this.count() > 0 ? 'positive' : 'negative');

  incrementCount(): void { this.count.set(this.count() + 1); }
  doubleCount(): void    { this.count.update(c => c * 2); }

  // ── Code snippets ────────────────────────────────────────────────────────

  demo1Code =
`// Two children, same @Input, different CD strategies

// Parent mutates — same object reference:
mutateItem() { this.sharedItem.value++; }
// → Default child: re-renders (reads fresh value on every CD cycle) ✓
// → OnPush child:  stays frozen (not dirty, reference unchanged)    ✗ (stale)

// Parent replaces — new object reference:
replaceItem() { this.sharedItem = { value: this.sharedItem.value + 1 }; }
// → Default child: re-renders ✓
// → OnPush child:  re-renders (reference changed → marked dirty)    ✓

// Template
@Component({ changeDetection: ChangeDetectionStrategy.OnPush, ... })
class CdOnPushChild {
  @Input() item!: { value: number };  // only reference change triggers update
  ngOnChanges() { ... }               // only fires on reference change
}`;

  demo2Code =
`// ChangeDetectorRef methods:
constructor(private cdr: ChangeDetectorRef) {}

markForCheck()  → marks this component + ancestors dirty
                   view updates on the NEXT CD cycle (async)

detectChanges() → immediately runs CD on this component's subtree
                   view updates RIGHT NOW (sync), even if detached

detach()        → removes component from the CD tree entirely
                   zone.js can still run tick() but this component is never reached
                   only detectChanges() can force an update while detached

reattach()      → re-adds to the CD tree
                   OnPush rules apply again

// Pattern: long-lived timer in OnPush component
ngOnInit() {
  setInterval(() => {
    this.value++;
    // zone.js triggers tick() → CD runs → OnPush not dirty → view frozen
    // Need markForCheck() or detectChanges() to unfreeze
    this.cdr.markForCheck(); // ← add this line to auto-update each tick
  }, 1000);
}`;

  demo3Code =
`import { signal, computed } from '@angular/core';

// signal() — writable reactive container
count = signal(0);

// computed() — read-only derived signal, auto-updates when dependencies change
doubled = computed(() => this.count() * 2);

// Mutations
count.set(5);            // replace value
count.update(c => c+1); // derive new value from current

// In template — reading count() creates a reactive subscription.
// When count changes, ONLY this expression is re-evaluated, not the whole component.
<div>{{ count() }}</div>
<div>{{ doubled() }}</div>

// Signals work without zone.js (zoneless apps, Angular 17+).
// No CD strategy needed — fine-grained updates by default.`;
}
