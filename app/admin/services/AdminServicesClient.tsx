"use client"

import { useState } from 'react'
import { 
  createPlatformService, 
  updatePlatformService, 
  deletePlatformService 
} from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
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
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
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

      if (!name.trim()) {
        throw new Error('Service name is required')
      }

      const serviceData: Omit<PlatformService, 'id'> = {
        name,
        description: description || undefined,
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
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Platform Services</h1>
        <Button 
          onClick={() => {
            setServiceToEdit(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Service
        </Button>
      </div>

      {_error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <h3 className="font-medium">Error</h3>
          </div>
          <p className="mt-1">{_error}</p>
        </div>
      )}

      <Table>
        <TableCaption>List of available services contractors can offer</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Service Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                No services found. Click &quot;Add New Service&quot; to create one.
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>{service.description || '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
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