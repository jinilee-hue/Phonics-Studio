export type Role = 'creator' | 'reviewer' | 'ops'
export type Kind = 'html' | 'zip' | 'video' | 'audio' | 'url'
export type Status = 'draft' | 'in_review' | 'approved' | 'rejected' | 'published'

export interface User {
  id: number
  email: string
  name: string
  role: Role
}

export interface Content {
  id: number
  title: string
  description: string
  kind: Kind
  status: Status
  entryPath: string | null
  externalUrl: string | null
  ownerId: number
  ownerName: string
  rejectReason: string | null
  createdAt: string
  submittedAt: string | null
  publishedAt: string | null
}

export interface Preview {
  url: string
  external: boolean
}
