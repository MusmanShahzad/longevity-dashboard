import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const limit = searchParams.get("limit")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    let query = supabase
      .from("health_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("sleep_date", { ascending: false }) // Order by sleep_date instead of created_at
      .order("created_at", { ascending: false }) // Secondary sort by created_at

    if (limit) {
      query = query.limit(Number.parseInt(limit))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ alerts: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, type, title, description, suggestion, sleep_date } = body

    const { data, error } = await supabase
      .from("health_alerts")
      .insert([
        {
          user_id,
          type,
          title,
          description,
          suggestion,
          sleep_date: sleep_date || new Date().toISOString().split("T")[0], // Default to today if not provided
          is_read: false,
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ alert: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
