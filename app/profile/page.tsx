'use server'

import { redirect } from 'next/navigation'

export default function LegacyProfileListing() {
  redirect('/experts')
}
