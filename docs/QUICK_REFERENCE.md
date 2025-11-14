# 🎨 Supabase White Theme - Quick Reference

## 🎯 Essential Patterns

### Page Structure
```jsx
<DashboardLayout>
  <div className="p-10">
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-gray-900">Title</h1>
      <p className="text-sm text-gray-500 mt-1">Description</p>
    </div>
    <Card>{/* content */}</Card>
  </div>
</DashboardLayout>
```

### Colors (Tailwind Classes)
```
bg-white              → White background
bg-gray-50            → Light gray surface
bg-gray-100           → Hover/active states
text-gray-900         → Primary text
text-gray-500         → Secondary text
border-gray-200       → Borders
bg-black              → Primary buttons
```

### Typography Quick Reference
```jsx
<h1 className="text-2xl font-semibold text-gray-900">      {/* Page title */}
<h2 className="text-lg font-medium text-gray-900">         {/* Section title */}
<p className="text-sm text-gray-500">                      {/* Subtitle */}
<p className="text-sm text-gray-700 leading-6">            {/* Body */}
<label className="text-sm font-medium text-gray-800">     {/* Label */}
```

### Buttons
```jsx
<Button variant="primary">     {/* bg-black text-white */}
<Button variant="secondary">   {/* bg-white border */}
<Button variant="destructive"> {/* bg-red-600 text-white */}
<Button variant="ghost">       {/* transparent */}
```

### Status Badges
```jsx
<span className="text-xs font-medium px-2 py-1 rounded-md bg-green-50 text-green-700">
  Active
</span>
<span className="text-xs font-medium px-2 py-1 rounded-md bg-red-50 text-red-700">
  Failed
</span>
```

### Spacing Scale
```
p-10        → Page padding (40px)
mb-8        → Section spacing (32px)
p-6         → Card padding (24px)
gap-6       → Grid/flex gaps (24px)
gap-4       → Item gaps (16px)
space-y-4   → Vertical stack (16px)
```

### Interactive States
```jsx
hover:bg-gray-50
hover:text-black
focus:ring-2 focus:ring-black focus:border-black
disabled:opacity-50 disabled:cursor-not-allowed
```

### Grid Layouts
```jsx
{/* 3 columns */}
<div className="grid grid-cols-3 gap-6">

{/* Sidebar + Main */}
<div className="grid grid-cols-4 gap-6">
  <div>{/* sidebar */}</div>
  <div className="col-span-3">{/* main */}</div>
</div>
```

### Chat Bubbles
```jsx
{/* User */}
<div className="bg-black text-white rounded-lg px-4 py-3">

{/* AI */}
<div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3">
```

### Alert Boxes
```jsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm text-yellow-700">Warning message</p>
</div>
```

### Metric Cards
```jsx
<Card>
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm text-gray-500">Label</p>
      <p className="text-3xl font-semibold text-gray-900 mt-2">1,234</p>
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
  </div>
</Card>
```

## 🚫 Don'ts

❌ Neon colors or gradients  
❌ Heavy shadows  
❌ Cluttered layouts  
❌ Rounded-pill buttons (`rounded-full`)  
❌ Mixed design patterns  

## ✅ Do's

✅ White backgrounds (`bg-white`)  
✅ Subtle borders (`border-gray-200`)  
✅ Clean spacing (`p-10`, `gap-6`)  
✅ Black primary actions  
✅ Gray hover states  
✅ Consistent typography  

## 📱 Responsive

```jsx
{/* Mobile first, then tablet, then desktop */}
<div className="p-4 md:p-6 lg:p-10">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<div className="hidden lg:block">
```

## 🔗 Resources

- `/style-guide` - Visual component showcase
- `docs/DESIGN_SYSTEM.md` - Complete documentation
- `frontend/src/components/` - Component implementations

---

**Remember:** Clean, minimal, professional. That's the Supabase way. 🎨
