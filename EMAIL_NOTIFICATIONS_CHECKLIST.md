# Email Notifications Checklist  
_Comprehensive list of every in-app event that should trigger an outgoing email._  
Check each box as you implement and test the notification.

---

## Client Dashboard

- [ ] Booking request **created** (pending contractor approval)
- [ ] Booking request **edited** (dates / services / pets)
- [ ] Booking request **cancelled** (before approval)
- [ ] Booking **approved** by contractor
- [ ] Booking **declined** by contractor
- [ ] Booking **completed** & payment captured (receipt)
- [ ] Booking **auto-cancelled / payment failure**
- [ ] Payment card **added / removed**
- [ ] **Payment failure** (card decline / expired)
- [ ] **Refund** or partial refund issued
- [ ] **New message** received while offline
- [ ] **Review request** after completed booking (24 h later)
- [ ] **New pet profile** added (optional)

## Contractor Dashboard

- [ ] **New gig request** that matches availability
- [ ] Gig **edited** by client (needs reconfirmation)
- [ ] Gig **cancelled** by client or admin
- [ ] Gig **approved** (itinerary details)
- [ ] Upcoming gig **reminder** (24 h before start)
- [ ] Gig **completed → payout queued**
- [ ] **Payout initiated** (Stripe Connect)
- [ ] **Payout successful**
- [ ] **Payout failed / requires action**
- [ ] **New review** received from client
- [ ] Review **edited / deleted** by client (if allowed)

### Contractor Application & On-boarding

- [ ] Application **submitted** (acknowledgement)
- [ ] Application **approved** (next-steps)
- [ ] Application **rejected**
- [ ] **On-boarding docs** pending / reminder

## Admin / Owner Notifications

- [ ] **New contractor application** awaiting review
- [ ] Contractor **accepted / rejected** (duplicate of above but send to applicant)
- [ ] Booking **cancelled after payment captured** (manual refund alert)
- [ ] **Disputed charge** / Stripe dispute opened
- [ ] **New coupon** created or large discount used (optional auditing)

## System-Level / Account Events

- [ ] **Welcome email** on user sign-up (client / contractor)
- [ ] **Email address change** confirmation
- [ ] **Password reset** confirmation
- [ ] **Unhandled server error** that blocks a user flow (fallback alert)

---

_Total items: 37_ 