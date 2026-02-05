# GearNinja Project Guide

## Overview

**GearNinja** is a Danish non-profit online marketplace for musicians. Users can buy/sell musical instruments, rent rehearsal spaces, and engage in community forums. All text is in Danish.

**Production URL:** https://www.gearninja.dk

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, React Router DOM, Framer Motion
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Edge Functions:** Deno/TypeScript

## Database Rules (CRITICAL)

- **READS:** You may use MCP tools to read schema, tables, and rows at any time.
- **WRITES/UPDATES:** YOU MUST ALWAYS ASK FOR EXPLICIT PERMISSION before executing any SQL, creating tables, or modifying data.
- **SCHEMA:** Always use MCP `list_tables` or similar before suggesting changes.

---

## Project Structure

```
src/
├── pages/                    # Route pages
│   ├── auth/                 # Login, Register, Password reset
│   ├── LandingPage.tsx       # Homepage
│   ├── [Category]Page.tsx    # GuitarPage, BasPage, TrommerPage, etc.
│   ├── Create[Category]Page.tsx  # Product/room creation forms
│   ├── ProductDetailPage.tsx # Single product view + sales workflow
│   ├── RoomDetailPage.tsx    # Rehearsal room view
│   ├── ChatPage.tsx          # Direct messaging
│   ├── ForumPage.tsx         # Forum listing
│   ├── ForumThreadPage.tsx   # Thread view with replies
│   ├── MineAnnoncerPage.tsx  # User's listings
│   ├── MineKoebPage.tsx      # User's purchases
│   ├── MineSalgPage.tsx      # User's sales
│   ├── ProfilePage.tsx       # User dashboard
│   ├── UserProfilePage.tsx   # Public profile
│   ├── FavoritterPage.tsx    # Saved favorites
│   └── SearchResultsPage.tsx # Search results
├── components/
│   ├── Layout.tsx            # Main layout (header, nav, footer)
│   ├── NotificationBell.tsx  # Real-time notifications
│   ├── FavoriteButton.tsx    # Like button with cooldown
│   ├── ProductFilters.tsx    # Filter controls
│   ├── ui/Button.tsx         # Reusable button
│   ├── chat/ChatsSidebar.tsx # Chat sidebar
│   ├── reviews/              # ReviewModal, ReviewsList
│   └── sales/BuyerSelectionModal.tsx
├── lib/
│   ├── supabase.ts           # Supabase client init
│   ├── env.ts                # Environment helpers
│   └── utils.ts              # Utilities (image compression, etc.)
└── App.tsx                   # Main router config

supabase/functions/           # Edge Functions
├── register/                 # User registration
├── create-product/           # Product creation
├── create-room/              # Room creation
├── create-review/            # Review creation
├── create-forum-thread/      # Forum thread creation
├── create-forum-post/        # Forum reply
├── send-chat-message/        # Chat with rate limiting
├── send-message-email/       # Email notifications
├── handle-product-lifecycle/ # Product status management
└── delete-user/              # Account deletion
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **profiles** | User profiles (synced with auth.users) | id, username, avatar_url |
| **products** | Instrument/equipment listings | user_id, category, type, brand, model, price, location, condition, image_urls, sold, is_soft_deleted |
| **rehearsal_rooms** | Rehearsal space listings | user_id, name, address, type (Musikstudie/Øvelokale/Andet), price, payment_type, rented_out |
| **sales** | Purchase transactions | product_id, seller_id, buyer_id, status (pending/completed/cancelled) |
| **reviews** | User ratings (0-5) tied to sales | sale_id, reviewer_id, reviewee_id, rating, content |
| **chats** | Conversations between users | buyer_id, seller_id, item_id, item_type |
| **messages** | Chat messages | chat_id, sender_id, content, read |
| **favorites** | Liked products/rooms | user_id, product_id OR room_id |
| **notifications** | User notifications | user_id, type, item_id, read |
| **forum_categories** | Forum categories (10 preset) | name, slug, sort_order |
| **forum_threads** | Forum topics | category_id, user_id, title, content |
| **forum_posts** | Forum replies | thread_id, user_id, content |
| **forum_favorites** | Saved threads | user_id, thread_id |

### RLS (Row Level Security)

All tables have RLS enabled:
- Users can view all products/rooms/forum content
- Users can only CRUD their own products/rooms/threads/posts
- Sales, reviews, messages visible only to participants
- Soft-deleted products visible to buyer/seller for transaction history

---

## Product Categories

Products use these `category` values:
- `guitar` - Guitars
- `bas` - Bass guitars
- `trommer` - Drums
- `keyboards` - Keyboards/pianos
- `blaes` - Wind instruments (blæseinstrumenter)
- `strygere` - String instruments
- `studieudstyr` - Studio equipment

Each category has specific `type` values (e.g., guitar types: "El-guitar", "Akustisk guitar", "Klassisk guitar", etc.)

---

## Key Routes

| Route | Page | Notes |
|-------|------|-------|
| `/` | Landing | Featured products, rooms carousel |
| `/guitar`, `/bas`, `/trommer`, etc. | Category browse | Filters, sorting, pagination |
| `/product/:id` | Product detail | Sales workflow, reviews |
| `/room/:id` | Room detail | Contact seller |
| `/create/[category]` | Create listing | Image upload, form validation |
| `/chat/:chatId` | Messaging | Real-time via Supabase Realtime |
| `/forum` | Forum main | Categories, threads |
| `/forum/thread/:id` | Thread view | Replies, edit own posts |
| `/mine-annoncer` | My listings | Manage, mark sold, delete |
| `/mine-koeb` | My purchases | Transaction history |
| `/mine-salg` | My sales | Leave reviews |
| `/profil` | Profile dashboard | Stats, quick links |
| `/user/:userId` | Public profile | User info, ratings |

---

## Sales Workflow

1. Buyer clicks "Køb" on ProductDetailPage
2. `sales` record created with status=pending
3. Seller sees pending sale in MineAnnoncerPage
4. Seller confirms/declines via BuyerSelectionModal
5. On confirm: status=completed, product marked sold, soft-deleted
6. Both parties can leave reviews via MineSalgPage/MineKoebPage

---

## Edge Functions Pattern

All functions follow this structure:
```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: get user from JWT
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Validation & business logic
  // Return JSON response
});
```

CORS allowed origins: `https://www.gearninja.dk`, `http://localhost:5173`

---

## Styling Conventions

- **Colors:** Dark background, neon accents (neon-blue: #00f3ff, neon-purple: #bc13fe, neon-green: #0aff0a)
- **Animations:** Framer Motion for transitions
- **Responsive:** Desktop nav at min-width: 1400px, mobile burger menu below
- **Icons:** Lucide React

---

## Important Patterns

1. **Image handling:** Compress before upload, store in Supabase Storage buckets
2. **Soft delete:** Products marked `is_soft_deleted=true` remain visible to buyer/seller
3. **Rate limiting:** Chat messages limited to 10/minute per user
4. **Notifications:** Created via database triggers, emails via queue
5. **Favorites cooldown:** 2-second cooldown on like/unlike to prevent spam

---

## Environment Variables

**Client-side (VITE_ prefix):**
- `VITE_SUPABASE_URL`
- `VITE_PUSHIABLE_API_KEY` (publishable anon key)

**Server-side:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
