# Client-Side Styling & Layout Conventions Guide

## Overview
This document outlines the complete styling and layout conventions used throughout the Boorkin Industries pet care platform. Use this as a reference to maintain consistency when developing the contractor-side features.

---

## 🎨 Color Scheme & Design System

### Primary Color Palette
```css
/* CSS Custom Properties (from globals.css) */
--background: oklch(1 0 0);
--foreground: oklch(0.129 0.042 264.695);
--primary: oklch(0.208 0.042 265.755);
--primary-foreground: oklch(0.984 0.003 247.858);
--secondary: oklch(0.968 0.007 247.896);
--muted: oklch(0.968 0.007 247.896);
--muted-foreground: oklch(0.554 0.046 257.417);
--border: oklch(0.929 0.013 255.508);
--radius: 0.625rem;
```

### Tailwind Color Usage
```tsx
// Background gradients (most common)
className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50"
className="bg-gradient-to-br from-slate-50 to-slate-100"
className="bg-gradient-to-br from-slate-50 via-white to-blue-50"

// Text colors
className="text-slate-900"      // Primary headings
className="text-slate-700"      // Secondary headings
className="text-slate-600"      // Body text
className="text-slate-500"      // Muted text
className="text-slate-400"      // Placeholder text

// Status colors
className="bg-green-100 text-green-800"    // Success
className="bg-blue-100 text-blue-800"      // Info/Approved
className="bg-yellow-100 text-yellow-800"  // Warning/Pending
className="bg-red-100 text-red-800"        // Error/Cancelled
```

### Typography System
```tsx
// Font setup (from layout.tsx)
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

// Heading styles
className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight"
className="text-3xl font-bold text-slate-900 tracking-tight"
className="text-2xl font-bold text-slate-900"

// Gradient text effect
className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent"

// Body text
className="text-lg text-slate-600 leading-relaxed"
className="text-slate-600 font-medium"
className="text-sm text-slate-500"
```

---

## 🏗️ Layout Patterns

### Page Structure Template
```tsx
export default function PageName() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header/Hero Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Page Title
                </h1>
                <p className="text-slate-600 mt-1">
                  Page description
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Content goes here */}
      </div>
    </div>
  )
}
```

### Container Patterns
```tsx
// Standard containers
className="container mx-auto px-4 py-8"
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
className="max-w-4xl mx-auto px-4 py-8"
className="max-w-3xl mx-auto"

// Content width variations
className="max-w-7xl"  // Full width dashboards
className="max-w-4xl"  // Profile pages, forms
className="max-w-3xl"  // Hero sections, centered content
className="max-w-2xl"  // Search bars, narrow content
```

### Grid Systems
```tsx
// Dashboard stats grid
className="grid grid-cols-1 md:grid-cols-4 gap-6"

// Content grid (2 columns)
className="grid grid-cols-1 lg:grid-cols-2 gap-8"

// Card grid (3 columns)
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Form grid
className="grid grid-cols-1 md:grid-cols-2 gap-6"
```

---

## 🎯 Component Styling Conventions

### Card Components
```tsx
// Basic card
<Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-xl font-semibold text-slate-900">
      Card Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Modern card with rounded corners
<Card className="rounded-xl border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-200">

// Stats card
<Card className="bg-white rounded-xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-200">
```

### Button Variants
```tsx
// Primary button
<Button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">

// Outline button
<Button variant="outline" className="border-2 hover:bg-slate-50 transition-all duration-200">

// Modern rounded button
<Button className="rounded-full px-6 py-2 border-2 hover:bg-slate-50 transition-all duration-200">

// Icon button
<Button variant="outline" className="h-8 w-8 p-0">
  <Icon className="h-4 w-4" />
</Button>
```

### Form Elements
```tsx
// Standard input
<Input className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0" />

// Large search input
<Input 
  className="pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-0 shadow-sm"
  placeholder="Search..."
/>

// Label
<Label className="block text-sm font-semibold text-slate-700 mb-2">
  Field Label
</Label>

// Textarea
<Textarea className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 min-h-[100px]" />

// Select
<Select>
  <SelectTrigger className="rounded-xl border-2 border-slate-200">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## 📱 Responsive Design Patterns

### Navigation Layout
```tsx
// Desktop sidebar (from dashboard/layout.tsx)
<aside className={cn(
  "hidden md:flex flex-col border-r border-border bg-background py-8 px-2 transition-all duration-200 relative",
  isSidebarCollapsed ? 'w-20' : 'w-56'
)}>

// Mobile drawer
<Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
  <DialogContent className="p-0 w-64 h-screen max-w-full left-0 top-0 translate-x-0 translate-y-0 fixed rounded-none flex flex-col bg-background z-50 shadow-lg border-r overflow-y-auto">

// Mobile hamburger
<div className="md:hidden fixed top-4 left-4 z-40">
  <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
    <Menu className="h-6 w-6" />
  </Button>
</div>
```

### Responsive Utilities
```tsx
// Hide/show patterns
className="hidden md:flex"        // Desktop only
className="md:hidden"             // Mobile only
className="hidden sm:flex"        // Tablet and up
className="block md:hidden"       // Mobile only

// Responsive spacing
className="px-4 sm:px-6 lg:px-8"  // Responsive padding
className="py-6 md:py-12"         // Responsive vertical padding
className="gap-4 md:gap-6 lg:gap-8" // Responsive gaps

// Responsive text
className="text-4xl md:text-5xl"  // Responsive font size
className="flex flex-col sm:flex-row" // Responsive flex direction
```

---

## 🎭 Visual Effects & Animations

### Loading States
```tsx
// Page loading skeleton
<div className="animate-pulse space-y-8">
  <div className="h-8 bg-slate-200 rounded w-1/3"></div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
    ))}
  </div>
</div>

// Spinner
<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>

// Loading text
<p className="text-slate-600 font-medium">Loading your dashboard...</p>
```

### Hover Effects
```tsx
// Card hover
className="hover:shadow-lg transition-all duration-200"

// Button hover
className="hover:bg-primary/90 transition-colors"

// Interactive element hover
className="hover:bg-muted-foreground/10 transition-colors"

// Scale hover
className="hover:scale-105 transition-transform duration-200"
```

### Backdrop Effects
```tsx
// Glass morphism
className="bg-white/80 backdrop-blur-sm"

// Sticky header with backdrop
className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10"
```

---

## 🏷️ Badge & Status System

### Status Badges
```tsx
// Status color function
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'approved': return 'bg-blue-100 text-blue-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-slate-100 text-slate-800'
  }
}

// Usage
<Badge className={getStatusColor(booking.status)}>
  {booking.status}
</Badge>
```

### Animal Type Badges
```tsx
const animalTypes = [
  { value: 'dog', label: 'Dog', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'cat', label: 'Cat', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'fish', label: 'Fish', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'bird', label: 'Bird', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'rabbit', label: 'Rabbit', color: 'bg-pink-100 text-pink-700 border-pink-200' },
]
```

---

## 🖼️ Avatar & Image Patterns

### Avatar Sizes & Styling
```tsx
// Small avatar (navigation)
<Avatar className="h-8 w-8">
  <AvatarImage src={user.imageUrl} />
  <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
</Avatar>

// Medium avatar (cards)
<Avatar className="h-16 w-16 border-2 border-white shadow-md">
  <AvatarImage src={profile.avatar} />
  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
    {profile.name?.[0]}
  </AvatarFallback>
</Avatar>

// Large avatar (profile page)
<Avatar className="h-32 w-32 border-4 border-white shadow-xl ring-4 ring-slate-100 dark:ring-slate-700">
  <AvatarImage src={profile.avatar} className="object-cover" />
  <AvatarFallback className="text-3xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
    {profile.name?.[0]}
  </AvatarFallback>
</Avatar>
```

---

## 📋 Content Organization

### Section Headers
```tsx
// Page header pattern
<div className="space-y-2">
  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
    Page Title
  </h1>
  <p className="text-slate-600 dark:text-slate-400 text-lg">
    Descriptive subtitle explaining the page purpose
  </p>
</div>

// Section divider
<Separator className="my-8" />

// Card section header
<div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-semibold text-slate-900">Section Title</h2>
  <Button variant="outline" size="sm">Action</Button>
</div>
```

### Spacing Conventions
```tsx
// Section spacing
className="space-y-8"    // Large sections
className="space-y-6"    // Medium sections
className="space-y-4"    // Small sections
className="space-y-2"    // Tight spacing

// Flex/Grid gaps
className="gap-8"        // Large gaps
className="gap-6"        // Medium gaps
className="gap-4"        // Standard gaps
className="gap-2"        // Small gaps

// Padding patterns
className="p-8"          // Large padding (hero sections)
className="p-6"          // Standard padding (cards)
className="p-4"          // Small padding
className="py-8 px-4"    // Vertical/horizontal specific
```

---

## 🎪 Interactive Elements

### Search & Filter Patterns
```tsx
// Hero search bar
<div className="relative max-w-2xl mx-auto mb-6">
  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
  <Input
    placeholder="Search by name, location, or services..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-0 shadow-sm"
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery('')}
      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  )}
</div>

// Filter toggle button
<Button
  variant="outline"
  onClick={() => setShowFilters(!showFilters)}
  className="rounded-full px-6 py-2 border-2 hover:bg-slate-50 transition-all duration-200"
>
  <Filter className="w-4 h-4 mr-2" />
  Filters
  {hasActiveFilters && (
    <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs">
      {activeFilterCount}
    </Badge>
  )}
</Button>
```

### Modal & Dialog Patterns
```tsx
// Standard dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold">Dialog Title</DialogTitle>
      <DialogDescription className="text-slate-600">
        Dialog description
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>

// Mobile drawer (full height)
<Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
  <DialogContent 
    className="p-0 w-64 h-screen max-w-full left-0 top-0 translate-x-0 translate-y-0 fixed rounded-none flex flex-col bg-background z-50 shadow-lg border-r overflow-y-auto"
    style={{ transform: 'none' }}
  >
    {/* Drawer content */}
  </DialogContent>
</Dialog>
```

---

## 🌙 Dark Mode Support

### Dark Mode Classes
```tsx
// Background gradients
className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"

// Text colors
className="text-slate-900 dark:text-slate-100"
className="text-slate-600 dark:text-slate-400"

// Card backgrounds
className="bg-white/80 dark:bg-slate-800/80"

// Borders
className="border-slate-200 dark:border-slate-700"
```

---

## 🚀 Performance & Accessibility

### Loading Patterns
```tsx
// Conditional rendering with loading
if (!isLoaded || !isAuthorized) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-600 font-medium">Loading message...</p>
      </div>
    </div>
  )
}
```

### Accessibility Patterns
```tsx
// Proper ARIA labels
<Button variant="outline" aria-label="Open navigation" onClick={() => setIsDrawerOpen(true)}>
  <Menu className="h-6 w-6" />
</Button>

// Screen reader text
<span className={cn(isSidebarCollapsed ? 'sr-only' : 'block')}>{item.label}</span>

// Semantic navigation
<aside aria-label="Dashboard navigation">
  <ul className="space-y-2">
    {navItems.map((item) => (
      <li key={item.href}>
        <Link href={item.href} tabIndex={0}>
          {/* Navigation content */}
        </Link>
      </li>
    ))}
  </ul>
</aside>
```

---

## 📝 Code Organization

### Import Patterns
```tsx
// Standard imports order
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Icons } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { TypeDefinitions } from '@/types/...'
```

### Component Structure
```tsx
export default function ComponentName() {
  // 1. Hooks
  const { user } = useUser()
  const [state, setState] = useState()
  
  // 2. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // 3. Event handlers
  const handleAction = () => {
    // Handler logic
  }
  
  // 4. Early returns
  if (loading) return <LoadingComponent />
  
  // 5. Render
  return (
    <div className="layout-classes">
      {/* Component JSX */}
    </div>
  )
}
```

---

## 🎯 Key Takeaways for Contractor-Side Development

1. **Consistency**: Always use the same color palette, spacing, and component patterns
2. **Responsive**: Mobile-first approach with proper breakpoints
3. **Accessibility**: Include proper ARIA labels and semantic HTML
4. **Performance**: Implement proper loading states and skeleton screens
5. **Modern**: Use backdrop-blur, rounded corners, and smooth transitions
6. **Typography**: Maintain the Geist font family and text hierarchy
7. **Navigation**: Follow the same sidebar/drawer pattern for consistency

This guide should be referenced for every contractor-side component to ensure visual and functional consistency across the entire platform. 