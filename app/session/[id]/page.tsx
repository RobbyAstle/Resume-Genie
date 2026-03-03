import { notFound } from "next/navigation"
import { getSession, listProfiles } from "@/lib/storage"
import { SessionBuilder } from "./SessionBuilder"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [session, profiles] = await Promise.all([
    getSession(id),
    listProfiles(),
  ])

  if (!session) notFound()

  return <SessionBuilder session={session} profiles={profiles} />
}
