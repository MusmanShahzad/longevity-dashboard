import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseServer, uploadConfig } from "@/lib/supabase-server"
import { extractBiomarkersFromText, extractTextFromPDF, generateBiomarkerInsights } from "@/lib/biomarker-extraction"
import { HIPAACompliance } from "@/lib/hipaa-compliance"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('user_id') as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Validate file size
    if (file.size > uploadConfig.maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds ${uploadConfig.maxFileSize / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !uploadConfig.allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type not allowed. Supported types: ${uploadConfig.allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${timestamp}-${sanitizedFileName}`

    // Upload file to Supabase storage using server client
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from(uploadConfig.bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseServer.storage
      .from(uploadConfig.bucketName)
      .getPublicUrl(filePath)

    // Save lab report to database
    const { data: labReport, error: dbError } = await supabase
      .from("lab_reports")
      .insert([
        {
          user_id: userId,
          name: file.name,
          file_url: publicUrl,
          status: "processing",
        },
      ])
      .select()
      .single()

    if (dbError) {
      // If database insert fails, clean up the uploaded file
      await supabaseServer.storage
        .from(uploadConfig.bucketName)
        .remove([filePath])
      
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // Log HIPAA audit event for lab report upload
    await HIPAACompliance.HIPAAAuditLogger.logEvent({
      event_type: 'lab_report_upload',
      user_id: userId,
      resource_type: 'lab_reports',
      resource_id: labReport.id,
      action: 'upload',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true,
      risk_level: 'medium',
      details: { 
        filename: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    })

    // Start biomarker extraction process (async)
    processBiomarkerExtraction(labReport.id, publicUrl).catch(console.error)

    return NextResponse.json({ 
      labReport,
      message: "File uploaded successfully. Biomarker extraction in progress." 
    }, { status: 201 })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Background process for biomarker extraction
async function processBiomarkerExtraction(labReportId: string, fileUrl: string) {
  try {
    // Extract text from the uploaded file
    const extractedText = await extractTextFromPDF(fileUrl)
    
    // Extract biomarkers from the text
    const biomarkerData = extractBiomarkersFromText(extractedText)
    
    // Generate health insights
    const insights = generateBiomarkerInsights(biomarkerData.biomarkers)
    
    // Update lab report with extracted data
    const { error: updateError } = await supabase
      .from("lab_reports")
      .update({
        status: "processed",
        biomarkers: biomarkerData.biomarkers,
        extraction_confidence: biomarkerData.confidence,
        health_insights: insights,
        processed_at: new Date().toISOString()
      })
      .eq("id", labReportId)

    if (updateError) {
      console.error('Failed to update lab report with biomarkers:', updateError)
      
      // Mark as error status
      await supabase
        .from("lab_reports")
        .update({ status: "error" })
        .eq("id", labReportId)
    }
    
  } catch (error) {
    console.error('Biomarker extraction failed:', error)
    
    // Mark as error status
    await supabase
      .from("lab_reports")
      .update({ status: "error" })
      .eq("id", labReportId)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("lab_reports")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ labReports: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
