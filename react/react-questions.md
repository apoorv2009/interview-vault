# React — Interview Preparation

**Context**: ~9–10 months hands-on React experience, layered on top of 5+ years Angular. Most recent use: front-end alongside Angular on the Entity Management System (Grant Thornton, healthcare domain).
**Sourced from**: Decos Global Round 1 (Full Stack Deep Dive).

---

## Table of Contents

1. [Q1. React hooks — useState, useEffect, useContext](#q1-react-hooks--usestate-useeffect-usecontext)
2. [Q2. Component-level state vs global state](#q2-component-level-state-vs-global-state)
3. [Q3. Redux vs Context API — when to use each](#q3-redux-vs-context-api--when-to-use-each)
4. [Q4. useMemo vs useCallback](#q4-usememo-vs-usecallback)

---

### Q1. React hooks — useState, useEffect, useContext?

- **`useState`** — component-level state (form inputs, toggles, local UI flags). Triggers a re-render on every update.
- **`useEffect`** — side effects tied to mount/update/unmount (API calls, subscriptions, DOM manipulation). Runs after render, controlled by its dependency array.
- **`useContext`** — reads a value from a `Context.Provider` further up the tree without prop drilling (theme, auth state, current tenant).

```jsx
function EntityDetail({ entityId }) {
  const [entity, setEntity] = useState(null);
  const { user } = useContext(AuthContext); // no prop drilling for the current user

  useEffect(() => {
    let cancelled = false;
    fetchEntity(entityId).then(data => {
      if (!cancelled) setEntity(data);
    });
    return () => { cancelled = true; }; // cleanup — avoids setting state after unmount
  }, [entityId]); // re-run only when entityId changes

  if (!entity) return <Spinner />;
  return <div>{entity.name} — viewed by {user.name}</div>;
}
```

Each hook runs declaratively based on its dependency array — an empty array (`[]`) means "run once on mount," omitting the array means "run after every render" (usually a bug), and a populated array means "run when any of these values change."

---

### Q2. Component-level state vs global state?

**Component-level** (`useState`/`useReducer` inside the component): isolated to one component, no external dependency, simplest to reason about. Use it whenever the state doesn't need to be seen outside the component that owns it (a form's current input value, a modal's open/closed flag).

**Global state**: shared across unrelated components — managed via a Redux store or Context API. Use it for data genuinely needed in multiple, unrelated parts of the tree (logged-in user, current tenant, feature flags, a shopping cart).

Rule of thumb: default to component-level state; promote to global state only when prop-drilling more than 2–3 levels deep becomes the alternative.

---

### Q3. Redux vs Context API — when to use each?

| | Redux | Context API |
|---|---|---|
| Best for | Complex global state, many action types | Simple, low-frequency global data |
| Debugging | Time-travel debugging, Redux DevTools | No built-in tooling |
| Middleware | Thunk/Saga for async side-effect orchestration | None built in — roll your own with `useReducer` + effects |
| Re-render behavior | Fine-grained via selectors (`useSelector`) | Any Provider value change re-renders **all** consumers unless memoized |

Use Redux when the app has many interacting pieces of shared state and you need predictable, traceable updates (audit trail of every action). Use Context API for simpler, rarely-changing global data like theme or an auth token. Never reach for Redux to manage state that's actually local to one component — that's over-engineering and adds indirection with no benefit.

---

### Q4. useMemo vs useCallback?

- **`useCallback`** — memoizes a **function reference** across re-renders. Prevents a child component from re-rendering unnecessarily when that function is passed down as a prop (paired with `React.memo` on the child).
- **`useMemo`** — memoizes a **computed value**, avoiding an expensive recalculation on every render.

Both take a dependency array and only recompute when a dependency actually changes.

```jsx
function EntityList({ entities, onSelect }) {
  // useMemo — avoid re-filtering 10,000 entities on every keystroke elsewhere in the app
  const activeEntities = useMemo(
    () => entities.filter(e => e.isActive),
    [entities]
  );

  // useCallback — stable function reference so <Row> (wrapped in React.memo) doesn't re-render
  const handleSelect = useCallback(
    (id) => onSelect(id),
    [onSelect]
  );

  return activeEntities.map(e => <Row key={e.id} entity={e} onSelect={handleSelect} />);
}
```

Both are optimizations, not defaults — only reach for them once profiling (React DevTools Profiler) shows an actual re-render or recomputation cost worth avoiding.
