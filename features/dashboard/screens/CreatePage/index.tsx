/**
 * CreatePage for Dashboard 2
 * Server component following Dashboard 1's pattern
 */

import { notFound } from 'next/navigation'
import { CreatePageClient } from './CreatePageClient'
import { getListByPath } from '../../actions/getListByPath'

interface CreatePageParams {
  params: Promise<{
    listKey: string
  }>
}

export async function CreatePage({ params }: CreatePageParams) {
  const resolvedParams = await params
  const { listKey } = resolvedParams

  const list = await getListByPath(listKey)

  // A role that cannot create in this list gets the same 404 as a missing page.
  if (!list || list.isHidden || list.hideCreate) {
    notFound()
  }

  return <CreatePageClient listKey={listKey} list={list} />
}

export default CreatePage