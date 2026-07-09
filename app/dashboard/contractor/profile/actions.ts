"use server";

import { revalidatePath } from "next/cache";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore"; 
import { db } from "@/firebase";
import type { ContractorServiceOffering } from "@/types/service";

export interface ActionResponse {
  message?: string | null;
  error?: string | null;
  newOffering?: ContractorServiceOffering | null;
  newOfferings?: ContractorServiceOffering[] | null;
  updatedOfferings?: ContractorServiceOffering[] | null; 
}

// Helper to get the path for a specific service offering document
const getServiceOfferingDocRef = (contractorId: string, serviceId: string) => 
  doc(db, "contractors", contractorId, "serviceOfferings", serviceId);

// Helper to fetch all service offerings for a contractor
async function getAllOfferingsForContractor(contractorId: string): Promise<ContractorServiceOffering[]> {
  const offeringsColRef = collection(db, "contractors", contractorId, "serviceOfferings");
  const snapshot = await getDocs(offeringsColRef);
  // Map including the document ID as serviceId
  return snapshot.docs.map(docSnap => ({
    serviceId: docSnap.id,
    contractorUid: contractorId, // Add contractorId explicitly
    price: docSnap.data().price, // Assuming price is a field
    paymentType: docSnap.data().paymentType || 'daily', // Default to daily if not specified
    // Spread other potential fields from the document data
    ...docSnap.data()
  } as ContractorServiceOffering));
}

export async function addServiceOfferingAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const contractorId = formData.get("contractorId") as string;
  const serviceId = formData.get("serviceId") as string;
  const priceString = formData.get("price") as string;
  const paymentType = formData.get("paymentType") as 'one_time' | 'daily' || 'daily';

  if (!contractorId || !serviceId || !priceString) {
    return { error: "Missing required fields." };
  }

  const price = parseInt(priceString, 10);
  if (isNaN(price) || price <= 0) {
    return { error: "Invalid price. Price must be a positive number." };
  }

  if (paymentType !== 'one_time' && paymentType !== 'daily') {
    return { error: "Invalid payment type. Must be 'one_time' or 'daily'." };
  }

  const offeringData: Omit<ContractorServiceOffering, 'serviceId'> = { 
    contractorUid: contractorId, 
    price,
    paymentType,
  };

  try {
    const contractorDocRef = doc(db, "contractors", contractorId);
    const contractorSnap = await getDoc(contractorDocRef);
    if (!contractorSnap.exists()) {
        return { error: "Contractor not found." };
    }

    const serviceOfferingRef = getServiceOfferingDocRef(contractorId, serviceId);
    await setDoc(serviceOfferingRef, offeringData);

    const updatedOfferings = await getAllOfferingsForContractor(contractorId);
    revalidatePath("/dashboard/contractor/profile");
    return { 
      message: "Service offering saved successfully!", 
      newOffering: { serviceId, ...offeringData }, 
      updatedOfferings 
    };
  } catch (error) {
    console.error("Error saving service offering:", error);
    return { error: "Failed to save service. Please try again." };
  }
}

export async function updateServiceOfferingAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const contractorId = formData.get("contractorId") as string;
  const serviceId = formData.get("serviceId") as string; 
  const priceString = formData.get("price") as string;
  const paymentType = formData.get("paymentType") as 'one_time' | 'daily' || 'daily';

  if (!contractorId || !serviceId || !priceString) {
    return { error: "Missing required fields for update." };
  }

  const newPrice = parseInt(priceString, 10);
  if (isNaN(newPrice) || newPrice <= 0) {
    return { error: "Invalid price for update. Price must be a positive number." };
  }

  if (paymentType !== 'one_time' && paymentType !== 'daily') {
    return { error: "Invalid payment type. Must be 'one_time' or 'daily'." };
  }

  try {
    const serviceOfferingRef = getServiceOfferingDocRef(contractorId, serviceId);
    const serviceSnap = await getDoc(serviceOfferingRef);

    if (!serviceSnap.exists()) {
      return { error: "Service offering not found to update. It might have been deleted." };
    }

    await setDoc(serviceOfferingRef, { 
      price: newPrice,
      paymentType: paymentType
    }, { merge: true }); 

    const updatedOfferings = await getAllOfferingsForContractor(contractorId);
    revalidatePath("/dashboard/contractor/profile");
    return { 
      message: "Service price updated successfully!", 
      updatedOfferings 
    };
  } catch (error) {
    console.error("Error updating service offering:", error);
    return { error: "Failed to update service price. Please try again." };
  }
}

export async function deleteServiceOfferingAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const contractorId = formData.get("contractorId") as string;
  const serviceIdToDelete = formData.get("serviceId") as string;

  if (!contractorId || !serviceIdToDelete) {
    return { error: "Missing required fields for deletion." };
  }

  try {
    const serviceOfferingRef = getServiceOfferingDocRef(contractorId, serviceIdToDelete);
    await deleteDoc(serviceOfferingRef);

    const updatedOfferings = await getAllOfferingsForContractor(contractorId);
    revalidatePath("/dashboard/contractor/profile");
    return { 
      message: "Service deleted successfully!", 
      updatedOfferings 
    };
  } catch (error) {
    console.error("Error deleting service offering:", error);
    return { error: "Failed to delete service. Please try again." };
  }
} 

export async function addMultipleServiceOfferingsAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const contractorId = formData.get("contractorId") as string;
  const servicesData = formData.get("servicesData") as string;

  if (!contractorId || !servicesData) {
    return { error: "Missing required fields." };
  }

  let servicesToAdd: Array<{
    serviceId: string;
    price: number;
    paymentType: 'one_time' | 'daily';
  }>;

  try {
    servicesToAdd = JSON.parse(servicesData);
  } catch (error) {
    return { error: "Invalid services data format." };
  }

  if (!Array.isArray(servicesToAdd) || servicesToAdd.length === 0) {
    return { error: "No services provided to add." };
  }

  // Validate all services before adding any
  for (const service of servicesToAdd) {
    if (!service.serviceId || !service.price || service.price <= 0) {
      return { error: "Invalid service data. All services must have a valid serviceId and positive price." };
    }
    if (service.paymentType !== 'one_time' && service.paymentType !== 'daily') {
      return { error: "Invalid payment type. Must be 'one_time' or 'daily'." };
    }
  }

  try {
    const contractorDocRef = doc(db, "contractors", contractorId);
    const contractorSnap = await getDoc(contractorDocRef);
    if (!contractorSnap.exists()) {
      return { error: "Contractor not found." };
    }

    // Use a batch write to add all services atomically
    const batch = writeBatch(db);
    const newOfferings: ContractorServiceOffering[] = [];

    for (const service of servicesToAdd) {
      const offeringData: Omit<ContractorServiceOffering, 'serviceId'> = {
        contractorUid: contractorId,
        price: service.price,
        paymentType: service.paymentType,
      };

      const serviceOfferingRef = getServiceOfferingDocRef(contractorId, service.serviceId);
      batch.set(serviceOfferingRef, offeringData);

      newOfferings.push({
        serviceId: service.serviceId,
        ...offeringData,
      });
    }

    await batch.commit();

    const updatedOfferings = await getAllOfferingsForContractor(contractorId);
    revalidatePath("/dashboard/contractor/profile");
    
    return { 
      message: `Successfully added ${newOfferings.length} service${newOfferings.length > 1 ? 's' : ''}!`, 
      newOfferings,
      updatedOfferings 
    };
  } catch (error) {
    console.error("Error saving multiple service offerings:", error);
    return { error: "Failed to save services. Please try again." };
  }
} 