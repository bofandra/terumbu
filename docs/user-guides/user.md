# User Role Guide

## Demo Account

- Email: `user.demo@terumbu.eco`
- Temporary password: supplied separately by the deployment owner; rotate by rerunning `DEMO_ROLE_PASSWORD=... npm run db:seed-role-users`.
- Start URL: `/dashboard`

## What This Role Is For

Use this account to review the public supporter journey: discovering campaigns, donating, booking expeditions, taking Academy courses, tracking sponsored ecosystems, and managing an Impact Passport.

## Suggested Walkthrough

1. Sign in from `/login`.
2. Open `/dashboard` to review personal impact, donations, corals, expeditions, Academy progress, achievements, and recommendations.
3. Visit `/campaigns` and open a campaign detail page to inspect donation, evidence, updates, impact, FAQ, and related Academy content.
4. Visit `/expeditions` and open a trip detail page to review booking, itinerary, impact allocation, preparation, and cancellation details.
5. Visit `/academy` to search courses, inspect learning tracks, and open a course detail page.
6. Open `/dashboard/passport` to review the private Impact Passport experience and profile controls.

## Validation Checklist

- The dashboard loads without admin, partner, or corporate-only links.
- Campaigns, expeditions, Academy, and Impact Passport flows are visible.
- Private account data remains inside the authenticated dashboard.
- Public Impact Passport sharing follows the visibility configured in settings.
