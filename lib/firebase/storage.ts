import { storage } from '@/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file File to upload
 * @param path Path in the storage bucket (e.g. 'avatars/userId.jpg')
 * @returns Download URL string
 */
export async function uploadFileToStorage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
} 