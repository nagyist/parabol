import isCompanyDomain from './isCompanyDomain'
import getRethink from '../database/rethinkDriver'
import {RDatum} from '../database/stricterR'
import isUserVerified from './isUserVerified'
import User from '../database/types/User'

export const getEligibleOrgIdsByDomain = async (
  activeDomain: string,
  userId: string,
  limit?: number
) => {
  const BIG_ENOUGH_LIMIT = 9999

  if (!isCompanyDomain(activeDomain)) {
    return []
  }

  const r = await getRethink()

  return r
    .table('Organization')
    .getAll(activeDomain, {index: 'activeDomain'})
    .filter((org: RDatum) => org('featureFlags').contains('promptToJoinOrg'))
    .filter((org: RDatum) =>
      r
        .table('OrganizationUser')
        .getAll(org('id'), {index: 'orgId'})
        .filter({inactive: false, removedAt: null})
        .coerceTo('array')
        .do((orgUsers: RDatum) =>
          orgUsers
            .count()
            .gt(1)
            .and(orgUsers.filter((ou: RDatum) => ou('userId').eq(userId)).isEmpty())
        )
    )
    .limit(limit ?? BIG_ENOUGH_LIMIT)('id')
    .run()
}

const isRequestToJoinDomainAllowed = async (domain: string, user: User) => {
  if (!isUserVerified(user)) return false

  const orgIds = await getEligibleOrgIdsByDomain(domain, user.id, 1)
  return orgIds.length > 0
}

export default isRequestToJoinDomainAllowed
