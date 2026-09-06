# EduGenie International Education Platform Implementation Plan

## Executive direction

EduGenie will evolve into a secure, configurable, multi-tenant education operating system. It will support school administration, academic learning, creative education, technical training, vocational practice, competency assessment, portfolios, certificates, and progression into employment or further study.

The product will support nursery, primary, secondary, tertiary, vocational, community, and independent training organisations without hard-coding one national education model. Each institution will configure its own academic structure, grading rules, skills pathways, branding, roles, and workflows within a shared platform.

> **Implementation principle:** establish the security and domain foundations first, then deliver complete vertical slices. Do not add screens that are not backed by tenant isolation, authorization, auditability, and testable workflows.

## Product principles

| Principle | Required outcome |
|---|---|
| Tenant isolation | Every institution sees only authorised data for its school, campus, programme, or learner relationship. |
| Configuration over branching | Academic levels, terms, grading scales, competencies, and workflows are data-driven. |
| Competency over content completion | Practical learning measures demonstrated capability, not only video or quiz completion. |
| Evidence-based assessment | Learners can submit documents, images, audio, video, code, and instructor observations. |
| Accessibility by default | WCAG 2.2 AA target, keyboard support, readable contrast, captions, transcripts, and reduced-motion support. |
| Privacy and safeguarding | Minors, guardians, consent, retention, audit trails, and least-privilege access are first-class concerns. |
| Interoperability | Exportable data, standards-friendly identifiers, APIs, webhooks, and portable certificates. |
| Reliability | Offline-friendly learner workflows, idempotent writes, observable background jobs, backups, and recovery drills. |

## Delivery phases

### Phase 0 — Platform safety and architecture

**Objective:** make the existing application safe to extend.

Implement a formal tenant model, school membership model, permission matrix, audit events, database constraints, RLS tests, error monitoring, environment separation, migration discipline, and automated CI checks.

**Exit criteria:** a test user cannot read or modify another school’s data; migrations run from an empty database and from a production-like database; every privileged mutation has an authorization check and audit event.

### Phase 1 — Multi-school administration core

**Objective:** support real institutions from registration through daily operation.

Implement schools, campuses, academic years, terms or semesters, programmes, departments, classes, arms, subjects, staff, learners, guardians, admissions, attendance, timetables, announcements, documents, and configurable branding.

**Exit criteria:** an institution administrator can configure a school, create an academic period, enrol a learner, assign staff, publish a timetable, record attendance, and communicate with authorised recipients.

### Phase 2 — Academic learning platform

**Objective:** provide a complete digital teaching and learning loop.

Implement courses, modules, lessons, resources, assignments, quizzes, rubrics, gradebooks, report cards, transcripts, learner progress, teacher feedback, parent visibility, and learning analytics.

**Exit criteria:** a teacher can publish a course, assign work to a class, mark submissions using a rubric, and produce an auditable result that appears in the correct learner and parent views.

### Phase 3 — Practical and vocational training

**Objective:** support catering, music, agriculture, fashion, trades, technology, arts, and other practical pathways.

Implement learning tracks, competencies, practical modules, safety prerequisites, projects, evidence submissions, instructor observations, rubric reviews, practical-session scheduling, equipment or workshop records, portfolios, certificates, and competency progression.

**Exit criteria:** a learner can enrol in a practical track, complete theory and safety prerequisites, submit evidence, receive structured feedback, demonstrate competency, and receive a verifiable achievement record.

### Phase 4 — AI, collaboration, and learner support

**Objective:** provide safe and useful intelligence without replacing professional judgement.

Implement AI tutoring with age-appropriate guardrails, lesson and assessment assistance, multilingual support, voice interaction, study groups, moderated communities, early-warning signals, accessibility support, and teacher review of generated content.

**Exit criteria:** AI output is labelled, reviewable, logged, privacy-filtered, and never becomes an unreviewed official grade or safeguarding decision.

### Phase 5 — Commercial, institutional, and ecosystem capabilities

**Objective:** make the platform deployable across countries and institution types.

Implement admissions funnels, billing, invoices, payments, scholarships, payroll integrations, APIs, SSO, webhooks, data imports and exports, marketplace publishing, training providers, employer placements, internship supervision, and partner integrations.

**Exit criteria:** a new school can be onboarded through a repeatable process; external systems can exchange documented data; financial and institutional actions are reconciled and auditable.

### Phase 6 — International readiness

**Objective:** compete across regions and education systems.

Implement localisation, time zones, currencies, country-specific academic configurations, language packs, accessibility audits, privacy controls, retention policies, disaster recovery, load testing, penetration testing, service-level monitoring, and standards-aligned certificate verification.

**Exit criteria:** the product passes security, accessibility, performance, privacy, and operational readiness reviews for the target launch markets.

## First implemented vertical slice

This increment adds the database foundation for Phase 3 while remaining usable by future academic and administration modules:

- School-scoped configuration records.
- Reusable learning tracks for academic, vocational, creative, technical, and entrepreneurship pathways.
- Track modules with ordering and prerequisites.
- Competencies with levels and evidence requirements.
- Practical projects and submissions.
- Instructor reviews with structured scores and feedback.
- Learner portfolios.
- Verifiable certificates with unique public verification codes.
- Row-level security for school members, instructors, learners, and public certificate verification.
- Indexes and constraints for the main access paths.

## Engineering standards

Every feature must include a migration, typed domain contract, authorization rules, loading and empty states, accessible interaction states, error handling, audit requirements, analytics events where appropriate, and a regression test at the correct seam. Large files must use direct upload and resumable strategies rather than loading entire media assets into browser memory.

The release process must run formatting, lint, TypeScript checks, production builds, migration validation, unit tests, integration tests, and browser smoke tests. Security checks must include cross-tenant access attempts, role escalation attempts, unsafe file access, token leakage, and abuse-rate scenarios.

## Prioritised backlog

| Priority | Work item | Definition of done |
|---|---|---|
| P0 | Tenant and permission model | RLS and negative-access tests pass for every school-owned table. |
| P0 | Education configuration | A school can define levels, periods, grading, programmes, and branding without code changes. |
| P0 | Practical-training foundation | Track, competency, evidence, review, portfolio, and certificate workflow is persisted securely. |
| P0 | Audit and safeguarding | Sensitive changes are attributable, reviewable, and retained according to policy. |
| P1 | Administration workflows | Admissions, attendance, timetable, communication, and documents operate end to end. |
| P1 | Academic workflows | Course, assignment, quiz, gradebook, report-card, and transcript workflows operate end to end. |
| P1 | Media and offline | Learners with unreliable connectivity can continue permitted work and sync safely. |
| P1 | Accessibility | Core journeys pass automated and manual WCAG 2.2 AA checks. |
| P2 | AI and collaboration | AI assistance and social features are moderated, observable, and age-appropriate. |
| P2 | Commercial ecosystem | Payments, providers, employers, APIs, imports, exports, and certificates are production-ready. |
| P2 | International operations | Localisation, compliance, recovery, performance, and support processes are verified. |

## Immediate next implementation increments

1. Apply and validate the foundation migration in a disposable Supabase environment.
2. Regenerate database types from the live schema.
3. Add typed repository functions for tracks, modules, competencies, submissions, reviews, portfolios, and certificates.
4. Build the school administrator configuration screens.
5. Build the learner track catalogue and progress screen.
6. Build instructor review and rubric screens.
7. Add file-upload policy, malware scanning, size limits, and media processing jobs.
8. Add cross-tenant RLS integration tests before exposing the features to real schools.

## Explicit non-goals for this increment

This increment does not claim to complete admissions, billing, payroll, transport, library, full academic records, AI safety operations, mobile packaging, or international compliance certification. Those require separate vertical slices, domain review, real institution pilots, and security testing.

## Success measures

The programme will be measured using institution activation, learner weekly engagement, course and practical completion, competency attainment, instructor review turnaround, parent engagement, support resolution time, cross-tenant security test results, accessibility defects, uptime, sync success rate, and certificate verification reliability.

## Governance

Each future module requires a named product owner, education-domain reviewer, security reviewer, accessibility reviewer, and technical owner. Major schema changes require backward-compatible migration planning, rollback strategy, data retention analysis, and a documented release note.

## References

This plan is an implementation framework derived from the current EduGenie codebase and its existing Supabase, React, TypeScript, and Capacitor architecture. External standards and regulatory requirements should be confirmed for each target country before launch.
