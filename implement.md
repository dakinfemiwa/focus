# Goals Section — Implementation Guide

Context

You are a higly experience software engineer who specialises in planning and developing function, efficient and reusbale software and are an excellent planner.

Objective

Build a reusable Goals section for the dashboard that represents the first level of the application's hierarchy:

Goal
└── SubGoal
└── Task

For this stage, we are only building the Goal UI. Sub-goals and tasks will be integrated later.

1. Component Structure

Create the following files:

components/
└── dashboard/
├── goals-overview.tsx
└── goal-card.tsx

The relationship should be:

GoalsOverview
│
├── GoalCard
├── GoalCard
└── GoalCard

GoalsOverview is responsible for displaying the collection of goals.

GoalCard is responsible for displaying an individual goal.

2. Data Flow

The page should own the data and pass it down to the dashboard component.

page.tsx
│
│ goals[]
▼
GoalsOverview
│
│ .map()
▼
GoalCard

This follows the same pattern established for tasks:

page.tsx
│
│ tasks[]
▼
TodayOverview
│
│ .map()
▼
TaskCard

The components should not fetch their own data.

Later, when Convex is introduced, the data source can change without fundamentally changing the UI structure.

3. Goal Type

Create a domain type for a goal.

For now:

export type Goal = {
id: string;
goalName: string;
};

Keep this simple.

The Convex database already represents goals and sub-goals as separate tables, so don't prematurely put sub-goals inside the Goal type.

The relationship is currently represented by:

goals
↑
│ goalId
│
subGoals 4. GoalCard

Create:

components/dashboard/goal-card.tsx

The component should receive a Goal.

For example:

type GoalCardProps = {
goal: Goal;
};

Then:

export function GoalCard({ goal }: GoalCardProps) {
return (

      {goal.goalName}

);
}

The first version should focus on structure, not styling.

5. GoalsOverview

Create:

components/dashboard/goals-overview.tsx

It should receive an array of goals:

type GoalsOverviewProps = {
goals: Goal[];
};

Then use .map() to render each goal:

{goals.map((goal) => (
<GoalCard
    key={goal.id}
    goal={goal}
  />
))}

The key idea is:

goals[]
↓
.map()
↓
GoalCard × number of goals 6. Mock Data

Until Convex is connected, use temporary data in page.tsx.

For example:

const goals: Goal[] = [
{
id: "1",
goalName: "Get a First",
},
{
id: "2",
goalName: "Build Organise",
},
{
id: "3",
goalName: "Improve Fitness",
},
];

Then:

<GoalsOverview goals={goals} />

This keeps the data flow explicit.

7. Initial UI

The first version should display something roughly like:

Goals

┌──────────────────────┐
│ Get a First │
└──────────────────────┘

┌──────────────────────┐
│ Build Organise │
└──────────────────────┘

┌──────────────────────┐
│ Improve Fitness │
└──────────────────────┘

Don't add progress calculations yet.

8. Later UI

Once the basic components work, we can expand GoalCard:

┌────────────────────────────────┐
│ Get a First │
│ │
│ 3 sub-goals │
│ │
│ ████████████░░░░ 75% │
└────────────────────────────────┘

Potential information:

Goal name
Number of sub-goals
Progress
Number of incomplete tasks
Optional deadline

These should be added only when we have a clear reason to display them.

9. Dashboard Composition

The dashboard will eventually become:

Dashboard
│
├── PageHeader
│
├── TodayOverview
│ ├── Summary
│ ├── TaskCard
│ ├── TaskCard
│ └── TaskCard
│
└── GoalsOverview
├── GoalCard
├── GoalCard
└── GoalCard

This gives the dashboard two primary purposes:

What do I need to do?

TodayOverview

What am I working towards?

GoalsOverview

10. Important Architecture Rule

Keep the responsibilities separate:

page.tsx
→ owns/provides data

GoalsOverview
→ manages the collection/layout

GoalCard
→ renders one goal

Convex
→ eventually provides the real data

Don't put database queries inside GoalCard.

Don't make GoalCard responsible for finding its own sub-goals.

Don't build progress calculations until we've decided exactly what "progress" means.

11. Current Implementation Target

For this stage, the goal is simply:

✓ Goal type
✓ Mock goal data
✓ GoalsOverview
✓ GoalCard
✓ Render goals on dashboard
✓ Reusable component composition

After that, we can decide how sub-goals and progress should work before connecting the real Convex data.
