# SmartMenu CRM Development Plan
## Building the Best Restaurant CRM Through QR Code Entry Point

---

## 🎯 Vision Statement

Transform SmartMenu from a digital menu platform into a comprehensive Restaurant CRM that leverages QR code scanning as the perfect entry point. Even with anonymous customers, we'll build rich behavioral profiles, track visit patterns, spending habits, and order preferences to enable powerful loyalty programs and personalized marketing.

---

## 📊 Part 1: CRM Design Guidelines & Best Practices

### 1.1 Customer Card/Profile Design Principles

#### Core Philosophy: Anonymous-First CRM
- **No Personal Information Required**: Build rich profiles without names, emails, or phone numbers
- **Device/Browser Fingerprinting**: Use persistent identifiers (localStorage, cookies, device IDs)
- **Behavioral Tracking**: Focus on actions, not identity
- **Privacy-Compliant**: GDPR-friendly anonymous tracking

#### Customer Profile Structure
```
Customer Profile (Anonymous)
├── Identity
│   ├── Anonymous ID (UUID)
│   ├── Device Fingerprint
│   ├── Browser Fingerprint
│   └── First Seen Date
├── Visit History
│   ├── Total Visits
│   ├── First Visit Date
│   ├── Last Visit Date
│   ├── Average Days Between Visits
│   ├── Visit Frequency (Regular, Occasional, Rare)
│   └── Visit Times (Day of week, Time of day patterns)
├── Spending Behavior
│   ├── Total Lifetime Value (LTV)
│   ├── Average Order Value (AOV)
│   ├── Highest Order Value
│   ├── Spending Trend (Increasing, Stable, Decreasing)
│   └── Preferred Payment Methods
├── Order Patterns
│   ├── Favorite Categories
│   ├── Favorite Products (Top 10)
│   ├── Dietary Preferences (Vegetarian, Spicy, etc.)
│   ├── Price Sensitivity (Budget, Mid-range, Premium)
│   ├── Order Size Patterns
│   └── Seasonal Preferences
├── Table Preferences
│   ├── Preferred Areas/Sections
│   ├── Preferred Table Types
│   └── Group Size Patterns
├── Engagement Metrics
│   ├── Menu View Time
│   ├── Product View Counts
│   ├── Add-to-Cart Abandonment Rate
│   ├── Order Completion Rate
│   └── Return Rate
└── Loyalty Status
    ├── Current Tier
    ├── Points Balance
    ├── Rewards Earned
    └── Rewards Redeemed
```

### 1.2 CRM Dashboard Design Guidelines

#### Key Metrics Dashboard
1. **Customer Overview**
   - Total Unique Customers (anonymous)
   - New vs Returning Customers
   - Customer Retention Rate
   - Average Customer Lifetime Value

2. **Visit Analytics**
   - Daily/Weekly/Monthly Active Customers
   - Peak Visit Times
   - Visit Frequency Distribution
   - Customer Journey Funnel

3. **Spending Analytics**
   - Revenue by Customer Segment
   - Average Order Value Trends
   - High-Value Customer Identification
   - Spending Pattern Analysis

4. **Product Analytics**
   - Most Popular Items by Customer Segment
   - Cross-Sell Opportunities
   - Product Affinity Analysis
   - Seasonal Product Preferences

5. **Loyalty Analytics**
   - Program Participation Rate
   - Points Distribution
   - Reward Redemption Patterns
   - ROI of Loyalty Program

#### Customer List View
- **Sortable Columns**: Last Visit, Total Spent, Visit Count, LTV, Status
- **Filters**: 
  - Visit Frequency (Regular, Occasional, Rare, Lost)
  - Spending Tier (High, Medium, Low)
  - Last Visit Range
  - Preferred Category
  - Loyalty Tier
- **Quick Actions**: View Profile, Send Offer, Add Note, Tag Customer
- **Bulk Actions**: Tag Multiple, Send Campaign, Export Data

#### Individual Customer Card View
- **Header Section**: 
  - Anonymous ID
  - Customer Status Badge (Active, At-Risk, Lost)
  - Quick Stats (Visits, LTV, AOV)
  - Last Activity Timestamp
  
- **Timeline Tab**: Chronological view of all interactions
  - Visit events with order details
  - Menu views
  - Table assignments
  - Loyalty events
  
- **Insights Tab**: AI-generated insights
  - Visit patterns
  - Spending trends
  - Product preferences
  - Recommended actions
  
- **Loyalty Tab**: Points, rewards, tier status
  
- **Notes Tab**: Staff notes and tags

### 1.3 Segmentation Strategy

#### Automatic Segmentation
1. **By Visit Frequency**
   - Champions (Daily/Weekly)
   - Regulars (Bi-weekly/Monthly)
   - Occasional (Every 2-3 months)
   - Rare (Less than quarterly)
   - Lost (No visit in 6+ months)

2. **By Spending**
   - VIP (Top 10% by LTV)
   - High-Value (Top 25%)
   - Medium-Value (Middle 50%)
   - Low-Value (Bottom 25%)

3. **By Behavior**
   - Early Birds (Morning visits)
   - Lunch Regulars
   - Dinner Crowd
   - Late Night
   - Weekend Warriors
   - Weekday Workers

4. **By Preferences**
   - Vegetarian/Vegan
   - Spicy Lovers
   - Budget-Conscious
   - Premium Seekers
   - Family Groups
   - Solo Diners

5. **By Engagement**
   - High Engagement (Long menu views, multiple interactions)
   - Medium Engagement
   - Low Engagement (Quick visits, minimal interaction)

### 1.4 Loyalty Program Design

#### Tier System
- **Bronze**: 0-99 points (New customers)
- **Silver**: 100-499 points (Regular customers)
- **Gold**: 500-1499 points (Loyal customers)
- **Platinum**: 1500+ points (VIP customers)

#### Points Earning
- Base: 1 point per 1 currency unit spent
- Bonus multipliers for:
  - First visit bonus
  - Visit frequency milestones
  - Special occasions (birthdays if provided)
  - Referrals (if implemented)

#### Rewards Structure
- **Immediate Rewards**: Discounts, free items
- **Milestone Rewards**: Unlock at point thresholds
- **Tier Benefits**: Exclusive offers, priority service
- **Personalized Offers**: Based on order history

#### Offer Types
- **Win-Back**: For at-risk customers
- **Upsell**: For high-value customers
- **Frequency**: Encourage more visits
- **Product-Specific**: Based on favorites
- **Time-Based**: Off-peak hour promotions

---

## 🔲 Part 2: Enhanced QR Code System

### 2.1 Current State Analysis

**Current Implementation:**
- Single QR code per restaurant
- URL format: `/menu/{restaurant-slug}`
- No table identification
- No client persistence
- No visit tracking

**Limitations:**
- Cannot identify which table ordered
- Cannot track repeat visits
- Cannot personalize experience
- No way to link orders to physical locations

### 2.2 Proposed QR Code Architecture

#### 2.2.1 Table-Specific QR Codes

**URL Structure:**
```
/menu/{restaurant-slug}?table={table-id}&area={area-id}
```

**Benefits:**
- Identify order location
- Track table performance
- Enable table-specific service
- Optimize seating arrangements
- Link orders to physical space

**Implementation Approach:**
1. **Table Management System**
   - Create `tables` table in database
   - Each table has: id, restaurant_id, area_id, table_number, capacity, qr_code_url
   - Areas/Sections: Indoor, Outdoor, Bar, VIP, etc.

2. **QR Code Generation**
   - Generate unique QR code per table
   - Store table_id in URL parameters
   - Track which QR code was scanned

3. **QR Code Storage**
   - Store in `qr-codes/{restaurant-id}/tables/{table-id}.png`
   - Bulk generation for all tables
   - Printable format with table number

#### 2.2.2 Client Persistence & Tracking

**Client Identification Strategy:**

1. **Primary Method: Browser Fingerprinting**
   - Combine multiple signals:
     - User-Agent string
     - Screen resolution
     - Timezone
     - Language preferences
     - Installed fonts
     - Canvas fingerprint
   - Generate stable hash: `client_fingerprint_id`

2. **Secondary Method: LocalStorage Token**
   - Generate UUID on first visit: `client_token`
   - Store in localStorage (persists across sessions)
   - Fallback if fingerprinting fails
   - Can be cleared by user (privacy)

3. **Tertiary Method: Cookie**
   - Set long-lived cookie (1 year)
   - `smartmenu_client_id` cookie
   - Works across devices if user logs in (future)

**Client Profile Creation:**
```
On First Visit:
1. Generate client_fingerprint_id
2. Check localStorage for existing client_token
3. If new, create customer record with:
   - anonymous_id (UUID)
   - client_fingerprint_id
   - client_token (localStorage)
   - first_seen_at
   - first_table_id (if table-specific QR)
   - first_area_id
4. Store client_token in localStorage
5. Set cookie for cross-session tracking
```

**Visit Tracking:**
```
On Each Visit:
1. Extract client_token from localStorage
2. Extract table_id from URL params
3. Create visit record:
   - customer_id (anonymous)
   - restaurant_id
   - table_id
   - area_id
   - visit_timestamp
   - device_info
   - referrer (if any)
4. Update customer profile:
   - last_visit_at
   - total_visits++
   - preferred_table (if frequent)
   - preferred_area (if frequent)
```

#### 2.2.3 Enhanced QR Code Features

**QR Code Types:**
1. **General Menu QR** (Current)
   - `/menu/{slug}` - No tracking, general access
   - Use case: Social media, website, marketing

2. **Table-Specific QR** (New)
   - `/menu/{slug}?table={id}` - Table tracking
   - Use case: Physical table placement

3. **Area-Specific QR** (New)
   - `/menu/{slug}?area={id}` - Area tracking
   - Use case: Section entrances, bar area

4. **Campaign QR** (Future)
   - `/menu/{slug}?campaign={id}` - Marketing tracking
   - Use case: Promotional materials, events

**QR Code Metadata:**
- Table number display
- Area name
- Restaurant branding
- Instructions ("Scan to view menu")
- Optional: WiFi password, special offers

### 2.4 WhatsApp Ordering via Single Platform Number (Dine-In + Delivery/Flyer)

- **One inbound number**: All customers message a single platform WhatsApp Business number. The platform webhook receives the message (and phone), then routes the order to the correct restaurant/table/campaign.
- **Prefilled message with token**: Menu includes “Send via WhatsApp” that opens WA with a short token referencing the cart + context (restaurant, table/area or campaign). Keep the text compact; store order details server-side keyed by the token.
- **Consent on sharing phone**: In the WA flow, clearly state that the phone is visible to the platform; optionally ask if it may be shared with the restaurant. If declined, mask/redact before forwarding.
- **Routing logic**:
  - Dine-in: `/menu/{slug}?table={tableId}&area={areaId}` → order token → WA → webhook → dining room view shows it on that table, phone shared or masked per choice.
  - Delivery/Flyer: `/menu/{slug}?campaign={id}&type=delivery` → same WA flow; mark order as delivery and tag campaign. Address can be collected in WA chat or via short link if needed.
- **Attribution**: Table/area/campaign params stay attached to the order and customer profile; phone becomes a strong identifier when provided.
- **Fallbacks**: Provide a non-WhatsApp checkout path for customers without WA. Keep prefilled text short; never embed full order JSON.

---

## 🏢 Part 3: Dining Room View & Table Management

### 3.1 Floor Plan System

#### 3.1.1 Area/Section Management

**Concept:**
- Restaurant divided into logical areas
- Each area can have different characteristics
- Enables area-specific analytics

**Area Types:**
- Indoor Dining
- Outdoor Patio
- Bar Area
- Private Dining Room
- VIP Section
- Takeout Counter

**Area Properties:**
- Name
- Capacity (total seats)
- Table count
- Service type (Full service, Bar service, Counter)
- Operating hours (if different)
- Special features (Outdoor, Smoking, Private)

#### 3.1.2 Table Management

**Table Properties:**
- Table Number/Name (e.g., "Table 5", "Booth A12")
- Area/Section assignment
- Capacity (seats)
- Table Type (2-top, 4-top, 6-top, booth, bar stool)
- Status (Available, Occupied, Reserved, Out of Service)
- QR Code URL
- Position coordinates (for visual floor plan)

**Table States:**
- **Available**: Ready for customers
- **Occupied**: Currently has active order
- **Reserved**: Booked for future time
- **Cleaning**: Being cleaned, not available
- **Out of Service**: Maintenance, broken, etc.

### 3.2 Dining Room View Interface

#### 3.2.1 Visual Floor Plan

**Design Approach:**
- Interactive drag-and-drop floor plan
- Visual representation of restaurant layout
- Real-time status updates
- Color-coded table states

**Layout Options:**
1. **Grid-Based Editor**
   - Simple grid system
   - Drag tables onto grid
   - Good for rectangular layouts

2. **Free-Form Editor**
   - Draw custom shapes
   - More flexible for unique layouts
   - Better for complex restaurant designs

3. **Template-Based**
   - Pre-built templates (Common layouts)
   - Quick setup
   - Customizable after selection

**Visual Elements:**
- Tables as colored circles/rectangles
- Color coding:
  - Green: Available
  - Yellow: Occupied
  - Blue: Reserved
  - Red: Out of Service
  - Gray: Cleaning
- Area boundaries (visual separators)
- Table numbers/names displayed
- Capacity indicators

#### 3.2.2 Real-Time Table Status

**Live Updates:**
- When customer scans QR code → Table becomes "Occupied"
- When order is placed → Table shows order count
- When order is completed → Table returns to "Available"
- Manual status changes by staff

**Table Information Panel:**
- Click table to see:
  - Current order details
  - Customer info (if available)
  - Visit history for this table
  - Service notes
  - Quick actions (Mark available, Add note, etc.)

#### 3.2.3 Table Analytics

**Per-Table Metrics:**
- Total orders served
- Average order value
- Average table turn time
- Peak usage times
- Customer satisfaction (if feedback collected)
- Revenue generated

**Area Analytics:**
- Area popularity
- Revenue by area
- Average order value by area
- Peak times by area
- Table utilization rate

**Optimization Insights:**
- Underutilized tables
- Overbooked areas
- Optimal table arrangements
- Capacity planning recommendations

### 3.3 Integration with CRM

**Table-Customer Linking:**
- Track which customers prefer which tables
- Identify VIP table preferences
- Optimize seating for regular customers
- Personalize experience based on table history

**Service Optimization:**
- Assign staff based on table/area
- Track service times per area
- Identify bottlenecks
- Improve table turnover

---

## 🎯 Part 4: Complete CRM Feature Set

### 4.1 Customer Journey Tracking

#### 4.1.1 Visit Funnel
```
1. QR Code Scan
   ├── Track: Scan time, Device, Location (table/area)
   └── Action: Create/Update customer profile

2. Menu View
   ├── Track: Time on menu, Categories viewed, Products viewed
   └── Action: Build preference profile

3. Add to Cart
   ├── Track: Items added, Quantity, Time to add
   └── Action: Identify purchase intent

4. Order Placement
   ├── Track: Final order, Total value, Payment method
   └── Action: Complete transaction, Update LTV

5. Order Completion
   ├── Track: Fulfillment time, Customer satisfaction
   └── Action: Calculate visit metrics, Trigger loyalty points
```

#### 4.1.2 Behavioral Events
- **Menu Interactions**
  - Product views (which items viewed)
  - Category navigation
  - Search queries
  - Filter usage
  - Description expansions

- **Order Behavior**
  - Add to cart events
  - Remove from cart
  - Quantity changes
  - Cart abandonment
  - Order modifications

- **Engagement Metrics**
  - Session duration
  - Page views per visit
  - Return rate
  - Time between visits

### 4.2 Advanced Analytics

#### 4.2.1 Customer Lifetime Value (LTV) Calculation
```
LTV = Average Order Value × Purchase Frequency × Customer Lifespan

Components:
- AOV: Total revenue / Total orders
- Frequency: Orders per time period
- Lifespan: Time from first to last visit (or predicted)
```

#### 4.2.2 Predictive Analytics
- **Churn Prediction**: Identify at-risk customers
- **Next Visit Prediction**: When will they return?
- **Order Prediction**: What will they order?
- **Upsell Opportunities**: What to recommend?
- **Optimal Offer Timing**: When to send promotions?

#### 4.2.3 Cohort Analysis
- Track customer groups by:
  - Acquisition date (month/quarter)
  - First visit characteristics
  - Initial order value
  - Compare retention and LTV over time

### 4.3 Marketing Automation

#### 4.3.1 Automated Campaigns
1. **Welcome Series** (First-time visitors)
   - First visit bonus points
   - Special offer for return visit

2. **Win-Back Campaigns** (At-risk customers)
   - "We miss you" offers
   - Special discounts
   - Triggered after X days without visit

3. **Loyalty Milestones** (Engaged customers)
   - Points milestone rewards
   - Tier upgrade notifications
   - Birthday offers (if data available)

4. **Product Recommendations**
   - "Try something new" based on preferences
   - Seasonal item suggestions
   - Complementary items

5. **Frequency Campaigns**
   - Encourage more visits
   - Off-peak promotions
   - Weekend specials

#### 4.3.2 Personalization Engine
- **Dynamic Menu**: Show favorites first
- **Personalized Offers**: Based on order history
- **Smart Recommendations**: "Customers who ordered X also liked Y"
- **Time-Based**: Show lunch items at lunch time
- **Weather-Based**: Show hot drinks in cold weather

### 4.4 Reporting & Insights

#### 4.4.1 Executive Dashboard
- **Revenue Metrics**
  - Total revenue
  - Revenue by customer segment
  - Revenue trends
  - Forecasts

- **Customer Metrics**
  - Customer growth
  - Retention rate
  - Churn rate
  - Average customer value

- **Operational Metrics**
  - Table utilization
  - Average service time
  - Peak hours analysis
  - Area performance

#### 4.4.2 Detailed Reports
1. **Customer Report**
   - List all customers with key metrics
   - Segmentation breakdown
   - Top customers
   - At-risk customers

2. **Visit Report**
   - Visit patterns
   - Peak times
   - Table/area preferences
   - Visit frequency distribution

3. **Product Report**
   - Best sellers by segment
   - Product affinity
   - Cross-sell opportunities
   - Seasonal trends

4. **Loyalty Report**
   - Program participation
   - Points distribution
   - Reward redemption
   - ROI analysis

---

## 🗄️ Part 5: Database Schema Design

### 5.1 New Tables Required

#### 5.1.1 Core CRM Tables

**`customers` (Customer Profiles - Anonymous-First, Enrichable)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- anonymous_id (UUID, unique per restaurant)
- client_fingerprint_id (TEXT, hashed)
- client_token (TEXT, from localStorage)
- phone_number (TEXT, nullable) -- from WhatsApp or manual entry
- name (TEXT, nullable) -- optional, can be added by restaurant
- email (TEXT, nullable) -- optional, for future use
- address (TEXT, nullable) -- for delivery customers
- notes (TEXT, nullable) -- staff notes about customer
- tags (TEXT[], nullable) -- array of tags for segmentation
- first_seen_at (TIMESTAMP)
- last_seen_at (TIMESTAMP)
- total_visits (INTEGER)
- total_spent (DECIMAL)
- average_order_value (DECIMAL)
- lifetime_value (DECIMAL)
- preferred_category (TEXT)
- preferred_area_id (UUID, FK)
- preferred_table_id (UUID, FK)
- customer_segment (TEXT) -- auto-assigned
- loyalty_tier (TEXT)
- loyalty_points (INTEGER)
- status (TEXT) -- active, at-risk, lost
- phone_shared_with_restaurant (BOOLEAN, default false) -- WhatsApp consent
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`customer_visits` (Visit Tracking)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- table_id (UUID, FK, nullable)
- area_id (UUID, FK, nullable)
- visit_timestamp (TIMESTAMP)
- device_info (JSONB)
- referrer (TEXT, nullable)
- session_duration (INTEGER, seconds)
- menu_views (INTEGER)
- products_viewed (JSONB, array of product IDs)
- order_placed (BOOLEAN)
- order_id (UUID, FK, nullable)
- order_value (DECIMAL, nullable)
- created_at (TIMESTAMP)
```

**`customer_orders` (Order History)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- table_id (UUID, FK, nullable)
- area_id (UUID, FK, nullable)
- visit_id (UUID, FK)
- order_items (JSONB) -- array of {product_id, quantity, price}
- subtotal (DECIMAL)
- total (DECIMAL)
- payment_method (TEXT, nullable)
- order_status (TEXT) -- pending, completed, cancelled
- placed_at (TIMESTAMP)
- completed_at (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
```

**`customer_preferences` (Behavioral Data)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- preference_type (TEXT) -- category, product, dietary, price_range
- preference_value (TEXT)
- preference_strength (DECIMAL) -- 0.0 to 1.0, based on frequency
- first_observed_at (TIMESTAMP)
- last_observed_at (TIMESTAMP)
- observation_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`customer_events` (Event Tracking)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- event_type (TEXT) -- menu_view, product_view, add_to_cart, remove_from_cart, order_placed, etc.
- event_data (JSONB) -- flexible data structure
- table_id (UUID, FK, nullable)
- area_id (UUID, FK, nullable)
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### 5.1.2 Table Management Tables

**`areas` (Restaurant Sections)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- name (TEXT) -- "Indoor Dining", "Outdoor Patio", "Bar"
- description (TEXT, nullable)
- capacity (INTEGER) -- total seats
- table_count (INTEGER)
- service_type (TEXT) -- full_service, bar_service, counter
- operating_hours (JSONB, nullable) -- if different from restaurant
- floor_plan_coordinates (JSONB, nullable) -- for visual layout
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`tables` (Table Management)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- area_id (UUID, FK)
- table_number (TEXT) -- "5", "A12", "Booth 3"
- table_name (TEXT, nullable) -- optional friendly name
- capacity (INTEGER) -- number of seats
- table_type (TEXT) -- 2_top, 4_top, 6_top, booth, bar_stool, large_party
- status (TEXT) -- available, occupied, reserved, cleaning, out_of_service
- qr_code_url (TEXT, nullable)
- qr_code_path (TEXT, nullable) -- storage path
- floor_plan_x (DECIMAL, nullable) -- position for visual layout
- floor_plan_y (DECIMAL, nullable)
- floor_plan_rotation (DECIMAL, nullable) -- rotation angle
- notes (TEXT, nullable)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`table_reservations` (Future: Reservation System)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- table_id (UUID, FK)
- customer_id (UUID, FK, nullable) -- if known customer
- reservation_name (TEXT)
- reservation_time (TIMESTAMP)
- party_size (INTEGER)
- special_requests (TEXT, nullable)
- status (TEXT) -- confirmed, cancelled, completed
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 5.1.3 Loyalty & Marketing Tables

**`loyalty_points` (Points Transactions)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- points (INTEGER) -- positive for earned, negative for redeemed
- transaction_type (TEXT) -- earned, redeemed, expired, adjusted
- order_id (UUID, FK, nullable) -- if from order
- description (TEXT)
- expires_at (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
```

**`loyalty_rewards` (Reward Definitions)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- reward_name (TEXT)
- reward_description (TEXT)
- points_required (INTEGER)
- reward_type (TEXT) -- discount, free_item, tier_upgrade
- reward_value (JSONB) -- flexible structure
- is_active (BOOLEAN)
- valid_from (TIMESTAMP)
- valid_until (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
```

**`customer_rewards` (Reward Redemptions)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- reward_id (UUID, FK)
- points_used (INTEGER)
- status (TEXT) -- pending, redeemed, expired, cancelled
- redeemed_at (TIMESTAMP, nullable)
- expires_at (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
```

**`marketing_campaigns` (Campaign Management)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- campaign_name (TEXT)
- campaign_type (TEXT) -- email, sms, push, in_app
- target_segment (TEXT) -- segment criteria
- offer_details (JSONB)
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- status (TEXT) -- draft, active, paused, completed
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`customer_campaigns` (Campaign Tracking)**
```sql
- id (UUID, PK)
- campaign_id (UUID, FK)
- customer_id (UUID, FK)
- status (TEXT) -- sent, delivered, opened, clicked, converted
- sent_at (TIMESTAMP)
- delivered_at (TIMESTAMP, nullable)
- opened_at (TIMESTAMP, nullable)
- clicked_at (TIMESTAMP, nullable)
- converted_at (TIMESTAMP, nullable) -- if led to order
- created_at (TIMESTAMP)
```

#### 5.1.4 Analytics & Insights Tables

**`customer_segments` (Auto-Segmentation)**
```sql
- id (UUID, PK)
- restaurant_id (UUID, FK)
- segment_name (TEXT) -- "VIP", "Regular", "At-Risk"
- segment_type (TEXT) -- frequency, spending, behavior, custom
- criteria (JSONB) -- segmentation rules
- customer_count (INTEGER) -- cached count
- last_calculated_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**`customer_insights` (AI-Generated Insights)**
```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- restaurant_id (UUID, FK)
- insight_type (TEXT) -- visit_pattern, spending_trend, preference_change, churn_risk
- insight_title (TEXT)
- insight_description (TEXT)
- insight_data (JSONB) -- supporting data
- confidence_score (DECIMAL) -- 0.0 to 1.0
- generated_at (TIMESTAMP)
- is_read (BOOLEAN)
- created_at (TIMESTAMP)
```

---

## 🎨 Part 6: User Interface Design

### 6.1 CRM Dashboard Layout

#### 6.1.1 Main Dashboard
**Layout:**
```
┌─────────────────────────────────────────────────┐
│  CRM Dashboard                    [Date Range] │
├─────────────────────────────────────────────────┤
│  [Key Metrics Cards]                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │Total │ │Active │ │Avg   │ │Reten │          │
│  │Cust. │ │Today  │ │LTV   │ │Rate  │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
├─────────────────────────────────────────────────┤
│  [Charts Section]                               │
│  ┌──────────────────┐ ┌──────────────────┐   │
│  │ Visit Trends     │ │ Revenue Trends    │   │
│  │ (Line Chart)     │ │ (Bar Chart)       │   │
│  └──────────────────┘ └──────────────────┘   │
│  ┌──────────────────┐ ┌──────────────────┐   │
│  │ Customer Segments │ │ Top Products      │   │
│  │ (Pie Chart)      │ │ (Bar Chart)       │   │
│  └──────────────────┘ └──────────────────┘   │
├─────────────────────────────────────────────────┤
│  [Recent Activity]                              │
│  - New customers today                          │
│  - High-value orders                            │
│  - At-risk customers                            │
└─────────────────────────────────────────────────┘
```

#### 6.1.2 Customer List View
**Features:**
- Infinite scroll or pagination
- Advanced filtering
- Bulk actions
- Export functionality
- Quick customer card preview
- Search by anonymous ID, visit patterns, preferences

#### 6.1.3 Individual Customer Card
**Tabs:**
1. **Overview**: Key metrics, status, quick actions
2. **Timeline**: Chronological activity feed
3. **Orders**: Complete order history
4. **Preferences**: Favorite items, categories, patterns
5. **Loyalty**: Points, rewards, tier status
6. **Insights**: AI-generated insights and recommendations
7. **Notes**: Staff notes and tags

### 6.2 Dining Room View Interface

#### 6.2.1 Floor Plan Editor (Admin)
- Drag-and-drop table placement
- Area boundary drawing
- Table property editing
- QR code generation per table
- Save/load layouts
- Print-friendly view

#### 6.2.2 Live Floor Plan View (Staff)
- Real-time table status
- Color-coded states
- Click table for details
- Quick status updates
- Order information
- Customer information (if available)

#### 6.2.3 Table Analytics View
- Heat map of table usage
- Revenue by table
- Turn time analysis
- Peak time visualization
- Optimization suggestions

---

## 🚀 Part 7: Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Basic customer tracking and table management

**Deliverables:**
1. Database schema for customers, visits, tables, areas
2. Client fingerprinting and persistence
3. Table management system
4. Table-specific QR code generation
5. Basic visit tracking

**Success Metrics:**
- Can track anonymous customers
- Can generate table-specific QR codes
- Can view basic customer profiles

### Phase 2: CRM Core (Weeks 3-4)
**Goal**: Customer profiles and basic analytics

**Deliverables:**
1. Customer profile pages
2. Visit history tracking
3. Order history
4. Basic segmentation
5. Customer list with filters

**Success Metrics:**
- Can view complete customer profiles
- Can segment customers
- Can see visit patterns

### Phase 3: Dining Room View (Weeks 5-6)
**Goal**: Visual floor plan and table management

**Deliverables:**
1. Floor plan editor
2. Live table status view
3. Table analytics
4. Area management
5. QR code bulk generation

**Success Metrics:**
- Can create and edit floor plans
- Can see real-time table status
- Can generate QR codes for all tables

### Phase 4: Advanced Analytics (Weeks 7-8)
**Goal**: Insights and predictions

**Deliverables:**
1. LTV calculations
2. Churn prediction
3. Customer insights
4. Advanced reporting
5. Cohort analysis

**Success Metrics:**
- Can identify high-value customers
- Can predict churn
- Can generate actionable insights

### Phase 5: Loyalty Program (Weeks 9-10)
**Goal**: Points, rewards, and engagement

**Deliverables:**
1. Points system
2. Reward definitions
3. Tier system
4. Redemption flow
5. Loyalty analytics

**Success Metrics:**
- Customers can earn and redeem points
- Can track loyalty program ROI
- Can see tier distribution

### Phase 6: Marketing Automation (Weeks 11-12)
**Goal**: Automated campaigns and personalization

**Deliverables:**
1. Campaign builder
2. Automated triggers
3. Personalization engine
4. A/B testing framework
5. Campaign analytics

**Success Metrics:**
- Can create and run campaigns
- Can personalize customer experience
- Can measure campaign effectiveness

---

## 💡 Part 8: Key Design Decisions & Recommendations

### 8.1 Privacy & Compliance

**Recommendations:**
- **Anonymous-First**: Never require personal information
- **Opt-In for Enhanced Features**: Offer optional email/phone for better experience
- **Clear Privacy Policy**: Explain what data is collected and why
- **WhatsApp Consent**: If using a single platform WA number, disclose phone visibility to platform and let customers choose whether to share it with the restaurant; honor masking when declined
- **Data Retention Policies**: Auto-delete old data after X months
- **GDPR Compliance**: Right to deletion, data export
- **Transparency**: Show customers what data is collected (optional feature)

### 8.2 Client Persistence Strategy

**Recommended Approach:**
1. **Primary**: localStorage token (most reliable)
2. **Secondary**: Browser fingerprinting (for cross-session)
3. **Tertiary**: Cookie (for cross-device if user opts in)
4. **Fallback**: Session-based tracking (if all fail)

**Why This Works:**
- localStorage persists across browser restarts
- Fingerprinting helps identify returning customers
- Multiple methods increase reliability
- Privacy-friendly (no personal data)

### 8.3 Table QR Code Strategy

**Recommendations:**
1. **Generate on Setup**: Bulk generate all table QR codes when floor plan is created
2. **Printable Format**: Include table number, area name, instructions
3. **Regeneration**: Allow regeneration if URL structure changes
4. **Analytics**: Track which QR codes are scanned most
5. **Backup**: General restaurant QR code as fallback

### 8.4 Dining Room View Design

**Recommendations:**
1. **Start Simple**: Grid-based editor for MVP
2. **Progressive Enhancement**: Add free-form editor later
3. **Mobile-Friendly**: Staff should be able to view on tablets
4. **Real-Time Updates**: Use WebSockets or polling for live status
5. **Print Option**: Printable floor plan for reference

### 8.5 Segmentation Strategy

**Recommendations:**
1. **Auto-Segment on Visit**: Update segment after each visit
2. **Multiple Segments**: Customers can be in multiple segments
3. **Dynamic Segments**: Recalculate periodically
4. **Manual Override**: Allow staff to manually assign segments
5. **Segment Analytics**: Track performance of each segment

### 8.6 Loyalty Program Design

**Recommendations:**
1. **Start Simple**: Points-based system
2. **Clear Value**: Make rewards attractive but sustainable
3. **Tier Benefits**: Clear benefits for each tier
4. **Gamification**: Milestones, badges, achievements
5. **Personalization**: Tailor rewards to customer preferences

---

## 🎯 Part 9: Success Metrics & KPIs

### 9.1 Customer Metrics
- **Customer Acquisition**: New customers per period
- **Retention Rate**: % of customers who return
- **Churn Rate**: % of customers who stop visiting
- **Customer Lifetime Value**: Average LTV
- **Average Order Value**: AOV trends
- **Visit Frequency**: Average visits per customer

### 9.2 Engagement Metrics
- **Menu Engagement**: Time on menu, products viewed
- **Order Completion Rate**: % of carts that become orders
- **Return Rate**: % of customers who return within X days
- **Loyalty Participation**: % of customers in loyalty program
- **Campaign Engagement**: Open rates, click rates, conversion

### 9.3 Revenue Metrics
- **Revenue Growth**: Month-over-month growth
- **Revenue by Segment**: Which segments drive most revenue
- **Table Revenue**: Revenue per table
- **Area Revenue**: Revenue by area
- **Upsell Rate**: Additional items per order

### 9.4 Operational Metrics
- **Table Utilization**: % of time tables are occupied
- **Average Turn Time**: Time from order to completion
- **Peak Hours**: Busiest times
- **Area Performance**: Which areas perform best

---

## 🔮 Part 10: Future Enhancements

### 10.1 Advanced Features (Post-MVP)
1. **Customer Recognition**: Optional name/email collection
2. **Reservation System**: Table booking integration
3. **Waitlist Management**: Queue management for busy times
4. **Staff Assignment**: Link staff to tables/areas
5. **Feedback Collection**: Post-visit surveys
6. **Social Integration**: Share orders, reviews
7. **Referral Program**: Customer referral tracking
8. **Multi-Location**: Support for restaurant chains
9. **POS Integration**: Sync with existing POS systems
10. **Predictive Ordering**: AI predicts what customer will order

### 10.2 AI/ML Enhancements
1. **Recommendation Engine**: Personalized product suggestions
2. **Demand Forecasting**: Predict busy times
3. **Price Optimization**: Dynamic pricing suggestions
4. **Menu Optimization**: Suggest menu changes based on data
5. **Customer Clustering**: Advanced segmentation using ML

---

## 📋 Summary & Next Steps

### What We're Building
A comprehensive Restaurant CRM that:
- Tracks anonymous customers through QR code scanning
- Manages tables and dining room layout
- Provides rich customer insights and analytics
- Enables loyalty programs and marketing automation
- Optimizes restaurant operations

### Key Innovations
1. **Anonymous-First CRM**: Rich profiles without personal data
2. **Table-Specific Tracking**: Know where orders come from
3. **Visual Floor Plan**: Manage restaurant layout visually
4. **Behavioral Analytics**: Understand customer patterns
5. **Automated Marketing**: Personalized campaigns

### Recommended Starting Point
**Phase 1: Foundation**
- Start with customer tracking and table management
- Get basic CRM working
- Then add analytics, loyalty, and automation

### Questions to Consider
1. **Privacy Level**: How anonymous should we be? Allow optional email?
2. **Loyalty Complexity**: Start simple or build comprehensive system?
3. **Floor Plan Complexity**: Simple grid or advanced editor?
4. **Integration Priority**: POS integration now or later?
5. **Marketing Features**: Which campaigns are highest priority?

---

**This plan provides a comprehensive roadmap for building a world-class Restaurant CRM. The QR code entry point is indeed the perfect foundation for tracking customer behavior and building rich profiles, even without personal information.**

