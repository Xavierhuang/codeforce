import { redirect } from 'next/navigation'

interface LegacyDeveloperProfilePageProps {
  params: {
    slug: string
  }
}

export default function LegacyDeveloperProfilePage({ params }: LegacyDeveloperProfilePageProps) {
  redirect(`/profile/${params.slug}`)
}

