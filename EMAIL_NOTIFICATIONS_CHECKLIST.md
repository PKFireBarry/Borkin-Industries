# Email Notifications Checklist  
_Comprehensive list of every in-app event that should trigger an outgoing email._  
Check each box as you implement and test the notification.

---

## Client Dashboard

- [x] Booking request **created** (pending contractor approval)
- [ ] Booking request **edited** (dates / services / pets)
- [x] Booking request **cancelled** (by client)
- [x] Booking **approved** by contractor
- [x] Booking **declined** by contractor
- [x] Booking **completed** & payment captured (receipt)
- [ ] Payment card **added / removed**
- [x] **Payment failure** (card decline / expired)
- [x] **New message** received while offline


## Contractor Dashboard

- [x] **New gig request** that matches availability
- [ ] Gig **edited** by client (needs reconfirmation)
- [x] Gig **cancelled** by client or admin
- [ ] Gig **approved** (itinerary details)
- [ ] Upcoming gig **reminder** (24 h before start)
- [x] Gig **completed → payout queued**
- [ ] **Payout initiated** (Stripe Connect)
- [ ] **New review** received from client


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