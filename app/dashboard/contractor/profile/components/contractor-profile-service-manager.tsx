"use client";

import { useState, useActionState, useEffect, useRef } from 'react';
import type { PlatformService, ContractorServiceOffering } from "@/types/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit3, AlertCircle, Package, CalendarClock, Layers3 } from 'lucide-react';
import {
  updateServiceOfferingAction,
  deleteServiceOfferingAction,
  addMultipleServiceOfferingsAction,
} from "../actions";
import type { ActionResponse } from "../actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { ModalShell } from '@/app/dashboard/components/modal-shell';
import { ModalHeader } from '@/app/dashboard/components/modal-header';
import { RailDots } from '@/app/dashboard/components/rail-dots';
import { useRailScroll } from '@/hooks/use-rail-scroll';

const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 96
const DESKTOP_SERVICES_BOTTOM_BUFFER = 72
const DESKTOP_SERVICES_FIT_SAFETY_BUFFER = 32

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
  const [editFormKey, setEditFormKey] = useState(0); // Force form reset
  const railContainerRef = useRef<HTMLDivElement | null>(null)
  const servicesSectionRef = useRef<HTMLDivElement | null>(null)
  const firstServiceCardRef = useRef<HTMLDivElement | null>(null)
  const desktopPaginationRef = useRef<HTMLDivElement | null>(null)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [activeDesktopPage, setActiveDesktopPage] = useState(1)
  const [desktopServicesPerPage, setDesktopServicesPerPage] = useState(6)
  const [desktopPaginationHeight, setDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const [desktopViewportSectionHeight, setDesktopViewportSectionHeight] = useState<number | null>(null)

  useEffect(() => {
    setLocalOfferings(currentOfferings);
  }, [currentOfferings]);

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

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
      setEditFormKey(prev => prev + 1); // Reset form for next edit
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

  const { railRef, clampedDotIndex, onScroll } = useRailScroll({
    slideSelector: '[data-contractor-service-slide="true"]',
    itemCount: localOfferings.length,
  });

  const desktopPageCount = Math.max(1, Math.ceil(localOfferings.length / desktopServicesPerPage))
  const visibleOfferings = isDesktopViewport
    ? localOfferings.slice((activeDesktopPage - 1) * desktopServicesPerPage, activeDesktopPage * desktopServicesPerPage)
    : localOfferings

  useEffect(() => {
    setActiveDesktopPage(1)
  }, [localOfferings.length])

  useEffect(() => {
    if (activeDesktopPage > desktopPageCount) {
      setActiveDesktopPage(desktopPageCount)
    }
  }, [activeDesktopPage, desktopPageCount])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 639px)')

    const updateMobileRailCardHeight = () => {
      if (!mediaQuery.matches) {
        railContainerRef.current?.style.removeProperty('--rail-card-height')
        return
      }

      const railContainer = railContainerRef.current
      if (!railContainer) return

      const topOffset = railContainer.getBoundingClientRect().top
      const dotsAndBottomSpacing = 28
      const nextCardHeight = Math.max(260, window.innerHeight - topOffset - dotsAndBottomSpacing)

      railContainer.style.setProperty('--rail-card-height', `${nextCardHeight}px`)
    }

    const frameId = window.requestAnimationFrame(updateMobileRailCardHeight)
    window.addEventListener('resize', updateMobileRailCardHeight)
    mediaQuery.addEventListener('change', updateMobileRailCardHeight)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateMobileRailCardHeight)
      mediaQuery.removeEventListener('change', updateMobileRailCardHeight)
    }
  }, [localOfferings.length])

  useEffect(() => {
    if (!isDesktopViewport) {
      setDesktopViewportSectionHeight(null)
      return
    }

    const updateDesktopServicesPerPage = () => {
      const sectionTop = servicesSectionRef.current?.getBoundingClientRect().top
      const firstCardHeight = firstServiceCardRef.current?.getBoundingClientRect().height
      const paginationHeight = desktopPaginationRef.current?.getBoundingClientRect().height

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_SERVICES_BOTTOM_BUFFER)
      setDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstCardHeight !== 'number') return

      const gridGap = 16
      const availableHeight = Math.max(0, sectionHeight - desktopPaginationHeight - DESKTOP_SERVICES_FIT_SAFETY_BUFFER)
      const visibleRows = Math.max(1, Math.floor((availableHeight + gridGap) / (firstCardHeight + gridGap)))
      const desktopColumns = window.innerWidth >= 1536 ? 4 : window.innerWidth >= 1280 ? 3 : 2
      const nextPageSize = Math.max(desktopColumns, visibleRows * desktopColumns)

      setDesktopServicesPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopServicesPerPage)
    window.addEventListener('resize', updateDesktopServicesPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopServicesPerPage)
    }
  }, [activeDesktopPage, desktopPaginationHeight, isDesktopViewport, localOfferings.length])

  const renderOfferingCard = (offering: ContractorServiceOffering, interactive: boolean, attachRef = false) => {
    const serviceDescription = getServiceDescription(offering.serviceId);

    return (
      <div
        key={offering.serviceId}
        ref={attachRef ? firstServiceCardRef : undefined}
        data-contractor-service-slide="true"
        className="block w-[calc(100vw-3rem)] min-w-[calc(100vw-3rem)] max-w-none shrink-0 snap-center snap-always sm:w-auto sm:min-w-0 sm:max-w-none"
      >
        <Card className="flex h-full rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="flex min-h-[15rem] flex-1 flex-col gap-4 p-4 sm:p-5 h-[var(--rail-card-height,24rem)] sm:h-full">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-[3rem] items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-base font-semibold text-slate-900">{getServiceName(offering.serviceId)}</p>
                  <p className="text-xs text-slate-500">Client-facing service listing</p>
                </div>
              </div>

              <div className="mt-3 min-h-[4.5rem]">
                {serviceDescription ? (
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">{serviceDescription}</p>
                ) : (
                  <p className="text-sm text-slate-500">No description available yet.</p>
                )}
              </div>

              <div className="mt-auto grid min-h-[4.75rem] grid-cols-2 gap-2 pt-3 text-xs">
                <div className="rounded-xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-200">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Pricing</div>
                  <div className="mt-1 font-semibold text-slate-900">{formatPriceWithType(offering)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Type</div>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900">
                    {offering.paymentType === 'daily' ? <CalendarClock className="h-3.5 w-3.5" /> : <Layers3 className="h-3.5 w-3.5" />}
                    <span>{offering.paymentType === 'daily' ? 'Daily rate' : 'One-time fee'}</span>
                  </div>
                </div>
              </div>
            </div>

            {interactive ? (
              <div className="mt-auto grid grid-cols-2 gap-2.5 border-t border-slate-200/80 pt-4">
                <Button
                  variant="outline"
                  size="pillSm"
                  onClick={() => {
                    setEditingOffering(offering);
                    setShowBulkAddForm(false);
                    setEditFormKey(prev => prev + 1);
                  }}
                  disabled={isEditPending || isDeletePending || isBulkAddPending}
                  className="w-full justify-center"
                >
                  <Edit3 className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="pillSm"
                  onClick={() => handleDeleteServiceClick(offering.serviceId)}
                  disabled={isDeletePending || isEditPending || isBulkAddPending}
                  className="w-full justify-center border-red-200 bg-red-50/60 text-red-600 hover:border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!isEditing) {
    return (
      <div
        ref={servicesSectionRef}
        className="flex flex-col gap-4"
        style={isDesktopViewport && desktopViewportSectionHeight ? { minHeight: `${desktopViewportSectionHeight}px` } : undefined}
      >
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Services & Pricing</h3>
              <p className="mt-1 text-sm text-slate-600">These listings are visible to clients browsing your profile.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {localOfferings.length} services
            </div>
          </div>
        </div>

        {localOfferings.length === 0 ? (
          <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No specific services and prices added yet.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
              <div
                ref={(node) => {
                  railContainerRef.current = node
                  railRef.current = node
                }}
                onScroll={onScroll}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pl-0 sm:pr-0 lg:grid-cols-3 2xl:grid-cols-4"
              >
                {visibleOfferings.map((offering, index) => renderOfferingCard(offering, false, index === 0))}
              </div>
            </div>
            <div className="sm:hidden">
              <RailDots count={visibleOfferings.length} activeIndex={clampedDotIndex} className="mt-1" />
            </div>

            {isDesktopViewport && localOfferings.length > desktopServicesPerPage ? (
              <div
                ref={desktopPaginationRef}
                className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">Page {activeDesktopPage} of {desktopPageCount}</p>
                  <p className="text-xs text-slate-500">Showing {visibleOfferings.length} of {localOfferings.length} services</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="pillSm"
                    onClick={() => setActiveDesktopPage((prev) => Math.max(prev - 1, 1))}
                    disabled={activeDesktopPage === 1}
                    className="min-w-[7rem]"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="pillSm"
                    onClick={() => setActiveDesktopPage((prev) => Math.min(prev + 1, desktopPageCount))}
                    disabled={activeDesktopPage === desktopPageCount}
                    className="min-w-[7rem]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={servicesSectionRef}
      className="flex flex-col gap-4"
      style={isDesktopViewport && desktopViewportSectionHeight ? { minHeight: `${desktopViewportSectionHeight}px` } : undefined}
    >
      {(editFormState?.error || deleteState?.error || bulkAddState?.error) && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error: {editFormState?.error || deleteState?.error || bulkAddState?.error}</span>
        </div>
      )}
      <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Manage Your Service Offerings</h3>
            <p className="mt-1 text-sm text-slate-600">Keep your service list compact here, then add or edit pricing inside focused modals.</p>
          </div>
          <Button
            onClick={() => {
              setShowBulkAddForm(true);
              setEditingOffering(null);
            }}
            disabled={showBulkAddForm || !!editingOffering || isEditPending || isDeletePending || isBulkAddPending}
            variant="petCta"
            size="pill"
            className="w-full sm:w-auto"
          >
            <Package className="mr-2 h-4 w-4" />
            Add Services
          </Button>
        </div>
      </div>

      {localOfferings.length === 0 ? (
        <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            You haven&apos;t added any services yet. Use the button above to create your first service listing.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
            <div
              ref={(node) => {
                railContainerRef.current = node
                railRef.current = node
              }}
              onScroll={onScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pl-0 sm:pr-0 lg:grid-cols-3 2xl:grid-cols-4"
            >
              {visibleOfferings.map((offering, index) => renderOfferingCard(offering, true, index === 0))}
            </div>
          </div>
          <div className="sm:hidden">
            <RailDots count={visibleOfferings.length} activeIndex={clampedDotIndex} className="mt-1" />
          </div>

          {isDesktopViewport && localOfferings.length > desktopServicesPerPage ? (
            <div
              ref={desktopPaginationRef}
              className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">Page {activeDesktopPage} of {desktopPageCount}</p>
                <p className="text-xs text-slate-500">Showing {visibleOfferings.length} of {localOfferings.length} services</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="pillSm"
                  onClick={() => setActiveDesktopPage((prev) => Math.max(prev - 1, 1))}
                  disabled={activeDesktopPage === 1}
                  className="min-w-[7rem]"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="pillSm"
                  onClick={() => setActiveDesktopPage((prev) => Math.min(prev + 1, desktopPageCount))}
                  disabled={activeDesktopPage === desktopPageCount}
                  className="min-w-[7rem]"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={showBulkAddForm} onOpenChange={(open) => !open && setShowBulkAddForm(false)}>
        <ModalShell maxWidth="2xl" aria-labelledby="contractorAddServicesTitle">
          <div className="flex h-full min-h-0 flex-col">
            <ModalHeader
              eyebrow="Services"
              title="Add Services"
              description="Select the services you want to offer and set client-facing pricing before saving."
              titleId="contractorAddServicesTitle"
              onClose={() => {
                setShowBulkAddForm(false)
                setServicesToAdd([])
              }}
              closeAriaLabel="Close add services modal"
            />
            <form action={handleBulkAddSubmit} className="flex min-h-0 flex-1 flex-col">
              <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
                {bulkAddState?.message ? <p className="text-sm text-green-600">{bulkAddState.message}</p> : null}
                {servicesToAdd.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">All available services have already been added to your profile.</p>
                ) : (
                  <div className="space-y-4">
                    {servicesToAdd.map((service) => {
                      const platformService = platformServices.find(ps => ps.id === service.serviceId);
                      return (
                        <div key={service.serviceId} className="space-y-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={`service-${service.serviceId}`}
                              checked={service.selected}
                              onCheckedChange={(checked) => handleServiceSelectionChange(service.serviceId, checked as boolean)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`service-${service.serviceId}`} className="cursor-pointer text-base font-medium">
                                {platformService?.name}
                              </Label>
                              {platformService?.description ? (
                                <p className="mt-1 text-sm text-muted-foreground">{platformService.description}</p>
                              ) : null}
                            </div>
                          </div>
                          {service.selected ? (
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
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              <DialogFooter className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => { setShowBulkAddForm(false); setServicesToAdd([]); }} disabled={isBulkAddPending}>Cancel</Button>
                  <Button type="submit" variant="petCta" disabled={isBulkAddPending || servicesToAdd.filter(s => s.selected).length === 0}>
                    {isBulkAddPending ? 'Adding Services...' : 'Add Selected Services'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </ModalShell>
      </Dialog>

      <Dialog open={!!editingOffering} onOpenChange={(open) => !open && setEditingOffering(null)}>
        {editingOffering ? (
          <ModalShell maxWidth="lg" aria-labelledby="contractorEditServiceTitle">
            <div className="flex h-full min-h-0 flex-col">
              <ModalHeader
                eyebrow="Services"
                title={`Edit ${getServiceName(editingOffering.serviceId)}`}
                description="Update your price and billing type for this service."
                titleId="contractorEditServiceTitle"
                onClose={() => {
                  setEditingOffering(null)
                  setEditFormKey(prev => prev + 1)
                }}
                closeAriaLabel="Close edit service modal"
              />
              <form action={handleUpdateServiceSubmit} key={`form-${editingOffering.serviceId}-${editFormKey}`} className="flex min-h-0 flex-1 flex-col">
                <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
                  {editFormState?.message ? <p className="text-sm text-green-600">{editFormState.message}</p> : null}
                  <div>
                    <Label htmlFor={`edit-price-${editingOffering.serviceId}-${editFormKey}`}>Price (USD)</Label>
                    <Input
                      id={`edit-price-${editingOffering.serviceId}-${editFormKey}`}
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={(editingOffering.price / 100).toFixed(2)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Payment Type</Label>
                    <RadioGroup name="paymentType" defaultValue={editingOffering.paymentType || 'daily'} className="mt-2" key={`payment-${editFormKey}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id={`edit-daily-${editingOffering.serviceId}-${editFormKey}`} />
                        <Label htmlFor={`edit-daily-${editingOffering.serviceId}-${editFormKey}`} className="cursor-pointer">Daily Rate (charged per day)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one_time" id={`edit-one_time-${editingOffering.serviceId}-${editFormKey}`} />
                        <Label htmlFor={`edit-one_time-${editingOffering.serviceId}-${editFormKey}`} className="cursor-pointer">One-time Fee (flat rate)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
                <DialogFooter className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingOffering(null);
                        setEditFormKey(prev => prev + 1);
                      }}
                      disabled={isEditPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="petCta" disabled={isEditPending}>{isEditPending ? 'Saving Changes...' : 'Save Changes'}</Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </ModalShell>
        ) : null}
      </Dialog>
    </div>
  );
}
