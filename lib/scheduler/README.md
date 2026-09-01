# Scheduling & Recommendation Engine

## Technical & Product Specification

### 1. Purpose

The scheduling system takes a user's goals, subgoals, tasks, availability, constraints, and contextual information and produces a recommended way of allocating the user's time.

The system is **not simply a calendar generator**.

Its purpose is to maximise useful progress towards the user's goals while accounting for the fact that:

- different tasks have different levels of cognitive demand;
- some tasks require uninterrupted attention;
- some tasks can be paused and resumed easily;
- some tasks can be performed concurrently;
- some tasks require particular locations, equipment, or environments;
- the user has finite time and cognitive/physical resources;
- completing more tasks does not necessarily mean making more progress.

The long-term objective is:

> **Maximise expected progress towards the user's goals subject to real-world time, resource, and contextual constraints.**

---

# 2. High-Level Architecture

The system can be conceptualised as:

```text
Goals
  │
  ├── Subgoals
  │      │
  │      └── Tasks
  │
  ▼
Task Understanding
  │
  ▼
Task Resource Profile
  │
  ▼
Compatibility / Concurrency Analysis
  │
  ▼
Scheduling & Optimisation
  │
  ▼
Recommended Schedule
  │
  ▼
User Behaviour / Feedback
  │
  └──────────────► Model Improvement
```

The system should initially be implemented **inside the existing Next.js application**, but the scheduling engine should be isolated as its own domain/module.

Example:

```text
focus/
├── app/
├── components/
├── convex/
├── lib/
│   ├── scheduling/
│   │   ├── scheduler.ts
│   │   ├── classifier.ts
│   │   ├── scoring.ts
│   │   ├── constraints.ts
│   │   ├── concurrency.ts
│   │   └── types.ts
│   └── ...
└── ...
```

This provides a clean boundary without introducing the complexity of a separate microservice.

---

# 3. Existing Goal Hierarchy

The scheduler operates on the existing hierarchy:

```text
Goal
  └── Subgoal
        └── Task
```

For example:

```text
Goal:
Become stronger at computer science

    Subgoal:
    Improve algorithms

        Task:
        Complete 2 LeetCode problems

        Task:
        Study graph algorithms
```

A second goal might be:

```text
Goal:
Learn Spanish

    Subgoal:
    Build vocabulary

        Task:
        Complete Duolingo lesson
```

The scheduler therefore has to consider not only individual tasks but also the **value of making progress towards different subgoals and goals**.

---

# 4. Why Task Completion Alone Is Insufficient

A naïve scheduler might optimise:

$$
\text{Number of Tasks Completed}
$$

This is inadequate.

Completing five trivial tasks could produce less meaningful progress than completing one difficult task associated with a highly important subgoal.

Therefore the system should ultimately optimise something closer to:

$$
\text{Expected Goal Progress}
$$

rather than:

$$
\text{Tasks Completed}
$$

Each task should therefore contribute an estimated amount of progress towards its associated subgoal.

This connects the scheduling system to the previously defined goal-priority and weighting system.

---

# 5. Task Resource Model

Every task should eventually have a **resource profile**.

A task is not merely:

```text
name
duration
priority
due date
status
```

It also has properties describing how it consumes the user's resources.

A conceptual task vector is:

$$
T_i =
(A_i,I_i,P_i,V_i,Au_i,C_i)
$$

where:

- \(A_i\) = attention requirement
- \(I_i\) = interruption sensitivity
- \(P_i\) = physical engagement
- \(V_i\) = visual engagement
- \(Au_i\) = auditory engagement
- \(C_i\) = contextual requirements

Additional attributes can be added later.

---

# 6. Attention

## Definition

Attention represents how much sustained cognitive capacity a task requires.

A simple initial scale:

| Score | Description                | Example                                     |
| ----: | -------------------------- | ------------------------------------------- |
|     0 | Almost no cognitive demand | Starting a washing machine                  |
|     1 | Light attention            | Simple vocabulary practice                  |
|     2 | Moderate attention         | Lecture, note-taking                        |
|     3 | Deep attention             | Difficult programming, advanced mathematics |

Attention does **not** necessarily mean difficulty.

For example, reading a difficult research paper may have high attention requirements even though the physical activity is simply sitting and reading.

---

# 7. Interruptibility

Interruptibility describes how badly a task is affected if the user has to stop partway through it.

A useful interpretation is:

> **How much context or productivity is lost when this task is interrupted?**

Use a 0–3 scale:

| Score | Meaning                                    |
| ----: | ------------------------------------------ |
|     0 | Extremely easy to interrupt                |
|     1 | Easy to pause/resume                       |
|     2 | Some context is lost                       |
|     3 | Requires a substantial uninterrupted block |

Examples:

```text
Duolingo:
interruptibility = 1

Reading a chapter:
interruptibility = 2

Deep programming:
interruptibility = 3
```

This allows the scheduler to distinguish between:

```text
10 + 10 + 10 minutes
```

and:

```text
30 continuous minutes
```

even though both contain 30 minutes of wall-clock time.

---

# 8. Concurrency

Concurrency represents whether two tasks can be performed during overlapping periods.

A simple:

```text
concurrent = true
```

is insufficient.

Two tasks may be technically possible together but still interfere heavily.

Therefore concurrency should be based on **resource compatibility**.

---

# 9. Resource Dimensions

Tasks can consume different resources.

Potential dimensions include:

### Cognitive

How much mental processing is required?

### Visual

Does the task require sustained visual attention?

### Auditory

Does the task require listening?

### Physical

Does the task require physical interaction?

### Device

Does the task require a particular device?

### Context

Does the task require a particular location or environment?

For example:

### LeetCode

```text
cognitive: high
visual: high
auditory: low
physical: low
device: laptop
```

### Duolingo

```text
cognitive: low/moderate
visual: moderate
auditory: possible
physical: low
device: phone
```

### Cooking

```text
cognitive: low/moderate
visual: moderate
auditory: low
physical: high
context: kitchen
```

This gives the scheduler a basis for determining whether tasks can coexist.

---

# 10. Compatibility

Define a compatibility function:

$$
Compat(T_i,T_j)
$$

This determines whether two tasks can reasonably be performed concurrently.

For example:

```text
Cooking + Duolingo       → highly compatible
Cooking + Podcast       → highly compatible
Walking + Audiobook     → highly compatible
Reading + LeetCode      → incompatible
Meeting + LeetCode      → incompatible
```

The important point is that compatibility should be derived from the **resource profiles**, rather than requiring every possible pair of tasks to be manually defined.

---

# 11. Resource Capacity

The user has finite resource capacity.

For example:

$$
R =
(Cognitive,\ Visual,\ Auditory,\ Physical)
$$

Suppose the user's effective cognitive capacity is represented by 3.

If:

```text
LeetCode = 3 cognitive units
Duolingo = 1 cognitive unit
```

then:

$$
3+1=4>3
$$

Therefore concurrent LeetCode + Duolingo is probably inappropriate.

However:

```text
Cooking = 1 cognitive unit
Duolingo = 1 cognitive unit
```

gives:

$$
1+1=2\le3
$$

so concurrency is feasible.

The exact resource model should be refined experimentally.

---

# 12. Concurrent Tasks Are Not Necessarily "Simultaneous"

There are several forms of concurrency.

### True simultaneous activity

Two tasks genuinely occur at the same time.

Example:

```text
Cooking + listening to a lecture
```

### Passive waiting

One task contains periods where the user is waiting.

Example:

```text
Food cooking for 10 minutes
        +
Reading for 10 minutes
```

### Contextual bundling

Tasks are deliberately placed into the same situation.

Example:

```text
Lunch
+
Duolingo
```

### Audio concurrency

An activity that doesn't require auditory attention can be paired with audio learning.

Example:

```text
Walking
+
Podcast
```

The scheduler should recognise these as different mechanisms.

---

# 13. Task Classification

The system needs to determine the resource profile of a task.

There are three possible sources of information.

## 13.1 Predefined Data

The system can maintain default profiles for known task categories.

For example:

```text
Programming
→ high attention
→ high interruption sensitivity

Cooking
→ low/moderate attention
→ high concurrency potential

Language learning
→ low/moderate attention
→ potentially audio compatible
```

This provides sensible defaults.

---

# 14. Text-Based Task Understanding

Users will naturally enter tasks in natural language.

For example:

> "Do 20 minutes of Duolingo during lunch."

The system can extract:

```text
activity = language_learning
duration = 20 minutes
context = lunch
device = phone
```

It can then derive or retrieve a resource profile.

The architecture should distinguish between:

### NLP / text extraction

Determines:

> **What does the user appear to be asking to do?**

and:

### Task classification

Determines:

> **What resources does this activity probably require?**

These are related but distinct processes.

---

# 15. LLM-Based Extraction

An LLM can eventually be used to convert free-form task descriptions into structured attributes.

Example input:

```text
"Read the first 20 pages of my algorithms book on the train."
```

Potential structured output:

```json
{
  "activity": "reading",
  "durationMinutes": 30,
  "context": ["train"],
  "requiresDevice": false,
  "visualDemand": 2,
  "cognitiveDemand": 2
}
```

The LLM should initially be treated primarily as an **information extraction component**, rather than the final scheduling authority.

The deterministic scheduling engine should consume structured data.

This keeps scheduling behaviour predictable and testable.

---

# 16. Heuristic Classification

After extracting structured characteristics, deterministic rules can classify the task.

Conceptually:

$$
Attention(T)
=
f(Category, Complexity, UserInput, Context)
$$

For an MVP, this does not need to be sophisticated.

For example:

```text
programming + high complexity
→ attention = 3

language learning + low complexity
→ attention = 1
```

The exact rules should be configurable rather than hardcoded throughout the application.

---

# 17. User Overrides

The system should allow the user to correct its assumptions.

Example:

The system classifies:

```text
Reading
attention = 2
```

The user may indicate:

> "I need complete concentration when reading technical material."

The system can then adjust the profile.

This is important because **task requirements are not universal**.

The same activity can have different resource requirements for different users.

---

# 18. Personalisation

Eventually, the system can learn from user behaviour.

Suppose the system initially classifies:

```text
Technical reading
attention = 2
interruptibility = 2
```

But over many sessions it observes:

- the user usually completes it in long uninterrupted blocks;
- interruptions frequently lead to abandonment;
- the user rarely combines it with other activities.

The system can infer that, **for this user**, the task behaves more like:

```text
attention = 3
interruptibility = 3
```

This creates a progression:

```text
Generic task model
        ↓
Heuristic classification
        ↓
User corrections
        ↓
Behavioural data
        ↓
Personalised model
```

---

# 19. Potential ML Formulation

Once sufficient data exists, the classification could become probabilistic.

Instead of:

$$
Attention(T)=3
$$

the system could estimate:

$$
P(Attention=3\mid Task, Context, User)
$$

Likewise:

$$
P(Concurrent(T_i,T_j)=1
\mid T_i,T_j,Context,User)
$$

This creates a natural future application of machine learning.

However, **ML is not required for the first version**.

The initial system should use deterministic rules and heuristics.

---

# 20. Context

Task requirements depend heavily on context.

A task may require:

```text
location
equipment
noise level
time of day
internet connection
specific people
specific devices
```

For example:

```text
Task:
Run a local ML experiment

Requires:
laptop
internet potentially
quiet environment
sufficient uninterrupted time
```

Whereas:

```text
Task:
Listen to Spanish vocabulary

Requires:
phone/headphones
little visual attention
```

The scheduler can therefore make context-aware recommendations.

For example:

> You're already walking, so an audio-based language task is a good fit.

---

# 21. Scheduling Objective

Once task profiles have been established, the system can generate schedules.

The scheduler should optimise something like:

$$
Score(S)
=
Progress(S)
-
\lambda_1 Conflict(S)
-
\lambda_2 ContextSwitching(S)
-
\lambda_3 Overload(S)
+
\lambda_4 ConcurrencyGain(S)
$$

where:

### Progress

Expected progress towards the user's goals.

### Conflict

Penalty for violating hard constraints.

### Context switching

Penalty for repeatedly changing activities/environments.

### Overload

Penalty for unrealistic cognitive or physical demands.

### Concurrency gain

Reward for efficiently using otherwise unused time/resources.

The coefficients \(\lambda\) can be tuned experimentally.

---

# 22. Example

Suppose the user has one hour available.

Tasks:

```text
LeetCode
45 minutes
high attention
high interruption sensitivity

Duolingo
10 minutes
low attention
high interruptibility

Cooking
25 minutes
low attention
high physical demand
```

A naïve scheduler might produce:

```text
18:00–18:45 LeetCode
18:45–18:55 Duolingo
18:55–19:20 Cooking
```

But if cooking must happen during that period, a better schedule might be:

```text
18:00–18:25 Cooking
         + Duolingo during passive cooking

18:25–19:10 LeetCode
```

The scheduler has effectively recovered 10 minutes of otherwise unused capacity.

---

# 23. Hard vs Soft Constraints

The scheduler should distinguish between constraints that **cannot** be violated and preferences that **should preferably** be satisfied.

### Hard constraints

Examples:

```text
Meeting at 14:00
Task requires being at home
Task requires laptop
User is unavailable
Deadline cannot be exceeded
```

### Soft constraints

Examples:

```text
Prefer morning
Prefer long sessions
Prefer low context switching
Prefer working at the library
Prefer concurrent tasks where possible
```

The optimisation system should never sacrifice a hard constraint simply to improve the score.

---

# 24. Recommended Scheduling Pipeline

The complete process becomes:

```text
1. Retrieve user's goals
          ↓
2. Retrieve subgoals
          ↓
3. Retrieve tasks
          ↓
4. Parse task descriptions
          ↓
5. Extract structured properties
          ↓
6. Classify resource requirements
          ↓
7. Apply user-specific overrides
          ↓
8. Determine task compatibility
          ↓
9. Retrieve availability/context
          ↓
10. Generate candidate schedules
          ↓
11. Reject candidates violating hard constraints
          ↓
12. Score remaining candidates
          ↓
13. Select high-scoring schedule
          ↓
14. Present recommendation
          ↓
15. Observe user behaviour
          ↓
16. Update task estimates/preferences
```

---

# 25. Initial MVP

The first implementation should **not** attempt to solve the entire problem.

Start with:

### Task attributes

```text
attention
interruptibility
estimated duration
priority
deadline
context
```

### Task categories

Create a small number of predefined categories.

### Deterministic compatibility

Implement straightforward compatibility rules.

### Basic scheduling

Generate schedules from:

```text
available time
task priority
duration
constraints
```

### Concurrency

Allow compatible tasks to overlap.

### User correction

Allow users to modify incorrect classifications.

This is enough to prove the concept.

---

# 26. Future Versions

### Version 2

Add:

- richer contexts;
- energy levels;
- location;
- device requirements;
- better concurrency;
- task fragmentation;
- context-switch penalties.

### Version 3

Add behavioural learning:

- completion probability;
- abandonment probability;
- actual task duration;
- preferred times;
- personal attention requirements;
- learned concurrency preferences.

### Version 4

Potentially introduce ML:

$$
P(Completion\mid Task,Time,Context,User)
$$

and:

$$
P(Progress\mid Task,Duration,User)
$$

The scheduler can then optimise **expected progress**, rather than simply assigning tasks based on static priorities.

---

# 27. Key Design Principle

The central idea is:

> **A task is not merely something that occupies time. It consumes a combination of resources.**

Once tasks are represented this way, the system can reason about:

- whether tasks can overlap;
- whether a task needs uninterrupted time;
- whether the user's current context is suitable;
- whether a task should be scheduled now or later;
- whether two activities can be bundled;
- whether the user has enough cognitive capacity;
- and which combination of tasks produces the greatest expected progress.

This turns the project from a conventional **to-do list + calendar** into a **goal-oriented resource allocation and scheduling system**.

---

# 28. Core Technical Philosophy

The implementation should follow this progression:

```text
Natural language
      ↓
Structured task representation
      ↓
Heuristic resource classification
      ↓
Deterministic constraint/compatibility engine
      ↓
Optimisation-based scheduler
      ↓
Behavioural feedback
      ↓
Personalised prediction
      ↓
Machine learning (eventually)
```

The system therefore does **not need to be marketed or architected as an AI system from day one**.

The interesting technical problem exists independently of ML:

> **How can we formally represent a user's goals, estimate the value and resource requirements of their activities, and construct a schedule that maximises meaningful progress under real-world constraints?**

ML can later make those estimates better.

The underlying scheduling problem remains the foundation.
