# 🎨 NLQDB Supabase-Style UI

## Overview

The NLQDB frontend has been completely redesigned with a **Supabase-inspired white theme** - clean, minimal, professional, and breathable.

---

## ✨ Design System

### Color Palette
- **Primary Background**: `#ffffff` (Pure White)
- **Surface**: `#f8f9fa`, `#f1f3f5` (Soft Grays)
- **Text Primary**: `#1e1e1e` (Dark Gray)
- **Text Secondary**: `#6b7280` (Muted Gray)
- **Borders**: `#e5e7eb` (border-gray-200)
- **Accent**: `#000000` (Black for CTAs)

### Typography
- **Headings**: `text-2xl font-semibold text-gray-900`
- **Subheadings**: `text-lg font-medium text-gray-900`
- **Body**: `text-sm text-gray-700 leading-6`
- **Labels**: `text-sm font-medium text-gray-800`
- **Captions**: `text-xs text-gray-500`

---

## 📦 Components

### Layout Components

#### `Sidebar.jsx`
Fixed left sidebar (264px wide) with:
- Logo at top
- Navigation items with icons (lucide-react)
- Active state: `bg-gray-100 text-black font-medium`
- Hover state: `hover:bg-gray-50 hover:text-black`
- Logout button at bottom

#### `DashboardLayout.jsx`
Main layout wrapper:
- Renders Sidebar
- Main content area with `pl-64` offset
- White background throughout

### UI Components

#### `Button.jsx`
**Variants:**
- `primary`: Black background, white text
- `secondary`: White with gray border
- `destructive`: Red background
- `ghost`: Transparent with hover

**Sizes:** `sm`, `md`, `lg`

```jsx
<Button variant="primary" size="md">Click Me</Button>
```

#### `Card.jsx`
Clean card with subtle border:
- White background
- `border border-gray-200`
- `rounded-lg p-6`
- Optional title and description

```jsx
<Card title="User Stats" description="Last 30 days">
  {content}
</Card>
```

#### `Input.jsx`
Form input with focus states:
- `focus:ring-2 focus:ring-black focus:border-black`
- Optional label, error, and helper text
- Disabled state styling

```jsx
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={error}
  helperText="We'll never share your email"
/>
```

#### `Modal.jsx`
Centered modal with backdrop:
- Clean white surface
- Close button (X icon)
- Optional footer with action buttons

```jsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
  footer={
    <>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={onConfirm}>Confirm</Button>
    </>
  }
>
  {content}
</Modal>
```

#### `Table.jsx`
Data table with hover states:
- Header: `text-xs uppercase tracking-wide text-gray-500`
- Row hover: `hover:bg-gray-50`
- Configurable columns with custom renderers

```jsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> }
  ]}
  data={items}
  onRowClick={(row) => console.log(row)}
/>
```

---

## 📄 Pages

### Authentication

#### `Login.jsx`
- Centered card layout
- Logo at top
- Email + password inputs
- "Remember me" checkbox
- Link to signup
- Footer with copyright

#### `Signup.jsx`
- Similar layout to login
- Name, email, password, confirm password
- Terms of service checkbox
- Link to login

### Dashboard Pages

#### `Dashboard.jsx`
**Features:**
- Usage metric cards (3-column grid)
  - Queries this month
  - Tokens used
  - Team members
- Progress bars with color indicators (red/yellow/black)
- Alert banner when approaching limits
- Current plan card
- Quick actions card

#### `ChatNew.jsx`
**Features:**
- Collection selector in header
- Chat interface with message bubbles
  - User messages: `bg-black text-white`
  - AI messages: `bg-gray-100 text-gray-800`
- Input bar with rounded corners
- Send button with icon
- Empty state with example queries

#### `TablesNew.jsx`
**Features:**
- 4-column grid layout
- Collections sidebar (left)
- Schema card showing:
  - Document count
  - Field list with types
  - Indexes
- Sample data table
- Refresh button

#### `HistoryNew.jsx`
**Features:**
- Stats cards (Total/Successful/Failed queries)
- History table with:
  - Query text
  - Collection
  - Result count
  - Timestamp
  - Status badge

#### `ApiKeys.jsx`
**Features:**
- Create API key modal
- API keys table with:
  - Key name
  - Masked key preview
  - Status badge
  - Last used date
  - Rotate/Revoke actions
- One-time key display modal
- Copy to clipboard

#### `Billing.jsx`
**Features:**
- Current subscription card
- 3-column plan comparison
  - Free, Pro, Enterprise
  - Feature lists with checkmarks
  - CTA buttons
- FAQ section

#### `Organization.jsx`
**Features:**
- Organization details card
- Team members table
- Invite member modal
- Role management dropdown
- Remove member action

#### `Settings.jsx`
**Features:**
- Profile settings
- Notification preferences (checkboxes)
- Security (password change)
- Danger zone (delete account)

---

## 🎯 Navigation Structure

```
/login          → Login page
/signup         → Signup page
/dashboard      → Dashboard overview
/chat           → Query assistant
/tables         → Schema browser
/history        → Query history
/api-keys       → API key management
/billing        → Plans & billing
/organization   → Team management
/settings       → User settings
```

---

## 🔌 API Integration

### `apiService.js`
All API calls are centralized:

```javascript
import apiService from '../services/apiService';

// Organizations
await apiService.getCurrentOrganization();
await apiService.getUsageSummary();
await apiService.inviteTeamMember({ email, role });

// Billing
await apiService.getPlans();
await apiService.upgradePlan(planId);
await apiService.createPortalSession();

// API Keys
await apiService.createApiKey({ name, permissions });
await apiService.revokeApiKey(id);
await apiService.rotateApiKey(id);

// Queries
await apiService.translateQuery({ query, collection });
await apiService.getQueryHistory();

// Schema
await apiService.getCollections();
await apiService.getSchema(collection);
```

### Dynamic API URL
API URL is configured via environment variable:

```env
# frontend/.env
VITE_API_URL=/api
```

**In production, update to your domain:**
```env
VITE_API_URL=https://api.nlqdb.com
```

---

## 🚀 Running the UI

### Development
```bash
cd frontend
npm install
npm run dev
```

### Docker (with backend)
```bash
cd infra
docker-compose up --build
```

Frontend runs on: `http://localhost:3000`

---

## 🎨 Design Principles

1. **No Shadows** - Except for modals (subtle layering only)
2. **No Gradients** - Solid colors only
3. **Minimal Borders** - Light gray (`border-gray-200`)
4. **Breathable Spacing** - Large padding (`p-8`, `p-10`)
5. **Black Accents** - Primary actions use black, not blue
6. **Hover States** - Subtle gray backgrounds on hover
7. **Clean Typography** - Sans-serif, consistent sizing
8. **White Theme Only** - No dark mode

---

## 📱 Responsive Design

All pages are desktop-first but include mobile considerations:

- Sidebar is fixed on desktop
- Main content has left padding offset
- Cards use responsive grids
- Tables scroll horizontally on small screens

**Future Enhancement**: Add mobile hamburger menu for sidebar

---

## 🧩 Icons

Using **lucide-react** for all icons:

```javascript
import { Database, Users, Key, CreditCard } from 'lucide-react';

<Database className="w-5 h-5 text-gray-600" />
```

**Icon size convention:**
- Small: `w-4 h-4`
- Medium: `w-5 h-5`
- Large: `w-6 h-6`

---

## ✅ Checklist for New Pages

When creating new pages:

1. ✅ Wrap in `<DashboardLayout>`
2. ✅ Use `p-10` for main padding
3. ✅ Header with `text-2xl font-semibold text-gray-900`
4. ✅ Subtitle with `text-sm text-gray-500`
5. ✅ Use `Card` components for sections
6. ✅ Use `Button` with correct variants
7. ✅ Use `Table` for data lists
8. ✅ Add loading states (skeleton loaders)
9. ✅ Handle empty states with icons
10. ✅ Test responsive layout

---

## 🐛 Troubleshooting

### Icons not showing
```bash
npm install lucide-react
```

### API calls failing
Check `frontend/.env` has correct `VITE_API_URL`

### Styles not applying
Verify Tailwind config includes all component paths:

```javascript
// tailwind.config.js
content: [
  "./index.html",
  "./src/**/*.{js,jsx}",
],
```

---

## 📚 Examples

### Creating a New Page

```jsx
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';

const MyPage = () => {
  return (
    <DashboardLayout>
      <div className="p-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            My Page
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Page description
          </p>
        </div>

        <Card title="Section Title">
          <p className="text-sm text-gray-700">Content here</p>
          <Button variant="primary" className="mt-4">
            Action
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyPage;
```

---

## 🎯 Summary

The new UI provides:
- ✅ Clean Supabase-inspired design
- ✅ 8 complete dashboard pages
- ✅ 7 reusable components
- ✅ Consistent design system
- ✅ Professional look and feel
- ✅ Ready for production

**Result**: A modern, minimal SaaS dashboard that looks and feels like Supabase's white theme.
