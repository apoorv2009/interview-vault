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

### Q1a. [Topic: Compilation] Can you still use JIT in Angular 19 instead of AOT?

Yes, technically — but with significant caveats.

**How to opt in:**
```bash
ng build --aot=false       # disable AOT for a build
ng serve --aot=false       # disable for dev server
```

At the bootstrap level, JIT requires `platformBrowserDynamic` instead of the AOT default:
```typescript
// JIT bootstrap — templates compiled in the browser at runtime
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
```

```typescript
// AOT bootstrap — Angular 19 default
import { bootstrapApplication } from '@angular/platform-browser';
bootstrapApplication(AppComponent, appConfig);
```

**Walls you hit in Angular 19:**

| Issue | Detail |
|---|---|
| Standalone components | JIT support for standalone is limited and partially broken — standalone architecture was designed around AOT |
| esbuild builder | Angular 19's default builder (`@angular-devkit/build-angular:application`) is tightly coupled to AOT; JIT effectively forces the older webpack builder |
| Bundle cost | JIT requires shipping `@angular/compiler` — adds ~200–300 KB gzipped to the bundle |
| Deprecation trajectory | The Angular team has signalled JIT is not a long-term supported path. New features (Signals, `@defer`, partial hydration) are not tested against JIT |

**The only legitimate reason to use JIT in Angular 19** is runtime template compilation — a CMS or plugin system where component templates arrive as strings from a server and must be compiled dynamically in the browser. Even then, most teams find alternatives (a DSL compiled server-side, a safe HTML renderer) to avoid the security and bundle-size cost of shipping the compiler.

**Interview answer**: JIT is still technically available via `--aot=false` or `platformBrowserDynamic`, but in Angular 19 it is essentially a legacy escape hatch. AOT is the default for both dev and prod, and JIT is only justified for dynamic runtime template compilation — a rare architectural need.

---

### Q2. [Topic: Compilation] What is the Ivy compiler and how does it relate to AOT?

Ivy is Angular's **compiler and runtime renderer**, introduced as the default in Angular 9. It replaced the older View Engine. Understanding why it was rewritten makes its design decisions clear.

#### The problem with View Engine

View Engine compiled components with **global knowledge** — to compile component A, it needed to know about component B, module C, and every transitive dependency. This caused two problems:
1. **Slow incremental builds** — changing one component could force recompilation of unrelated components
2. **Poor tree-shaking** — NgModules bundled everything declared in them, used or not

#### How Ivy works differently — the Locality Principle

Ivy compiles each component **in isolation**. A component's compiled output contains everything it needs to render — no global registry, no cross-component lookup.

```typescript
// What you write
@Component({
  selector: 'app-hello',
  template: `<h1>Hello {{ name }}</h1>`
})
export class HelloComponent {
  name = 'World';
}
```

```javascript
// What Ivy generates at build time (simplified)
HelloComponent.ɵcmp = defineComponent({
  type: HelloComponent,
  selectors: [['app-hello']],
  decls: 2,     // 2 DOM nodes: <h1> and text node
  vars: 1,      // 1 binding: {{ name }}
  template: function(rf, ctx) {
    if (rf & 1) {                    // creation phase — runs ONCE, builds DOM
      elementStart(0, 'h1');
      text(1);
      elementEnd();
    }
    if (rf & 2) {                    // update phase — runs on CD, updates bindings only
      textInterpolate(ctx.name);
    }
  }
});
```

The template compiles into **two separate phases**:
- **Creation phase** (`rf & 1`) — runs once, builds the DOM structure
- **Update phase** (`rf & 2`) — runs on every change detection cycle, updates only the bindings that changed

This is fundamentally more efficient than View Engine, which re-evaluated the whole template on every check.

#### What Ivy enables

| Capability | How Ivy makes it possible |
|---|---|
| Better tree-shaking | Bundler sees exactly which runtime instructions (`elementStart`, `text`, `listener`) each component uses and drops the rest |
| Faster incremental builds | Locality means only the changed file is recompiled — no module-graph ripple |
| Standalone components | View Engine needed NgModules to resolve directive/pipe availability; Ivy resolves from the component's own `imports` array |
| Signals & fine-grained CD | The update phase already operates at binding level; Signals plug directly into it — only the specific `textInterpolate` calls that read a changed Signal re-execute |
| Better debugging | Ivy exposes component internals via `ng` globals in dev mode |

#### Ivy debugging utilities (dev mode only)

```javascript
// In browser DevTools console — click a DOM element first ($0 = selected element)
ng.getComponent($0)        // get component instance from a DOM element
ng.getOwningComponent($0)  // get the parent component
ng.applyChanges(comp)      // manually trigger CD on a specific component instance
ng.getContext($0)          // get template context (useful for *ngFor rows)
```

#### The `ɵ` prefix — internal Ivy symbols

Compiled Angular classes gain properties prefixed with `ɵ` (theta). These are **internal APIs** — never use them directly; the compiler generates them.

| Symbol | What it holds |
|---|---|
| `ɵcmp` | Component definition — template, styles, inputs, outputs |
| `ɵdir` | Directive definition |
| `ɵpipe` | Pipe definition |
| `ɵfac` | Factory function used by DI to instantiate the class |
| `ɵprov` | Injectable provider metadata |

#### Ivy vs View Engine

| Dimension | View Engine | Ivy |
|---|---|---|
| Compilation model | Global — whole-app knowledge required | Local — per-component, self-contained |
| NgModules required | Yes | No — standalone components possible |
| Tree-shaking | Coarse — module level | Fine-grained — instruction level |
| Build speed | Slower incremental | Faster incremental |
| Removed in Angular version | — | View Engine removed in Angular 13 |
| Default since | — | Angular 9 |

In Angular 19, Ivy is the only engine. View Engine cannot be re-enabled.

---

### Q3. [Topic: Compilation] [EPAM] How does tree-shaking work in Angular and what makes it possible?

#### The core idea

Tree shaking is the process of **removing dead code from your final bundle** — code that exists in source or dependencies but is never imported or used. The name comes from the mental model: shake the dependency tree and dead leaves (unused code) fall off.

It is performed by the **bundler** (esbuild in Angular 19) at build time.

#### Simple example

```typescript
// math-utils.ts
export function add(a: number, b: number)      { return a + b; }
export function subtract(a: number, b: number) { return a - b; }
export function multiply(a: number, b: number) { return a * b; }

// app.ts — only imports one function
import { add } from './math-utils';
console.log(add(2, 3));
```

**Without tree shaking** — all three functions in the bundle:
```javascript
function add(a, b)      { return a + b; }
function subtract(a, b) { return a - b; } // ← dead code
function multiply(a, b) { return a * b; } // ← dead code
```

**With tree shaking** — only `add` survives:
```javascript
function add(a, b) { return a + b; }
```

#### How the bundler knows what is safe to remove

Tree shaking relies on **ES Module static imports**. Because `import` declarations are top-level and cannot be dynamic, the bundler builds a complete dependency graph at build time without executing the code.

```typescript
// ✅ Static import — bundler can analyse at build time
import { NgIf } from '@angular/common';

// ❌ Dynamic — bundler cannot statically know what will be imported
const module = await import(someRuntimeVariable);
```

**CommonJS `require()` breaks tree shaking** — it is a runtime function call, so the bundler cannot know what will be required until the code actually runs. This is why Angular dropped CommonJS output in library packages.

#### What gets tree-shaken in an Angular 19 app

```typescript
@Component({
  imports: [NgIf, RouterLink],  // explicit — bundler sees exactly this
  template: `<a *ngIf="show" routerLink="/home">Go</a>`
})
```

Everything you never imported is eliminated from the bundle:
- `NgFor`, `NgSwitch`, `NgClass`, `NgStyle` — not in your imports
- `FormsModule`, `ReactiveFormsModule` — not provided
- `HttpClient` — if `provideHttpClient()` is never called
- Dozens of internal Angular runtime instructions your templates never generate

#### Why AOT is a prerequisite for effective tree shaking

```
JIT path:
  Angular compiler shipped to browser
  → Bundler cannot know which framework features templates will use at runtime
  → Entire compiler + all directives must be included
  → Tree shaking is largely defeated

AOT path:
  Templates compiled to explicit JS function calls before bundling
  → Bundler sees exactly: "this app uses elementStart, text, listener, ngIf — nothing else"
  → Everything else is dropped
  → Tree shaking works at maximum efficiency
```

#### `sideEffects: false` — the other half of tree shaking

For tree shaking to work safely, the bundler must be confident that removing an unused file won't break anything. Some code has side effects just from being imported (polyfills that modify `window`, auto-registering service workers, etc.).

Library authors signal safety in `package.json`:
```json
{ "sideEffects": false }
```

This tells the bundler: *"none of my files have side effects — drop any file that isn't explicitly imported."* Angular's own packages declare this, which is why Angular framework code tree-shakes so aggressively.

If a library does NOT declare `sideEffects: false`, the bundler takes the conservative path and keeps all imported modules even if their exports go unused.

---

### Q4. [Topic: Compilation] When would you use JIT compilation in a production Angular application?

The honest answer is almost never in a standard application. There are four specific architectural scenarios where JIT is genuinely justified.

#### Scenario 1 — CMS-driven dynamic templates

A Content Management System stores Angular template strings in a database. Those templates must be compiled in the browser at runtime because their content is not known at build time.

```typescript
import { Component, NgModule, Compiler } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DynamicTemplateService {
  constructor(private compiler: Compiler) {}

  async createComponent(template: string, context: Record<string, any>) {
    @Component({ template, standalone: false })
    class DynamicComponent {
      title   = context['title'];
      ctaText = context['ctaText'];
    }

    @NgModule({ declarations: [DynamicComponent] })
    class DynamicModule {}

    // JIT compiles here — this is what requires the compiler in the bundle
    const { componentFactories } =
      await this.compiler.compileModuleAndAllComponentsAsync(DynamicModule);
    return componentFactories[0];
  }
}
```

Real-world examples: email template builders, drag-and-drop form builders where admins author templates in a UI, content personalisation platforms with per-tenant layouts.

#### Scenario 2 — Plugin / extension architecture

Third-party developers write Angular components as plugins, loaded and compiled at runtime. Their source was not available when the host application was built — think VS Code extensions for an Angular host shell.

```typescript
async loadPlugin(pluginUrl: string) {
  // Plugin bundle loaded from CDN at runtime — unknown at build time
  const pluginModule = await import(/* webpackIgnore: true */ pluginUrl);

  const factory = await this.compiler.compileModuleAndAllComponentsAsync(
    pluginModule.PluginModule
  );
  return factory;
}
```

#### Scenario 3 — Developer tooling and live sandboxes

Tools that let users write and preview Angular code in real time require JIT — there is no build step; user code arrives as a string.

Examples that use JIT under the hood:
- **StackBlitz** — runs Angular in the browser, compiling code as you type
- **Angular Playground** — component isolation and previewing tool
- **Online coding challenge platforms** — that execute Angular components in-browser

#### Scenario 4 — Multi-tenant UI customisation

A SaaS platform where each tenant has a different UI layout stored in their database row. The server cannot pre-compile thousands of tenant-specific templates at build time.

#### Ask this before reaching for JIT

For every scenario above, ask: **can I solve this without runtime template compilation?**

| JIT scenario | AOT alternative to consider first |
|---|---|
| CMS stores template strings | Store data/config, not templates — drive rendering from a configuration object, not Angular syntax |
| Plugin architecture | Ship plugins as pre-compiled standalone components loaded via dynamic `import()` — no JIT needed |
| Tenant UI customisation | Use `ngComponentOutlet` with a finite set of pre-built layout components driven by tenant config |
| Simple dynamic HTML | Use `[innerHTML]` with `DomSanitizer.bypassSecurityTrustHtml()` for purely presentational content |

```
Use JIT when:
  ✅ Templates arrive as strings from external systems at runtime
  ✅ Plugins are compiled in the browser with no prior build step
  ✅ You are building developer tooling — sandbox, live preview, REPL

Do NOT use JIT when:
  ❌ You want conditional rendering          → use @if / ngComponentOutlet
  ❌ You want to load features lazily        → use dynamic import() with AOT
  ❌ You want to vary UI per user            → use config-driven pre-built components
  ❌ You are on Angular 19 standalone        → JIT support is degraded, find an alternative
```

---

### Q5. [Topic: Compilation] What is the Angular Language Service and how does it relate to AOT?

The Angular Language Service is a TypeScript plugin (used in VS Code, JetBrains IDEs) that provides type-checking, autocompletion, and error detection *inside templates* in the editor. It uses the same Ivy compiler that AOT uses, meaning editor template errors are identical to what `ng build` would report. This gives you instant feedback without running a build — effectively the developer experience of AOT without the build-step latency.

---

## 2. Change Detection

---

### Q6. [Topic: Change Detection] [EPAM] Explain Angular's change detection mechanism.

#### The problem it solves

In plain JavaScript, changing a variable does nothing to the screen — you have to manually find and update the DOM yourself. Angular's promise is: **you manage the data, Angular manages the DOM**. Change Detection (CD) is the system that keeps them in sync.

#### Simple mental model — the spreadsheet analogy

Think of your Angular app as a spreadsheet:
- Your **component class** = data cells (the values)
- Your **template** = formula cells (what the user sees)
- **Change Detection** = the recalculation engine — when a value cell changes, it recalculates all formula cells that depend on it

```
Component class         Template (DOM)
──────────────          ──────────────
username = 'Alice'  →→→ <p>Alice</p>

       ↓ data changes

username = 'Bob'
       ↓ Angular runs Change Detection
                   →→→ <p>Bob</p>   ← DOM updated
```

#### What triggers data to change — only three sources

```
1. User interaction   → button click, form input, keyboard event
2. HTTP response      → data returned from the server
3. Timer firing       → setTimeout / setInterval completed
```

All three are **async events**. Angular needs to know when they happen — this is Zone.js's job.

#### Zone.js — Angular's spy

Zone.js wraps every async operation silently. When any of the three sources above completes, Zone.js tells Angular: *"something just happened, you should check your data."*

```
User clicks a button
      ↓
Zone.js intercepts the click event
      ↓
Your click handler runs (data may have changed)
      ↓
Zone.js notifies Angular
      ↓
Angular runs Change Detection
      ↓
DOM updated
```

#### What happens during a CD cycle

Angular walks the **entire component tree top to bottom**, visiting every component:

```
AppComponent          ← checked
├── HeaderComponent   ← checked
├── SidebarComponent  ← checked
└── MainComponent     ← checked
    ├── UserCard      ← checked
    └── PostList      ← checked
```

For each component, Angular compares current binding values against the previous values it stored:

```
Previous value of username: 'Alice'
Current value of username:  'Bob'
Different? YES → update the <p> DOM node

Previous value of count: 42
Current value of count:  42
Different? NO  → skip, leave DOM alone
```

Only changed bindings get a DOM update. Everything unchanged is left untouched.

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

#### One-line version

- `markForCheck()` → **"Add me to the next inspection round"**
- `detectChanges()` → **"Inspect me right now, immediately"**

#### Real-world analogy

Imagine an office building where a **safety inspector** walks every floor on a schedule (Angular's CD cycle).

**`markForCheck()`** = You stick a **"needs inspection"** flag on your room door. You are not calling the inspector right now — just ensuring he does not skip your room on his next scheduled round.

**`detectChanges()`** = You **call the inspector directly** and say *"drop everything, come check my room now."* He comes immediately, checks your room and every room below yours, then goes back to his schedule.

#### Direction matters

```
markForCheck()  — walks UP the tree, flags component + ancestors
detectChanges() — walks DOWN the tree, checks component + all children

AppComponent         ← markForCheck() flags this
└── MainComponent    ← markForCheck() flags this
    └── UserCard     ← YOU ARE HERE
        └── Avatar   ← detectChanges() checks this
```

#### Side by side

| | `markForCheck()` | `detectChanges()` |
|---|---|---|
| When does CD run? | Next scheduled cycle | Immediately, right now |
| Direction | Walks UP — flags component + ancestors | Walks DOWN — checks component + children |
| Synchronous? | No — schedules only | Yes — runs synchronously |
| Safe in lifecycle hooks? | Yes | Careful — can cause `ExpressionChangedAfterItHasBeenCheckedError` |
| Typical use | Data changed outside Zone.js | Need DOM updated before the next line of code |

```typescript
constructor(private cdr: ChangeDetectorRef) {}

this.cdr.markForCheck();   // schedule — safe, idiomatic
this.cdr.detectChanges();  // immediate — synchronous

// Detach from CD tree entirely (charts, canvas, 3rd-party widgets)
this.cdr.detach();
this.cdr.reattach();
```

#### Real-world scenarios — `markForCheck()`

**WebSocket / third-party library callback outside Zone.js:**
```typescript
this.socket.on('message', (data) => {
  // Socket.io runs outside Zone.js — Angular has no idea this happened
  this.message = data;
  this.cdr.markForCheck();
});
```

**Manual subscribe in OnPush component:**
```typescript
ngOnInit() {
  this.notifService.unreadCount$.subscribe(count => {
    this.count = count;
    this.cdr.markForCheck(); // async pipe does this for you automatically
  });
}
```

**Running heavy work outside Angular zone, then updating UI:**
```typescript
this.ngZone.runOutsideAngular(() => {
  const result = this.doExpensiveCalculation();
  this.ngZone.run(() => {
    this.result = result;
    this.cdr.markForCheck();
  });
});
```

**Web Worker sending result back to main thread:**
```typescript
this.worker.onmessage = ({ data }) => {
  // Worker messages arrive outside Zone.js
  this.processedData = data;
  this.cdr.markForCheck();
};
```

**Third-party library events (Google Maps, Chart.js):**
```typescript
this.map.addListener('click', (event) => {
  // Google Maps events — completely outside Angular
  this.selectedLocation = event.latLng;
  this.cdr.markForCheck();
});
```

#### Real-world scenarios — `detectChanges()`

**Focusing an element that was just shown:**
```typescript
openSearchBox() {
  this.showSearch = true;
  this.cdr.detectChanges();          // DOM now has the input element
  this.searchInput.nativeElement.focus(); // safe to focus
}
```

**Initialising Chart.js / D3 on a conditionally rendered container:**
```typescript
showChart() {
  this.isChartVisible = true;
  this.cdr.detectChanges();          // canvas element now exists in DOM
  this.chart = new Chart(this.canvasRef.nativeElement, config);
}
```

**Measuring DOM dimensions to position a tooltip:**
```typescript
showTooltip(content: string) {
  this.tooltipContent = content;
  this.tooltipVisible = true;
  this.cdr.detectChanges();
  const { width, height } = this.tooltipRef.nativeElement.getBoundingClientRect();
  this.tooltipPosition = this.calculatePosition(width, height);
  this.cdr.detectChanges();          // apply calculated position
}
```

**Driving Angular from legacy non-Angular code:**
```typescript
updateFromLegacySystem(data: any) {
  this.componentData = data;
  this.cdr.detectChanges();          // legacy system expects DOM current immediately
  this.legacyLib.onAngularUpdated();
}
```

#### Decision rule

```
Does the DOM need to update RIGHT NOW before my next line of code?
  YES → detectChanges()
  NO  → markForCheck()

Did data change outside Zone.js (WebSocket, worker, 3rd-party callback)?
  YES → markForCheck()
  NO  → you probably don't need either
        (Zone.js handles Default strategy automatically)
        (async pipe handles OnPush automatically)
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

### Q10a. [Topic: Change Detection] HTTP responses automatically update the DOM — why doesn't WebSocket do the same?

This is a nuanced distinction. The short answer: **it depends on which WebSocket you use and which CD strategy your component has.**

#### Why HTTP works automatically

When you use Angular's `HttpClient`, two layers of safety work together:

```
HttpClient.get('/api/users')
    │
    ├── Internally uses XHR or Fetch
    │   ← Zone.js patches BOTH
    │   ← Response arrival notifies Angular automatically
    │
    └── Returns an Observable
        └── You subscribe via async pipe
            └── async pipe internally calls markForCheck()
                every time a new value arrives
```

HTTP works automatically because of **two layers** — Zone.js handles the network event AND the `async` pipe calls `markForCheck()` on your behalf.

#### The truth about native WebSocket

Zone.js **does** patch the native `WebSocket` API. So if you use it directly, CD triggers automatically for Default strategy components — just like HTTP:

```typescript
// Native WebSocket — Zone.js patches this
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  this.message = event.data;
  // Default strategy → DOM updates automatically ✅
  // No markForCheck() needed
};
```

#### Why WebSocket still needs `markForCheck()` in practice

Two real-world situations break the automatic behaviour:

**Situation 1 — Third-party WebSocket libraries (most common)**

In real projects you use Socket.io, SignalR, SockJS — not raw WebSocket. These libraries have their own internal event systems that Zone.js does NOT patch:

```typescript
// Socket.io — own event emitter, NOT patched by Zone.js
this.socket.on('message', (data) => {
  // Runs outside Angular's zone
  this.message = data;
  // DOM will NOT update automatically ❌
  this.cdr.markForCheck(); // ← required
});
```

**Situation 2 — OnPush component**

Even when Zone.js does trigger a CD cycle from a native WebSocket message, OnPush components are **skipped** unless explicitly marked dirty:

```
Native WebSocket message arrives
→ Zone.js triggers CD cycle (app-wide)
→ Angular walks the tree
→ Reaches your OnPush component
→ "Is this component dirty?" → NO
→ SKIPPED → DOM not updated ❌
```

Compare with HTTP + `async` pipe:
```
HTTP response arrives
→ Zone.js triggers CD cycle
→ async pipe receives the value
→ async pipe calls markForCheck() internally ← this is the key step
→ OnPush component is now dirty
→ Angular checks it → DOM updated ✅
```

#### Full picture

| Scenario | DOM auto-updates? |
|---|---|
| HTTP + `async` pipe + Default strategy | ✅ Zone.js + async pipe handles it |
| HTTP + `async` pipe + OnPush | ✅ async pipe calls `markForCheck()` internally |
| HTTP + manual subscribe + Default strategy | ✅ Zone.js handles it |
| HTTP + manual subscribe + OnPush | ❌ Need `markForCheck()` manually |
| Native WebSocket + Default strategy | ✅ Zone.js patches native WebSocket |
| Native WebSocket + OnPush | ❌ Zone.js triggers cycle but OnPush is skipped |
| Socket.io / SignalR + Default strategy | ❌ Library bypasses Zone.js entirely |
| Socket.io / SignalR + OnPush | ❌ Double problem — no Zone.js + OnPush skips |

#### Takeaway

The `async` pipe is the real hero in the HTTP story — it silently calls `markForCheck()` every time a value arrives. With WebSocket you have to do it yourself, because either your library bypasses Zone.js or your component is OnPush and nothing calls `markForCheck()` on your behalf.

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

Every Angular component goes through a predictable journey — created, initialised, updated, and eventually destroyed. Angular provides **hook methods** to tap into specific moments of that journey.

#### The house-building analogy

```
constructor()            → Land purchased — component object created, DI wired
ngOnChanges()            → Architect delivers blueprints — inputs received from parent
ngOnInit()               → Construction complete, move in — ready to work
ngDoCheck()              → Property inspector visits — every CD cycle
ngAfterContentInit()     → Furniture delivered — projected content ready
ngAfterContentChecked()  → Furniture re-inspected — after every CD on content
ngAfterViewInit()        → Final walkthrough, electricity & plumbing — DOM fully ready
ngAfterViewChecked()     → Final re-inspection — after every CD on view
ngOnDestroy()            → Moving out — cleanup before removal
```

#### Full execution order

```
Component created
      ↓
constructor()
      ↓
ngOnChanges()           ← fires BEFORE ngOnInit if there are @Input() values
      ↓
ngOnInit()              ← fires ONCE
      ↓
ngDoCheck()             ← fires every CD cycle
      ↓
ngAfterContentInit()    ← fires ONCE
      ↓
ngAfterContentChecked() ← fires every CD cycle
      ↓
ngAfterViewInit()       ← fires ONCE
      ↓
ngAfterViewChecked()    ← fires every CD cycle
      ↓
[component lives — ngOnChanges → ngDoCheck → Checked hooks repeat on each CD cycle]
      ↓
ngOnDestroy()           ← fires ONCE before removal
```

---

#### `constructor()`

Not an Angular hook — a standard TypeScript constructor. The only safe thing here is receiving injected services.

```typescript
export class UserComponent {
  constructor(private userService: UserService) {
    // ✅ DI only
    // ❌ Don't call services — inputs not set yet
    // ❌ Don't touch DOM — doesn't exist yet
  }
}
```

---

#### `ngOnChanges(changes: SimpleChanges)`

Fires every time an `@Input()` value changes — including the very first time, before `ngOnInit`.

```typescript
export class UserCardComponent implements OnChanges {
  @Input() userId!: number;

  ngOnChanges(changes: SimpleChanges) {
    // changes tells you what changed, old value, new value
    if (changes['userId']) {
      this.loadUser(changes['userId'].currentValue);
    }
  }
}
```

**Real use cases:**
```typescript
// 1. Reload data when parent passes a new ID
ngOnChanges(changes: SimpleChanges) {
  if (changes['userId'] && !changes['userId'].firstChange) {
    this.fetchUserData(this.userId);
  }
}

// 2. Validate input before using it
ngOnChanges(changes: SimpleChanges) {
  if (changes['price'] && this.price < 0) {
    this.price = 0;
  }
}

// 3. Detect first change vs subsequent changes
ngOnChanges(changes: SimpleChanges) {
  if (changes['config']?.firstChange) {
    this.initWithConfig(this.config);
  } else {
    this.updateConfig(this.config);
  }
}
```

> Only fires for `@Input()` properties — not for properties changed internally.

---

#### `ngOnInit()`

Fires **once**, after the first `ngOnChanges`. All `@Input()` values are available. This is the main "get started" hook.

```typescript
export class DashboardComponent implements OnInit {
  @Input() userId!: number;

  ngOnInit() {
    // ✅ @Input() values ready
    // ✅ Safe to call services and HTTP
    this.userService.getUser(this.userId).subscribe(u => this.user = u);
  }
}
```

**Real use cases:**
```typescript
// Fetch API data
ngOnInit() {
  this.productService.getProducts().subscribe(p => this.products = p);
}

// Subscribe to route params
ngOnInit() {
  this.route.paramMap.subscribe(params => {
    this.loadPost(+params.get('id')!);
  });
}

// Start a polling interval
ngOnInit() {
  interval(30000).pipe(
    startWith(0),
    switchMap(() => this.statusService.getStatus()),
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(status => this.status = status);
}
```

**constructor vs ngOnInit — most common interview question:**
```
constructor()  → component object BEING CREATED
                 @Input() NOT set, DOM does NOT exist
                 → only for DI

ngOnInit()     → component FULLY INITIALISED
                 @Input() IS set, DOM still does NOT exist
                 → HTTP calls, subscriptions, data setup
```

---

#### `ngDoCheck()`

Fires on **every single CD cycle**. Lets you write custom detection logic for changes Angular can't detect — like a mutation deep inside an object.

```typescript
export class CartComponent implements DoCheck {
  @Input() items: CartItem[] = [];
  private previousCount = 0;

  ngDoCheck() {
    // Array reference didn't change but contents did — Angular won't catch this
    if (this.items.length !== this.previousCount) {
      this.previousCount = this.items.length;
      this.recalculateTotal();
    }
  }
}
```

> Fires extremely frequently — keep logic here minimal. In most cases, use immutable data + OnPush instead.

---

#### `ngAfterContentInit()`

Fires **once** after Angular projects external content into your component via `<ng-content>`. Safe to read `@ContentChild` references here.

```typescript
export class TabsComponent implements AfterContentInit {
  @ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;

  ngAfterContentInit() {
    // All projected <app-tab> children are now accessible
    this.tabs.first.isActive = true;
  }
}

// Usage:
// <app-tabs>
//   <app-tab title="Home">...</app-tab>
//   <app-tab title="Profile">...</app-tab>
// </app-tabs>
```

---

#### `ngAfterContentChecked()`

Fires after Angular checks projected content on every CD cycle. Use when you need to react to dynamically changing projected content.

```typescript
ngAfterContentChecked() {
  this.updateTabTitles(); // tabs may have been added/removed
}
```

> Fires very frequently. Keep logic lightweight.

---

#### `ngAfterViewInit()`

Fires **once** after the component's own template and all child components are fully rendered. **The DOM finally exists here.**

```typescript
export class DashboardComponent implements AfterViewInit {
  @ViewChild('chartCanvas') canvasRef!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;

  ngAfterViewInit() {
    // ✅ DOM exists — safe to interact with it

    // Initialise a third-party chart library
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar', data: this.chartData
    });

    // Auto-focus an input
    this.searchInput.nativeElement.focus();
  }
}
```

**Real use cases:**
```typescript
// Google Maps initialisation
ngAfterViewInit() {
  this.map = new google.maps.Map(this.mapContainer.nativeElement, {
    center: { lat: 40.71, lng: -74.00 }, zoom: 12
  });
}

// Set up ResizeObserver
ngAfterViewInit() {
  new ResizeObserver(entries => {
    this.width = entries[0].contentRect.width;
    this.cdr.markForCheck();
  }).observe(this.containerRef.nativeElement);
}

// Measure element dimensions
ngAfterViewInit() {
  const { width, height } = this.cardRef.nativeElement.getBoundingClientRect();
  this.cardDimensions = { width, height };
}
```

**ngOnInit vs ngAfterViewInit:**
```
ngOnInit()        → data ready, DOM does NOT exist
                    → HTTP calls, subscriptions

ngAfterViewInit() → DOM FULLY EXISTS
                    → third-party library init, @ViewChild, focus, measure
```

---

#### `ngAfterViewChecked()`

Fires after Angular checks the component's view on every CD cycle. Use for post-render adjustments like auto-scrolling.

```typescript
ngAfterViewChecked() {
  if (this.shouldScrollToBottom) {
    this.messageList.nativeElement.scrollTop =
      this.messageList.nativeElement.scrollHeight;
    this.shouldScrollToBottom = false;
  }
}
```

> Set a flag in your logic and check it here — never do heavy computation directly.

---

#### `ngOnDestroy()`

Fires **once** just before the component is removed. Clean up everything to prevent memory leaks.

```typescript
export class LiveFeedComponent implements OnInit, OnDestroy {
  private subscription!: Subscription;
  private intervalId!: ReturnType<typeof setInterval>;
  private socket!: WebSocket;

  ngOnInit() {
    this.subscription = this.feedService.updates$.subscribe(/* ... */);
    this.intervalId   = setInterval(() => this.refresh(), 5000);
    this.socket       = new WebSocket('ws://live.example.com');
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();     // cancel subscriptions
    clearInterval(this.intervalId);      // clear timers
    this.socket.close();                 // close WebSocket
    document.removeEventListener('keydown', this.keyHandler); // remove listeners
  }
}
```

**Angular 19 — `takeUntilDestroyed()` replaces manual ngOnDestroy for subscriptions:**
```typescript
export class LiveFeedComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.feedService.updates$.pipe(
      takeUntilDestroyed(this.destroyRef) // auto-unsubscribes on destroy
    ).subscribe(/* ... */);
    // No ngOnDestroy needed for subscriptions
  }
}
```

---

#### Complete cheat sheet

| Hook | Fires | DOM exists? | @Input ready? | Use for |
|---|---|---|---|---|
| `constructor` | Once — on creation | ❌ | ❌ | Dependency injection only |
| `ngOnChanges` | Before init + on every input change | ❌ | ✅ | React to input changes, validate |
| `ngOnInit` | Once — after first ngOnChanges | ❌ | ✅ | HTTP calls, subscriptions, data init |
| `ngDoCheck` | Every CD cycle | ❌ | ✅ | Custom dirty checking — use sparingly |
| `ngAfterContentInit` | Once — after ng-content projected | ❌ | ✅ | Access @ContentChild references |
| `ngAfterContentChecked` | Every CD cycle | ❌ | ✅ | React to projected content changes |
| `ngAfterViewInit` | Once — after view fully rendered | ✅ | ✅ | 3rd-party libs, @ViewChild, focus, measure |
| `ngAfterViewChecked` | Every CD cycle | ✅ | ✅ | Post-render adjustments (scroll, measure) |
| `ngOnDestroy` | Once — before removal | ✅ | ✅ | Unsubscribe, clear timers, close sockets |

---

## 3. Components & Lifecycle Hooks

---

### Q13. [Topic: Components] [Capgemini] What is ViewEncapsulation in Angular and what are its modes?

#### The problem it solves

In plain HTML, CSS is global — a style defined anywhere affects everything on the page. Without protection, your `UserCard` component's `h2 { color: blue }` would make every `h2` on the entire page blue. ViewEncapsulation keeps each component's styles locked to that component only.

#### Simple analogy — offices in a building

**Without encapsulation** → One open floor. One team paints the walls blue — the entire floor turns blue.

**With encapsulation** → Separate walled offices. Blue walls in HR don't affect Finance next door.

ViewEncapsulation controls how "walled off" each component's styles are.

---

#### Mode 1 — `Emulated` (default)

Angular adds a **unique ID attribute** to every element in the component's template, then rewrites CSS rules to only target elements with that ID.

```typescript
@Component({
  selector: 'app-user-card',
  template: `<h2>Alice</h2>`,
  styles: [`h2 { color: blue; }`]
  // ViewEncapsulation.Emulated is the default — no need to declare it
})
```

What Angular actually renders in the browser:
```html
<!-- Angular adds a unique scoping attribute -->
<h2 _ngcontent-abc-c123>Alice</h2>
```

Your CSS gets rewritten to:
```css
/* You write:          h2 { color: blue; }                          */
/* Angular outputs:    h2[_ngcontent-abc-c123] { color: blue; }     */
```

Now `color: blue` only applies to `h2` inside **this component** — every other `h2` on the page is untouched. You write normal CSS and Angular handles all the scoping invisibly.

```typescript
// Component A
styles: [`h2 { color: blue; }`]  // only affects h2 inside Component A

// Component B
styles: [`h2 { color: red; }`]   // only affects h2 inside Component B
// They never interfere ✅
```

---

#### Mode 2 — `ShadowDom`

Uses the browser's **native Shadow DOM API** — a completely isolated DOM subtree built into the browser itself.

```typescript
@Component({
  selector: 'app-user-card',
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [`h2 { color: blue; }`]
})
```

What it looks like in DevTools:
```html
<app-user-card>
  #shadow-root (open)      ← browser creates this — styles live inside here
    <style>h2 { color: blue; }</style>
    <h2>Alice</h2>
</app-user-card>
```

**Emulated vs ShadowDom analogy:**
- Emulated = walled offices with glass windows — mostly separate but global CSS can still reach in
- ShadowDom = rooms with soundproof one-way mirrors — **complete isolation**, nothing gets in or out

| | Emulated | ShadowDom |
|---|---|---|
| Global CSS can style inside? | ✅ Yes | ❌ No |
| Component CSS leaks outside? | ❌ No | ❌ No |
| Browser support | All browsers | Modern browsers only |

**When to use**: Design systems, shared web components used across multiple frameworks, Angular Material internals.

**Downside**: You cannot style it from outside — parent component styles and global themes won't penetrate the shadow boundary. Theming becomes harder.

---

#### Mode 3 — `None`

No encapsulation. Styles become **global** and affect the entire page.

```typescript
@Component({
  selector: 'app-theme',
  encapsulation: ViewEncapsulation.None,
  styles: [`h2 { color: blue; }`]  // affects EVERY h2 on the page
})
```

**Valid use cases:**
```typescript
// 1. Intentional global theming — setting CSS variables for the whole app
@Component({
  selector: 'app-theme-provider',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    :root {
      --primary-color: #3f51b5;
      --font-size-base: 16px;
    }
  `]
})

// 2. Overriding styles inside a third-party library's rendered DOM
@Component({
  selector: 'app-dialog-wrapper',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .mat-dialog-container { border-radius: 12px; }
  `]
})
```

---

#### The `:host` selector — styling your component's own element

All three modes support `:host`, which targets the **component's own tag** (`<app-user-card>` itself, not its inner content):

```typescript
@Component({
  selector: 'app-user-card',
  styles: [`
    :host {
      display: block;           /* make it block-level */
      border: 1px solid #ccc;
      padding: 16px;
    }

    :host(.featured) {          /* when parent adds class="featured" to the tag */
      border-color: gold;
    }

    :host-context(.dark-theme) { /* when ANY ancestor has class dark-theme */
      background: #333;
      color: white;
    }
  `]
})
```

---

#### Full comparison

| | `Emulated` (default) | `ShadowDom` | `None` |
|---|---|---|---|
| How | Angular adds unique attribute IDs | Browser native Shadow DOM | No scoping |
| Styles leak out? | ❌ No | ❌ No | ✅ Yes — global |
| Global CSS leaks in? | ✅ Yes | ❌ No | ✅ Yes |
| Browser support | All browsers | Modern browsers | All browsers |
| Use for | Everything — correct default | Design systems, web components | Global theming, 3rd-party overrides |

**One-line interview answer**: ViewEncapsulation controls how component styles are scoped. `Emulated` (default) adds unique attribute selectors so styles only apply inside that component. `ShadowDom` uses the browser's native shadow DOM for complete isolation. `None` removes all scoping making styles global. Use `Emulated` always, `None` only for intentional global overrides, `ShadowDom` for design systems needing true browser-level isolation.

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

#### The problem Signals solve

Before Signals, Angular relied on Zone.js to detect changes — after every async event, it checked the entire component tree to find what changed. This is like asking a librarian to inspect every single book after every customer visit to find the one that was returned.

**Signals make data self-aware.** Instead of Angular going to check if data changed, the data itself says *"I just changed — and here is exactly who needs to know."*

#### Simple mental model — the box with notifications

```
Regular variable:              Signal:
┌──────────────┐               ┌────────────────────────────┐
│  count = 0   │               │  count = signal(0)         │
└──────────────┘               │  + notifies Angular        │
                               │    exactly which template  │
Angular must go CHECK it.      │    expressions use it      │
                               └────────────────────────────┘
                               Angular is TOLD when it changes.
```

Think of it like a **live scoreboard** — you do not keep walking over to check the score. The scoreboard updates itself and everyone watching sees the change immediately.

---

#### The three core primitives

**1. `signal()` — the box that holds a value**

```typescript
import { signal } from '@angular/core';

const count = signal(0);       // create with initial value

// READ — call it like a function
console.log(count());          // 0

// WRITE — set to an absolute value
count.set(5);
console.log(count());          // 5

// UPDATE — based on the previous value
count.update(n => n + 1);
console.log(count());          // 6
```

In a component:
```typescript
@Component({
  template: `
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">+1</button>
    <button (click)="reset()">Reset</button>
  `
})
export class CounterComponent {
  count = signal(0);

  increment() { this.count.update(n => n + 1); }
  reset()     { this.count.set(0); }
}
// No ngOnInit, no subscribe, no markForCheck — it just works
```

---

**2. `computed()` — a value derived from other signals**

`computed()` creates a **read-only signal** whose value is automatically calculated from other signals. It is lazy (only calculates when read) and memoized (caches the result, only recalculates when dependencies change).

```typescript
const price    = signal(100);
const quantity = signal(3);
const discount = signal(0.1);

const total = computed(() => price() * quantity() * (1 - discount()));

console.log(total()); // 270
price.set(200);
console.log(total()); // 540 — recalculated automatically
```

Real shopping cart example:
```typescript
@Component({
  template: `
    <p>Items: {{ itemCount() }}</p>
    <p>Subtotal: {{ subtotal() | currency }}</p>
    <p>Tax: {{ tax() | currency }}</p>
    <p>Total: {{ total() | currency }}</p>
  `
})
export class CartComponent {
  items   = signal<CartItem[]>([]);
  taxRate = signal(0.08);

  // All derived — automatically stay in sync
  itemCount = computed(() => this.items().length);
  subtotal  = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));
  tax       = computed(() => this.subtotal() * this.taxRate());
  total     = computed(() => this.subtotal() + this.tax());

  addItem(item: CartItem) {
    this.items.update(current => [...current, item]);
    // itemCount, subtotal, tax, total all update automatically ✅
  }
}
```

---

**3. `effect()` — run code when a signal changes**

`effect()` is a side effect that automatically re-runs whenever any signal it reads changes.

```typescript
@Component({...})
export class ThemeComponent {
  theme = signal<'light' | 'dark'>('light');

  constructor() {
    // Runs immediately, then re-runs whenever theme() changes
    effect(() => {
      document.body.className = this.theme();
      localStorage.setItem('theme', this.theme());
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
}
```

**Do/don't with `effect()`:**
```typescript
// ❌ Wrong — updating a signal inside effect() causes circular dependencies
effect(() => {
  this.total.set(this.price() * this.qty()); // don't do this
});

// ✅ Right — use computed() for derived values
total = computed(() => this.price() * this.qty());

// ✅ effect() is for side effects outside Angular's template
effect(() => {
  localStorage.setItem('theme', this.theme()); // storage
  this.analytics.track('theme_changed', this.theme()); // analytics
  this.thirdPartyLib.setTheme(this.theme()); // external library
});
```

---

#### Signal vs regular variable — what actually changes

```typescript
// Regular variable — Angular must check it every CD cycle
@Component({ template: `<p>{{ username }}</p>` })
export class OldComponent {
  username = 'Alice';

  updateName() {
    this.username = 'Bob';
    // Zone.js eventually triggers a full component tree check
  }
}

// Signal — Angular knows EXACTLY which expression to update
@Component({ template: `<p>{{ username() }}</p>` })
export class NewComponent {
  username = signal('Alice');

  updateName() {
    this.username.set('Bob');
    // Only the one <p> expression re-evaluates — nothing else
  }
}
```

---

#### Bridging Signals and Observables

HTTP returns Observables. Your components use Signals. Two bridge functions connect them.

**`toSignal()` — Observable → Signal (most common bridge):**
```typescript
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  template: `
    @if (user()) {
      <p>{{ user()!.name }}</p>   <!-- no async pipe needed -->
    }
  `
})
export class ProfileComponent {
  // Converts Observable to Signal — auto-manages subscription and unsubscription
  user = toSignal(
    this.http.get<User>('/api/me'),
    { initialValue: null }        // value shown before HTTP responds
  );
  // No subscribe(), no ngOnDestroy needed
}
```

**`toObservable()` — Signal → Observable (when you need RxJS operators):**
```typescript
import { toObservable } from '@angular/core/rxjs-interop';

export class SearchComponent {
  searchTerm = signal('');

  // Convert to Observable to use debounce, switchMap etc.
  results$ = toObservable(this.searchTerm).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.api.search(term))
  );
}
```

---

#### Real-world complete example

A profile page using signals end-to-end:
```typescript
@Component({
  template: `
    @if (user()) {
      <div [class]="theme()">
        <h2>{{ user()!.name }}</h2>
        <p>Member for {{ membershipDays() }} days</p>
        <button (click)="toggleTheme()">Switch Theme</button>
      </div>
    }
  `
})
export class ProfileComponent {
  userId = input.required<number>();         // signal-based input
  theme  = signal<'light' | 'dark'>('light'); // local state

  // HTTP data bridged to a signal
  user = toSignal(
    toObservable(this.userId).pipe(
      switchMap(id => this.http.get<User>(`/api/users/${id}`))
    ),
    { initialValue: null }
  );

  // Derived — auto-updates when user() changes
  membershipDays = computed(() => {
    const u = this.user();
    if (!u) return 0;
    return Math.floor((Date.now() - new Date(u.joinedAt).getTime()) / 86400000);
  });

  constructor(private http: HttpClient) {
    // Side effect — sync theme to localStorage
    effect(() => localStorage.setItem('theme', this.theme()));
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
}
```

---

**Signal vs Observable:**

| Dimension | Signal | Observable (RxJS) |
|---|---|---|
| Synchrony | Always synchronous | Can be sync or async |
| Reading current value | `count()` — always available | Requires `.subscribe()` or `.getValue()` |
| Async operations | Not built-in | Native (HTTP, events, timers) |
| Memoization | `computed()` is automatic | Requires `shareReplay()` or manual caching |
| Change Detection | Fine-grained — only touched expressions update | Requires `async` pipe or `markForCheck()` |
| Template syntax | `{{ count() }}` | `{{ count$ \| async }}` |

```
Use Signals when:                     Use Observables when:
──────────────────                    ──────────────────────
Component / feature state             HTTP requests
Values displayed in templates         WebSocket streams
Derived / computed values             Complex operators (debounce, retry)
Replacing BehaviorSubject             RxJS pipelines

Bridge with:
  toSignal()      → Observable into Signal (for templates)
  toObservable()  → Signal into Observable (for RxJS operators)
```

---

### Q18. [Topic: Angular 19] What are signal-based `input()`, `output()`, and `model()` in Angular 19?

Angular 19 provides signal-based equivalents of `@Input()`, `@Output()`, and two-way `[(x)]` binding. All are stable in Angular 19 and the preferred approach for new components.

#### `input()` — signal-based @Input

```typescript
@Component({ selector: 'app-user-card' })
export class UserCardComponent {
  // Required — compiler error if parent does not provide it
  userId = input.required<number>();

  // Optional with default value
  theme = input<'light' | 'dark'>('light');

  // Because inputs are signals, you can derive from them directly
  label     = computed(() => `User #${this.userId()}`);
  isDark    = computed(() => this.theme() === 'dark');
}

// Parent usage:
// <app-user-card [userId]="42" [theme]="'dark'" />
```

**`@Input()` vs `input()` comparison:**
```typescript
// Old decorator approach
@Input() userId!: number;
// → not a signal, no computed(), requires separate ngOnChanges to react

// New signal approach
userId = input.required<number>();
// → IS a signal, computed() reacts to it, no ngOnChanges needed
label = computed(() => `User #${this.userId()}`); // auto-updates ✅
```

---

#### `output()` — signal-based @Output

```typescript
@Component({ selector: 'app-save-form' })
export class SaveFormComponent {
  saved   = output<User>();    // no EventEmitter<User>() needed
  deleted = output<number>();  // emits the deleted user's id

  onSave(user: User)      { this.saved.emit(user); }
  onDelete(userId: number){ this.deleted.emit(userId); }
}

// Parent:
// <app-save-form (saved)="handleSave($event)" (deleted)="handleDelete($event)" />
```

---

#### `model()` — two-way binding signal

`model()` creates a signal that is readable and writable from **both inside and outside** the component — perfect for form-like components where the parent wants to bind to the current value.

```typescript
@Component({
  selector: 'app-toggle',
  template: `
    <button (click)="toggle()">
      {{ isOn() ? 'ON' : 'OFF' }}
    </button>
  `
})
export class ToggleComponent {
  isOn = model(false); // writable from parent and from inside

  toggle() { this.isOn.update(v => !v); } // internal write
}

// Parent — two-way binding:
// <app-toggle [(isOn)]="lightSwitch" />
// lightSwitch updates when user clicks, toggle updates when parent changes lightSwitch
```

Under the hood `model()` is equivalent to `@Input() + @Output() xChange` — but in one line with Signal benefits.

---

#### All three together in one component

```typescript
@Component({
  selector: 'app-quantity-picker',
  template: `
    <button (click)="decrement()" [disabled]="value() <= min()">-</button>
    <span>{{ value() }}</span>
    <button (click)="increment()" [disabled]="value() >= max()">+</button>
  `
})
export class QuantityPickerComponent {
  // Inputs
  min = input(1);
  max = input(99);

  // Two-way bindable value
  value = model(1);

  // Output — notifies parent when limits are hit
  limitReached = output<'min' | 'max'>();

  increment() {
    if (this.value() < this.max()) {
      this.value.update(v => v + 1);
    } else {
      this.limitReached.emit('max');
    }
  }

  decrement() {
    if (this.value() > this.min()) {
      this.value.update(v => v - 1);
    } else {
      this.limitReached.emit('min');
    }
  }
}

// Parent usage:
// <app-quantity-picker [min]="1" [max]="10" [(value)]="cartQty"
//                      (limitReached)="showLimitWarning($event)" />
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

## JIT vs AOT Compilation

| | JIT (Just-In-Time) | AOT (Ahead-of-Time) |
|---|-------------------|---------------------|
| When compiled | At runtime in browser | At build time on server |
| Build speed | Fast (dev builds) | Slower |
| Runtime performance | Slower startup | Faster startup ✅ |
| Bundle size | Larger (compiler included) | Smaller ✅ |
| Template errors | Found at runtime ❌ | Found at build time ✅ |
| Use in | Development | Production ✅ |

```bash
ng build              # AOT by default in Angular CLI
ng serve              # JIT by default (dev only)
ng build --aot=false  # force JIT (rare)
```

**AOT is production default since Angular 9 (Ivy).** Template errors surface during `ng build` not at runtime — safer for production.

---

## Change Detection

Angular checks if the view (DOM) needs updating when:
- An event fires (click, input, HTTP response)
- A timer fires (setTimeout, setInterval)
- A Promise or Observable resolves

### Default Change Detection
```typescript
// Angular walks the ENTIRE component tree from root on every change
// Simple but expensive for large apps
@Component({ changeDetection: ChangeDetectionStrategy.Default })
```

### OnPush Change Detection ← Performance Optimization
```typescript
// Angular ONLY checks this component when:
// 1. An @Input() reference changes (not just value — the reference)
// 2. An event originates from this component or its children
// 3. An Observable used with async pipe emits
// 4. markForCheck() / detectChanges() called manually

@Component({
    selector: 'app-engagement-card',
    changeDetection: ChangeDetectionStrategy.OnPush,  // ✅
    template: `<div>{{ engagement.status }}</div>`
})
export class EngagementCardComponent {
    @Input() engagement!: EngagementActivity;
    // ❌ engagement.status = 'Completed'  → no re-render (same reference)
    // ✅ engagement = { ...engagement, status: 'Completed' } → new reference → re-renders
}
```

**Capital Access:** All leaf components use OnPush — the engagement grid renders 1000+ rows, OnPush prevents unnecessary re-renders on parent state changes.

---

## Angular State Management

### Input / Output (Component Communication)
```typescript
// Parent → Child: @Input()
@Component({ template: `<app-card [engagement]="eng" (statusChange)="onStatusChange($event)">` })
// Child → Parent: @Output() + EventEmitter
@Output() statusChange = new EventEmitter<string>();
this.statusChange.emit('Completed');
```

### Services (Shared State)
```typescript
@Injectable({ providedIn: 'root' })
export class EngagementStateService {
    private engagements$ = new BehaviorSubject<EngagementActivity[]>([]);
    engagements = this.engagements$.asObservable();

    update(data: EngagementActivity[]) { this.engagements$.next(data); }
}
```

### NgRx (Redux pattern — for complex state)
```typescript
// State → Selector → Component (reads)
// Component → Action → Reducer → State (writes)
// Side effects → Effect → Action

// Action
export const loadEngagements = createAction('[Engagement] Load', props<{ tenantId: string }>());

// Reducer
export const engagementReducer = createReducer(
    initialState,
    on(loadEngagementsSuccess, (state, { engagements }) => ({ ...state, engagements }))
);

// Effect (handles API call)
loadEngagements$ = createEffect(() => this.actions$.pipe(
    ofType(loadEngagements),
    switchMap(({ tenantId }) => this.service.getAll(tenantId).pipe(
        map(data => loadEngagementsSuccess({ engagements: data })),
        catchError(err => of(loadEngagementsFailure({ error: err })))
    ))
));

// Selector
export const selectPendingEngagements = createSelector(
    selectAll,
    engagements => engagements.filter(e => e.status === 'Pending')
);
```

### Signals (Angular 16+)
```typescript
// Simpler reactive state — no RxJS needed for local state
export class EngagementComponent {
    count   = signal(0);                          // writable signal
    doubled = computed(() => this.count() * 2);   // derived signal (auto-updates)

    increment() { this.count.update(c => c + 1); }
    // count() to read, count.set(5) or count.update(fn) to write
}
```

**When to use what:**
- `@Input/@Output` — parent/child communication
- Service + BehaviorSubject — shared state, simple apps
- NgRx — complex state, many components sharing state, time-travel debugging
- Signals — local component state, replacing simple BehaviorSubjects

---

## RxJS and Observable Types

```typescript
// Observable: lazy stream, only executes when subscribed
const obs$ = new Observable(observer => {
    observer.next(1);
    observer.next(2);
    observer.complete();
});

// Subject: Observable + Observer — multicast, can emit values manually
const subject$ = new Subject<string>();
subject$.subscribe(v => console.log('A:', v));
subject$.subscribe(v => console.log('B:', v));
subject$.next('hello');  // both A and B receive 'hello'

// BehaviorSubject: Subject + current value — new subscribers get last value immediately
const state$ = new BehaviorSubject<string>('initial');
state$.subscribe(v => console.log(v));  // immediately logs 'initial'
state$.next('updated');                 // logs 'updated'
// Capital Access: used in services for shared state ✅

// ReplaySubject: replays N last values to new subscribers
const replay$ = new ReplaySubject<number>(3);  // buffer last 3
replay$.next(1); replay$.next(2); replay$.next(3); replay$.next(4);
replay$.subscribe(v => console.log(v));  // logs 2, 3, 4 (last 3)

// AsyncSubject: only emits last value when complete()
const async$ = new AsyncSubject<number>();
async$.next(1); async$.next(2); async$.next(3);
async$.subscribe(v => console.log(v));  // nothing yet
async$.complete();  // now logs 3 (only last value)
```

**Common RxJS operators:**
```typescript
.pipe(
    map(x => x * 2),                  // transform each value
    filter(x => x > 0),               // filter values
    switchMap(id => this.api.get(id)), // cancel previous, switch to new (HTTP search)
    mergeMap(id => this.api.get(id)),  // run all concurrently (parallel calls)
    concatMap(id => this.api.get(id)), // queue sequentially
    debounceTime(300),                 // wait 300ms after last emit (search input)
    distinctUntilChanged(),            // skip if same as previous value
    takeUntil(this.destroy$),          // unsubscribe when component destroys
    catchError(err => of([])),         // handle error, return fallback
)
```

---

## Angular Performance Optimization

```
1. OnPush change detection on all leaf components
2. trackBy in *ngFor — prevents full list re-render on data change
   *ngFor="let e of engagements; trackBy: trackById"
   trackById = (index: number, e: Engagement) => e.id;

3. Virtual scrolling (CDK) — render only visible rows
   <cdk-virtual-scroll-viewport itemSize="50">
     <div *cdkVirtualFor="let item of items">{{ item.name }}</div>
   </cdk-virtual-scroll-viewport>

4. Lazy loading feature modules — load only when route activated
   { path: 'reports', loadComponent: () => import('./report.component') }

5. async pipe — auto-subscribes + unsubscribes, no memory leaks
   {{ engagements$ | async }}

6. AOT compilation + tree shaking (production build default)

7. Preloading strategy for secondary routes
   RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
```

---

## Angular Fundamentals — Verbal Interview Answers (Q1–Q25)

### Q1. What's the use of Angular?
Angular is a TypeScript-based front-end framework for building Single Page Applications. It gives you a structured way to build complex UIs through components, handles data binding between your UI and logic, provides routing without page reloads, and includes built-in tools for forms, HTTP calls, and dependency injection — everything you need in one framework.

---

### Q2. What are directives in Angular?
Directives are instructions you place in the HTML that tell Angular to do something to a DOM element — change its appearance, add or remove it, or give it new behaviour. Think of them as custom HTML attributes that Angular understands.

---

### Q3. Types of Angular directives?
Three types. **Component directives** — a component is actually a directive with a template, it's the most common type. **Structural directives** — change the DOM structure by adding or removing elements, like `*ngIf` which adds or removes an element based on a condition, and `*ngFor` which repeats an element for each item in a list. **Attribute directives** — change the appearance or behaviour of an existing element without adding or removing it, like `ngClass` to add CSS classes dynamically and `ngStyle` to apply inline styles.

```html
<!-- Structural — adds/removes element -->
<div *ngIf="isLoggedIn">Welcome back!</div>
<li *ngFor="let user of users">{{ user.name }}</li>

<!-- Attribute — changes appearance -->
<div [ngClass]="{ 'active': isActive, 'disabled': !isActive }">Status</div>
<div [ngStyle]="{ 'color': isError ? 'red' : 'green' }">Message</div>
```

---

### Q4. NPM and Node_Modules folder?
NPM stands for Node Package Manager — it's the tool you use to install, manage, and update all the third-party libraries your Angular project needs. When you run `npm install`, NPM downloads all the packages listed in package.json and puts them in the `node_modules` folder. That folder contains all the actual library code. You never commit node_modules to git — it can be recreated any time from package.json.

---

### Q5. Package.json?
Package.json is the project manifest — it describes your project and lists everything it depends on. It has two key sections: `dependencies` which are packages needed in production like Angular itself, and `devDependencies` which are only needed during development like the Angular CLI and testing tools. It also contains scripts — shortcuts for commands like `npm start` to run the app and `npm test` to run tests. It's the single source of truth for what your project needs.

---

### Q6. TypeScript — what and why?
TypeScript is a superset of JavaScript that adds static typing. Every valid JavaScript is valid TypeScript, but TypeScript adds the ability to declare types for variables, function parameters, and return values. The benefit is that type errors are caught at compile time in your editor — before the code even runs — rather than at runtime in the browser. This makes large codebases much easier to maintain and refactor. Angular is built entirely in TypeScript and requires it.

---

### Q7. Angular CLI?
Angular CLI is a command-line tool that automates all the repetitive tasks in Angular development. `ng new` scaffolds a complete new project with all configuration. `ng generate component` creates a component with all its files. `ng serve` runs a development server with hot reload. `ng build` compiles the app for production. Without the CLI you'd have to set up webpack, TypeScript config, and project structure manually every time.

---

### Q8. Components and Modules?
A **component** is the basic building block of Angular UI — it consists of a TypeScript class containing the logic, an HTML template defining what it renders, and a CSS file for styling. Every piece of UI you see is a component.

A **module** is a container that groups related components, services, directives, and pipes together. In older Angular, NgModules were mandatory. In Angular 18 with standalone components, modules are optional — components can be self-contained. In Capital Access we migrated from NgModule architecture to standalone components, which reduced our bundle size by 30%.

```typescript
// Standalone Component (Angular 18 — no NgModule needed)
@Component({
  selector: 'app-investor-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investor-card.component.html'
})
export class InvestorCardComponent {
  @Input() investorName: string = '';
}
```

---

### Q9. Decorator in Angular?
A decorator is a special function prefixed with `@` that you attach to a class to give Angular information about what that class is and how it should behave. `@Component` tells Angular this class is a component and provides its template and selector. `@Injectable` tells Angular this class can be injected as a dependency. `@NgModule` marks a class as an Angular module. Decorators are TypeScript's way of adding metadata to classes without changing the class logic itself.

```typescript
@Component({                          // ← decorator
  selector: 'app-root',              // ← metadata
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent { }

@Injectable({ providedIn: 'root' })  // ← decorator + metadata
export class AuthService { }
```

---

### Q10. Annotations / Metadata?
Annotations and metadata mean the same thing in Angular context — they are the configuration objects you pass inside decorators. For example in `@Component({ selector: 'app-root', templateUrl: './app.component.html' })` — the object inside the brackets is the metadata. It tells Angular what HTML selector to use, where the template lives, and what styles to apply. Angular reads this metadata at compile time to understand how to process and render the class.

---

### Q11. Template?
A template is the HTML view associated with a component — it defines what the component renders on the screen. Templates in Angular are not plain HTML — they can contain Angular-specific syntax like data binding expressions `{{}}`, structural directives like `*ngIf`, and references to other components. The template is what the user actually sees and interacts with.

---

### Q12. Four types of Data Binding?
**Interpolation** — one-way from component to template. Double curly braces `{{title}}` display a component property value in the HTML.

**Property binding** — one-way from component to template. Square brackets `[src]="imageUrl"` bind a component property to an HTML element property.

**Event binding** — one-way from template to component. Parentheses `(click)="onSave()"` listen to DOM events and call component methods.

**Two-way binding** — both directions simultaneously. `[(ngModel)]="username"` — the component updates the input field and the input field updates the component property at the same time. The banana-in-a-box syntax `[()]` is a reminder that it combines both property and event binding.

```html
<!-- 1. Interpolation — component → template -->
<h1>{{ pageTitle }}</h1>

<!-- 2. Property binding — component → template -->
<img [src]="profileImageUrl" [alt]="userName" />
<button [disabled]="isLoading">Save</button>

<!-- 3. Event binding — template → component -->
<button (click)="onSave()">Save</button>
<input (keyup)="onSearch($event)" />

<!-- 4. Two-way binding — both directions -->
<input [(ngModel)]="searchTerm" />
<!-- equivalent to: [value]="searchTerm" (input)="searchTerm=$event.target.value" -->
```

---

### Q13. Architecture of Angular?
Angular architecture has eight building blocks. **Modules** group the application into cohesive blocks. **Components** define the UI and logic. **Templates** define the HTML view. **Metadata** via decorators tells Angular how to process classes. **Data binding** connects the component and template. **Directives** add behaviour to DOM elements. **Services** contain shared business logic. **Dependency Injection** provides services to components without them creating instances themselves.

---

### Q14. SPA in Angular?
SPA stands for Single Page Application. Instead of the browser loading a new HTML page every time you navigate, a SPA loads one HTML page initially and then dynamically updates the content as you navigate — without a full page reload. Angular is built specifically for this pattern. The result is a much faster, app-like user experience because only the data changes, not the entire page. Capital Access is a SPA — the IR user navigates between Ownership, Targeting, and Reports modules without any page reload.

---

### Q15. How to implement SPA in Angular?
Through Angular Router. You define a routes array that maps URL paths to components. You place a `<router-outlet>` in your main template — this is the placeholder where Angular swaps components in and out as you navigate. You use `routerLink` instead of `href` for navigation so the browser doesn't reload the page. The Router intercepts navigation, matches the URL to a route, and renders the correct component inside the outlet — all without a page reload.

---

### Q16. How to implement Routing?
Import RouterModule, define a Routes array where each route is an object with a path and a component. Register the routes with RouterModule.forRoot in the app module or use provideRouter in standalone setup. Place `<router-outlet>` in the app template. Use `routerLink` for navigation links. Use the Router service programmatically to navigate from TypeScript — `this.router.navigate(['/dashboard'])`.

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '',        redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard',  component: DashboardComponent },
  { path: 'profile/:id', component: ProfileComponent }
];

// app.component.html
// <nav>
//   <a routerLink="/dashboard">Dashboard</a>
//   <a routerLink="/profile/1">Profile</a>
// </nav>
// <router-outlet></router-outlet>   ← components render here

// programmatic navigation
constructor(private router: Router) {}
goToProfile(id: number) {
  this.router.navigate(['/profile', id]);
}
```

---

### Q17. Lazy Loading?
Lazy loading means a feature module or component is only downloaded and loaded when the user actually navigates to that route — not upfront when the app first loads. Without lazy loading, every module is bundled together and downloaded on first page load, making it slow. With lazy loading, the initial bundle is small and fast — additional code is only fetched when needed. In Capital Access, all 8+ feature modules are lazy loaded — the user only downloads the Investor Targeting module when they navigate to that section.

---

### Q18. How to implement Lazy Loading?
In your route config, instead of importing the component directly, use `loadComponent` with a dynamic import — a function that returns the component only when that route is activated. Angular CLI automatically splits that into a separate bundle. The user's browser downloads that bundle only when they first navigate to that route.

```typescript
// Lazy loading with standalone components (Angular 18 — Capital Access pattern)
export const routes: Routes = [
  {
    path: 'investor-targeting',
    loadComponent: () =>
      import('./features/targeting/targeting.component')
        .then(m => m.TargetingComponent)   // downloaded only when user navigates here
  },
  {
    path: 'ownership',
    loadComponent: () =>
      import('./features/ownership/ownership.component')
        .then(m => m.OwnershipComponent)
  }
];
// Each feature = separate JS bundle = faster initial load ✅
```

---

### Q19. Services?
A service is a TypeScript class that contains business logic or data that needs to be shared across multiple components. Services are singletons by default — one instance shared across the entire application. Examples: an AuthService that manages the logged-in user, an HttpService that makes API calls. Components should stay focused on the view — business logic belongs in services.

---

### Q20. Dependency Injection?
Dependency Injection is a design pattern where a class doesn't create its own dependencies — Angular creates them and provides them. Instead of a component calling `new UserService()` itself, Angular creates the UserService and injects it into the component's constructor. The component doesn't need to know how to create the service, and you can easily swap implementations — especially useful for testing where you inject a mock service instead of the real one.

---

### Q21. How to implement DI?
Three steps. First, mark the service class with `@Injectable({ providedIn: 'root' })` — this tells Angular this class can be injected and should be a singleton. Second, Angular registers it in the root injector automatically. Third, in any component or service that needs it, declare it as a constructor parameter with the correct type — Angular sees the type, looks it up in its injector, and provides the instance automatically.

```typescript
// Step 1 — mark service as injectable
@Injectable({ providedIn: 'root' })   // singleton across the whole app
export class EngagementService {
  getAll() { return this.http.get('/api/engagements'); }
  constructor(private http: HttpClient) {}
}

// Step 2 — inject into component via constructor
@Component({ selector: 'app-dashboard', ... })
export class DashboardComponent {
  constructor(private engagementService: EngagementService) {}
  // Angular sees the type → looks it up → provides the singleton instance ✅

  ngOnInit() {
    this.engagementService.getAll().subscribe(...);
  }
}
```

---

### Q23. Benefits of DI?
Four main benefits. **Loose coupling** — components don't depend on specific implementations, just interfaces. **Testability** — you can inject mock versions of services in unit tests without touching the real implementation. **Reusability** — one service instance shared across the whole app, no duplication. **Lifecycle management** — Angular controls when services are created and destroyed, you don't manage that yourself.

---

### Q24. ng serve vs ng build?
`ng serve` compiles the app in memory and runs a local development server with hot module replacement — when you change a file, the browser updates automatically. Nothing is written to disk. It's for development only.

`ng build` compiles the app and writes the output to a `dist` folder on disk. This is what you deploy to a server. By default it's a development build — not optimised. You add `--configuration production` for a production-ready build.

```bash
# Development — runs in memory, hot reload, not optimised
ng serve
ng serve --port 4200 --open

# Build for deployment — writes to /dist folder
ng build                              # development build
ng build --configuration production   # production build (minified, AOT, tree-shaken)

# Output
# dist/
#   my-app/
#     main.js        ← your app code (minified in prod)
#     polyfills.js
#     index.html
```

---

### Q25. --prod parameter in ng build?
The `--prod` flag (now `--configuration production` in modern Angular) enables all production optimisations in one go: AOT compilation converts templates to JavaScript at build time rather than runtime, minification removes whitespace and shortens variable names, tree shaking removes unused code, uglification makes the code unreadable to protect it, and source maps are excluded. The result is a significantly smaller, faster bundle. In Capital Access, production build combined with standalone component migration reduced our bundle size by 30%.

---

## Angular Q26–Q31 — ViewChild, Content Projection & Slots

### Q26. ViewChild and ViewChildren?

`@ViewChild` gives you a reference to a single element, component, or directive from your component's **own template**. You use it when you need to access a child component's methods or properties from the parent TypeScript class. `@ViewChildren` does the same but returns a `QueryList` of **all matching elements** instead of just one. Both are available after `ngAfterViewInit` — because the view needs to be rendered before you can query it.

```typescript
// Child component
@Component({ selector: 'app-chart', ... })
export class ChartComponent {
  refresh() { console.log('chart refreshed'); }
}

// Parent component
@Component({
  template: `
    <app-chart #myChart></app-chart>
    <app-chart #myChart2></app-chart>
    <button (click)="refreshChart()">Refresh</button>
  `
})
export class DashboardComponent implements AfterViewInit {
  @ViewChild(ChartComponent) chart!: ChartComponent;          // single
  @ViewChildren(ChartComponent) charts!: QueryList<ChartComponent>; // all

  ngAfterViewInit() {
    // view is rendered — safe to access now
    this.chart.refresh();
  }

  refreshChart() {
    this.charts.forEach(c => c.refresh()); // refresh all charts
  }
}
```

---

### Q27. Template Reference Variables?

A template reference variable is a way to name a DOM element or component directly in the HTML using the `#` symbol. Once named, you can pass that reference to other elements in the same template, or access it in TypeScript via `@ViewChild`. Without template reference variables, you'd have to query the DOM manually — they give Angular a cleaner, declarative way to reference elements.

```html
<!-- Reference a DOM element — use directly in template -->
<input #searchInput type="text" />
<button (click)="search(searchInput.value)">Search</button>

<!-- Reference a component instance — call its methods -->
<app-chart #chartRef></app-chart>
<button (click)="chartRef.refresh()">Refresh</button>
```

```typescript
// Access template reference variable in TypeScript via @ViewChild
@ViewChild('searchInput') searchInput!: ElementRef;

ngAfterViewInit() {
  this.searchInput.nativeElement.focus(); // auto-focus on load
}
```

---

### Q28. Content Projection?

Content projection is how you pass HTML from a parent component **into** a child component's template. The child defines a slot using `<ng-content>` — a placeholder that says "put whatever the parent gives me here." The parent then places its HTML between the child component's opening and closing tags. It's different from `@Input` — `@Input` passes data, content projection passes actual HTML structure.

```typescript
// Child — card component with a content slot
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="card-header">Card Title</div>
      <div class="card-body">
        <ng-content></ng-content>   <!-- parent's content goes here -->
      </div>
    </div>
  `
})
export class CardComponent {}

// Parent — fills the slot with any HTML it wants
// <app-card>
//   <p>This paragraph is projected into the card body.</p>
//   <button>Action</button>
// </app-card>
```

---

### Q29. Content Projection Slot?

When a child component needs to accept multiple different pieces of projected content in different places, you use named slots. The child defines multiple `<ng-content>` tags each with a `select` attribute targeting a CSS selector. The parent marks its content with matching selectors so Angular knows which content goes into which slot.

```typescript
// Child — multi-slot card
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="header">
        <ng-content select="[card-header]"></ng-content>  <!-- slot 1 -->
      </div>
      <div class="body">
        <ng-content select="[card-body]"></ng-content>    <!-- slot 2 -->
      </div>
      <div class="footer">
        <ng-content select="[card-footer]"></ng-content>  <!-- slot 3 -->
      </div>
    </div>
  `
})
export class CardComponent {}

// Parent — fills each named slot
// <app-card>
//   <h2 card-header>Investor Report</h2>
//   <p  card-body>Q3 ownership summary...</p>
//   <button card-footer>Download PDF</button>
// </app-card>
```

---

### Q30. ContentChild and ContentChildren?

`@ContentChild` gives you a reference to a single element that was **projected into** your component via `<ng-content>`. `@ContentChildren` gives you a `QueryList` of all projected matching elements. Both are available after `ngAfterContentInit` — content is projected before the view renders. The key distinction: ViewChild queries your own template, ContentChild queries what the parent passed in.

```typescript
// Child component — queries projected content
@Component({
  selector: 'app-card',
  template: `<ng-content></ng-content>`
})
export class CardComponent implements AfterContentInit {
  @ContentChild('cardTitle')   title!: ElementRef;        // single projected element
  @ContentChildren('cardItem') items!: QueryList<ElementRef>; // all projected items

  ngAfterContentInit() {
    // content has been projected — safe to access now
    console.log('Title:', this.title.nativeElement.textContent);
    console.log('Items count:', this.items.length);
  }
}

// Parent — projects content with template reference variables
// <app-card>
//   <h2 #cardTitle>Report Summary</h2>
//   <p #cardItem>Item 1</p>
//   <p #cardItem>Item 2</p>
// </app-card>
```

---

### Q31. ViewChild vs ViewChildren vs ContentChild vs ContentChildren?

Two dimensions — **where** the content lives, and **how many** you're querying.

| Decorator | Queries | Returns | Available after |
|---|---|---|---|
| `@ViewChild` | Own template | Single element | `ngAfterViewInit` |
| `@ViewChildren` | Own template | `QueryList` (all matches) | `ngAfterViewInit` |
| `@ContentChild` | Projected content (`ng-content`) | Single element | `ngAfterContentInit` |
| `@ContentChildren` | Projected content (`ng-content`) | `QueryList` (all matches) | `ngAfterContentInit` |

```typescript
@Component({
  selector: 'app-parent',
  template: `
    <app-child>
      <p #projected>I am projected</p>   <!-- ContentChild territory -->
    </app-child>
    <div #ownDiv>I am in own template</div>  <!-- ViewChild territory -->
  `
})
export class ParentComponent implements AfterViewInit, AfterContentInit {
  @ViewChild('ownDiv')     ownDiv!: ElementRef;      // own template ✅
  @ContentChild('projected') projected!: ElementRef; // projected ✅ (in child)
}
```

**Memory trick:** View = what YOU render. Content = what the PARENT gives you.

---

## Angular Q32–Q34 — Component Lifecycle

### Q32. Importance of Component Lifecycle?

A component in Angular goes through a defined lifecycle — it gets created, renders, gets updated when data changes, and eventually gets destroyed. Angular provides **lifecycle hooks** — special methods you can implement to plug into these moments.

This matters for three reasons:
- **Timing** — you need to know exactly when `@Input` values are available, when child components are ready, when projected content is initialised
- **Resource management** — without `ngOnDestroy`, subscriptions and timers keep running after the component is gone, causing **memory leaks**
- **Change tracking** — `ngOnChanges` lets you react every time an `@Input` value changes, not just on first load

In Capital Access: `ngOnInit` fetches investor data, `ngAfterViewInit` initialises the virtual scroll grid, `ngOnDestroy` unsubscribes all RxJS streams.

---

### Q33. Events and Sequence of Component Lifecycle?

Eight hooks in this exact order:

| # | Hook | When it runs | Use for |
|---|---|---|---|
| 1 | `ngOnChanges` | Before init & on every @Input change | React to input changes, get prev/current values |
| 2 | `ngOnInit` | Once after first ngOnChanges | HTTP calls, initialisation logic |
| 3 | `ngDoCheck` | Every change detection cycle | Custom change detection |
| 4 | `ngAfterContentInit` | Once after ng-content is projected | @ContentChild is now available |
| 5 | `ngAfterContentChecked` | After every projected content check | Rarely used |
| 6 | `ngAfterViewInit` | Once after view & child views init | @ViewChild is now available, init 3rd-party libs |
| 7 | `ngAfterViewChecked` | After every view check | Rarely used |
| 8 | `ngOnDestroy` | Just before component destroyed | Unsubscribe, clear timers, prevent memory leaks |

```typescript
@Component({ selector: 'app-investor', template: `...` })
export class InvestorComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() tenantId!: string;
  @ViewChild('grid') grid!: ElementRef;

  private sub = new Subscription();

  constructor(private investorService: InvestorService) {
    // DI only — @Input not set yet, template not rendered
  }

  ngOnChanges(changes: SimpleChanges) {
    // runs BEFORE ngOnInit and on every @Input change
    if (changes['tenantId']) {
      console.log('prev:', changes['tenantId'].previousValue);
      console.log('curr:', changes['tenantId'].currentValue);
    }
  }

  ngOnInit() {
    // @Input values are NOW set — safe to use tenantId
    this.sub = this.investorService.getAll(this.tenantId).subscribe();
  }

  ngAfterViewInit() {
    // @ViewChild is NOW available — safe to access DOM
    this.grid.nativeElement.focus();
  }

  ngOnDestroy() {
    // MUST clean up to prevent memory leaks
    this.sub.unsubscribe();
  }
}
```

---

### Q34. Constructor vs ngOnInit?

**Constructor** — plain TypeScript concept. Runs when the class is instantiated, before any lifecycle hooks. At this point: `@Input` properties are NOT set, template is NOT rendered, child components do NOT exist. Use it **only for Dependency Injection**.

**ngOnInit** — Angular's first lifecycle hook. By the time it runs: all `@Input` values are set, component metadata is processed, ready to work. Use it for **all initialisation logic** — HTTP calls, reading inputs, subscribing to Observables.

**Rule: Constructor = DI only. ngOnInit = everything else.**

```typescript
@Component({ selector: 'app-report', template: `...` })
export class ReportComponent implements OnInit {

  @Input() reportId!: string;

  constructor(private reportService: ReportService) {
    // ✅ DI — inject the service
    // ❌ DON'T call API here — reportId is undefined at this point
  }

  ngOnInit() {
    // ✅ @Input reportId is NOW set — safe to use
    this.reportService.load(this.reportId).subscribe();
  }
}

// Why it matters:
// Constructor runs before Angular sets @Input values.
// If you call an API in constructor using an @Input → undefined → wrong data or crash.
// ngOnInit runs after inputs are set → works correctly every time.
```

**Interview line:** "I use the constructor only as a DI receiver. Everything else goes in ngOnInit — that's the Angular way."

---

## Jasmine Unit Testing (Angular)

```typescript
describe('EngagementService', () => {
    let service: EngagementService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [EngagementService]
        });
        service    = TestBed.inject(EngagementService);
        httpMock   = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());  // ensure no unexpected HTTP calls

    it('should fetch engagements for tenant', () => {
        const mockData = [{ id: 1, status: 'Pending' }];

        service.getAll('spg-001').subscribe(data => {
            expect(data.length).toBe(1);
            expect(data[0].status).toBe('Pending');
        });

        const req = httpMock.expectOne('/api/engagements?tenantId=spg-001');
        expect(req.request.method).toBe('GET');
        req.flush(mockData);  // return mock response
    });
});
```
