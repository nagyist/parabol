import getKysely from '../../../postgres/getKysely'
import {selectOrganizations} from '../../../postgres/select'
import type {QueryResolvers} from '../resolverTypes'

const suProOrgInfo: QueryResolvers['suProOrgInfo'] = async (_source, {includeInactive}) => {
  const pg = getKysely()
  const proOrgs = await selectOrganizations().where('tier', '=', 'team').execute()
  if (includeInactive || proOrgs.length === 0) return proOrgs

  const proOrgIds = proOrgs.map(({id}) => id)
  const pgResults = await pg
    .selectFrom('OrganizationUser as ou')
    .innerJoin('User as u', 'ou.userId', 'u.id')
    .select(['orgId', ({fn}) => fn.count<number>('id').as('orgSize')])
    .where('orgId', 'in', proOrgIds)
    .where('u.inactive', '=', false)
    .where('ou.removedAt', 'is', null)
    .groupBy('orgId')
    .having(({eb, fn}) => eb(fn.count('ou.id'), '>=', 1))
    .execute()

  const activeOrgIds = pgResults.map(({orgId}) => orgId)
  return proOrgs.filter((org) => activeOrgIds.includes(org.id))
}

export default suProOrgInfo
