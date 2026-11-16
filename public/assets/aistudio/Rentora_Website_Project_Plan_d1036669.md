# Rentora — Website Version Project Plan

**Project:** Rentora — Peer-to-Peer Rental Marketplace  
**Tagline:** Rent. Share. Earn.  
**Project type:** University entrepreneurship and web-development project  
**Platform:** Responsive website for desktop, tablet and mobile browsers  
**Build approach:** Local-first student prototype; no public launch or commercial deployment planned  
**Design reference:** Image 1 — the navy-and-teal Rentora visual direction  
**AI features:** AI Listing Generator and AI Rental Finder  

> **Project scope in one sentence:** Build a polished local website where people can browse and list rental items, send booking requests, manage their listings and use AI to generate listing drafts and find suitable rentals.

![Rentora design reference](Rentora_Design_Reference.png)

---

## 1. Project overview

### 1.1 The idea

Rentora is a peer-to-peer rental marketplace. People list belongings they do not use every day, while other people rent those items temporarily instead of purchasing them.

The first version focuses on four categories:

1. **Cameras & Photography** — DSLR and mirrorless cameras, lenses, tripods, lights, microphones and action cameras.
2. **Gaming Consoles** — PlayStation, Xbox, controllers, VR headsets and gaming accessories.
3. **Bikes & Cycles** — bicycles and ordinary cycling accessories.
4. **Electronics & Equipment** — projectors, speakers, tablets, laptops, microphones and general equipment.

Keep these categories distinct. “Electronics & Equipment” should not duplicate cameras or gaming consoles.

### 1.2 The problem Rentora addresses

People sometimes need expensive equipment for a short period. Buying it for temporary use may be unnecessary or too expensive. At the same time, people own items that sit unused for long stretches. Rentora connects these two groups through item listings, daily rental prices, availability and booking requests.

### 1.3 Target users

**Renters** may include university students, content creators, gamers and people who need equipment for a short project or event.

**Owners** may include students, hobbyists, creators and people who want to earn from items they already own.

An account should be able to act as both renter and owner. “Rent an item” and “List an item” are entry points into different activities, not two permanently separate account types.

### 1.4 Main value proposition

**Rent useful things nearby without buying them. Earn from things you already own.**

Rentora should feel more focused on temporary rentals than a general buy-and-sell classifieds website. The rental process—dates, availability, daily prices, deposits, owner approval and booking status—is the main difference.

---

## 2. Project boundaries: keep it suitable for a university project

This is a demonstration website, not a commercial marketplace. It should show a convincing end-to-end workflow without requiring public hosting, real transactions or real identity verification.

### 2.1 What the finished demonstration should include

- A responsive website that works on desktop, tablet and mobile browsers.
- A polished home page with search, category navigation and featured listings.
- Sign-in, demo account creation and account-choice screens.
- Four category pages, search results, filters and item detail pages.
- Favourites and a booking-request workflow.
- A multi-step item-listing form with local photo upload.
- **AI Feature A: AI Listing Generator** using a photo and owner-provided details.
- **AI Feature B: AI Rental Finder** using natural-language requests and actual database listings.
- Owner dashboard for listing and booking management.
- A small admin/moderator page for approving or hiding demo listings.
- A local SQLite database that retains information after the browser or server restarts.
- Sample users and sample listings for a reliable presentation.
- Simulated verification, payment confirmation and subscription/featured-listing flows.

### 2.2 Deliberately excluded

Do not build these for the university version:

- Public hosting, domain purchase or public registration.
- Real banking, wallet, escrow, deposit-holding or refund integrations.
- Real subscription billing or payment-provider webhooks.
- Real SMS or email OTP delivery.
- Real identity-document collection or verification-provider integration.
- Delivery fleets, courier tracking or live location tracking.
- Insurance, legal dispute resolution or automated compensation.
- Large-scale multi-server infrastructure, cloud deployment or production monitoring.
- A complex commercial customer-support system.

These can be described as future improvements in the report, but they are not development requirements.

### 2.3 Local-only behaviour

Run the website and its backend on the development computer. The browser opens a local address such as `http://localhost:5173`, while the API server runs on another local port such as `http://localhost:3001`.

The website's database is stored in a local SQLite file on that computer. This means the same demo data is available when the website is reopened on that computer. It does not automatically synchronise with another computer or phone.

The AI features call Gemini over the internet through the local backend. Therefore, the ordinary marketplace can work without an AI request, but AI generation and AI recommendations require an internet connection and a valid API key.

---

## 3. Recommended technology stack

Use TypeScript throughout the frontend and backend. This keeps the codebase consistent and gives the project useful type checking.

| Layer | Recommended technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript | Build reusable website components and pages |
| Development/build tool | Vite | Local development server and frontend build |
| Routing | React Router | Navigate between pages without full-page reloads |
| Styling | CSS variables + CSS Modules | Consistent design tokens and scoped component styles |
| Icons | Lucide React | Consistent outline icon set |
| Backend | Node.js + Express + TypeScript | Local API, database access and AI requests |
| Database | SQLite | Local persistent data store |
| SQLite driver | `better-sqlite3` or another maintained Node SQLite driver | Read and write the database from the backend |
| AI | Gemini API | Understand uploaded item photos and natural-language rental requests |
| Validation | Zod | Validate forms, API input and AI-generated structured output |
| Image handling | Multer or equivalent upload middleware | Receive and validate listing photos |
| Code editor | Visual Studio Code | Write and debug the project |
| Testing | Browser DevTools + Vitest/React Testing Library where useful | Check responsive layout and core logic |

### 3.1 Why this stack

- **React** makes it straightforward to build reusable page sections, listing cards, forms, dialogs and dashboards.
- **TypeScript** helps catch incorrect data shapes and many common coding mistakes.
- **Vite** provides a simple React + TypeScript starter and a fast local development server. Its official guide lists a React TypeScript template. [Vite guide](https://vite.dev/guide/)
- **Express** provides a small local API without requiring a large backend framework. Its official documentation includes TypeScript setup guidance. [Express installation guide](https://expressjs.com/en/starter/installing/)
- **SQLite** is a self-contained, serverless, zero-configuration database stored in a file, which suits a local university demo. [SQLite overview](https://www.sqlite.org/about.html)
- **Gemini** can process image inputs, which makes it suitable for the listing-generation workflow. [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)

Do not spend time choosing many competing libraries. Start with this stack and add another dependency only when a feature genuinely needs it.

### 3.2 Local development ports

Use a simple local arrangement:

- React/Vite frontend: `http://localhost:5173`
- Express API: `http://localhost:3001`
- SQLite file: `server/data/rentora.db`
- Uploaded demo images: `server/uploads/`

The frontend sends API requests to the Express server. The backend reads and writes the database and makes AI requests. Keep the Gemini API key on the backend, never in React code or browser environment variables.

---

## 4. Brand identity and design system

### 4.1 Overall visual direction

Use Image 1 as the design reference. The website should feel like a modern, friendly rental marketplace—not a generic admin dashboard and not an old classifieds site.

The visual direction:
- Deep navy for brand identity and strong headings.
- Teal for primary actions, selected controls and interactive highlights.
- White and very light blue-grey surfaces for a clean, open feel.
- Clear product photography and prominent daily prices.
- Rounded cards, restrained shadows and consistent spacing.
- Generous whitespace and concise text.
- Strong desktop layout that adapts cleanly to narrow screens.

The mobile-app mockup is a style reference, not a requirement to copy its bottom navigation onto desktop. The website should use a top navigation bar and page layouts that take advantage of wider screens.

### 4.2 Colour palette

Use these tokens consistently across all pages.

| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#172554` | Main brand colour, dark hero sections, strong headers |
| `navy-800` | `#1E3A5F` | Secondary dark surfaces |
| `teal-500` | `#14B8A6` | Brand accent, icons, selected controls |
| `teal-700` | `#0F766E` | Primary buttons with white text |
| `teal-100` | `#CCFBF1` | Selected backgrounds and soft callouts |
| `amber-500` | `#F59E0B` | Featured labels and premium highlights only |
| `amber-100` | `#FEF3C7` | Background for featured labels |
| `background` | `#F8FAFC` | Main page background |
| `surface` | `#FFFFFF` | Cards, forms, dialogs and panels |
| `surface-muted` | `#F1F5F9` | Search boxes, inactive chips and grouped panels |
| `border` | `#E2E8F0` | Borders and dividers |
| `text-primary` | `#0F172A` | Main text and headings |
| `text-secondary` | `#64748B` | Supporting text and metadata |
| `success` | `#15803D` | Success and completed states |
| `warning` | `#B45309` | Pending and caution states |
| `danger` | `#B91C1C` | Errors and destructive actions |
| `info` | `#1D4ED8` | Informational labels |

**Colour rules**
- Use `teal-700` with white text for filled primary buttons to maintain contrast.
- Reserve amber for featured/promotion labels; it should not become a second primary action colour.
- Use semantic status colours consistently and include text or an icon, not colour alone.
- Keep most pages white or very light. Use navy for the logo, hero banner and occasional strong sections.
- Check contrast for text, buttons, links, focus rings and disabled states.

### 4.3 Typography

**Recommended font:** Inter, with a system sans-serif fallback. Install a local font package or include the font files in the project if the presentation must not rely on an external font service.

| Style | Approx. size | Weight | Use |
|---|---:|---|---|
| Display | 40–48 px | Bold | Home hero headline |
| H1 | 30–36 px | Bold | Page headings |
| H2 | 22–26 px | Semibold | Main sections |
| H3 | 17–20 px | Semibold | Listing and card titles |
| Body | 15–16 px | Regular | Main content |
| Small body | 13–14 px | Regular | Supporting content |
| Caption | 12 px | Medium | Metadata only |
| Button | 14–16 px | Semibold | Action labels |

Do not shrink important text to fit more information. Use line-height around 1.45–1.6 for body text.

### 4.4 Layout, spacing and shape

Use an 8-point spacing system: 4, 8, 12, 16, 24, 32, 40 and 48 px.

Suggested values:
- Main content max width: approximately 1200–1280 px.
- Desktop page side padding: 32–48 px, depending on viewport.
- Tablet side padding: 24 px.
- Mobile side padding: 16 px.
- Small controls: 10–12 px radius.
- Standard cards: 16 px radius.
- Large hero panels and modals: 20–24 px radius.
- Pill chips: fully rounded.

Prefer whitespace and subtle borders over heavy shadows. Use a consistent grid and align card edges.

### 4.5 Responsive breakpoints

Use these as practical starting points, then test the actual layout:

| Layout | Width | Expected behaviour |
|---|---:|---|
| Wide desktop | 1200 px and above | Full header, 4-column listing grid, wide detail layout |
| Desktop/laptop | 900–1199 px | Slightly narrower content, 3-column listing grid |
| Tablet | 600–899 px | Compact header, 2-column listing grid, stacked detail panels |
| Mobile | Below 600 px | Compact header, 1- or 2-column cards depending on width, stacked forms |

Avoid horizontal page scrolling. Navigation, filters, dialogs and tables must adapt to mobile screens.

### 4.6 Photography and icons

- Use one consistent icon set, such as Lucide React.
- Use real-looking sample product photos for the seeded demo listings.
- Keep card image ratios consistent, preferably around 4:3.
- The detail page should show a larger gallery with thumbnails.
- Use an intentional empty state when an item has no photo.
- Use consistent image sizing and `object-fit: cover` for listing cards.

### 4.7 Component design rules

Create shared components rather than styling every page independently:

- `Button` — primary, secondary, outline, danger, loading and disabled states.
- `Input` and `TextArea` — label, hint, error and disabled states.
- `SearchBar` — icon, clear action and loading state.
- `CategoryCard` — category image, title and item count.
- `ListingCard` — photo, title, daily rate, rating, location and featured label.
- `StatusBadge` — pending, approved, declined, completed and featured.
- `Modal` / `Dialog` — confirmation and focused interactions.
- `Toast` — short success or error messages.
- `EmptyState` — useful guidance when there are no results.
- `SkeletonCard` — loading placeholder.
- `Pagination` or “Load more” — for result sets.

All clickable elements need hover, focus, active and disabled states.

---

## 5. Website navigation and page structure

### 5.1 Main desktop header

Use a sticky or fixed top header with:

- Rentora logo on the left.
- Search field in the middle.
- Links for Browse, Categories and How it works.
- “List an item” as a prominent teal button.
- Saved items icon.
- Sign in or a user avatar/profile menu on the right.

Keep the header compact. Do not place every dashboard link in the public navigation.

### 5.2 Category navigation

Display the four categories below the main header or as a horizontal category row:

- Cameras & Photography
- Gaming Consoles
- Bikes & Cycles
- Electronics & Equipment

On mobile, the category row can scroll horizontally. Do not make it take up excessive vertical space.

### 5.3 Footer

Include:
- Rentora logo and short description.
- Browse category links.
- “How it works” link.
- Demo privacy and help information.
- University-project/demo notice.

Do not invent real company contact details or social links.

---

## 6. Screen and page-by-page requirements

### 6.1 Home page `/`

Recommended order:

1. Main header.
2. Hero section with headline **“Rent smarter. Spend less.”** and supporting copy.
3. Search field and “Explore rentals” action.
4. Four category cards.
5. Featured listings row/grid.
6. “How Rentora works” with three steps: Find an item, Request a rental, Meet and return.
7. Owner call-to-action: “Have something sitting unused? List it on Rentora.”
8. Footer.

The hero should be balanced, not excessively tall. Use an equipment photo or collage on the opposite side of the headline. Make the primary CTA clear.

### 6.2 Browse/search page `/browse`

Include:
- Search query at the top.
- Category filter.
- Minimum/maximum daily price filters.
- Sort by recommended, price low-to-high and price high-to-low.
- Optional availability date filter if the booking data is ready.
- Listing grid.
- Result count and clear-filters action.
- Empty state with a suggestion to broaden the search.

On wide screens, place filters in a left sidebar and results on the right. On mobile, show a “Filters” button that opens a drawer or modal.

### 6.3 Category page `/category/:slug`

- Category title and short description.
- Category-specific hero image or compact banner.
- Subcategory chips where useful.
- Sort and filter controls.
- Matching item grid.

### 6.4 Listing detail page `/items/:id`

Desktop layout:
- Left column: large photo gallery, title, description, specifications, owner details and reviews.
- Right column: sticky booking panel with price per day, date selection, deposit information and “Request to rent” button.

Mobile layout:
- Photo gallery first.
- Title, rating and price.
- Owner information and description.
- Booking panel below the item details or as a compact sticky bottom action.

Show clear labels for:
- Daily rental price.
- Refundable security deposit (demo only; not actually collected).
- Item condition.
- Available dates or a note that availability needs owner confirmation.
- Owner profile and demo verification status.

Never imply that an item is actually available for a date unless the booking data supports it.

### 6.5 Sign-in and registration `/login` and `/register`

For the project demo:
- Email and password fields.
- A simple create-account form.
- Clear validation errors.
- A demo-account selector or documented demo credentials.
- Simulated email/phone verification badges.
- “Continue as renter” and “Continue as owner” options only as shortcuts into the relevant workflow.

A user account can perform both renter and owner activities. Do not maintain two separate user records for the same person.

Suggested seeded accounts:
- `renter@rentora.demo`
- `owner@rentora.demo`
- `admin@rentora.demo`

Use one clearly documented demo password or a demo account switcher. Never use these credentials for a public website.

### 6.6 Listing wizard `/list-item`

Build a multi-step form:

**Step 1 — Basic details**
- Item title.
- Category and optional subcategory.
- Description.
- Item condition.

**Step 2 — Photos**
- Upload one or more images.
- Preview and remove selected photos.
- Show allowed file formats and size limits.
- Select a cover image.

**Step 3 — Rental details**
- Daily rental price in PKR.
- Refundable deposit amount (illustrative only).
- Location/area text for the demo.
- Availability note or calendar.

**Step 4 — Review**
- Show the final listing preview.
- Allow edits.
- Submit as a pending demo listing.

Include an **“Generate with AI”** button in the basic-details/photo step. AI content must remain editable and must never publish automatically.

### 6.7 Owner dashboard `/dashboard`

Use dashboard tabs or a sidebar:
- Overview.
- My listings.
- Booking requests.
- Booking history.
- Featured listings (simulated).

Overview cards may show total demo listings, pending requests and completed demo rentals. Use figures derived from the database, not hard-coded counters.

### 6.8 Booking pages `/bookings` and `/bookings/:id`

Show tabs or filters for:
- Requests received.
- Requests sent.
- Upcoming/approved.
- Completed.
- Declined/cancelled.

A booking detail view should show item, renter, owner, requested dates, daily rate, rental total, deposit information and current status.

Owners can approve or decline pending requests. Renters can cancel a request while it is still pending. Use a confirmation dialog for status-changing actions.

### 6.9 Saved listings `/saved`

- Grid of favourited items.
- Remove from saved list.
- Link to item details.
- Helpful empty state.

### 6.10 Profile `/profile`

- User display name and email.
- Simulated phone/email verification indicators.
- Saved items shortcut.
- My listings and bookings shortcuts.
- Settings and sign-out.

Do not collect real identity documents for this project.

### 6.11 Admin/moderator page `/admin`

This is a small demonstration page, not a full enterprise admin system.

Include:
- Pending listing review queue.
- Listing preview and approve/hide actions.
- User list with demo status.
- Reports or flagged listing examples.

Only the seeded admin demo account should access this route. The Express API must also check the user's role; hiding a link in React is not sufficient access control.

---

## 7. Core user journeys

### 7.1 Renter journey

1. Open Rentora.
2. Browse categories or search.
3. Apply filters or use AI Rental Finder.
4. Open an item detail page.
5. Choose rental dates.
6. Review estimated price and deposit information.
7. Sign in if necessary.
8. Send a booking request.
9. See the request in “My bookings”.
10. Receive an in-app demo status update when the owner approves or declines.
11. Mark the demo rental complete through the appropriate owner/admin flow.
12. Leave a review for a completed booking.

### 7.2 Owner journey

1. Sign in.
2. Choose “List an item”.
3. Upload a photo and enter basic details.
4. Use AI Listing Generator to create a draft.
5. Review and edit AI-suggested information.
6. Add price, deposit, location and availability.
7. Preview and submit the listing.
8. Find the listing in “My listings”.
9. Receive a booking request.
10. Approve or decline the request.
11. Mark the rental complete after the return in the demo workflow.

### 7.3 Admin journey

1. Sign in using the admin demo account.
2. Open the moderation page.
3. Review pending listings.
4. Approve or hide a listing.
5. Review sample reported content.

---

## 8. AI integration

AI is an important part of Rentora, but it should assist the user rather than control the marketplace. The database remains the source of truth for real listings, price, dates and booking status.

### 8.1 AI Feature A — AI Listing Generator

**Purpose:** Help owners write a clear item listing without having to compose the full description themselves.

**User experience:**
1. The owner uploads a product photo.
2. The owner enters any extra facts they know, such as brand, model, condition and included accessories.
3. The owner clicks **Generate with AI**.
4. The website sends the image and owner-provided notes to the local Express API.
5. The backend sends the request to Gemini.
6. Gemini returns structured suggestions.
7. The form fills with editable draft values.
8. The owner corrects or confirms the details and submits the listing.

**Suggested output fields:**
- Suggested title.
- Suggested description.
- Suggested category from the four allowed categories.
- Suggested tags.
- Visible item attributes that appear reasonably clear in the photo.

**Important accuracy rules:**
- Do not let AI invent the exact make/model when it is not clearly visible or supplied by the owner.
- Do not infer that an item is fully functional or in excellent condition from a photo.
- Do not invent accessories, technical specifications, warranty, ownership or rental availability.
- Do not automatically set the rental price. The owner must enter and confirm the price.
- Label all generated text as a suggestion and allow the owner to edit or discard it.
- The owner must confirm the final listing before it is saved.

**Suggested API endpoint:** `POST /api/ai/listing-draft`

**Request:** one image plus optional user notes and allowed categories.  
**Response:** validated JSON with title, description, category suggestion and tags.

Use a schema validator such as Zod to reject malformed AI output before placing it into the form.

### 8.2 AI Feature B — AI Rental Finder

**Purpose:** Let a renter describe what they need in ordinary language instead of having to know exact filters.

**Example user request:**

> “I need a camera for a university photography assignment for two days, preferably under Rs. 2,500 per day.”

**User experience:**
1. The renter opens the AI Rental Finder from the home page or search page.
2. The renter enters a natural-language request.
3. The backend asks Gemini to convert the request into structured filters, such as category, maximum daily price, duration, preferred dates and keywords.
4. The backend validates the filters.
5. The backend searches the actual Rentora SQLite database.
6. Matching listings are ranked using category, budget, keywords, location and availability data.
7. The website shows real listing cards and a short explanation of why they match.
8. The renter can open a listing and send a normal booking request.

**Critical rule:** Gemini must not invent products or listing IDs. It interprets the request; the database supplies every displayed listing. If there are no matches, say so and suggest adjusting the budget, category or dates.

**Suggested API endpoints:**
- `POST /api/ai/rental-search` — interpret the text request and return matching database listings.
- `GET /api/items` — ordinary search/filter route used by both standard browsing and fallback behaviour.

AI recommendations do not reserve an item and do not guarantee availability. A booking request still follows the normal owner-approval process.

### 8.3 AI fallback and error states

The website must remain usable if the Gemini API is unavailable or the user has no internet connection:
- Listing creation still works with manually entered information.
- Ordinary search and filters still work using SQLite.
- AI buttons show a clear error and a “Try again” action.
- Never erase the user's entered form data when an AI request fails.
- Show a loading state while the AI request is in progress.
- Prevent repeated clicks while one request is running.

### 8.4 AI privacy and key handling

- Store the Gemini API key in the backend `.env` file.
- Add `.env` to `.gitignore`.
- Never place a secret API key in frontend variables, HTML, browser storage or source maps.
- Send only the selected image and information needed for the AI feature.
- Do not send identity documents, passwords or unrelated profile data to Gemini.
- Use a file-size limit and supported image formats.
- For a real public version, revisit privacy, retention, consent and provider terms. Those production obligations are outside this local prototype.

---

## 9. Database design

Use SQLite in a file such as `server/data/rentora.db`. Create tables through a schema/migration script and seed the four categories and sample accounts.

### 9.1 Main tables

| Table | Purpose | Example fields |
|---|---|---|
| `users` | Demo accounts and profiles | `id`, `name`, `email`, `password_hash`, `role`, `phone`, `email_verified_demo`, `phone_verified_demo`, `created_at` |
| `categories` | Four main categories | `id`, `name`, `slug`, `description`, `image_path` |
| `listings` | Items offered for rent | `id`, `owner_id`, `category_id`, `title`, `description`, `condition`, `daily_price`, `deposit_amount`, `location_text`, `status`, `featured_until`, `created_at` |
| `listing_images` | Photos attached to listings | `id`, `listing_id`, `file_path`, `is_cover`, `sort_order` |
| `favorites` | Saved listings | `id`, `user_id`, `listing_id`, `created_at` |
| `bookings` | Rental requests and booking details | `id`, `listing_id`, `renter_id`, `owner_id`, `start_date`, `end_date`, `rental_days`, `daily_price_snapshot`, `rental_total`, `deposit_snapshot`, `status`, `created_at` |
| `booking_status_history` | Record demo status changes | `id`, `booking_id`, `old_status`, `new_status`, `changed_by`, `created_at` |
| `reviews` | Feedback after completed rentals | `id`, `booking_id`, `reviewer_id`, `reviewee_id`, `rating`, `comment`, `created_at` |
| `notifications` | In-app demo notifications | `id`, `user_id`, `title`, `body`, `is_read`, `created_at` |
| `demo_promotions` | Simulated featured listing plans | `id`, `listing_id`, `plan_name`, `start_at`, `end_at`, `status` |

Keep the schema simple. Avoid creating a separate table for every small UI concept.

### 9.2 Relationships

- One user can own many listings.
- One category can contain many listings.
- One listing can have multiple images.
- One renter can send many bookings.
- One owner can receive many bookings.
- One booking belongs to one listing, one renter and one owner.
- A booking may have one review from each side after completion.
- Users and listings can have favourites through the `favorites` join table.

### 9.3 Booking status values

Use a fixed set of statuses:
- `pending`
- `approved`
- `declined`
- `cancelled`
- `completed`

Only allow valid transitions. For example, an owner can approve or decline a pending booking; a renter can cancel a pending request; a completed booking can be reviewed. Avoid allowing a user to arbitrarily change a booking status.

### 9.4 Booking calculations

- Keep all demo prices in PKR.
- Store a snapshot of the daily price and deposit on the booking so later listing edits do not change an existing booking record.
- Calculate rental days from the selected start and end dates using one consistent rule.
- Require the end date to be after the start date and at least one rental day.
- Rental total = daily rate × rental days.
- Display the deposit separately as a refundable/demo amount; do not treat it as a real charge.
- Check for overlapping approved bookings before approving a new one.

### 9.5 Database safety

- Use parameterised SQL queries.
- Add foreign-key relationships and enable foreign-key enforcement.
- Validate input on the server even when the React form validates it too.
- Use a transaction when a single action writes multiple related rows.
- Keep the database file and uploads in a clear local data folder.
- Include a seed/reset script so the demo can be restored to a known state.

---

## 10. Backend/API structure

The React website should not connect directly to SQLite or Gemini. It should call the local Express API.

### 10.1 Suggested API routes

**Authentication/demo session**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/register` (local demo only)

**Categories and listings**
- `GET /api/categories`
- `GET /api/items`
- `GET /api/items/:id`
- `POST /api/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id` (prefer archive/hide for the demo)
- `POST /api/items/:id/images`

**Favourites**
- `GET /api/favorites`
- `POST /api/favorites/:listingId`
- `DELETE /api/favorites/:listingId`

**Bookings**
- `POST /api/bookings`
- `GET /api/bookings/mine`
- `GET /api/bookings/received`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id/status`

**Reviews and notifications**
- `POST /api/reviews`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

**AI**
- `POST /api/ai/listing-draft`
- `POST /api/ai/rental-search`

**Admin**
- `GET /api/admin/listings/pending`
- `PATCH /api/admin/listings/:id/status`
- `GET /api/admin/users`

These are proposed route names, not a requirement to implement all of them on day one. Build only the routes needed for completed screens.

### 10.2 Access checks

The server must confirm that:
- A user is signed in before creating a listing, favourite, booking or review.
- Only the owner of a listing can edit or archive it.
- Only the listing owner can approve or decline a received booking.
- Only the renter who created a pending booking can cancel it.
- Only participants in a booking can view its private detail.
- Only the admin demo account can access moderation routes.

The React interface can hide actions that a user cannot perform, but the backend must enforce the same rule. Frontend-only access control is not sufficient.

### 10.3 Local demo authentication

For the local prototype, use a simple server-managed session or another small, documented approach. Hash demo passwords rather than saving plaintext passwords. Store session state in an HTTP-only cookie where feasible. Do not build password reset email delivery, social sign-in or multi-factor authentication for this project.

---

## 11. Access, permissions and roles

### 11.1 Guest visitor

Can:
- Open the home page.
- Browse categories and listings.
- Search and filter items.
- Open public item details.

Must sign in to:
- Save favourites.
- Send a booking request.
- List an item.
- Access dashboard pages.

### 11.2 Signed-in user

Can:
- Browse and save items.
- Create and manage their own listings.
- Send booking requests.
- View their own sent and received booking records.
- Edit their own basic profile.
- Review a completed booking where eligible.

A user can act as both renter and owner. No separate renter and owner accounts are required.

### 11.3 Admin demo account

Can:
- View the small moderation page.
- Approve or hide pending listings.
- View sample reports and demo users.

The admin account cannot access or change another user's password. Keep the admin tools limited to what is needed for the presentation.

### 11.4 Simulated verification

Show labels such as “Email verified (demo)” or “Phone verified (demo)” only when the seeded demo state says so. Do not ask for real identity documents or claim an actual verification process has occurred.

---

## 12. Simulated payments, featured listings and subscriptions

### 12.1 Payment demonstration

When a booking is approved, the renter may see a **Confirm demo payment** screen. This should update a demo booking/payment status only. Do not ask for bank or card information and do not connect a real gateway.

Display clear copy such as: “Demo payment only — no real money is charged.”

### 12.2 Security deposit demonstration

Show the deposit amount in the booking summary and mark it as “Refundable deposit (demo)”. The system does not collect, hold or refund real money.

### 12.3 Featured listings

Provide a small simulated promotion flow:
- Free listing: normal placement.
- Featured listing: a demo promotion that displays a visible “Featured” label and moves the listing into a featured section for a set demo period.
- Optional premium owner plan: display a plan comparison and a demo activation action.

Do not integrate recurring subscriptions or real billing. Mark paid/premium functions as simulated.

---

## 13. Project folder structure

A clean folder structure will make the website easier to maintain.

```text
rentora-website/
├── client/
│   ├── public/
│   │   └── images/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   └── router.tsx
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── common/
│   │   │   ├── listings/
│   │   │   └── forms/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── browsing/
│   │   │   ├── listing-management/
│   │   │   ├── bookings/
│   │   │   ├── favorites/
│   │   │   ├── ai-listing-generator/
│   │   │   └── ai-rental-finder/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── styles/
│   │   │   ├── tokens.css
│   │   │   └── global.css
│   │   └── types/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── bookings/
│   │   │   └── listings/
│   │   ├── middleware/
│   │   ├── database/
│   │   │   ├── connection.ts
│   │   │   ├── schema.sql
│   │   │   └── seed.ts
│   │   ├── validation/
│   │   └── app.ts
│   ├── data/
│   │   └── rentora.db
│   ├── uploads/
│   └── package.json
├── .gitignore
├── README.md
└── package.json
```

This is a proposed structure. It can start smaller and expand as features are completed. Do not create empty folders for every future feature before they are needed.

---

## 14. Development roadmap and completion criteria

Build in phases. Finish and test each phase before adding the next one.

### Phase 0 — Project setup and scope

**Tasks**
- Install a supported Node.js LTS version and VS Code.
- Create the project folders for `client` and `server`.
- Create the React + TypeScript + Vite frontend.
- Set up the Express + TypeScript backend.
- Add a `/api/health` route.
- Configure local frontend-to-backend requests.
- Add `.env` and `.gitignore` files.

**Done when**
- The React page opens in the browser.
- The Express API starts locally.
- The frontend can call the health endpoint.
- No secrets are placed in frontend source code.

### Phase 1 — Design foundation

**Tasks**
- Define CSS colour, typography, spacing, radius and shadow tokens.
- Add the Rentora logo/wordmark and category images.
- Build the header, footer and main content container.
- Create reusable buttons, inputs, cards, chips, badges, modals and toasts.
- Test desktop, tablet and mobile layouts.

**Done when**
- The home-page shell matches the Image 1 visual direction.
- Shared components look consistent.
- The layout does not overflow at the agreed breakpoints.
- Keyboard focus is visible on interactive controls.

### Phase 2 — Home page and browsing

**Tasks**
- Build the home page and category cards.
- Build search and category routes.
- Build filters and sorting.
- Create reusable listing cards.
- Add empty, loading and error states.
- Populate the interface with temporary sample data first.

**Done when**
- A user can browse all four categories.
- Search and filters change the displayed results.
- Listing cards open the correct detail page.

### Phase 3 — Database and backend

**Tasks**
- Create the SQLite database connection.
- Create schema and seed scripts.
- Add the users, categories, listings and listing-images tables.
- Add API routes for categories and listing search.
- Replace temporary frontend listing data with API data.
- Add clear API error handling.

**Done when**
- Listings load from SQLite.
- A new listing can be saved and remains after restarting the server.
- Seed/reset scripts restore a predictable demo dataset.

### Phase 4 — Accounts and access control

**Tasks**
- Add local demo login and logout.
- Seed renter, owner and admin demo accounts.
- Add profile page.
- Add protected React routes.
- Add server-side permission checks.
- Add clear simulated verification labels.

**Done when**
- Users can sign in and sign out.
- A normal user cannot access admin API routes.
- Users cannot edit other users' listings.
- Guests are prompted to sign in for restricted actions.

### Phase 5 — Listing management

**Tasks**
- Build the multi-step listing wizard.
- Add image upload and preview.
- Add file type and file size checks.
- Save item details and image file paths.
- Build owner listing dashboard.
- Add edit, archive and pending-review states.

**Done when**
- An owner can create a listing with a photo.
- The listing appears in the correct category after approval.
- The owner can edit their own listing but not another owner's.

### Phase 6 — Booking workflow

**Tasks**
- Build date selection and booking summary.
- Calculate rental days, rental total and displayed deposit.
- Create booking requests.
- Add owner approve/decline actions.
- Add renter cancellation for pending requests.
- Add booking history and notifications.
- Prevent overlapping approved bookings for the same listing.

**Done when**
- A renter can submit a request.
- The owner can approve or decline it.
- Both sides see the updated status.
- Invalid date ranges and overlapping approved bookings are rejected.
- No real payment details are collected.

### Phase 7 — AI Listing Generator

**Tasks**
- Configure the Gemini API key in the backend `.env` file.
- Add a backend AI service.
- Add the photo + owner-notes upload flow.
- Request structured listing-draft output.
- Validate AI output with Zod.
- Fill editable form fields with the suggestions.
- Add loading, timeout, rate-limit and error states.
- Keep a manual listing form as fallback.

**Done when**
- A user can upload a supported image and request a draft.
- The website receives a valid structured response.
- The user can edit or discard every suggestion.
- A failed AI request does not lose the entered listing details.
- The API key is not visible in browser developer tools or frontend bundles.

### Phase 8 — AI Rental Finder

**Tasks**
- Build an AI search panel or dedicated AI Finder page.
- Send the natural-language request to the backend.
- Ask Gemini to extract structured search criteria.
- Validate the extracted filters.
- Query SQLite for matching available listings.
- Rank and display the real matching records.
- Show a brief reason for each recommendation.
- Add no-match and AI-unavailable fallbacks.

**Done when**
- A natural-language request becomes valid search filters.
- Every recommendation corresponds to an actual database listing.
- The AI never fabricates a price, item or availability.
- Standard search still works when AI is unavailable.

### Phase 9 — Favourites, reviews and admin moderation

**Tasks**
- Add favourites.
- Add reviews for completed bookings.
- Add the small admin review queue.
- Add approve/hide actions and simple report examples.
- Add the simulated featured-listing flow.

**Done when**
- Favourites persist in SQLite.
- Only eligible completed bookings can be reviewed.
- Only admin can moderate listings.
- Featured listings are visibly labelled as demo promotions.

### Phase 10 — Final polish and presentation

**Tasks**
- Check all pages at desktop, tablet and mobile widths.
- Check spelling, prices, date formats and labels.
- Add loading, empty, success and error states.
- Check all navigation links and buttons.
- Test the project after restarting the backend and frontend.
- Reset to seeded demo data before the presentation.
- Prepare a short demo script.

**Done when**
- The full renter and owner journeys work from start to finish.
- Both AI features can be demonstrated or their fallback states are clear.
- The app can be launched locally using the README instructions.
- No public hosting or real payment integration is required.

---

## 15. Testing checklist

### 15.1 Functional tests

- Home page loads and all four categories open.
- Search returns matching listings.
- Filters and sorting work together.
- Listing detail page displays the correct images and information.
- Favourites add and remove correctly.
- User can create, edit and archive their own listing.
- User cannot edit another owner's listing.
- Booking date range validation works.
- Booking totals are calculated correctly.
- Owner can approve or decline a pending request.
- Renter can cancel a pending request.
- Overlapping approved bookings are prevented.
- Reviews are limited to eligible completed bookings.
- Admin access is rejected for ordinary accounts.
- AI listing draft fills editable fields.
- AI Rental Finder only displays actual database items.
- App remains usable when Gemini fails.

### 15.2 Responsive tests

Check at representative widths such as:
- 1440 px desktop.
- 1280 px laptop.
- 1024 px compact laptop/tablet landscape.
- 768 px tablet.
- 390 px mobile.
- 360 px narrow mobile.

Look for clipped cards, overflowing text, broken headers, awkward filter panels, dialogs wider than the screen and inaccessible mobile buttons.

### 15.3 Accessibility and usability

- Use semantic headings and buttons.
- Every input has a visible label.
- Form errors are associated with the relevant fields.
- All important actions work with a keyboard.
- Focus indicators are visible.
- Images have meaningful alt text where appropriate.
- Status is communicated with text/icon as well as colour.
- Buttons have readable labels; avoid icon-only controls without accessible names.

### 15.4 Demo reset and reliability

- Provide a database seed/reset script.
- Keep a backup of sample listing images.
- Ensure the backend returns understandable errors.
- Do not rely on a particular browser session containing old data.
- Keep demo accounts and password instructions in the README.
- Test a clean start before presenting.

---

## 16. Suggested presentation/demo flow

A five-to-seven-minute demonstration can show the whole idea without rushing:

1. **Home page:** show the Rentora branding, categories and sample listings.
2. **Browse:** search for a camera and apply a price/category filter.
3. **Item details:** show photos, daily rate, owner information and rental details.
4. **AI Rental Finder:** enter a natural-language request and show recommendations that come from the database.
5. **Owner listing:** sign in as the owner and create a sample listing.
6. **AI Listing Generator:** upload a photo, generate a draft, edit the generated text and save the listing.
7. **Booking:** sign in as a renter, request the item, then switch to the owner and approve it.
8. **Dashboard:** show the updated booking status and the owner's listing.
9. **Explain scope:** clarify that payments, subscriptions and verification are simulated because this is a university prototype.

Prepare at least one example listing and a known AI request before the presentation. AI output can vary, so test the exact demo prompt in advance and keep a manual fallback ready.

---

## 17. Website-only versus app-and-website strategy

This document describes a **standalone website implementation**. It uses a local Express API and SQLite file on the computer running the demo.

The separate mobile-app plan uses React Native and Expo. The two versions can share the Rentora brand, database concepts, categories, business rules and AI feature designs, but their frontend components are different.

If the university project eventually requires both mobile and website clients to use exactly the same listings and bookings, the cleanest next step is to make both clients call one shared backend API and one database. That is an optional later architecture change; do not build two clients and a shared multi-client architecture at the same time unless the project requirement actually demands both.

For now, complete one polished version first. The website is a good choice for a presentation because it is easy to open on a laptop, demonstrate to a lecturer and inspect with browser developer tools.

---

## 18. Final scope summary

### Must-have

- Responsive React website.
- Rentora branding and consistent design system.
- Four categories, search, filters and listing details.
- Demo accounts and user access rules.
- Listing creation and image upload.
- AI Listing Generator.
- AI Rental Finder.
- SQLite persistence through a local Express API.
- Booking requests and owner approval.
- Owner dashboard and small admin moderation page.

### Nice-to-have

- Favourites.
- Reviews and ratings.
- In-app demo notifications.
- Featured-listing promotion simulation.
- Small analytics cards on the owner dashboard.
- Subtle animations and polished empty states.

### Not required

- Public hosting or app-store deployment.
- Real payments, subscriptions or deposits.
- Real SMS/email/identity verification.
- Cloud database or production infrastructure.
- Real-world delivery, insurance or dispute handling.

**Final recommendation:** Build Rentora as a responsive React + TypeScript website with Vite, a small Express backend and a local SQLite database. Preserve the navy-and-teal design from Image 1. Make AI Listing Generator and AI Rental Finder the two standout features, while keeping the ordinary rental workflow fully functional without AI. This is enough to make a strong, polished university demonstration without turning the project into a commercial platform.

---

## Official documentation references

- [React — Quick Start](https://react.dev/learn)
- [React — TypeScript](https://react.dev/learn/typescript)
- [Vite — Getting Started](https://vite.dev/guide/)
- [Express — Installing and TypeScript guidance](https://expressjs.com/en/starter/installing/)
- [SQLite — About SQLite](https://www.sqlite.org/about.html)
- [Gemini API — Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
