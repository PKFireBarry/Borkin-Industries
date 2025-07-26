"use client";

import { useState, useActionState, useEffect } from 'react';
import type { PlatformService, ContractorServiceOffering } from "@/types/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit3, PlusCircle, AlertCircle, Package } from 'lucide-react';
import {
  updateServiceOfferingAction,
  deleteServiceOfferingAction,
  addMultipleServiceOfferingsAction,
} from "../actions";
import type { ActionResponse } from "../actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface ContractorProfileServiceManagerProps {
  contractorId: string;
  currentOfferings: ContractorServiceOffering[];
  platformServices: PlatformService[];
  isEditing: boolean;
}

interface ServiceToAdd {
  serviceId: string;
  price: number;
  paymentType: 'one_time' | 'daily';
  selected: boolean;
}

export function ContractorProfileServiceManager({
  contractorId,
  currentOfferings,
  platformServices,
  isEditing,
}: ContractorProfileServiceManagerProps) {
  console.log("[ContractorProfileServiceManager] Received platformServices prop:", platformServices);

  const [localOfferings, setLocalOfferings] = useState<ContractorServiceOffering[]>(currentOfferings);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ContractorServiceOffering | null>(null);
  const [servicesToAdd, setServicesToAdd] = useState<ServiceToAdd[]>([]);

  useEffect(() => {
    setLocalOfferings(currentOfferings);
  }, [currentOfferings]);

  // Initialize services to add when bulk form is shown
  useEffect(() => {
    if (showBulkAddForm) {
      const availableServices = platformServices.filter(ps => 
        !localOfferings.some(so => so.serviceId === ps.id)
      );
      setServicesToAdd(availableServices.map(ps => ({
        serviceId: ps.id,
        price: 0,
        paymentType: 'daily' as const,
        selected: false,
      })));
    }
  }, [showBulkAddForm, platformServices, localOfferings]);

  const [editFormState, submitEditAction, isEditPending] = useActionState<ActionResponse | null, FormData>(
    updateServiceOfferingAction,
    null
  );
  const [deleteState, submitDeleteAction, isDeletePending] = useActionState<ActionResponse | null, FormData>(
    deleteServiceOfferingAction,
    null
  );
  const [bulkAddState, submitBulkAddAction, isBulkAddPending] = useActionState<ActionResponse | null, FormData>(
    addMultipleServiceOfferingsAction,
    null
  );

  useEffect(() => {
    if (bulkAddState?.newOfferings) {
      setLocalOfferings(prev => [...prev, ...bulkAddState.newOfferings!]);
      setShowBulkAddForm(false);
      setServicesToAdd([]);
    }
    if (bulkAddState?.error) console.error("Bulk Service Add Error:", bulkAddState.error);
  }, [bulkAddState]);

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

  const handleBulkAddSubmit = (formData: FormData) => {
    const selectedServices = servicesToAdd.filter(s => s.selected && s.price > 0);
    
    if (selectedServices.length === 0) {
      return;
    }
    
    const servicesData = selectedServices.map(s => ({
      serviceId: s.serviceId,
      price: s.price * 100, // Convert to cents
      paymentType: s.paymentType,
    }));
    
    const bulkData = new FormData();
    bulkData.append('contractorId', contractorId);
    bulkData.append('servicesData', JSON.stringify(servicesData));
    
    submitBulkAddAction(bulkData);
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

  const handleServiceSelectionChange = (serviceId: string, selected: boolean) => {
    setServicesToAdd(prev => prev.map(s => 
      s.serviceId === serviceId ? { ...s, selected } : s
    ));
  };

  const handleServicePriceChange = (serviceId: string, price: number) => {
    setServicesToAdd(prev => prev.map(s => 
      s.serviceId === serviceId ? { ...s, price } : s
    ));
  };

  const handleServicePaymentTypeChange = (serviceId: string, paymentType: 'one_time' | 'daily') => {
    setServicesToAdd(prev => prev.map(s => 
      s.serviceId === serviceId ? { ...s, paymentType } : s
    ));
  };
  
  const getServiceName = (serviceId: string) => platformServices.find(ps => ps.id === serviceId)?.name || 'Unknown Service';
  
  const getServiceDescription = (serviceId: string) => platformServices.find(ps => ps.id === serviceId)?.description || '';
  
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
          {localOfferings.length === 0 && <p className="pt-2 text-sm text-muted-foreground">No specific services and prices added yet.</p>}
        </CardHeader>
        {localOfferings.length > 0 && (
            <CardContent>
                <div className="grid gap-4">
                    {localOfferings.map((offering) => {
                      const serviceDescription = getServiceDescription(offering.serviceId);
                      return (
                        <div key={offering.serviceId} className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">{getServiceName(offering.serviceId)}</h3>
                                  </div>
                                  {serviceDescription && (
                                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{serviceDescription}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {offering.paymentType === 'daily' ? 'Daily Rate' : 'One-time Fee'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-left sm:text-right">
                                  <div className="text-xl sm:text-2xl font-bold text-primary">
                                    {formatPriceWithType(offering)}
                                  </div>
                                </div>
                            </div>
                        </div>
                      );
                    })}
                </div>
            </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {(editFormState?.error || deleteState?.error || bulkAddState?.error) && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error: {editFormState?.error || deleteState?.error || bulkAddState?.error}</span>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Manage Your Service Offerings</CardTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Add services you offer and set your price for each. These will be visible to clients.
          </p>
        </CardHeader>
        <CardContent>
          {localOfferings.length === 0 && !showBulkAddForm && (
            <p className="text-muted-foreground py-4 text-center">You haven&apos;t added any services yet. Click below to add services.</p>
          )}
          {localOfferings.length > 0 && (
            <div className="grid gap-4 mb-6">
                {localOfferings.map((offering) => {
                  const serviceDescription = getServiceDescription(offering.serviceId);
                  return (
                    <div key={offering.serviceId} className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">{getServiceName(offering.serviceId)}</h3>
                                  </div>
                                  {serviceDescription && (
                                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{serviceDescription}</p>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                                      {offering.paymentType === 'daily' ? 'Daily Rate' : 'One-time Fee'}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                      Current Price: {formatPriceWithType(offering)}
                                    </span>
                                  </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                              <Button 
                                variant="outline" 
                                onClick={() => { setEditingOffering(offering); setShowBulkAddForm(false); }} 
                                disabled={isEditPending || isDeletePending || isBulkAddPending}
                                className="border-slate-300 hover:bg-slate-50 text-sm px-3 py-2 sm:px-3 sm:py-1 w-full sm:w-auto"
                              >
                                <Edit3 className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                onClick={() => handleDeleteServiceClick(offering.serviceId)} 
                                disabled={isDeletePending || isEditPending || isBulkAddPending}
                                className="text-sm px-3 py-2 sm:px-3 sm:py-1 w-full sm:w-auto"
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </div>
                        </div>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="flex justify-center">
            <Button 
              onClick={() => { setShowBulkAddForm(true); setEditingOffering(null);}} 
              disabled={showBulkAddForm || !!editingOffering || isEditPending || isDeletePending || isBulkAddPending } 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
                <Package className="mr-2 h-4 w-4" /> Add Services
            </Button>
          </div>
        </CardContent>
      </Card>

      {showBulkAddForm && (
        <Card className="border-primary border-2">
          <CardHeader>
            <CardTitle>Add Services</CardTitle>
            <p className="text-sm text-muted-foreground">Select the services you want to offer and set your prices.</p>
            {bulkAddState?.message && <p className="text-sm text-green-600 mt-1">{bulkAddState.message}</p>}
          </CardHeader>
          <form action={handleBulkAddSubmit}>
            <CardContent className="space-y-4">
              {servicesToAdd.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">All available services have already been added to your profile.</p>
              ) : (
                <div className="space-y-4">
                  {servicesToAdd.map((service) => {
                    const platformService = platformServices.find(ps => ps.id === service.serviceId);
                    return (
                      <div key={service.serviceId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`service-${service.serviceId}`}
                            checked={service.selected}
                            onCheckedChange={(checked) => handleServiceSelectionChange(service.serviceId, checked as boolean)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`service-${service.serviceId}`} className="text-base font-medium cursor-pointer">
                              {platformService?.name}
                            </Label>
                            {platformService?.description && (
                              <p className="text-sm text-muted-foreground mt-1">{platformService.description}</p>
                            )}
                          </div>
                        </div>
                        {service.selected && (
                          <div className="ml-6 space-y-3">
                            <div>
                              <Label htmlFor={`price-${service.serviceId}`}>Price (USD)</Label>
                              <Input
                                id={`price-${service.serviceId}`}
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="e.g., 25.00"
                                value={service.price || ''}
                                onChange={(e) => handleServicePriceChange(service.serviceId, parseFloat(e.target.value) || 0)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Payment Type</Label>
                              <RadioGroup 
                                value={service.paymentType} 
                                onValueChange={(value) => handleServicePaymentTypeChange(service.serviceId, value as 'one_time' | 'daily')}
                                className="mt-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="daily" id={`daily-${service.serviceId}`} />
                                  <Label htmlFor={`daily-${service.serviceId}`} className="cursor-pointer">Daily Rate</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="one_time" id={`one_time-${service.serviceId}`} />
                                  <Label htmlFor={`one_time-${service.serviceId}`} className="cursor-pointer">One-time Fee</Label>
                                </div>
                              </RadioGroup>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => { setShowBulkAddForm(false); setServicesToAdd([]); }} disabled={isBulkAddPending}>Cancel</Button>
                <Button type="submit" disabled={isBulkAddPending || servicesToAdd.filter(s => s.selected).length === 0}>
                     {isBulkAddPending ? 'Adding Services...' : 'Add Selected Services'}
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