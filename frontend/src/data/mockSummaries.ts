/* eslint-disable @stylistic/max-len */
export interface VideoChapter {
    timestamp: string
    title: string
}

export interface VideoSummary {
    keyPoints: string[]
    chapters: VideoChapter[]
    readingMode: string
}

const summaries: Record<string, VideoSummary> = {
    v001: {
        keyPoints: [
            'React 19 introduces the new `use()` hook for reading resources and promises directly in render',
            'The React Compiler automatically memoizes components, eliminating the need for useMemo/useCallback in most cases',
            'Concurrent transitions now support interruption, making UIs more responsive under heavy load',
            'Server Actions allow mutations to be triggered directly from client components without API boilerplate',
            'Performance improvements of up to 40% on hydration benchmarks compared to React 18',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Introduction & React 19 overview' },
            { timestamp: '2:15', title: 'The new use() hook explained' },
            { timestamp: '8:40', title: 'React Compiler deep dive' },
            { timestamp: '16:30', title: 'Concurrent features & transitions' },
            { timestamp: '24:00', title: 'Server Actions & mutations' },
            { timestamp: '31:10', title: 'Performance benchmarks' },
            { timestamp: '38:00', title: 'Migration guide & breaking changes' },
        ],
        readingMode: `## React 19 Concurrent Features

React 19 represents the most significant evolution of the framework since the introduction of hooks. At its core, the release focuses on three pillars: the React Compiler, expanded concurrent capabilities, and first-class server integration.

### The React Compiler

The compiler, previously known as React Forget, analyzes your component tree and automatically inserts memoization where beneficial. This means most usages of \`useMemo\`, \`useCallback\`, and \`React.memo\` become unnecessary — the compiler handles it transparently.

### The use() Hook

The new \`use()\` hook is a game-changer for data fetching patterns. Unlike hooks, \`use()\` can be called conditionally and can read promises directly during render, integrating with Suspense boundaries to show fallback UI while data loads.

### Concurrent Transitions

React 19 improves the interruptibility of transitions. Long-running renders can now be abandoned mid-flight if higher-priority updates arrive, ensuring the UI remains responsive even during complex state changes.

### Server Actions

Direct server mutations from client components are now a first-class primitive. With Server Actions, you can call async server-side functions without building a REST API endpoint — React handles the serialization and transport layer.`,
    },
    v002: {
        keyPoints: [
            'CSS custom properties (variables) are the backbone of a scalable design token system',
            'Separating semantic tokens (--color-text-primary) from primitive tokens (--color-gray-900) enables theming',
            'Component-scoped CSS keeps styles maintainable and avoids cascade pollution',
            'A design system should be built component-by-component, not all at once',
            'Storybook integration allows designers and developers to share the same source of truth',
        ],
        chapters: [
            { timestamp: '0:00', title: 'What is a design system?' },
            { timestamp: '3:20', title: 'Design tokens & CSS variables' },
            { timestamp: '11:45', title: 'Building the Button component' },
            { timestamp: '20:00', title: 'Typography & spacing scales' },
            { timestamp: '27:30', title: 'Dark mode implementation' },
            { timestamp: '34:00', title: 'Storybook setup' },
            { timestamp: '41:15', title: 'Deploy & NPM publish' },
        ],
        readingMode: `## Building a Scalable Design System with React

A design system is more than a component library — it's the contract between design and engineering. When done well, it dramatically reduces decision fatigue and ensures visual consistency across every surface of your product.

### The Token Layer

Design tokens are the atoms of your system. Primitive tokens represent raw values (\`--color-gray-900: #111\`), while semantic tokens map intent to those values (\`--color-text-primary: var(--color-gray-900)\`). This two-layer approach makes theming and dark mode trivial to implement.

### Component Architecture

Each component in the system should be self-contained with its own CSS module or scoped styles. Avoid relying on global classes. Every variant should be expressible through props, not by consumers overriding styles.

### Dark Mode

With CSS custom properties, dark mode is a matter of redefining semantic tokens under a \`[data-theme='dark']\` selector. No JavaScript required at runtime — the browser handles it natively.`,
    },
    v003: {
        keyPoints: [
            'React Context is ideal for low-frequency updates like theme or auth — not for frequently changing data',
            'Zustand offers a minimal API with excellent TypeScript support and no boilerplate',
            'Redux Toolkit (RTK) is the right choice for complex applications with many async flows',
            'Avoid prop drilling beyond 2 levels — reach for a state solution immediately',
            'Benchmark your state solution: Context re-renders all consumers on every update',
        ],
        chapters: [
            { timestamp: '0:00', title: 'The state management landscape in 2025' },
            { timestamp: '4:00', title: 'React Context: strengths & pitfalls' },
            { timestamp: '11:20', title: 'Zustand: minimal but powerful' },
            { timestamp: '20:00', title: 'Redux Toolkit: enterprise scale' },
            { timestamp: '29:30', title: 'Performance comparison & benchmarks' },
            { timestamp: '36:00', title: 'Decision framework' },
        ],
        readingMode: `## Choosing Your State Solution in 2025

State management remains one of the most debated topics in the React ecosystem. The right answer depends entirely on your application's complexity, team size, and performance requirements.

### React Context: The Built-in Option

Context excels at distributing values that change infrequently — authentication state, theme preferences, locale. Its main weakness is performance: every consumer re-renders when the context value changes, making it unsuitable for high-frequency updates.

### Zustand: The Modern Sweet Spot

Zustand has earned its reputation for a reason. Its API is tiny — you define a store with \`create()\`, access slices with selectors, and mutations are plain functions. No actions, no reducers, no dispatching. TypeScript integration is excellent out of the box.

### Redux Toolkit: Power for Complex Apps

RTK addresses every pain point of vanilla Redux. With \`createSlice\`, \`createAsyncThunk\`, and RTK Query, you get an opinionated structure that scales to hundreds of engineers. The tradeoff is ceremony — even RTK has more boilerplate than Zustand.`,
    },
    v008: {
        keyPoints: [
            'Figma Variables map directly to CSS custom properties, enabling seamless design-to-code handoff',
            'Auto Layout in Figma mirrors CSS Flexbox — learning one makes the other intuitive',
            'Component properties replace the need for dozens of component variants',
            'Consistent naming conventions between Figma and code reduce translation errors',
            'Use Figma\'s Dev Mode to inspect exact CSS values and export assets',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Design system foundations' },
            { timestamp: '3:00', title: 'Figma Variables & design tokens' },
            { timestamp: '9:30', title: 'Auto Layout mastery' },
            { timestamp: '17:00', title: 'Component properties & variants' },
            { timestamp: '24:30', title: 'Dark mode with variable modes' },
            { timestamp: '31:00', title: 'Dev Mode & developer handoff' },
            { timestamp: '37:30', title: 'Maintaining the system over time' },
        ],
        readingMode: `## Design System with Figma — From Token to Component

The gap between design and development has historically been a source of friction, misinterpretation, and inconsistency. Figma's Variables feature, combined with structured components, closes that gap dramatically.

### Variables as Design Tokens

Figma Variables are the design-side equivalent of CSS custom properties. Define a \`color/text/primary\` variable with a light-mode value and a dark-mode value, and your designs automatically adapt. Developers can consume the exact same naming convention in code.

### Auto Layout as Flexbox

Every Auto Layout frame in Figma is a flexbox container in disguise. Direction, gap, padding, alignment — all the same concepts. Designers who understand Auto Layout produce specs that developers can implement without guesswork.

### The Handoff

With Dev Mode active, clicking any layer in Figma reveals the CSS representation of that element. Colors appear as hex or HSL, spacing as pixels, and typography as font shorthand. Combined with consistent token naming, the translation from Figma to code becomes mechanical.`,
    },
    v004: {
        keyPoints: [
            'react-hook-form uses uncontrolled inputs for performance — no re-renders on each keystroke',
            'Zod schemas serve as both validation logic and TypeScript type definitions with `z.infer<>`',
            'The `zodResolver` adapter connects Zod schemas directly to react-hook-form\'s validation pipeline',
            '`useFormState` and `formState.errors` provide granular field-level error messages',
            'Nested objects and arrays are handled with `useFieldArray` and dot-notation field names',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Why form libraries exist' },
            { timestamp: '3:00', title: 'react-hook-form fundamentals' },
            { timestamp: '10:00', title: 'Zod schema basics & type inference' },
            { timestamp: '18:30', title: 'Connecting them with zodResolver' },
            { timestamp: '26:00', title: 'Error handling & UX patterns' },
            { timestamp: '33:00', title: 'Complex forms: arrays & nested objects' },
            { timestamp: '40:00', title: 'Server-side validation integration' },
        ],
        readingMode: `## Forms with react-hook-form and Zod

Form validation is one of those problems that sounds simple until you actually solve it at scale. Combining react-hook-form with Zod is the modern answer to typed, performant, ergonomic form handling in React.

### Why react-hook-form?

Unlike Formik or Redux Form, react-hook-form registers inputs with refs rather than state. This means your form doesn't re-render on every keystroke — validation is lazy and performance is excellent even for large forms with dozens of fields.

### Zod as a Single Source of Truth

With Zod, your schema does double duty. It validates at runtime and generates TypeScript types via \`z.infer<typeof schema>\`. Define the schema once, and both your form and your API handler share the same contract.

### The Resolver Pattern

The \`zodResolver\` from \`@hookform/resolvers/zod\` wraps your schema and translates Zod's error format into react-hook-form's error structure. From there, \`formState.errors.fieldName\` gives you field-level messages with full TypeScript autocomplete.`,
    },
    v006: {
        keyPoints: [
            'Framer Motion\'s `layout` prop automatically animates between layout changes without specifying keyframes',
            'The `AnimatePresence` component enables exit animations when components unmount from the React tree',
            'Spring animations feel natural because they simulate physics — stiffness and damping replace duration',
            'Gesture props (`whileHover`, `whileTap`, `whileDrag`) make interactions declarative and reusable',
            'Shared layout animations use `layoutId` to morph elements across routes or conditional renders',
        ],
        chapters: [
            { timestamp: '0:00', title: 'The case for animation in UI' },
            { timestamp: '2:30', title: 'motion components & basic transitions' },
            { timestamp: '8:00', title: 'Spring physics: stiffness, damping, mass' },
            { timestamp: '14:30', title: 'Layout animations with the layout prop' },
            { timestamp: '21:00', title: 'AnimatePresence & exit animations' },
            { timestamp: '28:00', title: 'Gestures: drag, hover, tap' },
            { timestamp: '35:00', title: 'Shared layout & route transitions' },
        ],
        readingMode: `## Performant Animations with Framer Motion

Animation is often treated as decoration, but intentional motion communicates state changes, provides spatial context, and makes interfaces feel alive. Framer Motion makes the right animations easy and the wrong ones hard.

### Layout Animations

The \`layout\` prop is Framer Motion's superpower. Add it to any \`motion\` element and it automatically interpolates between layout changes — reordering lists, expanding cards, switching layouts — all with a single prop and zero keyframe specification.

### Spring Physics

CSS transitions work with cubic bezier curves and fixed durations. Springs work differently: you specify stiffness (how rigid the spring is) and damping (how quickly it settles). The duration emerges naturally from the physics, resulting in motion that feels organic rather than mechanical.

### AnimatePresence

React destroys components instantly when they unmount. AnimatePresence intercepts that destruction, keeps the element in the DOM long enough to complete its exit animation, then removes it. Wrap any conditional rendering or route changes with AnimatePresence to unlock exit animations.`,
    },
    v007: {
        keyPoints: [
            'TanStack Query separates server state (remote data) from client state (UI state) as distinct concerns',
            'The query cache automatically deduplicates in-flight requests and shares data across components',
            'Background refetching on window focus keeps data fresh without manual refresh logic',
            'Mutations with `useMutation` support optimistic updates and automatic cache invalidation',
            'Query keys are the foundation of the cache — arrays with hierarchical structure enable precise invalidation',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Server state vs client state' },
            { timestamp: '4:00', title: 'useQuery basics & query keys' },
            { timestamp: '11:00', title: 'Loading, error, and stale states' },
            { timestamp: '18:00', title: 'Mutations with useMutation' },
            { timestamp: '25:30', title: 'Optimistic updates' },
            { timestamp: '32:00', title: 'Prefetching & SSR integration' },
            { timestamp: '39:00', title: 'Advanced: dependent queries & pagination' },
        ],
        readingMode: `## TanStack Query — Async State Management

Most state management solutions treat all state the same way. TanStack Query recognizes a fundamental distinction: server state is asynchronous, shared, and can become stale. It needs completely different handling from local UI state.

### Query Keys as Cache Identifiers

Every query is identified by its key — typically an array like \`['todos', userId, { status: 'active' }]\`. This key is how TanStack Query stores, retrieves, and invalidates cache entries. Hierarchical keys enable powerful invalidation patterns: invalidating \`['todos']\` clears all todo queries regardless of their other parameters.

### Background Refetching

By default, TanStack Query refetches stale data when the window regains focus, when the component remounts, and on a configurable interval. This means users always see fresh data without explicit refresh logic, while the cache prevents unnecessary network requests.

### Optimistic Updates

With \`useMutation\`'s \`onMutate\` callback, you can update the cache immediately before the server responds. If the mutation fails, \`onError\` receives the previous snapshot for rollback. This pattern eliminates the latency that makes mutations feel sluggish.`,
    },
    v005: {
        keyPoints: [
            'React Server Components (RSC) run exclusively on the server and have zero client-side JavaScript footprint',
            'RSC and Client Components can be freely composed — RSC renders Client Components as slots',
            'Streaming with Suspense enables progressive page hydration, improving Time to First Byte',
            'The fetch cache in Next.js 15 is request-scoped by default — explicit cache configuration is required',
            'Server Actions are the recommended mutation pattern, replacing traditional API route handlers',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Server Components mental model' },
            { timestamp: '5:30', title: 'RSC vs Client Components' },
            { timestamp: '13:00', title: 'Streaming & Suspense boundaries' },
            { timestamp: '20:30', title: 'Data fetching patterns' },
            { timestamp: '28:00', title: 'Server Actions in depth' },
            { timestamp: '35:30', title: 'Caching strategies in Next.js 15' },
            { timestamp: '42:00', title: 'Real-world architecture patterns' },
        ],
        readingMode: `## Server Components in Practice — Next.js 15

React Server Components represent a fundamental shift in how we think about the client-server boundary. Rather than fetching data from the client and shipping it down with JavaScript, RSC lets components run on the server and stream their output directly to the browser.

### The Mental Model

Think of Server Components as templates that never ship to the client. They can access databases, file systems, and secrets directly. They produce HTML that streams to the browser before JavaScript even parses. Client Components are opt-in islands of interactivity.

### Streaming with Suspense

Next.js 15 embraces React's Suspense primitives for streaming. Wrapping a slow component in \`<Suspense fallback={<Skeleton />}>\` tells the framework to stream the shell of the page immediately, then stream the component's HTML when it resolves. Users see content progressively instead of waiting for the slowest operation.

### Server Actions

Server Actions blur the line between server and client in the best way. Annotate an async function with \`'use server'\` and call it from anywhere — a form submit handler, a button click, an effect. Next.js handles the serialization, the network roundtrip, and the cache revalidation.`,
    },
    v009: {
        keyPoints: [
            'Absolute positioning inside Auto Layout frames lets you break out of the flow for overlapping elements',
            'Wrapping Auto Layout enables responsive grids that reflow based on container width',
            'Nested Auto Layout frames compose complex layouts from simple, predictable building blocks',
            'Min/Max width constraints on Auto Layout children enable fluid, responsive behavior',
            'Good handoff requires meaningful frame naming — developers read Figma layer names in inspect mode',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Auto Layout fundamentals recap' },
            { timestamp: '3:00', title: 'Absolute position within Auto Layout' },
            { timestamp: '8:30', title: 'Wrapping & responsive grids' },
            { timestamp: '15:00', title: 'Nested frames & composition' },
            { timestamp: '21:30', title: 'Min/max width for fluid behavior' },
            { timestamp: '28:00', title: 'Layer naming & handoff conventions' },
        ],
        readingMode: `## Advanced Auto Layout in Figma

Auto Layout is the foundation of scalable Figma components. Once you move past the basics, a handful of advanced features transform how you handle complex, responsive layouts.

### Absolute Positioning Within Auto Layout

Frames in Auto Layout follow a linear flow by default. Enabling absolute positioning on a child removes it from that flow — it positions relative to the parent frame while other children ignore it. This is essential for badges, notification dots, or any overlapping element.

### Wrapping for Responsive Grids

Setting an Auto Layout frame to wrap causes children to flow to the next row when they reach the container's edge. Combined with min-width constraints on children, this creates CSS Grid-like behavior directly in Figma — your designs reflow exactly as they will in the browser.

### The Handoff Contract

Developers spend significant time in Figma's inspect panel. Frames named \`Frame 247\` tell them nothing; frames named \`card/pricing/highlighted\` communicate hierarchy, purpose, and variant. Good naming is as important as good design.`,
    },
    v015: {
        keyPoints: [
            'Arrays provide O(1) indexed access but O(n) insertion/deletion at arbitrary positions',
            'Linked lists excel at O(1) prepend/delete but sacrifice O(1) random access',
            'Hash maps achieve average O(1) for get/set by mapping keys to array indices via a hash function',
            'Binary trees enable O(log n) search, insert, and delete when balanced',
            'Graphs model relationships — BFS finds shortest path in unweighted graphs, DFS explores all reachable nodes',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Why data structures matter' },
            { timestamp: '3:30', title: 'Arrays & dynamic arrays' },
            { timestamp: '10:00', title: 'Linked lists: single & double' },
            { timestamp: '18:00', title: 'Stacks & queues' },
            { timestamp: '25:00', title: 'Hash maps & collision handling' },
            { timestamp: '34:00', title: 'Trees: binary, BST, heap' },
            { timestamp: '44:00', title: 'Graphs: adjacency list vs matrix' },
        ],
        readingMode: `## Data Structures in JavaScript — A Visual Guide

Data structures are the vocabulary of algorithms. Choosing the right structure is often the difference between an O(n²) solution and an O(n log n) one.

### Arrays

JavaScript arrays are dynamic — they resize automatically. Under the hood, V8 optimizes small integer-indexed arrays to be contiguous in memory, giving true O(1) random access. Appending with \`push\` is amortized O(1); inserting at the beginning with \`unshift\` is O(n) because all elements shift right.

### Hash Maps

JavaScript's \`Map\` and plain objects are hash maps. A hash function converts your key to an array index. Collisions (two keys hashing to the same slot) are handled via chaining (linked list per slot) or open addressing. Well-implemented hash maps average O(1) for get, set, and delete — but worst-case is O(n).

### Trees

A Binary Search Tree (BST) maintains the invariant that left children are smaller and right children are larger than their parent. This enables O(log n) search — at each node you eliminate half the remaining tree. The catch: unbalanced trees degrade to O(n). Self-balancing variants like AVL trees and Red-Black trees maintain balance automatically.`,
    },
    v016: {
        keyPoints: [
            'REST maps HTTP verbs to CRUD operations — simple, widely understood, but can over-fetch or under-fetch',
            'GraphQL lets clients request exactly the fields they need, eliminating over-fetching at the cost of complexity',
            'tRPC provides end-to-end type safety between TypeScript server and client without code generation',
            'REST is ideal for public APIs; GraphQL shines for complex client-driven data needs; tRPC for internal full-stack TypeScript apps',
            'N+1 query problem is GraphQL\'s main performance pitfall — solved with DataLoader batching',
        ],
        chapters: [
            { timestamp: '0:00', title: 'API paradigms overview' },
            { timestamp: '3:00', title: 'REST: principles & best practices' },
            { timestamp: '10:00', title: 'GraphQL: schema, resolvers, queries' },
            { timestamp: '19:00', title: 'tRPC: full-stack type safety' },
            { timestamp: '26:30', title: 'Performance comparison' },
            { timestamp: '33:00', title: 'Developer experience comparison' },
            { timestamp: '39:00', title: 'Decision framework' },
        ],
        readingMode: `## REST vs GraphQL vs tRPC

API design decisions have long-lasting consequences. Choosing the wrong paradigm means months of workarounds. Here's how to think about each option.

### REST

REST is the default for good reason. It's familiar to every developer, maps cleanly to HTTP semantics, and is easy to document, cache, and consume from any language. Its weakness is rigidity: endpoints return fixed shapes, so clients either over-fetch (getting fields they don't need) or under-fetch (requiring multiple requests).

### GraphQL

GraphQL inverts the control: the client specifies exactly what it needs in a query, and the server returns precisely that structure. This is transformative for data-heavy applications with many different clients (web, mobile, third-party) that need different subsets of data. The tradeoff is complexity — schema definition, resolver implementation, and the N+1 query problem require careful engineering.

### tRPC

tRPC is the newest paradigm and the most constrained: it only works when both server and client are TypeScript. Within that constraint, it's extraordinarily ergonomic. Procedures defined on the server are immediately available as fully-typed functions on the client — no schema files, no code generation, no API documentation to maintain.`,
    },
    v017: {
        keyPoints: [
            'Big O describes how an algorithm\'s runtime or memory grows as input size (n) approaches infinity',
            'O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n²) quadratic — each is dramatically different at scale',
            'Nested loops are the most common source of O(n²) — look for opportunities to trade space for time',
            'Space complexity matters as much as time complexity for memory-constrained environments',
            'Premature optimization is the root of all evil — profile first, then optimize the actual bottleneck',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Why complexity analysis matters' },
            { timestamp: '4:00', title: 'Big O definition & rules' },
            { timestamp: '10:30', title: 'O(1) and O(log n) explained' },
            { timestamp: '16:00', title: 'O(n) and O(n log n)' },
            { timestamp: '22:00', title: 'O(n²) and how to avoid it' },
            { timestamp: '29:00', title: 'Space complexity' },
            { timestamp: '35:00', title: 'Real-world examples & profiling' },
        ],
        readingMode: `## Big O Notation — Algorithm Complexity

Big O notation answers a single question: how does this algorithm scale? Not how fast is it on my machine today — how does its runtime change as the input grows from 100 to 1,000 to 1,000,000 elements?

### The Rules of Big O

Big O drops constants and lower-order terms. O(2n + 50) simplifies to O(n) because at large n, the constant multiplier and additive term are irrelevant compared to the linear growth. We care about the shape of the curve, not its exact position.

### The Dramatic Difference Between Classes

An O(n log n) sort on 1 million elements takes ~20 million operations. An O(n²) sort takes 1 trillion. At 10 million elements: 230 million vs 100 trillion. The difference between complexity classes isn't academic — it's the difference between a feature working and being unusable in production.

### Trading Space for Time

The most common optimization pattern is using a hash map to convert O(n²) nested-loop lookups into O(n) single-pass lookups. Instead of searching the array for each element (O(n) per element → O(n²) total), build a map in one pass (O(n)) then look up in O(1). This is the intuition behind almost every "optimize this" interview problem.`,
    },
    v018: {
        keyPoints: [
            'JWT is stateless: all user data is encoded in the token, so no database lookup is needed per request',
            'Sessions are stateful: the server stores session data, and the token is just an opaque ID (cookie)',
            'JWT revocation is hard — you must maintain a blocklist, undermining the stateless advantage',
            'Cookies with HttpOnly + SameSite + Secure flags are the safest storage mechanism for auth tokens',
            'For most web apps, server-side sessions with secure cookies outperform JWT in security, simplicity, and revocability',
        ],
        chapters: [
            { timestamp: '0:00', title: 'Authentication fundamentals' },
            { timestamp: '3:30', title: 'How JWT works: header, payload, signature' },
            { timestamp: '9:00', title: 'How sessions work: cookie as pointer' },
            { timestamp: '14:00', title: 'Security comparison' },
            { timestamp: '21:00', title: 'Revocation strategies' },
            { timestamp: '27:30', title: 'Scalability considerations' },
            { timestamp: '34:00', title: 'When to use each' },
        ],
        readingMode: `## JWT vs Sessions — Auth Security in Practice

Authentication is not a solved problem, but the patterns are well understood. Choosing between JWT and sessions is largely about tradeoffs between statelessness, security, and operational complexity.

### How JWT Works

A JSON Web Token is a Base64-encoded string with three parts: header (algorithm), payload (claims), and signature. The server signs the token with a secret. Any server with that secret can verify the token without database access — this is the "stateless" advantage.

### The Revocation Problem

Statelessness is also JWT's Achilles' heel. If a user logs out, changes their password, or their account is compromised, you cannot invalidate their existing token until it expires — which might be hours or days. The workaround is a blocklist of revoked tokens, stored in Redis or a database. But now you have a database lookup per request anyway, eliminating the stateless advantage.

### Sessions Done Right

A session cookie stores only an opaque ID. The actual session data lives server-side (Redis is the standard). This means revocation is immediate — delete the session key and the user is logged out everywhere instantly. With an HttpOnly, Secure, SameSite=Lax cookie, the token is inaccessible to JavaScript (no XSS risk) and not sent cross-site (CSRF protection).`,
    },
};

export function getVideoSummary(videoId: string): VideoSummary | null {
    return summaries[videoId] ?? null;
}
