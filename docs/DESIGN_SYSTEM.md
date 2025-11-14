# NLQDB Design System - Supabase White Theme

## Overview
This design system follows the **Supabase Dashboard white theme** aesthetic - clean, minimal, professional, and highly readable. Every component and page maintains consistency with this design language.

---

## 🎨 Color Palette

### Primary Colors
- **Background**: `#ffffff` (white)
- **Surface**: `#f8f9fa`, `#f1f3f5` (soft greys)
- **Primary Text**: `#1e1e1e` (dark grey)
- **Secondary Text**: `#6b7280` (muted grey)
- **Borders**: `#e5e7eb` (border-gray-200)

### Accent Colors
- **Primary Action**: `#000000` (black)
- **Success**: `#10b981` (green-600)
- **Warning**: `#f59e0b` (yellow-600)
- **Error**: `#dc2626` (red-600)

### Interactive States
- **Hover**: `#f9fafb` (gray-50)
- **Active**: `#f3f4f6` (gray-100)
- **Focus Ring**: `2px solid black`

---

## 📐 Layout System

### Page Structure
```jsx
<DashboardLayout>
  <div className="p-10">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-gray-900">Page Title</h1>
      <p className="text-sm text-gray-500 mt-1">Page description</p>
    </div>

    {/* Content */}
    <Card>
      {/* Card content */}
    </Card>
  </div>
</DashboardLayout>
```

### Spacing Scale
- **Page padding**: `p-10` (40px)
- **Section spacing**: `mb-8` (32px)
- **Card spacing**: `p-6` (24px)
- **Item gaps**: `gap-6` (24px), `gap-4` (16px), `gap-3` (12px)

### Grid Layouts
```jsx
{/* 3 columns for metrics */}
<div className="grid grid-cols-3 gap-6">

{/* 4 columns with sidebar */}
<div className="grid grid-cols-4 gap-6">
  <div>Sidebar</div>
  <div className="col-span-3">Main content</div>
</div>
```

---

## 🔤 Typography

### Hierarchy
```jsx
{/* Page Title */}
<h1 className="text-2xl font-semibold text-gray-900">

{/* Section Title */}
<h2 className="text-lg font-medium text-gray-900">

{/* Subtitle/Description */}
<p className="text-sm text-gray-500">

{/* Body Text */}
<p className="text-sm text-gray-700 leading-6">

{/* Labels */}
<label className="text-sm font-medium text-gray-800">

{/* Button Text */}
<span className="text-sm font-medium">
```

### Font Properties
- **Font Family**: System fonts (San Francisco, Segoe UI, Roboto)
- **Font Smoothing**: `-webkit-font-smoothing: antialiased`
- **Line Height**: `leading-6` for body text

---

## 🧱 Components

### Button
```jsx
// Primary Button (Black)
<Button variant="primary">
  Primary Action
</Button>

// Secondary Button (White with border)
<Button variant="secondary">
  Secondary Action
</Button>

// Destructive Button (Red)
<Button variant="destructive">
  Delete
</Button>

// Ghost Button (Transparent)
<Button variant="ghost">
  Cancel
</Button>
```

**Styles:**
- Border radius: `rounded-md`
- Padding: `px-4 py-2` (medium), `px-3 py-1.5` (small)
- No shadows unless absolutely needed

### Card
```jsx
<Card title="Card Title" description="Optional description">
  {/* Card content */}
</Card>
```

**Styles:**
- Background: `bg-white`
- Border: `border border-gray-200`
- Padding: `p-6`
- Border radius: `rounded-lg`

### Input
```jsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  helperText="We'll never share your email"
/>
```

**Styles:**
- Background: `bg-white`
- Border: `border border-gray-300`
- Focus: `focus:ring-2 focus:ring-black focus:border-black`
- Padding: `px-3 py-2`

### Table
```jsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ]}
  data={rows}
  onRowClick={handleClick}
/>
```

**Styles:**
- Header: `bg-gray-50` with `text-xs uppercase text-gray-500`
- Row hover: `hover:bg-gray-50`
- Borders: `border-gray-200`

### Modal
```jsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  footer={
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>Save</Button>
    </>
  }
>
  {/* Modal content */}
</Modal>
```

**Styles:**
- Background: `bg-white`
- Border: `border border-gray-200`
- Backdrop: `bg-black bg-opacity-30`

---

## 🎛️ Navigation

### Sidebar
```jsx
// Active state
bg-gray-100 text-black font-medium

// Default state
text-gray-600 hover:bg-gray-50 hover:text-black

// Item structure
<Link className="flex items-center gap-3 px-4 py-2 text-sm rounded-md">
  <Icon className="w-5 h-5" />
  <span>Label</span>
</Link>
```

**Features:**
- Fixed left sidebar (w-64)
- Mobile responsive with hamburger menu
- Smooth transitions

---

## 💬 Chat Interface

### Message Bubbles
```jsx
{/* User message */}
<div className="bg-black text-white rounded-lg px-4 py-3">
  User message text
</div>

{/* AI response */}
<div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3">
  AI response text
</div>
```

### Input Bar
```jsx
<textarea
  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
  placeholder="Ask a question..."
/>
```

---

## 📊 Dashboard Widgets

### Metric Cards
```jsx
<Card>
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm text-gray-500">Metric Label</p>
      <p className="text-3xl font-semibold text-gray-900 mt-2">
        1,234
      </p>
      <p className="text-sm text-gray-500 mt-1">
        of 10,000
      </p>
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
  </div>
</Card>
```

### Progress Bars
```jsx
<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
  <div 
    className="h-full bg-black transition-all"
    style={{ width: '75%' }}
  />
</div>
```

---

## 🎭 Status Badges

```jsx
{/* Success */}
<span className="text-xs font-medium px-2 py-1 rounded-md bg-green-50 text-green-700">
  Active
</span>

{/* Warning */}
<span className="text-xs font-medium px-2 py-1 rounded-md bg-yellow-50 text-yellow-700">
  Pending
</span>

{/* Error */}
<span className="text-xs font-medium px-2 py-1 rounded-md bg-red-50 text-red-700">
  Failed
</span>

{/* Neutral */}
<span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-700">
  Inactive
</span>
```

---

## 🚨 Alert Boxes

```jsx
{/* Info */}
<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
  <p className="text-sm text-gray-700">Information message</p>
</div>

{/* Success */}
<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
  <p className="text-sm text-green-700">Success message</p>
</div>

{/* Warning */}
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm text-yellow-700">Warning message</p>
</div>

{/* Error */}
<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
  <p className="text-sm text-red-700">Error message</p>
</div>
```

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: `< 768px` (default)
- **Tablet**: `md:` (768px+)
- **Desktop**: `lg:` (1024px+)

### Mobile Considerations
```jsx
{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

{/* Responsive padding */}
<div className="p-4 md:p-6 lg:p-10">

{/* Hide on mobile */}
<div className="hidden lg:block">

{/* Mobile sidebar */}
<div className="lg:translate-x-0 transform -translate-x-full">
```

---

## ✅ Best Practices

### DO
✅ Use clean white backgrounds
✅ Apply subtle gray surfaces for depth
✅ Keep borders minimal (border-gray-200)
✅ Use big, breathable spacing
✅ Maintain consistent typography
✅ Use hover states for interactive elements
✅ Keep focus rings visible (black ring)

### DON'T
❌ Add neon colors or gradients
❌ Use heavy shadows
❌ Create cluttered layouts
❌ Use rounded-pill buttons
❌ Mix different design patterns
❌ Forget accessibility (contrast, focus states)

---

## 🎨 Example Pages

### Login Page
- Centered layout
- Logo at top
- Clean form card
- Minimal footer

### Dashboard
- Metric cards in 3-column grid
- Progress bars for usage
- Alert boxes for warnings
- Clean data visualization

### Chat Interface
- Empty state with suggestions
- User messages: black bubbles
- AI messages: gray bubbles
- Rounded input bar at bottom

### Table Browser
- Sidebar with collection list
- Schema information card
- Sample data table
- Refresh button

---

## 🔧 Development Tips

1. **Always start with the page structure:**
   ```jsx
   <DashboardLayout>
     <div className="p-10">
       {/* Header */}
       {/* Content */}
     </div>
   </DashboardLayout>
   ```

2. **Use the Card component for sections:**
   ```jsx
   <Card title="Section Title">
     {/* Content */}
   </Card>
   ```

3. **Maintain spacing consistency:**
   - Use `gap-6` for grids
   - Use `space-y-4` for vertical stacks
   - Use `mb-8` for major sections

4. **Keep interactive states:**
   ```jsx
   hover:bg-gray-50
   focus:ring-2 focus:ring-black
   active:bg-gray-100
   disabled:opacity-50
   ```

5. **Use semantic HTML:**
   - `<button>` for actions
   - `<Link>` for navigation
   - Proper heading hierarchy
   - ARIA labels when needed

---

## 📦 Component Library

All components are located in `/frontend/src/components/`:
- `Button.jsx` - All button variants
- `Card.jsx` - Container component
- `Input.jsx` - Form input with label
- `Table.jsx` - Data table component
- `Modal.jsx` - Dialog component
- `Sidebar.jsx` - Navigation sidebar
- `DashboardLayout.jsx` - Page wrapper

---

## 🎯 Supabase Inspiration

This design system is inspired by Supabase's dashboard because:
- Clean and professional appearance
- Excellent readability and contrast
- Minimal cognitive load
- Fast and lightweight
- Developer-friendly aesthetic
- Modern without being trendy

---

## 📝 Notes

- This design system prioritizes **clarity over cleverness**
- Every design decision serves **usability and accessibility**
- The white theme creates a **calm, focused environment**
- Consistency across pages builds **user confidence**

---

**Last Updated:** November 14, 2025
**Version:** 1.0.0
