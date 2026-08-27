# FocusBoard

> A personal productivity dashboard that turns long-term goals into actionable tasks and helps you plan your time around them.

## Project Status

Currently in active development.

The initial version is being built with Next.js and Convex, with the aim of evolving the project from a simple CRUD application into a full productivity platform.

---

## Overview

Managing university work, personal projects, fitness, and other commitments can become difficult when tasks exist in isolation.

FocusBoard is designed around a hierarchy:

Goal → Sub-goal → Task

For example:

Goal:
"Build a strong software engineering portfolio"

Sub-goal:
"Build and deploy a full-stack application"

Tasks:

- Implement authentication
- Design database schema
- Build dashboard
- Deploy application

The dashboard brings these tasks together with scheduling and progress tracking.

---

## Planned Features

### Current

- [x] Dashboard
- [x] Goals
- [x] Sub-goals
- [x] Tasks
- [x] Task priorities
- [x] Task status
- [x] Estimated task duration
- [x] Due dates

### Planned

- [ ] Timetable / calendar view
- [ ] Daily task planning
- [ ] Goal progress tracking
- [ ] Recurring tasks
- [ ] Notifications
- [ ] Analytics
- [ ] Authentication
- [ ] Responsive mobile UI
- [ ] Cloud deployment
- [ ] AI-assisted planning

---

## Architecture

The application currently follows a full-stack architecture built around Next.js and Convex.

```text
┌─────────────────────────┐
│        Next.js UI       │
│                         │
│ Dashboard / Components  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│        Convex           │
│                         │
│ Queries / Mutations     │
│ Database / Backend      │
└─────────────────────────┘
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
