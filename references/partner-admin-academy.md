# Implementation Prompt: Close Gaps for Academy, Partner Portal, and Admin Portal

You are working on the `terumbu-main` repository.

The app is a Next.js App Router application using TypeScript, PostgreSQL, Drizzle ORM, custom credentials/session auth, server actions, role-based dashboards, and existing public/user/partner/corporate/admin routes.

The goal of this phase is to make the **Academy**, **Partner Portal**, and **Admin Portal** feel like a complete working product flow.

Do **not** implement real payment gateway integration in this phase. Keep existing demo/payment simulation behavior untouched unless a change is required to avoid breaking the Academy, Partner, or Admin flows.

---

## 1. Phase Objective

Improve the app from a broad MVP/demo into a smoother working multi-role application by closing the functional gaps in:

1. Academy
2. Partner Portal
3. Admin Portal

The implementation should prioritize:

* Real end-to-end role flow
* Clear access control
* Working CRUD and moderation workflows
* Clean empty states
* Good operational dashboards
* Better data integrity
* Automated tests for critical flows
* Minimal UI polish where needed for usability

Do not redesign the whole app. Reuse existing components, server actions, database patterns, and route conventions wherever possible.

---

## 2. Non-Goals for This Phase

Do not implement:

* Real Midtrans/Xendit/payment gateway integration
* Full corporate payment/funding flow
* Production-grade object storage integration unless already partially available
* Major design system replacement
* Full notification/email worker system
* Mobile app
* New authentication provider such as Google OAuth
* Major database rewrite
* Full CMS replacement

Payment-related flows may remain in demo/simulated state.

---

## 3. General Engineering Rules

Before changing code:

1. Inspect the existing schema in `src/db/schema.ts` or equivalent schema files.
2. Inspect existing queries in `src/lib/queries.ts`.
3. Inspect existing server actions.
4. Inspect existing route groups for:

   * `/academy`
   * `/dashboard/academy`
   * `/dashboard/certificates`
   * `/partner`
   * `/admin`
5. Reuse existing auth helpers such as:

   * `requireUser`
   * `requireRole`
   * `getCurrentUser`
   * role redirection helpers
6. Reuse existing UI components where possible.
7. Keep naming consistent with existing domain names.
8. Add Drizzle migrations for schema changes.
9. Add seed data if required for local testing.
10. Add tests for new critical flows.

After implementation, these commands must pass:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If `npm run build` still hangs because of an existing repo-level issue, document the route or cause found during investigation.

---

# PART A — Academy Gap Closure

## A1. Academy Goal

Make Academy feel like a real mini-LMS inside the app.

Users should be able to:

1. Browse public Academy courses.
2. Enroll in a course.
3. Continue a course from the dashboard.
4. View lessons in sequence.
5. Mark lessons as completed.
6. Take an assessment.
7. Pass or fail based on configured score.
8. Receive a certificate when they pass.
9. See the certificate in their dashboard.
10. Have the certificate and course completion reflected in their impact passport.

Admins should be able to:

1. Manage Academy courses.
2. Manage modules/lessons.
3. Manage assessment questions.
4. Publish/unpublish courses.
5. View enrollments and completion stats.

---

## A2. Academy Routes to Review and Improve

Review existing routes first. Extend them instead of duplicating.

Likely routes:

```txt
/academy
/academy/courses/[slug]
/dashboard/academy
/dashboard/certificates
```

Add admin routes if missing:

```txt
/admin/academy
/admin/academy/courses
/admin/academy/courses/new
/admin/academy/courses/[courseId]
/admin/academy/courses/[courseId]/lessons
/admin/academy/courses/[courseId]/assessment
/admin/academy/enrollments
```

Do not expose admin Academy routes to normal users, partners, or corporates.

---

## A3. Academy Data Model

Inspect existing Academy tables first. Do not duplicate existing concepts.

If missing, add or complete these concepts:

### Course

Required fields:

```txt
id
slug
title
description
shortDescription
level
durationMinutes
status: draft | published | archived
coverImageUrl
publishedAt
createdAt
updatedAt
```

### Course Module

Required fields:

```txt
id
courseId
title
description
sortOrder
createdAt
updatedAt
```

### Lesson

Required fields:

```txt
id
courseId
moduleId nullable if current schema does not support modules
title
slug
content
videoUrl nullable
estimatedMinutes
sortOrder
isPreview
createdAt
updatedAt
```

### Enrollment

Required fields:

```txt
id
userId
courseId
status: enrolled | in_progress | completed
progressPercent
startedAt
completedAt nullable
lastLessonId nullable
createdAt
updatedAt
```

### Lesson Progress

Required fields:

```txt
id
userId
courseId
lessonId
status: not_started | completed
completedAt nullable
createdAt
updatedAt
```

### Assessment Question

Required fields:

```txt
id
courseId
questionText
questionType: multiple_choice
sortOrder
points
createdAt
updatedAt
```

### Assessment Choice

Required fields:

```txt
id
questionId
choiceText
isCorrect
sortOrder
createdAt
updatedAt
```

### Assessment Attempt

Required fields:

```txt
id
userId
courseId
score
maxScore
percentage
status: passed | failed
attemptNumber
submittedAt
createdAt
```

### Assessment Answer

Required fields:

```txt
id
attemptId
questionId
choiceId
isCorrect
pointsAwarded
createdAt
```

### Certificate

Required fields:

```txt
id
userId
courseId
certificateNumber
publicSlug
status: active | revoked
issuedAt
revokedAt nullable
createdAt
updatedAt
```

If some of these already exist, adapt the implementation to the current schema.

---

## A4. Public Academy Course Flow

Improve `/academy` and `/academy/courses/[slug]`.

### `/academy`

Should show:

* Published courses only
* Course title
* Short description
* Level
* Duration
* Enrollment status if user is logged in
* CTA:

  * guest: “Login to enroll”
  * logged-in user not enrolled: “Enroll”
  * enrolled user: “Continue”
  * completed user: “View certificate”

### `/academy/courses/[slug]`

Should show:

* Course overview
* Module/lesson outline
* Preview lessons if any
* Enrollment CTA
* Course progress if logged in and enrolled
* Assessment/certificate state if completed

Behavior:

```txt
Guest opens course
→ sees overview
→ clicks enroll
→ redirected to login with next path

Logged-in user opens course
→ clicks enroll
→ enrollment created
→ redirected to /dashboard/academy?course=<slug> or lesson player
```

---

## A5. Dashboard Academy Flow

Improve `/dashboard/academy`.

It should show:

1. Enrolled courses
2. In-progress courses
3. Completed courses
4. Recommended published courses not yet enrolled
5. Continue button
6. Progress percentage
7. Next lesson
8. Assessment status
9. Certificate status

Add a lesson player route if missing:

```txt
/dashboard/academy/courses/[slug]/lessons/[lessonSlug]
```

Lesson player should include:

* Lesson title
* Lesson content
* Module/course context
* Previous lesson button
* Next lesson button
* Mark as complete button
* Auto-update enrollment progress
* Course completion check

When all required lessons are completed:

```txt
If course has assessment
→ show “Take assessment”

If course has no assessment
→ mark course completed
→ generate certificate
→ create passport milestone
```

---

## A6. Assessment Flow

Add route if missing:

```txt
/dashboard/academy/courses/[slug]/assessment
```

Assessment behavior:

1. User must be enrolled.
2. User should ideally complete all required lessons before taking final assessment.
3. Questions and choices come from DB.
4. User submits answers.
5. Server calculates score.
6. If score >= passing threshold:

   * assessment attempt becomes `passed`
   * enrollment becomes `completed`
   * certificate is generated if not already generated
   * impact passport item is created if not already created
7. If score < passing threshold:

   * assessment attempt becomes `failed`
   * enrollment remains `in_progress`
   * user can retry, subject to attempt policy

Simple retry policy for this phase:

```txt
Allow unlimited attempts.
Show attempt history.
Use latest passed attempt to complete course.
```

Passing score:

* Use a course-level `passingScorePercent` if available.
* Otherwise default to `70`.

---

## A7. Certificate Flow

Improve `/dashboard/certificates`.

It should show:

* User’s certificates
* Course title
* Issued date
* Certificate number
* Status
* Link to public verification page

Add public verification route if missing:

```txt
/certificates/verify/[publicSlug]
```

Verification page should show:

* Certificate number
* Course title
* User display name
* Issued date
* Status:

  * valid
  * revoked
  * not found

Do not expose private user data beyond display name and certificate metadata.

---

## A8. Academy Admin Flow

Create or improve `/admin/academy`.

Admin should be able to:

### Course Management

* List all courses
* Filter by draft/published/archived
* Create course
* Edit course metadata
* Publish course
* Unpublish course
* Archive course

### Lesson Management

For a selected course:

* Create module
* Edit module
* Reorder modules
* Create lesson
* Edit lesson
* Reorder lessons
* Mark lesson as preview/non-preview

### Assessment Management

For a selected course:

* Add question
* Edit question
* Add answer choices
* Mark correct answer
* Reorder questions
* Delete question if no attempts exist
* Prevent destructive delete if attempts already exist; use archive/disable instead if necessary

### Enrollment Monitoring

Admin can view:

* total enrollments per course
* completions per course
* completion rate
* certificates issued
* recent assessment attempts

---

## A9. Academy Acceptance Criteria

Academy is complete for this phase when:

1. Guest can browse published courses.
2. User can enroll.
3. User can complete lessons.
4. User progress updates correctly.
5. User can take assessment.
6. Passing assessment creates certificate.
7. Certificate appears in dashboard.
8. Public certificate verification works.
9. Admin can create and publish a course.
10. Admin can create lessons and assessment questions.
11. Draft courses are not visible publicly.
12. Unauthorized roles cannot access admin Academy.
13. Tests cover enrollment, lesson completion, assessment passing, and certificate creation.

---

# PART B — Partner Portal Gap Closure

## B1. Partner Portal Goal

Make the Partner Portal a clear operational workspace for field partners.

Partners should be able to:

1. See assigned campaigns and expeditions.
2. Know what actions are required.
3. Submit activity updates.
4. Submit evidence.
5. See evidence review status.
6. Fix rejected evidence.
7. Manage their own campaign/expedition content if authorized.
8. Track impact reporting obligations.

Admins should be able to review partner submissions from the Admin Portal.

---

## B2. Partner Routes to Review and Improve

Review existing partner routes first:

```txt
/partner
/partner/activity
/partner/campaigns
/partner/campaigns/new
/partner/expeditions
```

If missing, add:

```txt
/partner/activity/new
/partner/activity/[activityId]
/partner/evidence
/partner/evidence/[evidenceId]
/partner/reports
```

If old routes already redirect to `/partner/activity`, keep compatibility.

---

## B3. Partner Dashboard

Improve `/partner`.

The dashboard should show:

### Summary Cards

* Active assigned campaigns
* Active expeditions
* Pending evidence review
* Rejected evidence needing revision
* Recently approved evidence
* Upcoming expedition departures
* Draft campaign updates

### Action Required Section

Show prioritized actions:

1. Rejected evidence requiring revision
2. Campaigns without recent update
3. Expeditions with upcoming departure but missing preparation info
4. Draft updates not submitted
5. Evidence pending too long

### Assigned Work

Show:

* Assigned campaigns
* Assigned expeditions
* Related impact sites
* Last update date
* Evidence status summary

---

## B4. Partner Authorization

Partner users should only access organizations they are linked to.

Use existing organization-user relationship if available.

Rules:

```txt
Partner can view campaigns assigned to their organization.
Partner can create updates/evidence only for campaigns assigned to their organization.
Partner can view expeditions assigned to their organization.
Partner cannot access another partner organization’s data.
Admin can access all.
```

Do not rely only on UI hiding. Server actions must enforce authorization.

If unauthorized:

* show clear 403/no-access state
* do not use confusing 404 unless the resource truly does not exist

---

## B5. Partner Activity Flow

Improve or create a unified activity submission flow.

Route:

```txt
/partner/activity/new
```

Fields:

```txt
campaignId
activityDate
title
summary
description
activityType
impactSiteId nullable
evidenceFiles or evidenceUrls
visibility: internal | public
```

Activity types:

```txt
field_update
planting
monitoring
maintenance
community_event
training
expedition_activity
other
```

Submission behavior:

```txt
Partner creates activity
→ activity saved
→ optional public campaign update created
→ optional evidence records created
→ status is submitted/pending_review
→ admin can review from Admin Portal
```

Partner should be able to save as draft or submit.

Statuses:

```txt
draft
submitted
approved
rejected
```

---

## B6. Partner Evidence Flow

Evidence should be treated as a reviewable object.

Evidence fields:

```txt
id
organizationId
campaignId nullable
expeditionId nullable
activityId nullable
title
description
evidenceType
mediaUrl or mediaAssetId
locationName nullable
latitude nullable
longitude nullable
capturedAt nullable
submittedBy
status: draft | pending_review | approved | rejected
reviewedBy nullable
reviewedAt nullable
rejectionReason nullable
createdAt
updatedAt
```

Evidence types:

```txt
photo
video
document
field_note
gps_track
other
```

For this phase, if real cloud storage is not implemented, allow URL-based evidence and keep existing upload behavior. However, create a clean abstraction so future object storage can be added without rewriting the partner/admin flows.

Validation:

* title required
* campaign or expedition required
* description required
* media URL or uploaded file required
* partner must be authorized for related campaign/expedition

Partner evidence list should show:

* Draft
* Pending review
* Approved
* Rejected

Rejected evidence should show rejection reason and a “Revise and resubmit” action.

---

## B7. Partner Campaign Management

Improve `/partner/campaigns`.

Partner should be able to:

* list campaigns assigned to their organization
* view campaign status
* create campaign draft if allowed
* edit draft campaign
* submit campaign for admin review
* see admin rejection reason if rejected

Suggested campaign partner statuses:

```txt
draft
submitted_for_review
approved
published
rejected
archived
```

If existing campaign statuses differ, map this behavior to existing status values.

Partner should not be able to directly publish public campaigns unless current business rules already allow it.

---

## B8. Partner Expedition Management

Improve `/partner/expeditions`.

Partner should be able to:

* view assigned expeditions
* edit operational details if allowed
* add/update departure dates if allowed
* see booked seats
* see participant count, but do not expose sensitive participant data unless already designed
* submit expedition activity/evidence

Partner should not be able to access unrelated expedition bookings.

---

## B9. Partner Reports / Impact Summary

Add a simple partner report page if missing:

```txt
/partner/reports
```

It should show:

* campaign impact summary
* evidence approval rate
* monthly activity count
* expedition activity count
* pending admin review items
* rejected items

This does not need PDF export in this phase.

---

## B10. Partner Acceptance Criteria

Partner Portal is complete for this phase when:

1. Partner dashboard clearly shows assigned work.
2. Partner can submit an activity update.
3. Partner can submit evidence.
4. Partner can save draft and submit.
5. Partner can see pending/approved/rejected status.
6. Partner can revise rejected evidence.
7. Partner cannot access another organization’s resources.
8. Admin can review submitted partner evidence.
9. Approved evidence can appear in relevant public/admin/corporate views if existing display supports it.
10. Tests cover partner authorization, evidence submission, and rejection/resubmission.

---

# PART C — Admin Portal Gap Closure

## C1. Admin Portal Goal

Make Admin Portal the operational control room.

Admins should be able to:

1. Manage users and roles.
2. Manage partners/organizations.
3. Manage campaigns.
4. Manage expeditions.
5. Review partner evidence.
6. Review partner-submitted campaign updates.
7. Manage Academy courses.
8. View audit logs.
9. See operational health/status.
10. Perform moderation and approval workflows.

---

## C2. Admin Routes to Review and Improve

Review existing admin routes:

```txt
/admin
/admin/campaigns
/admin/campaigns/[campaignId]
/admin/campaigns/new
/admin/campaigns/evidence
/admin/campaigns/impact-sites
/admin/expeditions
/admin/expeditions/[expeditionId]
/admin/expeditions/new
/admin/partners
/admin/partners/[partnerId]
/admin/partners/new
/admin/reports
/admin/users
/admin/audit
```

Add if missing:

```txt
/admin/academy
/admin/activity
/admin/evidence
/admin/moderation
/admin/settings
```

Avoid duplicate pages if existing functionality already covers the need.

---

## C3. Admin Dashboard

Improve `/admin`.

Admin dashboard should show:

### Operational Cards

* Active campaigns
* Draft campaigns
* Campaigns pending review
* Active partners
* Pending evidence review
* Rejected evidence count
* Published expeditions
* Upcoming departures
* Academy enrollments
* Certificates issued

### Review Queue

Show latest items requiring admin action:

1. Partner evidence pending review
2. Campaign drafts submitted for review
3. Campaign updates pending publication
4. Expedition changes needing review
5. Academy courses in draft, if relevant

### Recent Activity

Show:

* recent admin actions
* recent partner submissions
* recent campaign updates
* recent evidence approvals/rejections

---

## C4. Admin Evidence Review

Create or improve evidence review route:

```txt
/admin/evidence
```

or reuse:

```txt
/admin/campaigns/evidence
```

Admin should be able to:

* list evidence pending review
* filter by status
* filter by campaign
* filter by partner organization
* open evidence detail
* approve evidence
* reject evidence with required reason
* see media preview
* see metadata:

  * submitted by
  * submitted at
  * organization
  * campaign/expedition
  * location
  * captured date
* audit every approval/rejection action

Approval behavior:

```txt
Admin approves evidence
→ evidence.status = approved
→ reviewedBy set
→ reviewedAt set
→ rejectionReason cleared
→ audit log created
→ evidence becomes eligible for public/corporate display
```

Rejection behavior:

```txt
Admin rejects evidence
→ rejection reason required
→ evidence.status = rejected
→ reviewedBy set
→ reviewedAt set
→ audit log created
→ partner sees rejection reason
→ partner can revise/resubmit
```

---

## C5. Admin Partner Management

Improve `/admin/partners`.

Admin should be able to:

* list organizations/partners
* create partner organization
* edit organization details
* activate/deactivate partner
* assign users to partner organization
* remove users from partner organization
* view partner campaigns
* view partner evidence
* view partner expeditions
* view partner activity

Partner organization detail page should show:

```txt
organization profile
assigned users
assigned campaigns
assigned expeditions
recent evidence
recent activity
status
```

If invitation flow is not implemented, provide a simple admin-managed user assignment flow.

---

## C6. Admin User Management

Improve `/admin/users`.

Admin should be able to:

* list users
* filter by role
* filter by status
* view user detail
* assign role if allowed
* deactivate/reactivate user
* link user to partner organization
* link user to corporate organization if existing model supports it
* see user’s recent activity
* see user’s donations/bookings/enrollments where applicable

Safety rules:

* Admin cannot accidentally remove their own last admin role.
* Role changes must create audit logs.
* Deactivation must not delete data.
* Use soft-disable/status instead of destructive delete.

---

## C7. Admin Campaign Management

Improve `/admin/campaigns`.

Admin should be able to:

* list campaigns
* create campaign
* edit campaign
* publish/unpublish campaign
* archive campaign
* assign partner organization
* assign impact site
* review partner-submitted campaigns
* approve/reject submitted campaign drafts
* see donation/demo payment summary if already available
* see related evidence
* see related updates

Campaign detail should show:

```txt
campaign overview
status
partner
impact site
funding/raised amount
donor count
updates
evidence
admin notes
audit trail
```

For this phase, do not implement real payment. Existing donation summary can remain based on existing database records.

---

## C8. Admin Campaign Updates Moderation

If campaign updates are partner-submitted, admin should have a moderation flow.

Statuses:

```txt
draft
pending_review
approved
published
rejected
```

Admin can:

* approve and publish
* approve but keep unpublished
* reject with reason
* edit minor typo/metadata if allowed
* audit the action

Public campaign pages should only show approved/published updates.

---

## C9. Admin Expedition Management

Improve `/admin/expeditions`.

Admin should be able to:

* list expeditions
* create expedition
* edit expedition
* publish/unpublish expedition
* archive expedition
* assign partner
* manage departures
* see booked seats
* see booking counts
* see related partner evidence/activity

For this phase, do not replace existing demo payment behavior for expedition bookings.

---

## C10. Admin Academy Management

Implement the Academy admin flow described in Part A.

Admin dashboard should link to Academy management and show:

* draft courses
* published courses
* enrollments
* completions
* certificates issued

---

## C11. Admin Audit Logs

Improve `/admin/audit`.

Audit logs should capture at least:

```txt
admin login if currently available
role changes
partner organization changes
campaign create/update/publish/archive
campaign update approval/rejection
evidence approval/rejection
expedition create/update/publish/archive
academy course publish/unpublish
certificate revoke if implemented
```

Audit table should include:

```txt
actorUserId
action
entityType
entityId
metadata JSON
createdAt
```

Audit UI should show:

* timestamp
* actor
* action
* entity
* metadata summary

---

## C12. Admin Acceptance Criteria

Admin Portal is complete for this phase when:

1. Admin dashboard shows useful operational summary.
2. Admin can manage partners.
3. Admin can manage users and roles safely.
4. Admin can manage campaigns.
5. Admin can manage expeditions.
6. Admin can review evidence.
7. Admin can approve/reject with audit logs.
8. Admin can manage Academy courses.
9. Admin can view audit logs.
10. Admin-only pages are inaccessible to non-admin users.
11. Tests cover evidence moderation, partner assignment, user role change, campaign moderation, and Academy course publishing.

---

# PART D — Cross-Role Smooth Flow

## D1. Required Role Journeys

Implement and test these complete flows.

### Flow 1 — Academy

```txt
Admin creates course
→ Admin adds lessons and assessment questions
→ Admin publishes course
→ User enrolls
→ User completes lessons
→ User passes assessment
→ Certificate generated
→ Certificate appears in dashboard
→ Public certificate verification works
```

### Flow 2 — Partner Evidence

```txt
Admin creates partner organization
→ Admin assigns partner user
→ Admin assigns campaign to partner organization
→ Partner logs in
→ Partner submits evidence
→ Admin reviews evidence
→ Admin approves evidence
→ Evidence becomes approved and visible in relevant views
```

### Flow 3 — Partner Evidence Rejection

```txt
Partner submits evidence
→ Admin rejects with reason
→ Partner sees rejected evidence
→ Partner edits and resubmits
→ Admin approves
```

### Flow 4 — Campaign Moderation

```txt
Partner creates/submits campaign draft
→ Admin reviews campaign
→ Admin approves/publishes campaign
→ Campaign appears publicly
```

### Flow 5 — Admin Access Control

```txt
Guest opens /admin
→ redirected to login

Normal user opens /admin
→ no-access or redirect to dashboard with message

Partner opens /admin
→ no-access or redirect to partner portal with message

Corporate opens /admin
→ no-access or redirect to corporate portal with message

Admin opens /admin
→ allowed
```

---

# PART E — UI/UX Requirements

Keep UI simple but complete.

Every list page should have:

* title
* primary action button
* filters where useful
* empty state
* loading/suspense state if applicable
* clear status badges
* row actions

Every form should have:

* validation
* error message
* success message or redirect
* cancel/back action
* clear required fields

Every review flow should have:

* approve button
* reject button
* required rejection reason
* confirmation where destructive/sensitive

Every dashboard should answer:

```txt
What is happening?
What needs my attention?
What can I do next?
```

---

# PART F — Testing Requirements

Add or improve tests for:

## Unit/Server Action Tests

* Academy enrollment
* Lesson completion
* Assessment scoring
* Certificate generation
* Partner authorization
* Evidence submission
* Evidence approval
* Evidence rejection
* Evidence resubmission
* Admin role change safety
* Campaign publish/unpublish
* Audit log creation

## E2E Tests

Use Playwright if available. If not, add testing setup or document manual E2E scripts.

Critical E2E flows:

```txt
Academy full flow
Partner evidence approval flow
Partner evidence rejection/resubmission flow
Admin campaign publish flow
Admin access control flow
```

---

# PART G — Seed Data

Add or improve seed data for local development.

Seed should include:

## Users

```txt
admin@example.com
partner@example.com
user@example.com
corporate@example.com if existing corporate flow needs it
```

## Organizations

```txt
Partner organization
Corporate organization if existing
```

## Campaigns

```txt
published campaign
draft campaign
partner-assigned campaign
campaign pending review
```

## Expeditions

```txt
published expedition
partner-assigned expedition
upcoming departure
```

## Academy

```txt
published course
draft course
course with lessons
course with assessment
```

## Evidence

```txt
pending evidence
approved evidence
rejected evidence
```

Document seeded login credentials clearly in local development docs.

---

# PART H — Documentation Requirements

Update or create documentation:

```txt
docs/academy-flow.md
docs/partner-portal-flow.md
docs/admin-portal-flow.md
docs/role-access-matrix.md
docs/local-seed-users.md
```

Each document should explain:

* purpose
* routes
* roles
* key actions
* status lifecycle
* test account examples

---

# PART I — Final Deliverables

At the end of this phase, deliver:

1. Working Academy flow
2. Working Partner Portal flow
3. Working Admin Portal flow
4. Required migrations
5. Updated seed data
6. Updated docs
7. Unit tests
8. E2E/manual test script
9. Summary of changed files
10. Known limitations

Explicitly state that real payment gateway integration is not included in this phase.

---

# PART J — Implementation Priority

Implement in this order:

## Priority 1 — Access and Role Safety

* Fix admin/partner authorization
* Add clean no-access states
* Ensure server actions enforce permissions

## Priority 2 — Partner Evidence + Admin Review

* Partner submits evidence
* Admin approves/rejects evidence
* Partner revises rejected evidence
* Audit logs created

## Priority 3 — Academy End-to-End

* Admin course creation
* User enrollment
* Lesson completion
* Assessment
* Certificate generation
* Public verification

## Priority 4 — Admin Operational Improvements

* Admin dashboard
* Partner management
* User management
* Campaign moderation
* Expedition management

## Priority 5 — Tests and Documentation

* Unit tests
* E2E/manual flows
* Seed data
* Docs

---

# PART K — Important Constraints

Do not break existing routes.

Do not remove existing demo payment behavior.

Do not implement real payment gateway.

Do not store sensitive participant/user data publicly.

Do not expose admin-only data to partner/user/corporate roles.

Do not use only client-side checks for authorization.

Do not create duplicate tables if existing tables already support the feature.

Do not rewrite the whole app.

Prefer incremental, production-minded improvements.

---

# Success Definition

This phase is successful when the app can demonstrate these three complete working loops:

## Academy Loop

```txt
Admin publishes course
→ User enrolls
→ User completes course
→ User receives certificate
```

## Partner Loop

```txt
Partner submits evidence
→ Admin reviews evidence
→ Partner sees result
→ Approved evidence becomes usable for impact reporting
```

## Admin Loop

```txt
Admin manages users, partners, campaigns, expeditions, Academy, evidence, and audit logs from one coherent portal
```

No real payment integration is required for this phase.
