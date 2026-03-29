import { NextResponse } from "next/server"

import { resolveRepositoryView } from "@/lib/repository-service"

type RouteProps = {
  params: Promise<{
    owner: string
    repo: string
  }>
}

export async function GET(_: Request, { params }: RouteProps) {
  const { owner, repo } = await params
  const view = await resolveRepositoryView(owner, repo)
  return NextResponse.json(view)
}
