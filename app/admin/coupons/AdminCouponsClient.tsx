"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Plus, Edit, Trash2, Copy, Calendar, Users, DollarSign, Percent } from 'lucide-react'
import { Coupon, CreateCouponData } from '@/types/coupon'
import { getApprovedContractors } from '@/lib/firebase/contractors'
import { Contractor } from '@/types/contractor'
import { toast } from 'sonner'

export default function AdminCouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [usageHistory, setUsageHistory] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])



  const loadData = async () => {
    try {
      const [couponsResponse, contractorsData] = await Promise.all([
        fetch('/api/admin/coupons'),
        getApprovedContractors()
      ])
      
      if (!couponsResponse.ok) {
        throw new Error('Failed to fetch coupons')
      }
      
      const couponsData = await couponsResponse.json()
      setCoupons(couponsData)
      setContractors(contractorsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCoupon = async (data: CreateCouponData) => {
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create coupon')
      }
      
      toast.success('Coupon created successfully')
      setIsCreateDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error creating coupon:', error)
      toast.error('Failed to create coupon')
    }
  }

  const handleUpdateCoupon = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update coupon')
      }
      
      toast.success('Coupon updated successfully')
      setEditingCoupon(null)
      loadData()
    } catch (error) {
      console.error('Error updating coupon:', error)
      toast.error('Failed to update coupon')
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return
    
    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete coupon')
      }
      
      toast.success('Coupon deleted successfully')
      loadData()
    } catch (error) {
      console.error('Error deleting coupon:', error)
      toast.error('Failed to delete coupon')
    }
  }

  const handleViewUsage = async (couponId: string) => {
    try {
      const response = await fetch(`/api/admin/coupons?couponId=${couponId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load usage history')
      }
      
      const history = await response.json()
      setUsageHistory(history)
    } catch (error) {
      console.error('Error loading usage history:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load usage history')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatCurrency = (amount: number) => {
    // Safety check for invalid data
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn('Invalid amount for currency formatting:', amount)
      return '$0.00'
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">All Coupons</h2>
          <p className="text-muted-foreground">
            {coupons.length} coupon{coupons.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
            </DialogHeader>
            <CreateCouponForm 
              contractors={contractors}
              onSubmit={handleCreateCoupon}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {coupons.map((coupon) => (
          <CouponCard
            key={coupon.id}
            coupon={coupon}
            contractors={contractors}
            onEdit={setEditingCoupon}
            onDelete={handleDeleteCoupon}
            onViewUsage={handleViewUsage}
            onCopy={copyToClipboard}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        ))}
      </div>

      {editingCoupon && (
        <Dialog open={!!editingCoupon} onOpenChange={() => setEditingCoupon(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Coupon</DialogTitle>
            </DialogHeader>
            <EditCouponForm
              coupon={editingCoupon}
              contractors={contractors}
              onSubmit={(data) => handleUpdateCoupon(editingCoupon.id, data)}
              onCancel={() => setEditingCoupon(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {usageHistory.length > 0 && (
        <Dialog open={usageHistory.length > 0} onOpenChange={() => setUsageHistory([])}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Usage History</DialogTitle>
            </DialogHeader>
            <UsageHistoryTable 
              usageHistory={usageHistory}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

interface CreateCouponFormProps {
  contractors: Contractor[]
  onSubmit: (data: CreateCouponData) => void
  onCancel: () => void
}

function CreateCouponForm({ contractors, onSubmit, onCancel }: CreateCouponFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percentage' as 'fixed_price' | 'percentage',
    value: 0,
    contractorId: '',
    expirationDate: '',
    description: '',
    maxUsage: 0
  })
  const [isContractorSpecific, setIsContractorSpecific] = useState(false)
  const [hasExpiration, setHasExpiration] = useState(false)
  const [hasUsageLimit, setHasUsageLimit] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data: CreateCouponData = {
      code: formData.code,
      name: formData.name,
      type: formData.type,
      value: formData.value,
      contractorId: isContractorSpecific ? formData.contractorId : undefined,
      expirationDate: hasExpiration ? formData.expirationDate : undefined,
      description: formData.description,
      maxUsage: hasUsageLimit ? formData.maxUsage : undefined
    }
    
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Coupon Code</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            maxLength={8}
            placeholder="SAVE20"
            required
          />
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Summer Sale"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value: 'fixed_price' | 'percentage') => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage Discount</SelectItem>
              <SelectItem value="fixed_price">Fixed Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="value">
            {formData.type === 'percentage' ? 'Percentage' : 'Fixed Price ($)'}
          </Label>
          <Input
            id="value"
            type="number"
            value={formData.value || ''}
            onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
            placeholder={formData.type === 'percentage' ? '20' : '150'}
            required
            min={0}
            step={formData.type === 'percentage' ? 1 : 0.01}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="contractorSpecific"
          checked={isContractorSpecific}
          onCheckedChange={(checked) => setIsContractorSpecific(checked as boolean)}
        />
        <Label htmlFor="contractorSpecific">Contractor-specific coupon</Label>
      </div>

      {isContractorSpecific && (
        <div>
          <Label htmlFor="contractorId">Contractor</Label>
          {contractors.length > 0 ? (
            <Select value={formData.contractorId} onValueChange={(value) => setFormData({ ...formData, contractorId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((contractor) => (
                  <SelectItem key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              No approved contractors found. Please approve some contractor applications first.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="hasExpiration"
          checked={hasExpiration}
          onCheckedChange={(checked) => setHasExpiration(checked as boolean)}
        />
        <Label htmlFor="hasExpiration">Set expiration date</Label>
      </div>

      {hasExpiration && (
        <div>
          <Label htmlFor="expirationDate">Expiration Date</Label>
          <Input
            id="expirationDate"
            type="date"
            value={formData.expirationDate}
            onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
          />
        </div>
      )}

      {formData.type === 'percentage' && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasUsageLimit"
              checked={hasUsageLimit}
              onCheckedChange={(checked) => setHasUsageLimit(checked as boolean)}
            />
            <Label htmlFor="hasUsageLimit">Set usage limit</Label>
          </div>

          {hasUsageLimit && (
            <div>
              <Label htmlFor="maxUsage">Maximum Usage</Label>
              <Input
                id="maxUsage"
                type="number"
                value={formData.maxUsage}
                onChange={(e) => setFormData({ ...formData, maxUsage: parseInt(e.target.value) || 0 })}
                placeholder="100"
              />
            </div>
          )}
        </>
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description for internal use"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Coupon
        </Button>
      </div>
    </form>
  )
}

interface EditCouponFormProps {
  coupon: Coupon
  contractors: Contractor[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

function EditCouponForm({ coupon, contractors, onSubmit, onCancel }: EditCouponFormProps) {
  const [formData, setFormData] = useState({
    name: coupon.name,
    value: coupon.value,
    expirationDate: coupon.expirationDate || '',
    description: coupon.description || '',
    isActive: coupon.isActive,
    maxUsage: coupon.maxUsage || 0
  })
  const [hasExpiration, setHasExpiration] = useState(!!coupon.expirationDate)
  const [hasUsageLimit, setHasUsageLimit] = useState(!!coupon.maxUsage)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data: any = {
      name: formData.name,
      value: formData.value,
      description: formData.description,
      isActive: formData.isActive,
      expirationDate: hasExpiration ? formData.expirationDate : null,
      maxUsage: hasUsageLimit ? formData.maxUsage : null
    }
    
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="value">
          {coupon.type === 'percentage' ? 'Percentage' : 'Fixed Price ($)'}
        </Label>
        <Input
          id="value"
          type="number"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="hasExpiration"
          checked={hasExpiration}
          onCheckedChange={(checked) => setHasExpiration(checked as boolean)}
        />
        <Label htmlFor="hasExpiration">Set expiration date</Label>
      </div>

      {hasExpiration && (
        <div>
          <Label htmlFor="expirationDate">Expiration Date</Label>
          <Input
            id="expirationDate"
            type="date"
            value={formData.expirationDate}
            onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
          />
        </div>
      )}

      {coupon.type === 'percentage' && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasUsageLimit"
              checked={hasUsageLimit}
              onCheckedChange={(checked) => setHasUsageLimit(checked as boolean)}
            />
            <Label htmlFor="hasUsageLimit">Set usage limit</Label>
          </div>

          {hasUsageLimit && (
            <div>
              <Label htmlFor="maxUsage">Maximum Usage</Label>
              <Input
                id="maxUsage"
                type="number"
                value={formData.maxUsage}
                onChange={(e) => setFormData({ ...formData, maxUsage: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}
        </>
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Coupon
        </Button>
      </div>
    </form>
  )
}

interface CouponCardProps {
  coupon: Coupon
  contractors: Contractor[]
  onEdit: (coupon: Coupon) => void
  onDelete: (id: string) => void
  onViewUsage: (id: string) => void
  onCopy: (text: string) => void
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
}

function CouponCard({ 
  coupon, 
  contractors, 
  onEdit, 
  onDelete, 
  onViewUsage, 
  onCopy, 
  formatCurrency, 
  formatDate 
}: CouponCardProps) {
  const contractor = contractors.find(c => c.id === coupon.contractorId)
  const isExpired = coupon.expirationDate && new Date(coupon.expirationDate) < new Date()
  const isUsageLimitReached = coupon.maxUsage && coupon.usageCount >= coupon.maxUsage

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{coupon.name}</CardTitle>
                          <Button
              variant="outline"
              onClick={() => onCopy(coupon.code)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            </div>
            <p className="text-sm text-muted-foreground">{coupon.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onViewUsage(coupon.id)}
            >
              Usage
            </Button>
            <Button
              variant="outline"
              onClick={() => onEdit(coupon)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onDelete(coupon.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {coupon.code}
            </Badge>
            {coupon.type === 'fixed_price' ? (
              <Badge variant="outline">
                <DollarSign className="w-3 h-3 mr-1" />
                Fixed ${coupon.value}
              </Badge>
            ) : (
              <Badge variant="outline">
                <Percent className="w-3 h-3 mr-1" />
                {coupon.value}% off
              </Badge>
            )}
            {!coupon.isActive && <Badge variant="destructive">Inactive</Badge>}
            {isExpired && <Badge variant="destructive">Expired</Badge>}
            {isUsageLimitReached && <Badge variant="destructive">Limit Reached</Badge>}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {coupon.contractorId ? (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{contractor?.name || 'Unknown Contractor'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Site-wide</span>
              </div>
            )}
            
            {coupon.expirationDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Expires {formatDate(coupon.expirationDate)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <span>Used {coupon.usageCount} times</span>
              {coupon.maxUsage && <span>/ {coupon.maxUsage}</span>}
            </div>
          </div>

          <Separator />
          
          <div className="text-xs text-muted-foreground">
            Created {formatDate(coupon.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface UsageHistoryTableProps {
  usageHistory: (any & { clientName?: string; contractorName?: string })[]
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
}

function UsageHistoryTable({ usageHistory, formatCurrency, formatDate }: UsageHistoryTableProps) {
  // Helper function to format user names with fallback to ID
  const formatUserName = (name: string | undefined, id: string) => {
    if (name && name !== 'Unknown Client' && name !== 'Unknown Contractor') {
      return name
    }
    // Fallback to truncated ID if name is not available
    const shortId = id.slice(-8)
    return (
      <span title={id} className="cursor-help font-mono text-xs">
        {shortId}
      </span>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {usageHistory.length} usage record{usageHistory.length !== 1 ? 's' : ''}
      </div>
      
      {/* Desktop view */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium text-sm">Date</th>
              <th className="text-left p-3 font-medium text-sm">Client</th>
              <th className="text-left p-3 font-medium text-sm">Contractor</th>
              <th className="text-right p-3 font-medium text-sm">Original Price</th>
              <th className="text-right p-3 font-medium text-sm">Discount</th>
              <th className="text-right p-3 font-medium text-sm">Final Price</th>
            </tr>
          </thead>
          <tbody>
            {usageHistory.map((usage, index) => (
                <tr key={usage.id} className="border-b last:border-b-0">
                  <td className="p-3 text-sm">{formatDate(usage.usedAt)}</td>
                  <td className="p-3 text-sm">{formatUserName(usage.clientName, usage.clientId)}</td>
                  <td className="p-3 text-sm">{formatUserName(usage.contractorName, usage.contractorId)}</td>
                  <td className="p-3 text-sm text-right">{formatCurrency(usage.originalPrice)}</td>
                  <td className="p-3 text-sm text-right text-green-600">-{formatCurrency(usage.discountAmount)}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatCurrency(usage.finalPrice)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {usageHistory.map((usage, index) => (
          <div key={usage.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Usage #{index + 1}</span>
              <span className="text-sm text-muted-foreground">{formatDate(usage.usedAt)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Client:</span>
                <div className="mt-1 font-medium">
                  {usage.clientName && usage.clientName !== 'Unknown Client' 
                    ? usage.clientName 
                    : (
                        <span className="font-mono text-xs" title={usage.clientId}>
                          {usage.clientId?.slice(-8) || 'Unknown'}
                        </span>
                      )
                  }
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Contractor:</span>
                <div className="mt-1 font-medium">
                  {usage.contractorName && usage.contractorName !== 'Unknown Contractor' 
                    ? usage.contractorName 
                    : (
                        <span className="font-mono text-xs" title={usage.contractorId}>
                          {usage.contractorId?.slice(-8) || 'Unknown'}
                        </span>
                      )
                  }
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Original Price:</span>
                <span className="text-sm font-medium">{formatCurrency(usage.originalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Discount:</span>
                <span className="text-sm text-green-600 font-medium">-{formatCurrency(usage.discountAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">Final Price:</span>
                <span className="text-sm font-bold">{formatCurrency(usage.finalPrice)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 