# Phase 1 — Trade & Revenue + Esports Redesign

Building 5 revenue features and a full visual overhaul. Other categories (Engagement, Trust, Content Hubs) come in later phases.

## Features in this phase

### 1. AI Price Estimator
- New `/sell` helper card: seller enters level, login method, key items, email-bind → Lovable AI (Gemini 3 Flash) returns a suggested ₹ range + reasoning.
- Edge function `estimate-price` calls Lovable AI Gateway. Server-side only.
- Shows on SellForm and EditListingModal as a "Suggest price" button.

### 2. Auction & Bidding System
- New table `auctions` (listing_id, start_price, current_bid, current_bidder, ends_at, status).
- New table `bids` (auction_id, bidder_id, amount, placed_at).
- Sellers can list as "Auction" instead of fixed price; choose duration (1h / 6h / 24h / 3d).
- Bids escrow buyer's wallet balance (hold + auto-refund losing bids).
- DB function `place_bid` validates min increment, balance, deadline.
- Cron-like settle on first read after `ends_at`: highest bidder wins, escrow released into existing purchase flow.

### 3. Make Offer
- New table `offers` (listing_id, buyer_id, amount, status, expires_at).
- Buyer button on listing page: "Make Offer" → enters amount + optional message.
- Seller dashboard tab "Offers" → Accept (creates purchase) / Counter / Reject.
- Auto-expire after 48h.

### 4. VIP Membership (manual deposit, PhonePe)
- New table `vip_subscriptions` (user_id, tier, started_at, expires_at, deposit_request_id).
- Tiers: Bronze (₹99/mo), Silver (₹299/mo), Gold (₹799/mo).
- Perks (enforced server-side):
  - Bronze: 1 free featured listing/week, VIP badge.
  - Silver: 3 featured/week, lower withdrawal min, priority support flag.
  - Gold: unlimited featured, 0% sale fee, top placement in featured sellers.
- Purchase flow: user picks tier → opens existing PhonePe deposit flow tagged as VIP → admin approves → row inserted.

### 5. Premium Featured Listings
- Column `featured_until timestamptz` on `id_listings`.
- Seller can boost a listing for ₹20 (24h) / ₹50 (3d) / ₹120 (7d) deducted from wallet balance.
- VIPs get free boosts per their quota.
- Featured listings render with glow border, "FEATURED" badge, pinned above non-featured in marketplace.

## Esports redesign

Full visual rebuild in the same Orange / Black / Charcoal palette:

- **Typography**: Keep Orbitron for display; pair with Rajdhani for subheads, Inter for body.
- **New tokens** in `index.css`: neon orange glow, metallic gradients, scanline overlay, holographic accents, deeper shadows, animated borders.
- **Landing page**: animated hero (Particles + Border Beam), redesigned stats strip (Bento), featured carousel, live activity ticker placeholder.
- **Listing cards**: holographic hover, rarity-tinted borders, level/price glow, animated FEATURED ribbon.
- **Dashboards** (Seller, Profile, Admin): tabbed esports console layout, KPI tiles with sparklines, dark glass panels.
- **Mobile**: bottom tab bar, larger touch targets, swipeable filter chips, sticky CTAs.
- **Motion**: framer-motion page transitions, card stagger reveals, smooth modal entrances.
- **Perf**: lazy-load images, skeleton states already in place, code-split heavy routes (Admin, Tournaments).

MagicUI components I'll pull in: Particles, Border Beam, Shimmer Button, Animated List, Bento Grid, Aurora Text, Number Ticker.

## Technical notes

- All new tables get RLS + GRANTs + service_role.
- All money-moving DB functions are `SECURITY DEFINER` and use the existing `app.bypass_profile_guard` pattern.
- Bids/offers/featured payments deduct from wallet via the same `balance_transactions` ledger.
- One edge function: `estimate-price` (Lovable AI). All other logic stays in Postgres functions.
- No new secrets needed — `LOVABLE_API_KEY` already provisioned.

## Out of scope (next phases)
Daily Missions, Spin Wheel, Buyer/Seller Levels, Verification Score, Smart Recommendations, Wishlist (favorites already exist), Support Tickets, Analytics Dashboard, Leaderboards, Live Feed (only ticker placeholder now), Rare Bundle / Evo Gun / News hubs, Clan Hub.

## Build order
1. DB migration: auctions, bids, offers, vip_subscriptions, featured_until + functions + RLS.
2. Edge function: estimate-price.
3. New design tokens + global UI primitives (BorderBeam, Particles, Shimmer wrappers).
4. SellForm: AI estimator + auction/fixed toggle.
5. ListingDetails: Make Offer + Bid panel + Featured badge.
6. SellerDashboard: Offers tab, Boost button.
7. New routes: `/vip`, `/auctions`.
8. Landing + Header + ListingCard redesign.
9. Mobile polish + framer-motion transitions.

This is ~2-3 days of focused work. I'll commit in stages so the app stays usable throughout.
