export interface PlatformService {
  id: string;
  name: string;
  description?: string;
  // Add any other fields relevant to a platform-defined service,
  // e.g., default price range, categories, etc.
}

export interface ContractorServiceOffering {
  serviceId: string; // Corresponds to PlatformService.id
  contractorUid: string;
  price: number; // Price set by the contractor in cents
  // Add any other contractor-specific details for this service offering
  // e.g., isActive, specific notes from contractor for this service.
} 