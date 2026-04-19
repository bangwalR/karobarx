import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getProfileId } from '@/lib/profile'

// GET - Fetch field configuration for a table
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const visibleOnly = searchParams.get('visibleOnly') === 'true'
    const profileId = getProfileId(request)

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    let query = supabase
      .from('field_config')
      .select('*')
      .eq('profile_id', profileId)
      .order('display_order', { ascending: true })

    if (table) {
      query = query.eq('table_name', table)
    }

    if (visibleOnly) {
      query = query.eq('is_visible', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching field config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      fields: data || [] 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update field configuration
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { table_name, field_name, field_label, field_type, is_visible, is_required, display_order, options, placeholder, default_value, section, is_system } = body
    const profileId = getProfileId(request)

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    const fieldData = {
      table_name,
      field_name,
      field_label,
      field_type: field_type || 'text',
      is_system: is_system ?? false,
      is_visible: is_visible ?? true,
      is_required: is_required ?? false,
      display_order: display_order ?? 0,
      options: options || null,
      placeholder: placeholder || null,
      default_value: default_value || null,
      section: section || 'general',
      updated_at: new Date().toISOString(),
      profile_id: profileId,
    }

    // Check if record already exists
    const { data: existing } = await supabase
      .from('field_config')
      .select('id')
      .eq('table_name', table_name)
      .eq('field_name', field_name)
      .eq('profile_id', profileId)
      .maybeSingle()

    let data, error
    if (existing) {
      ;({ data, error } = await supabase
        .from('field_config')
        .update(fieldData)
        .eq('id', existing.id)
        .select()
        .single())
    } else {
      ;({ data, error } = await supabase
        .from('field_config')
        .insert(fieldData)
        .select()
        .single())
    }

    if (error) {
      console.error('Error saving field config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, field: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Bulk update field configurations
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { fields } = body

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Fields array required' }, { status: 400 })
    }

    const profileId = getProfileId(request)

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    // Update each field
    const results = []
    for (const field of fields) {
      // Check existence
      const { data: existing } = await supabase
        .from('field_config')
        .select('id')
        .eq('table_name', field.table_name)
        .eq('field_name', field.field_name)
        .eq('profile_id', profileId)
        .maybeSingle()

      const fieldData = {
        ...field,
        updated_at: new Date().toISOString(),
        profile_id: profileId,
      }

      let data, error
      if (existing) {
        ;({ data, error } = await supabase
          .from('field_config')
          .update(fieldData)
          .eq('id', existing.id)
          .select()
          .single())
      } else {
        ;({ data, error } = await supabase
          .from('field_config')
          .insert(fieldData)
          .select()
          .single())
      }

      if (error) {
        results.push({ field: field.field_name, error: error.message })
      } else {
        results.push({ field: field.field_name, success: true, data })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a custom field (only non-system fields)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const table = searchParams.get('table')
    const field = searchParams.get('field')

    if (id) {
      // First check if it's a system field
      const { data: existing } = await supabase
        .from('field_config')
        .select('is_system')
        .eq('id', id)
        .single()

      if (existing?.is_system) {
        return NextResponse.json({ error: 'Cannot delete system fields' }, { status: 400 })
      }

      const { error } = await supabase
        .from('field_config')
        .delete()
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (table && field) {
      // First check if it's a system field
      const { data: existing } = await supabase
        .from('field_config')
        .select('is_system')
        .eq('table_name', table)
        .eq('field_name', field)
        .single()

      if (existing?.is_system) {
        return NextResponse.json({ error: 'Cannot delete system fields. You can hide them instead.' }, { status: 400 })
      }

      const { error } = await supabase
        .from('field_config')
        .delete()
        .eq('table_name', table)
        .eq('field_name', field)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Field ID or table+field required' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
