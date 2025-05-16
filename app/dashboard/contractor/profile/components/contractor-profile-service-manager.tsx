"use client";

import { useState, useActionState, useEffect } from 'react';
import type { PlatformService, ContractorServiceOffering } from "@/types/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit3, PlusCircle, AlertCircle } from 'lucide-react';
import {
  addServiceOfferingAction,
  updateServiceOfferingAction,
  deleteServiceOfferingAction,
} from "../actions";
import type { ActionResponse } from "../actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ContractorProfileServiceManagerProps {
  contractorId: string;
  currentOfferings: ContractorServiceOffering[];
  platformServices: PlatformService[];
  isEditing: boolean;
}

export function ContractorProfileServiceManager({
  contractorId,
  currentOfferings,
  platformServices,
  isEditing,
}: ContractorProfileServiceManagerProps) {
  console.log("[ContractorProfileServiceManager] Received platformServices prop:", platformServices);

  const [localOfferings, setLocalOfferings] = useState<ContractorServiceOffering[]>(currentOfferings);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ContractorServiceOffering | null>(null);

  useEffect(() => {
    setLocalOfferings(currentOfferings);
  }, [currentOfferings]);

  const [addFormState, submitAddAction, isAddPending] = useActionState<ActionResponse | null, FormData>(
    addServiceOfferingAction,
    null
  );
  const [editFormState, submitEditAction, isEditPending] = useActionState<ActionResponse | null, FormData>(
    updateServiceOfferingAction,
    null
  );
  const [deleteState, submitDeleteAction, isDeletePending] = useActionState<ActionResponse | null, FormData>(
    deleteServiceOfferingAction,
    null
  );

  useEffect(() => {
    if (addFormState?.newOffering) {
      setLocalOfferings(prev => [...prev, addFormState.newOffering!]);
      setShowAddForm(false);
    }
    if (addFormState?.error) console.error("Service Add Error:", addFormState.error);
  }, [addFormState]);

  useEffect(() => {
    if (editFormState?.updatedOfferings && editingOffering) {
      const updatedItem = editFormState.updatedOfferings.find((o: ContractorServiceOffering) => o.serviceId === editingOffering.serviceId);
      if (updatedItem) {
        setLocalOfferings(prev => prev.map((po: ContractorServiceOffering) => po.serviceId === editingOffering.serviceId ? updatedItem : po));
      }
      setEditingOffering(null);
    }
    if (editFormState?.error) console.error("Service Edit Error:", editFormState.error);
  }, [editFormState, editingOffering]);

  useEffect(() => {
    if (deleteState?.updatedOfferings && deleteState.message) {
      setLocalOfferings(deleteState.updatedOfferings);
    }
    if (deleteState?.error) console.error("Service Delete Error:", deleteState.error);
  }, [deleteState]);

  const handleAddServiceSubmit = (formData: FormData) => {
    const serviceId = formData.get('serviceId') as string;
    const price = formData.get('price') as string;
    const paymentType = formData.get('paymentType') as string;
    
    if (!serviceId || !price || parseFloat(price) <= 0 || !paymentType) return;
    
    const serviceData = new FormData();
    serviceData.append('contractorId', contractorId);
    serviceData.append('serviceId', serviceId);
    serviceData.append('price', (parseFloat(price) * 100).toString());
    serviceData.append('paymentType', paymentType);
    
    submitAddAction(serviceData);
  };
  
  const handleUpdateServiceSubmit = (formData: FormData) => {
    if (!editingOffering) return;
    
    const price = formData.get('price') as string;
    const paymentType = formData.get('paymentType') as string;
    
    if (!price || parseFloat(price) <= 0 || !paymentType) return;
    
    const serviceData = new FormData();
    serviceData.append('contractorId', contractorId);
    serviceData.append('serviceId', editingOffering.serviceId);
    serviceData.append('price', (parseFloat(price) * 100).toString());
    serviceData.append('paymentType', paymentType);
    
    submitEditAction(serviceData);
  };

  const handleDeleteServiceClick = (serviceId: string) => {
    if (isDeletePending || !confirm(`Are you sure you want to remove this service? This cannot be undone.`)) return;
    const serviceData = new FormData();
    serviceData.append('contractorId', contractorId);
    serviceData.append('serviceId', serviceId);
    submitDeleteAction(serviceData);
  };
  
  const getServiceName = (serviceId: string) => platformServices.find(ps => ps.id === serviceId)?.name || 'Unknown Service';
  
  const formatPriceWithType = (offering: ContractorServiceOffering) => {
    const formattedPrice = `$${(offering.price / 100).toFixed(2)}`;
    return offering.paymentType === 'daily' 
      ? `${formattedPrice}/day`
      : formattedPrice;
  };

  if (!isEditing) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Services & Pricing</CardTitle>
          {localOfferings.length === 0 && <p className="pt-2 text-sm text-muted-foreground">No specific services and prices added yet.</p>}{/* Manual description */}
        </CardHeader>
        {localOfferings.length > 0 && (
            <CardContent>
                <ul className="space-y-3">
                    {localOfferings.map((offering) => (
                    <li key={offering.serviceId} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                        <div>
                        <p className="font-medium text-gray-700">{getServiceName(offering.serviceId)}</p>
                        <p className="text-sm text-gray-500">{offering.paymentType === 'daily' ? 'Daily rate' : 'One-time fee'}</p>
                        </div>
                        <p className="font-semibold text-lg text-primary">{formatPriceWithType(offering)}</p>
                    </li>
                    ))}
                </ul>
            </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {(addFormState?.error || editFormState?.error || deleteState?.error) && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error: {addFormState?.error || editFormState?.error || deleteState?.error}</span>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Manage Your Service Offerings</CardTitle>
          {/* Manual description */}
          <p className="text-sm text-muted-foreground pt-1">
            Add services you offer and set your price for each. These will be visible to clients.
          </p>
        </CardHeader>
        <CardContent>
          {localOfferings.length === 0 && !showAddForm && (
            <p className="text-muted-foreground py-4 text-center">You haven&apos;t added any services yet. Click below to add one.</p>
          )}
          {localOfferings.length > 0 && (
            <ul className="space-y-4 mb-6">
                {localOfferings.map((offering) => (
                <li key={offering.serviceId} className="flex items-center justify-between p-4 border rounded-md shadow-sm">
                    <div>
                      <p className="font-semibold">{getServiceName(offering.serviceId)}</p>
                      <p className="text-sm text-muted-foreground">
                        Current Price: {formatPriceWithType(offering)}
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-md text-xs">
                          {offering.paymentType === 'daily' ? 'Daily rate' : 'One-time fee'}
                        </span>
                      </p>
                    </div>
                    <div className="space-x-2 flex items-center">
                    <Button variant="outline" onClick={() => { setEditingOffering(offering); setShowAddForm(false); }} disabled={isEditPending || isDeletePending || isAddPending}>
                        <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteServiceClick(offering.serviceId)} disabled={isDeletePending || isEditPending || isAddPending}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                    </div>
                </li>
                ))}
            </ul>
          )}
          <div className="flex justify-center">
            <Button onClick={() => { setShowAddForm(true); setEditingOffering(null);}} disabled={showAddForm || !!editingOffering || isAddPending || isEditPending || isDeletePending } className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Service Offering
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAddForm && !editingOffering && (
        <Card className="border-primary border-2">
          <CardHeader>
            <CardTitle>Add New Service</CardTitle>
            {addFormState?.message && <p className="text-sm text-green-600 mt-1">{addFormState.message}</p>}
          </CardHeader>
          <form action={handleAddServiceSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serviceId">Service Type</Label>
                <Select name="serviceId" required defaultValue="">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service to offer" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformServices
                      .filter(ps => !localOfferings.some(so => so.serviceId === ps.id))
                      .map(ps => {
                        return (
                          <SelectItem key={ps.id} value={ps.id}>
                            {ps.name} {ps.description ? `(${ps.description})` : ''} 
                          </SelectItem>
                        );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Your Price (USD)</Label>
                <Input name="price" type="number" step="0.01" min="0.01" placeholder="e.g., 25.00" required />
              </div>
              <div>
                <Label>Payment Type</Label>
                <RadioGroup name="paymentType" defaultValue="daily" className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="cursor-pointer">Daily Rate (charged per day)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one_time" id="one_time" />
                    <Label htmlFor="one_time" className="cursor-pointer">One-time Fee (flat rate)</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} disabled={isAddPending}>Cancel</Button>
                {/* Simplified disabled condition for testing */}
                <Button type="submit" disabled={isAddPending}>
                     {isAddPending ? 'Adding...' : 'Add Service'}
                </Button>
            </div>
          </form>
        </Card>
      )}

      {editingOffering && (
        <Card className="border-primary border-2">
          <CardHeader>
            <CardTitle>Edit {getServiceName(editingOffering.serviceId)}</CardTitle>
            {editFormState?.message && <p className="text-sm text-green-600 mt-1">{editFormState.message}</p>}
          </CardHeader>
          <form action={handleUpdateServiceSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price">Price (USD)</Label>
                <Input name="price" type="number" step="0.01" min="0.01" defaultValue={(editingOffering.price / 100).toFixed(2)} required />
              </div>
              <div>
                <Label>Payment Type</Label>
                <RadioGroup name="paymentType" defaultValue={editingOffering.paymentType || 'daily'} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="edit-daily" />
                    <Label htmlFor="edit-daily" className="cursor-pointer">Daily Rate (charged per day)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one_time" id="edit-one_time" />
                    <Label htmlFor="edit-one_time" className="cursor-pointer">One-time Fee (flat rate)</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setEditingOffering(null)} disabled={isEditPending}>Cancel</Button>
                <Button type="submit" disabled={isEditPending}>{isEditPending ? 'Saving Changes...' : 'Save Changes'}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
} 