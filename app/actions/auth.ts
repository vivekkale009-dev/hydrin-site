'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginDistributor(prevState: any, formData: FormData) {
  const phone = formData.get('phone') as string
  const pin = formData.get('pin') as string
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('distributors')
    .select('id, name')
    .eq('phone', phone)
    .eq('PIN', pin)
    .single()

  if (error || !data) {
    return { error: 'Invalid phone number or PIN' }
  }

  redirect('/dashboard')
}