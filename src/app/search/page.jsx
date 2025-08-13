'use client'

import SearchWidget from '@/app/components/search_widget'
import SignOutButton from '@/app/components/SignOutButton'

export default function SearchPage() {
  return (
    <div>
      <div className="w-full flex justify-end px-8 py-4">
        <SignOutButton />
      </div>
      <SearchWidget />
    </div>
  )
}
