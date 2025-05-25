import { supabase } from "@/lib/supabase"

// Check if a bucket exists
export async function checkBucketExists(bucketName: string) {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) throw error
    
    return data.some(bucket => bucket.name === bucketName)
  } catch (error) {
    console.error('Error checking bucket:', error)
    return false
  }
}

export async function uploadFile(file: File, bucket: string, path: string) {
  try {
    // Check if bucket exists first
    const bucketExists = await checkBucketExists(bucket)
    if (!bucketExists) {
      throw new Error(`Bucket '${bucket}' not found. Please create it in your Supabase dashboard under Storage.`)
    }

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      throw error
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)

    return {
      success: true,
      data: {
        path: data.path,
        publicUrl,
      },
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

export async function deleteFile(bucket: string, path: string) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    }
  }
}

export function getFileUrl(bucket: string, path: string) {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}
