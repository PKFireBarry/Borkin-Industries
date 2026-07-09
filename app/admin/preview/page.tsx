"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Smartphone, Monitor, Tablet, RefreshCw, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'client' | 'contractor'
type Viewport = 'desktop' | 'tablet' | 'mobile'

const routes = {
    client: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Find Contractors', path: '/dashboard/contractors' },
        { label: 'Bookings', path: '/dashboard/bookings' },
        { label: 'Payments', path: '/dashboard/payments' },
        { label: 'My Pets', path: '/dashboard/pets' },
        { label: 'Profile', path: '/dashboard/profile' },
        { label: 'Messages', path: '/dashboard/messages' },
    ],
    contractor: [
        { label: 'Dashboard', path: '/dashboard/contractor' },
        { label: 'Gigs', path: '/dashboard/contractor/gigs' },
        { label: 'Availability', path: '/dashboard/contractor/availability' },
        { label: 'Payments', path: '/dashboard/contractor/payments' },
        { label: 'Profile', path: '/dashboard/contractor/profile' },
        { label: 'Reviews', path: '/dashboard/contractor/reviews' },
        { label: 'Messages', path: '/dashboard/messages' },
    ]
}

export default function PreviewPortal() {
    const [role, setRole] = useState<Role>('client')
    const [currentPath, setCurrentPath] = useState(routes.client[0].path)
    const [viewport, setViewport] = useState<Viewport>('desktop')
    const [key, setKey] = useState(0) // Used to force refresh iframe

    const handleRoleChange = (newRole: Role) => {
        setRole(newRole)
        setCurrentPath(routes[newRole][0].path)
    }

    const handleRefresh = () => {
        setKey(prev => prev + 1)
    }

    const getViewportStyle = () => {
        switch (viewport) {
            case 'mobile':
                return { width: '375px', height: '667px' }
            case 'tablet':
                return { width: '768px', height: '1024px' }
            case 'desktop':
            default:
                return { width: '100%', height: '100%' }
        }
    }

    const iframeSrc = `${currentPath}${currentPath.includes('?') ? '&' : '?'}preview=admin`

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
            {/* Control Bar */}
            <Card className="p-4 flex flex-wrap items-center gap-4 bg-background border-b rounded-none shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">View as:</span>
                    <Select value={role} onValueChange={(v) => handleRoleChange(v as Role)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="h-6 w-px bg-border mx-2" />

                <div className="flex items-center gap-2">
                    <Button
                        variant={viewport === 'desktop' ? 'default' : 'outline'}
                        className="h-9 w-9 p-0"
                        onClick={() => setViewport('desktop')}
                        title="Desktop View"
                    >
                        <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewport === 'tablet' ? 'default' : 'outline'}
                        className="h-9 w-9 p-0"
                        onClick={() => setViewport('tablet')}
                        title="Tablet View"
                    >
                        <Tablet className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewport === 'mobile' ? 'default' : 'outline'}
                        className="h-9 w-9 p-0"
                        onClick={() => setViewport('mobile')}
                        title="Mobile View"
                    >
                        <Smartphone className="h-4 w-4" />
                    </Button>
                </div>

                <div className="h-6 w-px bg-border mx-2" />

                <div className="flex-1 flex items-center gap-2 truncate text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                    <span className="font-mono">{iframeSrc}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 w-9 p-0" onClick={handleRefresh} title="Refresh Preview">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 w-9 p-0"
                        onClick={() => window.open(iframeSrc, '_blank')}
                        title="Open in New Tab"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                </div>
            </Card>

            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Sidebar Routes */}
                <Card className="w-64 flex-shrink-0 overflow-y-auto">
                    <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">
                            {role} Routes
                        </h3>
                        <div className="space-y-1">
                            {routes[role].map((route) => (
                                <button
                                    key={route.path}
                                    onClick={() => setCurrentPath(route.path)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                        currentPath === route.path
                                            ? "bg-primary text-primary-foreground font-medium"
                                            : "hover:bg-muted text-foreground"
                                    )}
                                >
                                    {route.label}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-4 border-t">
                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Instructions</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Interact with the page on the right just like a real user.
                                Role restrictions are bypassed in this preview mode.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Preview Area */}
                <div className="flex-1 bg-slate-100 rounded-lg border overflow-hidden relative flex items-center justify-center">
                    <div
                        style={getViewportStyle()}
                        className={cn(
                            "bg-white transition-all duration-300 shadow-xl overflow-hidden",
                            viewport !== 'desktop' && "border-8 border-slate-800 rounded-[2rem]"
                        )}
                    >
                        <iframe
                            key={key}
                            src={iframeSrc}
                            className="w-full h-full border-0 bg-white"
                            title="Preview"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
