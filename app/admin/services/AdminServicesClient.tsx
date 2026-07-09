"use client"

import { useState } from 'react'
import { 
  createPlatformService, 
  updatePlatformService, 
  deletePlatformService 
} from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import { formatDuration } from '@/lib/utils/booking-duration'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, AlertCircle, Settings, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface AdminServicesClientProps {
  initialServices: PlatformService[]
}

export default function AdminServicesClient({ initialServices }: AdminServicesClientProps) {
  const [services, setServices] = useState<PlatformService[]>(initialServices)
  const [_error, _setError] = useState<string | null>(null)
  const [serviceToEdit, setServiceToEdit] = useState<PlatformService | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<PlatformService | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const name = formData.get('name') as string
      const description = formData.get('description') as string
      const durationMinutes = parseInt(formData.get('durationMinutes') as string)

      if (!name.trim()) {
        throw new Error('Service name is required')
      }

      if (!durationMinutes || durationMinutes <= 0) {
        throw new Error('Duration must be a positive number')
      }

      const serviceData: Omit<PlatformService, 'id'> = {
        name,
        description: description || undefined,
        durationMinutes,
      }

      if (serviceToEdit) {
        // Update existing service
        await updatePlatformService(serviceToEdit.id, serviceData)
        
        // Update local state
        setServices(prev => 
          prev.map(s => 
            s.id === serviceToEdit.id 
              ? { ...s, ...serviceData } 
              : s
          )
        )
        
        toast.success(`${name} has been updated successfully.`)
      } else {
        // Create new service
        const newServiceId = await createPlatformService(serviceData)
        
        // Update local state
        setServices(prev => [
          ...prev, 
          { id: newServiceId, ...serviceData }
        ])
        
        toast.success(`${name} has been added to the platform.`)
      }

      // Reset form state
      setIsDialogOpen(false)
      setServiceToEdit(null)
    } catch (err) {
      console.error('Error saving service:', err)
      toast.error(err instanceof Error ? err.message : "Failed to save service")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async () => {
    if (!serviceToDelete) return
    
    setIsSubmitting(true)
    try {
      await deletePlatformService(serviceToDelete.id)
      
      // Update local state
      setServices(prev => prev.filter(s => s.id !== serviceToDelete.id))
      
      toast.success(`${serviceToDelete.name} has been removed from the platform.`)
      
      setIsDeleteDialogOpen(false)
      setServiceToDelete(null)
    } catch (err) {
      console.error('Error deleting service:', err)
      toast.error("Failed to delete service")
    } finally {
      setIsSubmitting(false)
    }
  }

  // When edit button is clicked
  const handleEditClick = (service: PlatformService) => {
    setServiceToEdit(service)
    setIsDialogOpen(true)
  }

  // When delete button is clicked
  const handleDeleteClick = (service: PlatformService) => {
    setServiceToDelete(service)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button 
          onClick={() => {
            setServiceToEdit(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Service
        </Button>
      </div>

      {/* Error Display */}
      {_error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <h3 className="font-medium">Error</h3>
          </div>
          <p className="mt-1">{_error}</p>
        </div>
      )}

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No services found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first platform service.
            </p>
            <Button 
              onClick={() => {
                setServiceToEdit(null)
                setIsDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{service.name}</CardTitle>
                                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button 
                       variant="outline" 
                       onClick={() => handleEditClick(service)}
                       className="h-8 w-8 p-0"
                     >
                       <Edit className="h-4 w-4" />
                     </Button>
                     <Button 
                       variant="destructive" 
                       onClick={() => handleDeleteClick(service)}
                       className="h-8 w-8 p-0"
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {service.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description provided
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(service.durationMinutes)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    Platform Service
                  </Badge>
                                     <div className="flex items-center gap-1 sm:hidden">
                     <Button 
                       variant="outline" 
                       onClick={() => handleEditClick(service)}
                       className="h-8 w-8 p-0"
                     >
                       <Edit className="h-4 w-4" />
                     </Button>
                     <Button 
                       variant="destructive" 
                       onClick={() => handleDeleteClick(service)}
                       className="h-8 w-8 p-0"
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {serviceToEdit ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {serviceToEdit 
                ? 'Update the details of this service.' 
                : 'Add a new service that contractors can offer to clients.'}
            </p>
          </DialogHeader>
          
          <form onSubmit={handleCreateService} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., Dog Walking (30 mins)" 
                defaultValue={serviceToEdit?.name || ''} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Provide a brief description of this service"
                defaultValue={serviceToEdit?.description || ''}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input 
                id="durationMinutes" 
                name="durationMinutes" 
                type="number"
                min="1"
                placeholder="e.g., 60 for 1 hour" 
                defaultValue={serviceToEdit?.durationMinutes || 60} 
                required 
              />
              <p className="text-xs text-muted-foreground">
                How long this service typically takes to complete
              </p>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? 'Saving...' 
                  : serviceToEdit ? 'Update Service' : 'Add Service'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Are you sure you want to remove the service &quot;{serviceToDelete?.name || 'this service'}&quot;? 
              This action cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 