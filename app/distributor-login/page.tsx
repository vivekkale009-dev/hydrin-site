'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { loginDistributor } from '@/app/actions/auth'
import Image from 'next/image'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      disabled={pending} 
      type="submit" 
      className="w-full bg-[#1e4d35] hover:bg-[#163a28] text-white py-3 rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg"
    >
      {pending ? 'Verifying...' : 'Access Portal'}
    </button>
  )
}

export default function LoginPage() {
  const [state, action] = useFormState(loginDistributor, null)

  return (
    // Added flex-col items-center to ensure strict centering
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbfaf8] py-12 px-4">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-stone-100 flex flex-col items-center">
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="relative w-24 h-24 mb-6">
            <Image 
              src="/EarthyLogo.JPG" 
              alt="Logo" 
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Distributor Portal</h1>
          <p className="text-stone-500">Sign in to manage your orders</p>
        </div>

        <form action={action} className="w-full space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-stone-600 ml-1">Phone Number</label>
            <input 
              name="phone" 
              type="text" 
              required 
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1e4d35] outline-none transition" 
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-stone-600 ml-1">PIN</label>
            <input 
              name="pin" 
              type="password" 
              required 
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1e4d35] outline-none transition" 
            />
          </div>
          
          {state?.error && (
            <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">{state.error}</p>
          )}
          
          <SubmitButton />
        </form>
      </div>
    </div>
  )
}