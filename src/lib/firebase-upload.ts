import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export async function uploadFile(file: File, folder: string = "uploads", onProgress?: (progress: number) => void) {
  const storage = getStorage();
  const fileId = uuidv4();
  const ext = file.name.split('.').pop();
  const storageRef = ref(storage, `${folder}/${fileId}.${ext}`);
  
  // If we have a progress callback, use resumable upload
  if (onProgress) {
    return new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  }
  
  // Otherwise use simple upload
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
