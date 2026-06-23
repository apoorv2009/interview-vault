# Angular & TypeScript — Interview Preparation

**Target Stack**: Angular 19, TypeScript 5.x
**Audience Level**: Senior Developer (5+ years)
**Last Updated**: June 2026

> All version-specific answers reflect **Angular 19** defaults and APIs.
> Features introduced in earlier versions are annotated with the version they stabilized in.

---

## Table of Contents

1. [Compilation & Build](#1-compilation--build)
2. [Change Detection](#2-change-detection)
3. [Components & Lifecycle Hooks](#3-components--lifecycle-hooks)
4. [Angular 19 Features — Signals, Control Flow & Defer](#4-angular-19-features)
5. [Directives & Pipes](#5-directives--pipes)
6. [Dependency Injection](#6-dependency-injection)
7. [Forms — Template-Driven & Reactive](#7-forms)
8. [Routing & Navigation](#8-routing--navigation)
9. [HTTP Client & Interceptors](#9-http-client--interceptors)
10. [RxJS & Reactivity](#10-rxjs--reactivity)
11. [State Management](#11-state-management)
12. [Performance Optimization](#12-performance-optimization)
13. [Testing with Jasmine & TestBed](#13-testing-with-jasmine--testbed)
14. [TypeScript Deep Dive](#14-typescript-deep-dive)
15. [SSR, Hydration & Angular Universal](#15-ssr-hydration--angular-universal)

---

## 1. Compilation & Build

---

### Q1. [Topic: Compilation] [EPAM] What is the difference between JIT and AOT compilation in Angular 19?

**JIT (Just-In-Time)**: The Angular compiler is shipped to the browser as part of the application bundle. Templates are compiled at runtime inside the browser before the app renders.

**AOT (Ahead-Of-Time)**: Templates are compiled to JavaScript factory functions at build time (on the developer's machine). The browser receives pre-compiled code — the Angular compiler is NOT included in the bundle.

In **Angular 19**, AOT is the default for both `ng serve` (development) and `ng build` (production). JIT is rarely used.

| Dimension | JIT | AOT |
|---|---|---|
| Compile time | Browser (runtime) | Build machine |
| Bundle size | Larger — includes compiler (~40% of framework) | Smaller — compiler not shipped |
| Startup speed | Slower — compile then render | Faster — immediately render |
| Template error detection | Runtime only | Build time (CI catches errors) |
| Security | Uses `eval()` internally | No `eval()`, smaller XSS surface |
| `ng serve` (Angular 19) | Not default | Default |
| `ng build` | Explicit flag only | Default |

```bash
ng build             # AOT (Angular 19 default)
ng build --aot=false # JIT (explicit opt-out, rare)
```

---

### Q2. [Topic: Compilation] What is the Ivy compiler and how does it relate to AOT?

Ivy is Angular's rendering engine and compiler, introduced as the default in Angular 9. It replaced the older View Engine.

Key Ivy characteristics:
- Makes AOT the default for **both dev and prod** builds
- Produces smaller bundles via the locality principle — each component is compiled independently without needing knowledge of the whole app
- Enables better tree-shaking: unused framework features are eliminated at the module level
- Foundation for Standalone components, Signals, and `@defer`

In Angular 19, Ivy is the only engine. View Engine was removed in Angular 13.

---

### Q3. [Topic: Compilation] [EPAM] How does tree-shaking work in Angular and what makes it possible?

Tree-shaking is performed by the bundler (esbuild in Angular 19). It statically analyzes the import graph and eliminates code that is never imported.

AOT makes tree-shaking effective because:
1. Templates are compiled to explicit TypeScript/JS references at build time
2. The bundler can see exactly which Angular directives, pipes, and features the app uses
3. Unused framework code (e.g., `NgSwitch` if you only use `@if`) is eliminated

With JIT, the Angular compiler must be shipped whole because the bundler cannot know what templates will dynamically reference at runtime.

In Angular 19, standalone components improve tree-shaking further — only directly imported components and directives are included, not entire NgModules.

---

### Q4. [Topic: Compilation] When would you use JIT compilation in a production Angular application?

JIT is needed in two narrow scenarios:

1. **CMS-driven dynamic templates**: When template HTML is loaded from a server at runtime (e.g., a form builder where users define UI structure), you need `JitCompilerFactory` from `@angular/platform-browser-dynamic`.
2. **Runtime micro-frontend plugins**: When plugin components are loaded at runtime whose structure isn't known at build time and dynamic compilation is required.

These are edge cases. In nearly all Angular 19 applications, AOT is the correct choice.

---

### Q5. [Topic: Compilation] What is the Angular Language Service and how does it relate to AOT?

The Angular Language Service is a TypeScript plugin (used in VS Code, JetBrains IDEs) that provides type-checking, autocompletion, and error detection *inside templates* in the editor. It uses the same Ivy compiler that AOT uses, meaning editor template errors are identical to what `ng build` would report. This gives you instant feedback without running a build — effectively the developer experience of AOT without the build-step latency.

---

## 2. Change Detection

---

### Q6. [Topic: Change Detection] [EPAM] Explain Angular's change detection mechanism.

Angular's change detection (CD) determines when to update the DOM to reflect state changes in components. The flow:

1. **Zone.js** monkey-patches all browser async APIs (`setTimeout`, `Promise.then`, `fetch`, DOM events, etc.)
2. When any async operation completes, Zone.js notifies Angular's `ApplicationRef`
3. Angular triggers a CD cycle starting from the **root component** and walking the entire component tree top-down
4. Each component compares its current template bindings against previous values
5. If a value changed, Angular updates the corresponding DOM node

This is the **Default** (`CheckAlways`) strategy — every component in the tree is checked on every CD cycle regardless of whether its inputs changed.

---

### Q7. [Topic: Change Detection] [EPAM] What is `ChangeDetectionStrategy.OnPush` and what triggers it?

`OnPush` opts a component out of the standard CD cycle. Angular skips it and its entire subtree unless one of four conditions is met:

| Trigger | Mechanism |
|---|---|
| `@Input()` reference changes | Parent passes a new object or array reference — not a mutation |
| Event emitted from within the component | A click, keydown, etc. originating inside this component |
| `async` pipe emits a new value | Observable subscribed via `\| async` emits |
| Manual trigger | `markForCheck()` or `detectChanges()` called explicitly |

```typescript
@Component({
  selector: 'app-user-card',
  template: `<p>{{ user.name }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCardComponent {
  @Input() user!: User;
}
```

**Critical trap — mutation does NOT trigger OnPush:**
```typescript
// Parent component

// ❌ Wrong: same object reference, OnPush child will NOT re-render
this.user.name = 'Alice';

// ✅ Correct: new reference, OnPush child WILL re-render
this.user = { ...this.user, name: 'Alice' };
```

`OnPush` enforces immutability discipline. Applied to all shared and leaf components, it dramatically reduces the number of CD checks per cycle.

---

### Q8. [Topic: Change Detection] [EPAM] What is the difference between `markForCheck()` and `detectChanges()`?

Both live on `ChangeDetectorRef` and are used to manually control CD in `OnPush` components.

| | `markForCheck()` | `detectChanges()` |
|---|---|---|
| Execution | Asynchronous — schedules check on next CD cycle | Synchronous — runs CD immediately |
| Scope | Marks this component and **all ancestors** as dirty | Runs CD on this component and **all children** |
| DOM update timing | On next tick | Immediately |
| Risk | Low — safe to call from anywhere | Can cause `ExpressionChangedAfterItHasBeenCheckedError` if called in lifecycle hooks at the wrong time |
| Typical use case | After pushing data to a stream outside Zone.js | After programmatic DOM manipulation that must be reflected immediately |

```typescript
constructor(private cdr: ChangeDetectorRef) {}

// Schedule: safe and idiomatic
this.cdr.markForCheck();

// Synchronous: use when DOM must be updated right now
this.cdr.detectChanges();

// Detach from CD tree entirely (useful for charts, canvas, 3rd-party widgets)
this.cdr.detach();
this.cdr.reattach(); // re-attach when needed
```

---

### Q9. [Topic: Change Detection] What is Zone.js and is it still required in Angular 19?

Zone.js is a library that monkey-patches all browser async APIs to create an "execution context" that can intercept and respond to asynchronous operations. Angular uses it to know when to run change detection — every time an async operation completes within Angular's zone, Angular re-checks the component tree.

In **Angular 19**, Zone.js is still the default, but **experimental zoneless mode** is available:

```typescript
// main.ts — Angular 19 zoneless bootstrap
bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

In zoneless mode, CD runs only when a Signal value changes, `markForCheck()` is called, or the `async` pipe emits. This eliminates Zone.js overhead entirely and is the direction Angular is heading (expected to stabilize in Angular 20+).

---

### Q10. [Topic: Change Detection] A component receives real-time price data 10 times per second via WebSocket. How do you prevent CD from destroying performance?

Three-layer approach:

**Layer 1 — OnPush**: Add `changeDetection: ChangeDetectionStrategy.OnPush` to the display component so Angular doesn't check it on unrelated events.

**Layer 2 — Debounce in RxJS before touching component state:**
```typescript
priceStream$.pipe(
  sampleTime(100),         // emit at most once per 100ms
  distinctUntilChanged()
).subscribe(price => {
  this.price = price;
  this.cdr.markForCheck(); // tell Angular to check on next tick
});
```

**Layer 3 — Detach and manually control refresh rate:**
```typescript
ngOnInit() {
  this.cdr.detach(); // excluded from automatic CD
  interval(200).pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.cdr.detectChanges()); // manual 5fps refresh
}
```

In Angular 19, converting the stream to a Signal via `toSignal()` is the cleanest approach — Signals drive fine-grained updates without Zone.js overhead.

---

### Q11. [Topic: Change Detection] What is `ExpressionChangedAfterItHasBeenCheckedError` and how do you fix it?

This error occurs in dev mode when Angular detects that a binding value changed *after* CD completed — Angular ran once, recorded values, then found different values in its verification pass.

Common causes:
- Modifying bound state in `ngAfterViewInit`
- A parent binding depends on state updated by a child's `ngOnInit`

Fix options:
```typescript
// Option 1: Push update to next tick
ngAfterViewInit() {
  setTimeout(() => { this.title = 'Ready'; });
}

// Option 2: Use async pipe — properly asynchronous
title$ = of('Ready').pipe(delay(0));

// Option 3: Use markForCheck() with proper timing
ngAfterViewInit() {
  this.value = this.computeValue();
  this.cdr.markForCheck();
}
```

In Angular 19 with Signals, this error is much rarer because Signal reads are synchronous and side-effect-free.

---

### Q12. [Topic: Change Detection] [Infosys] What is the Angular component lifecycle? List all hooks in execution order.

```
constructor()             DI injection. No DOM, no inputs yet.
ngOnChanges()             Fires when @Input() values change. Runs before ngOnInit and on each subsequent change.
ngOnInit()                Runs once after first ngOnChanges. Use for initialization and HTTP calls.
ngDoCheck()               Every CD cycle — use sparingly as it is very frequent.
ngAfterContentInit()      Once after ng-content projection is initialized.
ngAfterContentChecked()   After every CD check of projected content.
ngAfterViewInit()         Once after component + child views are initialized. DOM is accessible here.
ngAfterViewChecked()      After every CD check of the component's view.
ngOnDestroy()             Before component is removed from DOM. Cancel subscriptions and timers here.
```

**ngOnInit vs constructor:**
- `constructor`: for DI only. Inputs are not yet bound. DOM does not exist.
- `ngOnInit`: safe to read inputs and make HTTP calls. Called after the first `ngOnChanges`.

---

## 3. Components & Lifecycle Hooks

---

### Q13. [Topic: Components] [Capgemini] What is ViewEncapsulation in Angular and what are its modes?

ViewEncapsulation controls how component styles are scoped to prevent leaking to other components.

| Mode | Behavior |
|---|---|
| `Emulated` (default) | Angular adds unique attribute selectors (`_ngcontent-xxx`) to scope styles. No native shadow DOM. |
| `ShadowDom` | Uses the browser's native Shadow DOM API for true encapsulation. Styles and DOM are fully isolated. |
| `None` | No encapsulation. Styles leak globally — use only for intentional global overrides or theming. |

```typescript
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [`:host { display: block; } h2 { color: blue; }`]
})
```

`Emulated` is the correct default for most components. Use `None` sparingly — typically only for theme or design-system components that intentionally style projected or external content.

---

### Q14. [Topic: Components] What is the difference between `@ViewChild` / `@ViewChildren` and `@ContentChild` / `@ContentChildren`?

| | `@ViewChild` / `@ViewChildren` | `@ContentChild` / `@ContentChildren` |
|---|---|---|
| Queries | Elements in the component's own template | Elements projected via `<ng-content>` |
| Available from | `ngAfterViewInit` | `ngAfterContentInit` |
| Typical use | Access child component refs, template variables, DOM elements | Access projected component refs from a parent wrapper |

```typescript
// ViewChild — queries own template
@ViewChild('inputRef') inputEl!: ElementRef;
@ViewChild(ChildComponent) child!: ChildComponent;

ngAfterViewInit() {
  this.inputEl.nativeElement.focus(); // DOM is available here
}
```

In **Angular 19**, signal-based query functions are preferred:
```typescript
// Signal queries — stable in Angular 19
headerEl  = viewChild<ElementRef>('headerEl');      // Signal<ElementRef | undefined>
items     = viewChildren(ItemComponent);             // Signal<readonly ItemComponent[]>
projected = contentChild(IconComponent);             // from ng-content
```

---

### Q15. [Topic: Components] [TCS] What is two-way data binding in Angular and how is it implemented?

Two-way binding combines property binding (parent → child) and event binding (child → parent).

**Classic syntax with `ngModel`:**
```html
<!-- [(ngModel)] — "banana in a box" syntax -->
<input [(ngModel)]="username">

<!-- Desugars to: -->
<input [ngModel]="username" (ngModelChange)="username = $event">
```

**Custom two-way binding with `@Input` / `@Output` pair:**
```typescript
@Component({ selector: 'app-counter' })
export class CounterComponent {
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>(); // must be inputName + "Change"

  increment() { this.valueChange.emit(this.value + 1); }
}
// Usage: <app-counter [(value)]="count">
```

**Angular 19 — Signal-based two-way binding with `model()`:**
```typescript
@Component({ selector: 'app-counter' })
export class CounterComponent {
  value = model(0); // writable signal, auto-creates the two-way binding

  increment() { this.value.update(n => n + 1); }
}
// Usage: <app-counter [(value)]="count">
```

---

### Q16. [Topic: Components] [Infosys] What is `ng-content` and what is content projection?

Content projection lets a component render externally-provided HTML inside `<ng-content>` slots — Angular's equivalent of React's `children` prop.

```typescript
// Card component template
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content select="[card-header]"></ng-content>
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {}

// Consumer
<app-card>
  <h2 card-header>Title</h2>     <!-- goes to named slot -->
  <p>Body content here</p>       <!-- goes to default slot -->
</app-card>
```

Multi-slot projection uses `select` with CSS attribute selectors. Angular 19 also supports `ngTemplateOutlet` for deferred template rendering and `@defer` for deferring projected content loading.

---

## 4. Angular 19 Features

---

### Q17. [Topic: Angular 19] [EPAM] What are Signals in Angular 19 and how do they differ from Observables?

Signals (stable since Angular 17, fully featured in Angular 19) are a reactive primitive for synchronous state. A Signal holds a value and notifies consumers when that value changes.

```typescript
import { signal, computed, effect } from '@angular/core';

const count = signal(0);

console.log(count());          // read: 0
count.set(5);                  // write: absolute value
count.update(n => n + 1);     // write: based on previous value

const doubled = computed(() => count() * 2);    // derived — lazy and memoized
effect(() => console.log('Count is:', count())); // side effect — re-runs on change
```

**Signal vs Observable:**

| Dimension | Signal | Observable (RxJS) |
|---|---|---|
| Synchrony | Always synchronous | Can be sync or async |
| Reading current value | `count()` — always available | Requires `.subscribe()` or `.getValue()` (BehaviorSubject only) |
| Async operations | Not built-in | Native (HTTP, events, timers) |
| Memoization | `computed()` is automatic | Requires `shareReplay()` or manual caching |
| Change Detection integration | Fine-grained, drives zoneless CD | Requires `async` pipe or `markForCheck()` |
| Template syntax | `{{ count() }}` | `{{ count$ \| async }}` |

**Rule of thumb in Angular 19**: Use Signals for component and feature state. Use Observables for async data streams (HTTP, WebSockets, timers). Bridge them with `toSignal()` and `toObservable()`.

---

### Q18. [Topic: Angular 19] What are signal-based `input()`, `output()`, and `model()` in Angular 19?

Angular 19 provides signal-based equivalents of `@Input()`, `@Output()`, and the two-way `[(x)]` pattern. All are stable in Angular 19.

**`input()` — signal-based input:**
```typescript
@Component({ selector: 'app-user' })
export class UserComponent {
  userId = input.required<number>();          // required — compiler error if not provided
  theme  = input<'light' | 'dark'>('light'); // optional with default

  fullLabel = computed(() => `User #${this.userId()}`); // reactive derived value
}
```

**`output()` — signal-based output:**
```typescript
saved = output<User>(); // no EventEmitter needed

saveUser() {
  this.saved.emit(this.form.value);
}
```

**`model()` — two-way binding signal:**
```typescript
value = model(0); // writable from both inside and outside the component

increment() { this.value.update(n => n + 1); }
// Parent: <app-counter [(value)]="count">
```

---

### Q19. [Topic: Angular 19] [EPAM] What is `@defer` and what triggers does it support?

`@defer` (stable in Angular 17, enhanced in Angular 19) is a template-level primitive for lazy-loading component code and deferring rendering.

```html
@defer (on viewport; prefetch on idle) {
  <app-comments [postId]="postId" />
} @placeholder {
  <p>Scroll down to see comments...</p>
} @loading (minimum 200ms) {
  <app-spinner />
} @error {
  <p>Failed to load comments.</p>
}
```

**Available triggers:**

| Trigger | Description |
|---|---|
| `on idle` | When browser is idle (`requestIdleCallback`) |
| `on viewport` | When element enters viewport (IntersectionObserver) |
| `on interaction` | On first click, hover, or focus on the placeholder |
| `on hover` | On hover over the placeholder element |
| `on timer(2000)` | After a specified time delay |
| `on immediate` | As soon as possible after rendering |
| `when condition` | When a boolean expression becomes `true` |

`prefetch` loads the JS bundle in the background while still displaying the placeholder, enabling fast subsequent rendering. In Angular 19, `@defer` also enables **partial hydration** in SSR applications.

---

### Q20. [Topic: Angular 19] What is the new built-in control flow syntax in Angular 19 and how does it differ from structural directives?

Angular 17 introduced built-in control flow (`@if`, `@for`, `@switch`) as a replacement for `*ngIf`, `*ngFor`, and `*ngSwitch`. In **Angular 19**, these are the recommended default.

**`@if` vs `*ngIf`:**
```html
<!-- Old structural directive -->
<div *ngIf="user; else noUser">{{ user.name }}</div>
<ng-template #noUser>No user found</ng-template>

<!-- Angular 19 built-in control flow -->
@if (user) {
  <div>{{ user.name }}</div>
} @else if (pending) {
  <app-spinner />
} @else {
  <p>No user found</p>
}
```

**`@for` vs `*ngFor`:**
```html
<!-- Old -->
<li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>

<!-- Angular 19: track is REQUIRED — makes the performance best-practice mandatory -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>No items found.</li>
}
```

**`@switch`:**
```html
@switch (status) {
  @case ('active')   { <span class="green">Active</span> }
  @case ('inactive') { <span class="red">Inactive</span> }
  @default           { <span>Unknown</span> }
}
```

Key advantage over structural directives: no import needed, better TypeScript type narrowing inside blocks, no `<ng-template>` boilerplate.

---

### Q21. [Topic: Angular 19] What is `linkedSignal()` in Angular 19?

`linkedSignal()` (introduced in Angular 19) creates a writable signal whose **default value is derived from another signal** but can be overridden locally.

```typescript
// selectedItem resets to first item whenever items() changes,
// but can also be set manually (user selects a different item)
selectedItem = linkedSignal(() => this.items()[0]);

selectItem(item: Item) {
  this.selectedItem.set(item); // local override
}

// If this.items() changes (e.g., data refresh), selectedItem resets to items()[0]
```

This solves the "reset on dependency change but allow manual override" pattern that previously required a complex combination of `effect()` and writable signals.

---

### Q22. [Topic: Angular 19] What is the `resource()` API in Angular 19?

`resource()` (experimental in Angular 19) is a signal-based primitive for declaring asynchronous data dependencies, replacing the common `ngOnInit + HttpClient + subscribe` boilerplate.

```typescript
import { resource } from '@angular/core';

@Component({...})
export class UserComponent {
  userId = input.required<number>();

  // Automatically refetches when userId changes
  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) =>
      fetch(`/api/users/${request.id}`).then(r => r.json())
  });
}
```

In the template:
```html
@if (userResource.isLoading()) { <app-spinner /> }
@else if (userResource.error()) { <p>Error loading user.</p> }
@else { <p>{{ userResource.value()?.name }}</p> }
```

`resource()` provides built-in loading and error states as Signals, and supports `.reload()` for manual refetch.

---

### Q23. [Topic: Angular 19] What is Standalone architecture in Angular 19 and how does it differ from NgModule-based architecture?

In Angular 19, **Standalone is the default**. `ng generate component` creates standalone components by default. NgModules are still supported but no longer required.

**NgModule architecture (legacy):**
```typescript
@NgModule({
  declarations: [UserCardComponent, UserListComponent],
  imports: [CommonModule, FormsModule],
  exports: [UserCardComponent]
})
export class UserModule {}
```

**Standalone architecture (Angular 19 default):**
```typescript
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],  // declare dependencies directly
  template: `...`
})
export class UserCardComponent {}
```

**Application bootstrap:**
```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations()
  ]
});
```

Benefits: simpler mental model, better tree-shaking, easier per-component lazy loading via `loadComponent`, and closer alignment with the Signal programming model.

---

## 5. Directives & Pipes

---

### Q24. [Topic: Directives] [TCS] What is the difference between structural and attribute directives?

| | Structural Directives | Attribute Directives |
|---|---|---|
| Effect | Add, remove, or reshape DOM elements | Change the appearance or behavior of an existing element |
| Syntax | `*` prefix (desugars to `<ng-template>`) | No prefix |
| Examples | `*ngIf`, `*ngFor`, `@if`, `@for` | `[ngClass]`, `[ngStyle]`, `[routerLink]` |

```typescript
// Custom attribute directive — Angular 19 standalone
@Directive({ selector: '[appHighlight]', standalone: true })
export class HighlightDirective {
  @Input() appHighlight = 'yellow';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    this.renderer.setStyle(this.el.nativeElement, 'background-color', this.appHighlight);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.renderer.removeStyle(this.el.nativeElement, 'background-color');
  }
}
```

---

### Q25. [Topic: Pipes] [EPAM] What is the difference between pure and impure pipes?

| | Pure Pipe | Impure Pipe |
|---|---|---|
| `pure` flag | `true` (default) | `false` |
| Re-runs when | Input *reference* changes | Every CD cycle |
| Performance | High — result is memoized per input | Low — can be expensive on large datasets |
| Use case | Formatting, transformations | Filtering arrays, translations that change mid-component |

```typescript
// Pure pipe — runs once per unique input reference (default)
@Pipe({ name: 'currency', standalone: true })
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }
}

// Impure pipe — avoid for large arrays; runs every CD cycle
@Pipe({ name: 'filterList', pure: false, standalone: true })
export class FilterListPipe implements PipeTransform {
  transform(items: any[], term: string): any[] {
    return items.filter(i => i.name.includes(term));
  }
}
```

**Better alternative to an impure filter pipe in Angular 19 — use `computed()`:**
```typescript
filteredItems = computed(() =>
  this.items().filter(i => i.name.includes(this.searchTerm()))
);
```

---

### Q26. [Topic: Pipes] What is the `async` pipe and why is it preferred over manual subscriptions in templates?

The `async` pipe subscribes to an Observable or Promise and returns its latest value. It automatically **unsubscribes when the component is destroyed**, preventing memory leaks.

```typescript
@Component({
  template: `
    @if (user$ | async; as user) {
      <p>{{ user.name }}</p>
    }
  `
})
export class ProfileComponent {
  user$ = this.userService.getUser(); // no subscribe(), no ngOnDestroy needed
}
```

In Angular 19, for Signal-friendly code, prefer converting with `toSignal()`:
```typescript
user = toSignal(this.userService.getUser(), { initialValue: null });
// Template: @if (user()) { <p>{{ user()!.name }}</p> }
```

---

### Q27. [Topic: Pipes] [Capgemini] How do you create a custom pipe in Angular 19?

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 100, ellipsis = '...'): string {
    if (!value || value.length <= limit) return value;
    return value.slice(0, limit).trimEnd() + ellipsis;
  }
}

// Template usage:
// {{ longText | truncate:50:'…' }}
```

Import it directly in standalone components: `imports: [TruncatePipe]`.

---

### Q28. [Topic: Directives] What is `NgOptimizedImage` and what does it automatically handle?

`NgOptimizedImage` (stable Angular 15+, recommended in Angular 19) replaces `<img>` with a performance-optimized version:

```html
<img ngSrc="hero.jpg" width="400" height="300" priority>
```

What it handles automatically:
- Sets `loading="lazy"` by default; `priority` adds `loading="eager"` and a `<link rel="preload">` tag
- Generates a `srcset` for responsive images across device sizes
- Enforces explicit `width` and `height` attributes to prevent Cumulative Layout Shift (CLS)
- Warns in dev mode when the intrinsic image is much larger than the displayed size
- Integrates with CDN image loaders (Cloudinary, Imgix, ImageKit)

---

## 6. Dependency Injection

---

### Q29. [Topic: DI] [EPAM] How does Angular's Dependency Injection system work?

Angular's DI is a hierarchical injector system. When a component or service requests a dependency, Angular walks up the injector tree from the current component's injector to the root injector until it finds a provider.

**Injector hierarchy (Angular 19 standalone):**
```
Platform Injector        — bootstrap-level, rare
  └── Environment Injector (root) — providedIn: 'root' services live here
        └── Route Injector        — per lazy-loaded route (optional)
              └── Element Injector — per component
```

**Provider types:**
```typescript
providers: [
  { provide: UserService, useClass: MockUserService },             // swap class
  { provide: API_URL, useValue: 'https://api.example.com' },      // constant value
  { provide: UserService, useFactory: (h) => new UserService(h), deps: [HttpClient] },
  { provide: UserService, useExisting: AdminUserService },         // alias
]
```

**Scope options:**
```typescript
@Injectable({ providedIn: 'root' })    // singleton, tree-shakeable — preferred
@Injectable({ providedIn: 'platform' }) // shared across multiple Angular apps on page
// OR provided in component/route providers array for a new instance per scope
```

---

### Q30. [Topic: DI] What is `InjectionToken` and when is it needed?

`InjectionToken` provides a type-safe key for injecting non-class values (strings, objects, functions, interfaces) that have no runtime constructor for Angular to use as a key.

```typescript
// Define the token
export const API_CONFIG = new InjectionToken<ApiConfig>('api.config');

// Provide at bootstrap
bootstrapApplication(AppComponent, {
  providers: [
    { provide: API_CONFIG, useValue: { baseUrl: '/api', timeout: 5000 } }
  ]
});

// Inject using inject() function
@Injectable({ providedIn: 'root' })
export class ApiService {
  private config = inject(API_CONFIG);
}
```

Use `InjectionToken` when: injecting primitives, injecting by TypeScript interface (interfaces have no runtime representation), or providing environment-specific configuration.

---

### Q31. [Topic: DI] [EPAM] What are DI lifetime scopes and what is the captive dependency problem?

Angular has three effective scopes:

- **Root (singleton)** — `providedIn: 'root'` — one instance for the whole app
- **Component-scoped** — listed in a component's `providers` array — new instance per component
- **Route-scoped** — listed in route's `providers` array — shared within that lazy route

**Captive Dependency Problem** — when a longer-lived service depends on a shorter-lived one:
```typescript
@Injectable({ providedIn: 'root' }) // singleton — lives forever
export class CacheService {
  constructor(private requestCtx: RequestContextService) {} // scoped — should be short-lived
  // BUG: CacheService is created once and captures the FIRST instance of RequestContextService
  // All subsequent requests share the same stale context object
}
```

Fix: inject the shorter-lived service via `Injector` and resolve lazily, or redesign so dependencies always outlive their dependents.

---

### Q32. [Topic: DI] What is the `inject()` function and when should it replace constructor injection?

The `inject()` function (Angular 14+, widely used in Angular 19) retrieves a dependency from the current injection context without listing it in the constructor.

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  getUser(id: number) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

Required scenarios in Angular 19:
- **Functional guards, resolvers, and interceptors** — no class constructor exists
- **Inside `computed()` and `effect()`** for Signal-based services
- **Abstract base classes** where constructor chaining becomes verbose

```typescript
// Functional route guard — inject() is the only option
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};
```

---

## 7. Forms

---

### Q33. [Topic: Forms] [Infosys] What is the difference between Template-Driven and Reactive Forms?

| Dimension | Template-Driven | Reactive |
|---|---|---|
| Logic location | Template (HTML) | Component class (TypeScript) |
| Form model | Implicit via `NgModel` | Explicit `FormControl`, `FormGroup`, `FormArray` |
| Data flow | Async — two-way binding | Synchronous — direct property access |
| Validation | Template directives | Validator functions |
| Testability | Requires DOM and Angular TestBed | Pure class logic, fully testable without DOM |
| Dynamic forms | Difficult | Easy via `FormArray` |
| Module | `FormsModule` | `ReactiveFormsModule` |

```typescript
// Reactive form — preferred in Angular 19 for any non-trivial form
@Component({ imports: [ReactiveFormsModule] })
export class LoginComponent {
  form = new FormGroup({
    email:    new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  onSubmit() {
    if (this.form.valid) console.log(this.form.getRawValue());
  }
}
```

---

### Q34. [Topic: Forms] How do you implement custom synchronous and asynchronous validators in Angular?

**Synchronous validator:**
```typescript
export function noWhitespace(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const isBlank = (control.value ?? '').trim().length === 0;
    return isBlank ? { whitespace: true } : null;
  };
}

// Usage
username: new FormControl('', [Validators.required, noWhitespace()])
```

**Async validator (e.g., check username availability):**
```typescript
export function usernameAvailable(userService: UserService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return timer(400).pipe(  // debounce
      switchMap(() => userService.checkUsername(control.value)),
      map(taken => taken ? { usernameTaken: true } : null),
      catchError(() => of(null)) // don't fail the form on API error
    );
  };
}

// Usage — async validators are the third FormControl argument
username: new FormControl('', [Validators.required], [usernameAvailable(this.userService)])
```

---

### Q35. [Topic: Forms] What is `FormArray` and when do you use it?

`FormArray` manages a dynamic list of `FormControl` or `FormGroup` entries — useful when the user can add or remove list items.

```typescript
form = new FormGroup({
  name:   new FormControl(''),
  skills: new FormArray([])
});

get skills() { return this.form.get('skills') as FormArray; }

addSkill() {
  this.skills.push(new FormGroup({
    name:  new FormControl('', Validators.required),
    level: new FormControl('beginner')
  }));
}

removeSkill(index: number) { this.skills.removeAt(index); }
```

```html
@for (skill of skills.controls; track $index) {
  <div [formGroupName]="$index">
    <input formControlName="name" placeholder="Skill name">
    <button (click)="removeSkill($index)">Remove</button>
  </div>
}
```

---

## 8. Routing & Navigation

---

### Q36. [Topic: Routing] [Capgemini] How does lazy loading work in Angular 19?

Lazy loading splits the app into separate JS chunks loaded on demand. Angular 19 supports two approaches:

**Lazy load a standalone component:**
```typescript
const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(c => c.DashboardComponent)
  }
];
```

**Lazy load a group of routes:**
```typescript
{
  path: 'admin',
  providers: [AdminService],  // services scoped to this lazy route
  loadChildren: () =>
    import('./admin/admin.routes').then(r => r.ADMIN_ROUTES)
}
```

The JS bundle for the lazy route is not downloaded until the user navigates to that path, reducing initial bundle size and Time to Interactive.

---

### Q37. [Topic: Routing] What are Angular Route Guards? List the functional guard types in Angular 19.

Guards control navigation into and out of routes. In Angular 19, functional guards using `inject()` are preferred over class-based guards.

| Guard type | Purpose | Return |
|---|---|---|
| `CanActivateFn` | Allow or block navigation to a route | `boolean \| UrlTree` |
| `CanActivateChildFn` | Guard all child routes of a parent | `boolean \| UrlTree` |
| `CanDeactivateFn<T>` | Prevent leaving a route (e.g., unsaved changes) | `boolean \| Observable<boolean>` |
| `CanMatchFn` | Conditionally match a route definition | `boolean \| UrlTree` |
| `ResolveFn<T>` | Pre-fetch data before activating a route | `T \| Observable<T>` |

```typescript
// Functional auth guard
export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Unsaved changes guard
export const unsavedChangesGuard: CanDeactivateFn<EditFormComponent> =
  (component) => component.hasUnsavedChanges() ? confirm('Leave without saving?') : true;
```

---

### Q38. [Topic: Routing] What is `ResolveFn` and what are its trade-offs vs loading data in `ngOnInit`?

`ResolveFn` pre-fetches data before a route activates — the component does not render until the resolver completes.

```typescript
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(+route.paramMap.get('id')!);
};

// In route config
{ path: 'user/:id', resolve: { user: userResolver }, component: UserDetailComponent }

// In component — data already available
user = inject(ActivatedRoute).snapshot.data['user'] as User;
```

| | Resolver | `ngOnInit` load |
|---|---|---|
| When data arrives | Before component renders | After component renders |
| UX | Navigation appears blocked until ready | Immediate render, show loading skeleton |
| SEO | Better — data in initial render | Worse |
| Complexity in component | Lower (no loading/error state) | Higher |

**Rule**: Use resolvers for critical data where an empty component is incorrect. Use `ngOnInit` with loading states for better perceived performance.

---

### Q39. [Topic: Routing] What preloading strategies are available in Angular?

```typescript
provideRouter(routes, withPreloading(PreloadAllModules))
```

| Strategy | Behavior |
|---|---|
| `NoPreloading` (default) | Load only when the user navigates to that route |
| `PreloadAllModules` | After initial load, preload all lazy modules in the background |
| Custom `PreloadingStrategy` | Preload routes with a specific data flag (e.g., `data: { preload: true }`) |
| `QuicklinkStrategy` (third-party) | Preload only routes whose `routerLink`s are currently visible in the viewport |

Use `PreloadAllModules` for most apps to get the lazy-load bundle size benefit on initial load while still pre-downloading everything for fast subsequent navigation.

---

## 9. HTTP Client & Interceptors

---

### Q40. [Topic: HTTP] How do you set up `HttpClient` in an Angular 19 standalone application?

```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withFetch(),                                          // Angular 18+: use Fetch API over XHR
      withInterceptors([authInterceptor, loggingInterceptor])
    )
  ]
});
```

`provideHttpClient()` replaces the legacy `HttpClientModule` import. `withFetch()` uses the browser's Fetch API instead of XHR, enabling better streaming and integration with Service Workers.

---

### Q41. [Topic: HTTP] [Capgemini] What is an HTTP Interceptor and how do you implement a functional interceptor in Angular 19?

Interceptors intercept all HTTP requests and responses, enabling cross-cutting concerns: adding auth headers, logging, error handling, and caching.

```typescript
// Auth interceptor — functional style (Angular 15+, preferred in Angular 19)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq);
};

// Global error handling interceptor
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) inject(Router).navigate(['/login']);
      if (error.status === 0)   console.error('Network unreachable');
      return throwError(() => error);
    })
  );
};
```

Interceptors execute in registration order for requests and in reverse order for responses.

---

### Q42. [Topic: HTTP] How do you robustly handle errors in Angular HTTP calls?

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`).pipe(
      retry({ count: 2, delay: 1000 }),  // retry twice with 1s gap
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) return throwError(() => new UserNotFoundError(id));
        if (error.status >= 500)  return throwError(() => new ServerError(error.message));
        return throwError(() => error);
      })
    );
  }
}
```

Pattern: centralize error transformation in service methods. Let interceptors handle global concerns (401 redirect, network error toasts). Throw domain-specific errors from services so components can handle business-level failure states.

---

## 10. RxJS & Reactivity

---

### Q43. [Topic: RxJS] [EPAM] What is the purpose of RxJS in Angular?

RxJS provides Observable-based reactive programming. Angular uses it throughout the framework:

- `HttpClient` — all responses are Observables
- `Router` — navigation events are an Observable stream
- `FormControl.valueChanges` — stream of form value changes
- `EventEmitter` — extends `Subject`
- `async` pipe — subscribes to Observables in templates

Core value: composing asynchronous data streams with operators (`map`, `filter`, `switchMap`, `catchError`) without callback hell or manual async state management.

---

### Q44. [Topic: RxJS] [EPAM] Explain `switchMap`, `mergeMap`, `concatMap`, and `exhaustMap` with use cases.

All four map source emissions to inner Observables. The difference is how overlapping inner Observables are handled.

**`switchMap` — cancel previous, use latest:**
```typescript
// Search autocomplete — only the latest query result matters
searchTerm$.pipe(
  debounceTime(300),
  switchMap(term => this.api.search(term)) // cancels in-flight request when new term arrives
)
```

**`mergeMap` — run all concurrently:**
```typescript
// Parallel file uploads — all should run simultaneously
selectedFiles$.pipe(
  mergeMap(file => this.uploadService.upload(file))
)
```

**`concatMap` — queue one at a time, preserve order:**
```typescript
// Sequential API calls where order matters
actions$.pipe(
  concatMap(action => this.api.processAction(action)) // waits for previous before starting next
)
```

**`exhaustMap` — ignore new source values while inner is active:**
```typescript
// Login button — extra clicks dropped while request is in flight
fromEvent(loginBtn, 'click').pipe(
  exhaustMap(() => this.authService.login(credentials))
)
```

---

### Q45. [Topic: RxJS] [EPAM] What is the difference between cold and hot Observables? Give an example of each.

| | Cold Observable | Hot Observable |
|---|---|---|
| Producer | Created per subscriber | Shared across all subscribers |
| Data | Each subscriber gets the full sequence from the start | Subscribers get values only from the moment they subscribe |
| Examples | `HttpClient.get()`, `of()`, `from()` | `Subject`, `fromEvent()`, WebSocket connection, `share()` |

```typescript
// Cold — each subscriber triggers a new HTTP request
const cold$ = this.http.get('/api/data');
cold$.subscribe(d => console.log('A', d)); // HTTP request #1
cold$.subscribe(d => console.log('B', d)); // HTTP request #2 — separate!

// Make it hot with shareReplay(1)
const hot$ = cold$.pipe(shareReplay(1));
hot$.subscribe(d => console.log('A', d)); // HTTP request fires once
hot$.subscribe(d => console.log('B', d)); // gets cached result, no new request

// Inherently hot — Subject
const subject = new Subject<number>();
subject.subscribe(n => console.log('A', n));
subject.next(1);                           // A receives 1
subject.subscribe(n => console.log('B', n)); // B subscribes late
subject.next(2);                           // both A and B receive 2; B missed 1
```

---

### Q46. [Topic: RxJS] [EPAM] What are the differences between `Subject`, `BehaviorSubject`, `ReplaySubject`, and `AsyncSubject`?

| | Emits to late subscribers | Needs initial value | Typical use case |
|---|---|---|---|
| `Subject` | Nothing — late subscribers miss past values | No | Event bus, one-shot signals |
| `BehaviorSubject(init)` | Current value immediately on subscribe | Yes | Shared mutable state — always has a current value |
| `ReplaySubject(n)` | Last `n` emissions on subscribe | No | Cache recent values for late subscribers |
| `AsyncSubject` | Only the final value when `complete()` is called | No | Long computation, emit-once semantics |

```typescript
// BehaviorSubject — the standard for service-based state
@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = new BehaviorSubject<CartItem[]>([]);
  items$ = this._items.asObservable(); // hide .next() from consumers

  addItem(item: CartItem) {
    this._items.next([...this._items.getValue(), item]);
  }
}
```

---

### Q47. [Topic: RxJS] How do you prevent memory leaks from Observable subscriptions in Angular 19?

Three approaches in order of preference for Angular 19:

**1. `async` pipe — best for template bindings:**
```html
<p>{{ user$ | async }}</p> <!-- auto-unsubscribes on component destroy -->
```

**2. `takeUntilDestroyed()` (Angular 16+) — best for class subscriptions:**
```typescript
private destroyRef = inject(DestroyRef);

ngOnInit() {
  this.stream$.pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(data => this.data = data);
}
```

**3. `toSignal()` — converts Observable to Signal, auto-manages the subscription:**
```typescript
data = toSignal(this.stream$, { initialValue: [] });
```

**Pre-Angular 16 pattern (common in existing codebases):**
```typescript
private destroy$ = new Subject<void>();

ngOnInit()    { this.stream$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
```

---

### Q48. [Topic: RxJS] What is `shareReplay` and when should you use it?

`shareReplay(n)` multicasts an Observable, replaying the last `n` emissions to new subscribers. It converts a cold Observable to a shared hot one with caching.

```typescript
// Without shareReplay: each subscriber triggers a new HTTP call
const config$ = this.http.get<Config>('/api/config');

// With shareReplay(1): first subscriber fetches; all others get the cached value
@Injectable({ providedIn: 'root' })
export class ConfigService {
  config$ = this.http.get<Config>('/api/config').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );
}
```

**Gotcha**: `shareReplay(1)` without `refCount: true` keeps the source alive even after all subscribers unsubscribe. Always use `{ bufferSize: 1, refCount: true }` in services so the HTTP connection can be properly cleaned up.

---

### Q49. [Topic: RxJS] What is the difference between `combineLatest`, `forkJoin`, and `zip`?

| Operator | Emits when | Source completion | Use case |
|---|---|---|---|
| `combineLatest` | Any source emits (after all have emitted at least once) | Sources can be ongoing | Combining live data streams for a dashboard |
| `forkJoin` | All sources complete | All must complete | Parallel HTTP calls — need all results before rendering |
| `zip` | All sources have emitted a matching nth value | Sources can be ongoing | Pairing request parameters with matching responses |

```typescript
// forkJoin — parallel HTTP, wait for all to complete
forkJoin({
  user:   this.http.get<User>('/api/user'),
  config: this.http.get<Config>('/api/config')
}).subscribe(({ user, config }) => { /* both ready */ });

// combineLatest — reactively combine live streams
combineLatest([this.userId$, this.filter$]).pipe(
  switchMap(([id, filter]) => this.api.getItems(id, filter))
)
```

---

## 11. State Management

---

### Q50. [Topic: State Management] [EPAM] What are the state management options in Angular 19 and when do you choose each?

| Approach | When to use |
|---|---|
| `@Input` / `@Output` | Collocated parent-child components, no shared state needed |
| Service + `signal()` | Feature-scoped state, Angular 19 preferred simple pattern |
| Service + `BehaviorSubject` | Same as above — common in pre-Signals codebases |
| NgRx / NGXS | App-wide state, complex async flows, large teams, audit trails |

**Decision framework:**

| Condition | Choice |
|---|---|
| Data shared between 2–3 nearby components | `@Input/@Output` or a shared service |
| Feature-scoped state within one route | Service with Signals |
| State shared across multiple route-level features | NgRx or singleton service |
| Complex async orchestration (retry, race, cancellation) | NgRx Effects with RxJS |
| Need DevTools time-travel debugging or action audit log | NgRx |
| Team > 5 developers touching the same state | NgRx — explicit action boundaries prevent conflicts |

---

### Q51. [Topic: State Management] [EPAM] Explain the NgRx data flow: Store, Actions, Reducers, Effects, Selectors.

```
Component ──dispatch(action)──▶ Effect (async/HTTP) ──▶ dispatch(successAction)
    ▲                                                              │
    │                                                              ▼
Selector ◀── Store (immutable state tree) ◀────── Reducer (pure function)
```

1. **Action** — plain object: `{ type: '[Users] Load Success', users: User[] }`
2. **Reducer** — pure function: `(currentState, action) => newState`. No side effects ever.
3. **Effect** — handles side effects (HTTP, routing). Listens for actions, performs async work, dispatches new actions.
4. **Store** — single immutable state tree. Only reducers can update it.
5. **Selector** — memoized projection of store state. Components subscribe to selectors, not raw store.

```typescript
// Selector — re-runs only when selectAllUsers output changes
export const selectActiveUsers = createSelector(
  selectAllUsers,
  (users) => users.filter(u => u.isActive)
);

// Component
@Component({...})
export class UsersComponent {
  activeUsers$ = this.store.select(selectActiveUsers);
  constructor(private store: Store) {
    this.store.dispatch(loadUsers());
  }
}
```

---

### Q52. [Topic: State Management] [EPAM] What is selector memoization in NgRx and why does it matter for performance?

`createSelector` wraps the projection function with memoization. If input selectors return the same references as the previous call, the projection is not re-executed — the cached result is returned.

```typescript
const selectTotal = createSelector(
  selectCartItems,  // input selector
  items => items.reduce((sum, i) => sum + i.price, 0) // projection — skipped if items ref unchanged
);
```

Why it matters:
- Prevents re-computation when unrelated store slices change
- Prevents components from receiving new object references (which would trigger `OnPush` CD) when the logical value hasn't changed
- High-frequency updates to one slice (e.g., real-time prices) don't cascade re-renders to every component subscribed to unrelated slices

---

### Q53. [Topic: State Management] [EPAM] When would you choose NgRx over a service with BehaviorSubject?

Use **NgRx** when:
1. Multiple features modify the same state — you need an action log to trace *what* caused a change
2. Complex async orchestration: parallel requests, retries, cancellations are cleaner in Effects than chained service methods
3. Team is large — explicit action types act as a shared contract; developers can search where `[Orders] Load` is dispatched
4. You need time-travel debugging or state snapshots for reproducible bug reports
5. App-wide state that doesn't fit neatly in a single feature service

Use **service + BehaviorSubject/signal** when:
- State is feature-scoped and used within one route
- Async flows are simple (one HTTP call, straightforward result)
- Small team where NgRx boilerplate cost isn't justified

---

## 12. Performance Optimization

---

### Q54. [Topic: Performance] [EPAM] You have a list of 500 item cards that is sluggish on scroll. Walk through your optimization approach.

**Step 1 — Profile**: Chrome DevTools → Performance tab. Record during scroll. Long "Script" blocks correlating with scroll events confirm CD is the bottleneck.

**Step 2 — `OnPush`**: Add `ChangeDetectionStrategy.OnPush` to the item card component. Ensure the parent passes new array references instead of mutations.

**Step 3 — `track`**: Use `@for (item of items; track item.id)` so Angular reuses DOM nodes instead of destroying and recreating them.

**Step 4 — Virtual scrolling** for genuinely large datasets:
```html
<cdk-virtual-scroll-viewport itemSize="72" style="height: 600px">
  <app-item-card *cdkVirtualFor="let item of items" [item]="item" />
</cdk-virtual-scroll-viewport>
```

**Step 5 — `@defer`**: Defer below-fold items until they enter the viewport.

**Step 6 — Eliminate template method calls**: Replace `getFilteredItems()` in the template with a `computed()` signal or pure pipe.

---

### Q55. [Topic: Performance] [EPAM] What is `trackBy` / `track` and why is it critical for list performance?

Without tracking, Angular identifies list items by their DOM position. When the array reference changes (API refresh, sort, filter), Angular destroys all DOM nodes and recreates them — even if only one item changed.

```html
<!-- Old *ngFor — trackBy as an optional method ref -->
<li *ngFor="let user of users; trackBy: trackById">{{ user.name }}</li>

<!-- Angular 19 @for — track is REQUIRED syntax, not optional -->
@for (user of users; track user.id) {
  <li>{{ user.name }}</li>
}
```

With `track user.id`: Angular maps existing DOM nodes to items by their stable `id`. Only added, removed, or changed items trigger DOM operations. Items that moved positions get their DOM nodes *moved*, not recreated.

For a 500-item list refreshing every 5 seconds, this is the difference between 500 DOM removals + 500 creations vs. 0 DOM operations when no items changed.

---

### Q56. [Topic: Performance] What are preloading strategies and what does `@defer (prefetch on idle)` add?

**Route preloading** (`withPreloading(PreloadAllModules)`) — after initial load, all lazy-loaded route bundles are downloaded in the background while the user is on the current page.

**`@defer (prefetch on idle)`** — for component-level lazy loading, `prefetch on idle` downloads the deferred chunk during browser idle time while the placeholder is displayed. When the trigger fires (e.g., `on viewport`), the chunk is already cached and renders instantly.

```html
@defer (on viewport; prefetch on idle) {
  <app-heavy-chart [data]="chartData" />
} @placeholder {
  <div class="chart-placeholder"></div>
}
```

This combination gives you the bundle-size benefit of lazy loading and the UX speed of eager loading.

---

### Q57. [Topic: Performance] How do Angular Signals improve rendering performance compared to Zone.js-based CD?

With Zone.js and Default CD, any async event checks the entire component tree — O(n) where n is the number of components.

With Signals and `OnPush` (or zoneless):
- Only components whose Signal dependencies actually changed are re-checked
- Angular tracks which signals a template reads during render and creates a fine-grained dependency graph
- A signal change triggers only the specific template expressions that read it — not the whole subtree
- In zoneless mode, CD does not run at all unless a Signal or explicit `markForCheck()` triggers it

This makes Signal-based applications scale better — adding more components doesn't linearly increase CD cost per event.

---

## 13. Testing with Jasmine & TestBed

---

### Q58. [Topic: Testing] [EPAM] What is the Angular testing pyramid and how does it map to Angular test types?

```
         ╱─────────────────────────────╲
        ╱  E2E — Playwright / Cypress   ╲   Few, slow, test full user journeys
       ╱─────────────────────────────────╲
      ╱  Integration — TestBed + Spies   ╲  Most Angular tests live here
     ╱─────────────────────────────────────╲
    ╱  Unit — pure functions, pipes, utils  ╲  Fast, no DOM, no TestBed
   ╱─────────────────────────────────────────╲
```

| Test type | Angular equivalent | When to use |
|---|---|---|
| Unit | Pure service methods, pipes, utilities — no `TestBed` | Isolated business logic |
| Integration | `TestBed` + spy-replaced dependencies | Component + template + wired DI |
| E2E | Cypress / Playwright | Full user journeys across pages |

EPAM expectation: most Angular tests are integration tests using `TestBed`. Pure unit tests are used for pipes and logic-heavy services that have no Angular dependencies.

---

### Q59. [Topic: Testing] [EPAM] What is `TestBed` and how is it used to test a component?

`TestBed` creates a miniature Angular application context for testing components, services, and directives in isolation.

```typescript
describe('UserCardComponent', () => {
  let component: UserCardComponent;
  let fixture: ComponentFixture<UserCardComponent>;
  let userSpy: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userSpy = jasmine.createSpyObj('UserService', ['getUser']);
    userSpy.getUser.and.returnValue(of({ id: 1, name: 'Alice' }));

    await TestBed.configureTestingModule({
      imports: [UserCardComponent],          // standalone component
      providers: [{ provide: UserService, useValue: userSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('displays the user name', () => {
    const el = fixture.debugElement.query(By.css('.name'));
    expect(el.nativeElement.textContent).toContain('Alice');
  });
});
```

---

### Q60. [Topic: Testing] [EPAM] What is the difference between `fakeAsync/tick` and `async/whenStable`?

**`fakeAsync` + `tick()`** — fake the passage of time synchronously:
```typescript
it('debounces the search input', fakeAsync(() => {
  component.searchCtrl.setValue('Angular');
  tick(300);              // advance fake timer 300ms
  fixture.detectChanges();
  expect(apiSpy.search).toHaveBeenCalledWith('Angular');
}));
```
- `tick(ms)` advances the fake clock
- `tick()` with no argument flushes all pending microtasks
- `flush()` drains all pending macrotasks
- Works for `setTimeout`, `setInterval`, RxJS `debounceTime`, `delay`

**`async` + `await fixture.whenStable()`** — waits for the real Angular zone to drain:
```typescript
it('loads user on init', async () => {
  fixture.detectChanges();
  await fixture.whenStable(); // wait for all async operations to settle
  expect(component.user).toBeTruthy();
});
```

**Rule**: Prefer `fakeAsync` for speed and determinism. Use `whenStable` for operations that `fakeAsync` cannot handle (e.g., native browser APIs outside Zone.js, some Promise chains).

---

### Q61. [Topic: Testing] How do you test a service that uses `HttpClient`?

```typescript
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service  = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // assert no unexpected HTTP calls made

  it('fetches user by id', () => {
    const mockUser = { id: 1, name: 'Alice' };
    service.getUser(1).subscribe(user => expect(user).toEqual(mockUser));

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('handles 404 errors', () => {
    service.getUser(999).subscribe({ error: err => expect(err.status).toBe(404) });
    httpMock.expectOne('/api/users/999')
      .flush('Not found', { status: 404, statusText: 'Not Found' });
  });
});
```

---

### Q62. [Topic: Testing] What is `jasmine.createSpyObj` and how do you control spy behaviour?

`jasmine.createSpyObj` creates an object where all specified methods are replaced with spy functions that record calls and allow controlled return values.

```typescript
const spy = jasmine.createSpyObj('UserService', ['getUser', 'saveUser']);

// Control return values
spy.getUser.and.returnValue(of(mockUser));           // return Observable
spy.getUser.and.callFake((id: number) => of({ id })); // custom implementation
spy.getUser.and.throwError('Network failure');
spy.getUser.and.callThrough();                        // call the real implementation

// Assertions
expect(spy.getUser).toHaveBeenCalled();
expect(spy.getUser).toHaveBeenCalledTimes(2);
expect(spy.getUser).toHaveBeenCalledWith(42);
expect(spy.getUser).toHaveBeenCalledOnceWith(42);
expect(spy.saveUser).not.toHaveBeenCalled();
```

---

### Q63. [Topic: Testing] How do you test an NgRx-powered component?

```typescript
import { MockStore, provideMockStore } from '@ngrx/store/testing';

describe('UsersComponent', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        provideMockStore({ initialState: { users: { list: [], loading: false } } })
      ]
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches loadUsers on init', () => {
    spyOn(store, 'dispatch');
    TestBed.createComponent(UsersComponent).detectChanges();
    expect(store.dispatch).toHaveBeenCalledWith(loadUsers());
  });

  it('renders users from store state', () => {
    store.setState({ users: { list: [{ id: 1, name: 'Alice' }], loading: false } });
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.user-row').length).toBe(1);
  });
});
```

---

## 14. TypeScript Deep Dive

---

### Q64. [Topic: TypeScript Types] [EPAM] What is the difference between `interface` and `type` in TypeScript?

| Dimension | `interface` | `type` |
|---|---|---|
| Declaration merging | Yes — can be reopened and extended across files | No |
| `extends` / `implements` | Native syntax | Via `&` intersection |
| Primitives / Unions | Cannot alias primitives | `type ID = string \| number` |
| Mapped / Conditional types | Limited | Full support |
| Error messages | Often cleaner — shows interface name | Sometimes verbose — shows expanded shape |

```typescript
// Interface — prefer for object shapes, class contracts, public API
interface User { id: number; name: string; }
interface AdminUser extends User { role: 'admin'; }

// Type — prefer for unions, intersections, aliases, computed types
type ID     = string | number;
type Status = 'active' | 'inactive' | 'suspended';
type Admin  = User & { role: 'admin' };
```

**Rule of thumb**: Use `interface` for public API shapes and class `implements` contracts. Use `type` for unions, conditional types, mapped types, and utility compositions.

---

### Q65. [Topic: TypeScript Types] What are TypeScript generics and why are they important in Angular?

Generics allow writing type-safe code that works across multiple types without losing type information.

```typescript
// Generic function
function first<T>(arr: T[]): T | undefined { return arr[0]; }
const name = first(['Alice', 'Bob']); // inferred as string | undefined

// Generic with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]; // return type is exactly T[K]
}

// Generic class
class Repository<T extends { id: number }> {
  private items: T[] = [];
  getById(id: number): T | undefined {
    return this.items.find(i => i.id === id);
  }
}
```

In Angular, generics power everything: `HttpClient.get<User[]>('/api/users')`, `Observable<User>`, `Signal<User | null>`, `FormControl<string>`, `EventEmitter<ClickEvent>`.

---

### Q66. [Topic: TypeScript Types] What are the key TypeScript utility types and how do you use them?

```typescript
interface User {
  id: number; name: string; email: string; role: 'admin' | 'user';
}

type UserPatch     = Partial<User>;                   // all properties optional
type FullUser      = Required<Partial<User>>;         // all required
type UserSummary   = Pick<User, 'id' | 'name'>;      // select subset
type CreateUserDTO = Omit<User, 'id'>;                // exclude 'id'
type RoleMap       = Record<User['role'], string[]>;  // { admin: string[]; user: string[] }
type ImmutableUser = Readonly<User>;                  // no mutation allowed
type ApiResult     = ReturnType<typeof userService.getUser>; // extract return type
type SaveParams    = Parameters<typeof userService.save>;    // extract param types
type NonNull       = NonNullable<User | null | undefined>;   // removes null & undefined
```

---

### Q67. [Topic: TypeScript Types] What is the difference between `unknown`, `any`, and `never`?

| Type | Meaning | Type-safe? | When to use |
|---|---|---|---|
| `any` | Opt out of type checking entirely | No | Legacy migrations, truly dynamic code (avoid) |
| `unknown` | Value exists but type is unknown | Yes — must narrow before use | External input, `catch` error parameter |
| `never` | Value that can never occur | Yes | Exhaustive checks, functions that never return |

```typescript
// unknown — must narrow before use
function process(input: unknown) {
  if (typeof input === 'string') input.toUpperCase(); // narrowed to string
}

// never — exhaustive switch guard
type Shape = 'circle' | 'square';
function area(shape: Shape): number {
  switch (shape) {
    case 'circle': return Math.PI;
    case 'square': return 1;
    default:
      const _check: never = shape; // TypeScript errors here if Shape gains a new value without updating this
      throw new Error(`Unhandled: ${_check}`);
  }
}
```

In Angular 19, `catch` clauses type the error as `unknown` by default (TypeScript 4.4+ strict mode). Always check `instanceof Error` before accessing `.message`.

---

### Q68. [Topic: TypeScript Types] What are discriminated unions and how do you use them with Angular state?

A discriminated union is a union type where each member has a shared literal property (the discriminant) that uniquely identifies it.

```typescript
type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
```

```typescript
// TypeScript narrows the type based on the discriminant
@Component({
  template: `
    @switch (state().status) {
      @case ('loading') { <app-spinner /> }
      @case ('success') { <p>{{ state().data.name }}</p> }
      @case ('error')   { <p>{{ state().message }}</p> }
      @default          { <p>Idle</p> }
    }
  `
})
export class UserComponent {
  state = signal<ApiState<User>>({ status: 'idle' });

  loadUser(id: number) {
    this.state.set({ status: 'loading' });
    this.userService.getUser(id).subscribe({
      next: data    => this.state.set({ status: 'success', data }),
      error: err    => this.state.set({ status: 'error', message: err.message })
    });
  }
}
```

---

### Q69. [Topic: TypeScript Types] What are conditional types and mapped types in TypeScript?

**Conditional types — type-level if/else:**
```typescript
type Stringify<T> = T extends string ? string : number;

// Built-in uses conditional types internally
type NonNullable<T> = T extends null | undefined ? never : T;

// Extract keys of T whose values extend a given type
type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];
```

**Mapped types — transform every property of a type:**
```typescript
type Nullable<T>     = { [K in keyof T]: T[K] | null };
type Optional<T>     = { [K in keyof T]?: T[K] };
type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };
```

In Angular, mapped types power typed reactive forms and strongly-typed environment configurations.

---

### Q70. [Topic: TypeScript Types] What is `as const` and when do you use it in Angular applications?

`as const` instructs TypeScript to infer the most specific literal types and make the value deeply `readonly`.

```typescript
// Without as const — inferred as string[]
const statuses = ['active', 'inactive', 'pending'];

// With as const — inferred as readonly ['active', 'inactive', 'pending']
const STATUSES = ['active', 'inactive', 'pending'] as const;

// Derive a union type from the constant — single source of truth
type Status = typeof STATUSES[number]; // 'active' | 'inactive' | 'pending'

// Angular use case — route config, API endpoint map
const API_ROUTES = {
  users:  '/api/users',
  orders: '/api/orders'
} as const;
type ApiRoute = typeof API_ROUTES[keyof typeof API_ROUTES];
// '/api/users' | '/api/orders'
```

---

### Q71. [Topic: TypeScript Types] What are TypeScript decorators and how does Angular use them?

Decorators are functions that modify class declarations, methods, properties, or parameters at design time. Angular uses them for component metadata.

Angular's built-in decorators:

| Category | Decorators |
|---|---|
| Class | `@Component`, `@Directive`, `@Pipe`, `@Injectable`, `@NgModule` |
| Property | `@Input()`, `@Output()`, `@ViewChild()`, `@ContentChild()` |
| Host | `@HostListener()`, `@HostBinding()` |
| DI parameter | `@Inject()`, `@Optional()`, `@Self()`, `@SkipSelf()` |

In Angular 19, signal-based APIs (`input()`, `output()`, `viewChild()`) provide functional equivalents that do not require the Reflect metadata polyfill, are tree-shakeable, and integrate natively with Signals.

---

## 15. SSR, Hydration & Angular Universal

---

### Q72. [Topic: SSR] What is Angular SSR and what problems does it solve?

Angular SSR (Server-Side Rendering, previously Angular Universal) renders the application on a Node.js server and sends complete HTML to the browser instead of an empty `<div id="root">`.

Problems solved:
1. **SEO** — crawlers receive fully-rendered HTML with content and `<meta>` tags
2. **First Contentful Paint (FCP)** — users see content before JS loads and executes
3. **Social sharing previews** — Open Graph tags are present in the initial HTML
4. **Low-end device performance** — server does the initial render work

In Angular 19, SSR is built-in as a first-class feature:
```bash
ng new my-app --ssr        # scaffold with SSR from the start
ng add @angular/ssr        # add to an existing application
```

---

### Q73. [Topic: SSR] What is hydration in Angular 19 and what is the difference between full and partial hydration?

**Hydration**: After SSR delivers pre-rendered HTML, Angular's client-side JavaScript takes over the existing DOM — attaching event listeners, restoring component state, making it interactive — without destroying and recreating the DOM.

**Full hydration** (Angular 16+, stable in Angular 17):
```typescript
providers: [provideClientHydration()]
```
Angular reuses all server-rendered DOM nodes. `withHttpTransferCache()` prevents HTTP calls made during SSR from being repeated on the client.

**Partial hydration** (Angular 19):
Powered by `@defer` — only interactive sections are hydrated with JavaScript. Static content remains as server-rendered HTML with zero JS overhead.

```html
<!-- Section is not hydrated until the user scrolls to it -->
@defer (on viewport; hydrate on viewport) {
  <app-comments />
} @placeholder {
  <div class="comments-placeholder"></div>
}
```

Partial hydration dramatically reduces Total Blocking Time (TBT) on content-heavy pages by deferring JavaScript hydration of below-fold content.

---

### Q74. [Topic: SSR] What are common pitfalls when writing Angular code that will run during SSR?

**1. Accessing browser-only globals — `window`, `document`, `localStorage`:**
```typescript
// ❌ Crashes on the Node.js server
const width = window.innerWidth;

// ✅ Guard with PLATFORM_ID
private platformId = inject(PLATFORM_ID);

getWidth(): number | null {
  return isPlatformBrowser(this.platformId) ? window.innerWidth : null;
}
```

**2. Non-idempotent side effects in `ngOnInit`** — code runs on server then again on client. Use `afterNextRender()` for browser-only initialization:
```typescript
constructor() {
  afterNextRender(() => {
    this.initChart(); // runs only in browser, after hydration
  });
}
```

**3. HTTP requests firing twice** — use `withHttpTransferCache()` so server responses are transferred to the browser:
```typescript
provideClientHydration(withHttpTransferCache())
```

**4. Non-deterministic templates** — `Date.now()` or `Math.random()` in templates cause hydration mismatches (server HTML ≠ client HTML). Always use stable values in templates.

---
