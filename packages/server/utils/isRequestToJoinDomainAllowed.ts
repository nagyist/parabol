import isCompanyDomain from './isCompanyDomain'
import getRethink from '../database/rethinkDriver'
import {RDatum} from '../database/stricterR'
import isUserVerified from './isUserVerified'
import User from '../database/types/User'
import {DataLoaderWorker} from '../graphql/graphql'
import isValid from '../graphql/isValid'

export const getEligibleOrgIdsByDomain = async (
  activeDomain: string,
  userId: string,
  dataLoader: DataLoaderWorker,
) => {
  if (!isCompanyDomain(activeDomain)) {
    return []
  }

  const r = await getRethink()

  const orgs = await r
    .table('Organization')
    .getAll(activeDomain, {index: 'activeDomain'})
    .merge((org: RDatum) => ({
      members: r
      .table('OrganizationUser')
      .getAll(org('id'), {index: 'orgId'})
      .orderBy('joinedAt').coerceTo('array')
    }))
    .merge((org: RDatum) => ({
      founder: org('members').limit(1),
      billingLeads: org('members').filter({role: 'BILLING_LEADER', inactive: false}),
      activeMembers: org('members').filter({inactive: false, removedAt: null}).count()
    }))
    .filter((org: RDatum) => org('activeMembers').gt(0).and(org('members').filter({userId}).isEmpty()))
    .run()

  const eligibleOrgs = await Promise.all(orgs.map(async (org) => {
    const {founder} = org
    const importentMembers = org.billingLeads
    if (!founder.inactive && !founder.removedAt) {
      importentMembers.push(founder)
    }

    const users = (await dataLoader.get('users').loadMany(importentMembers.map(({userId}) => userId))).filter(isValid)
    if (!users.find(isUserVerified)) {
      return null
    }
    return org
  }))
  console.log('GEORG orgs', orgs, eligibleOrgs)
  return eligibleOrgs.filter(isValid).map(({id}) => id)
}

const isRequestToJoinDomainAllowed = async (domain: string, user: User, dataLoader: DataLoaderWorker) => {
  if (!isUserVerified(user)) return false

  const orgIds = await getEligibleOrgIdsByDomain(domain, user.id, dataLoader)
  return orgIds.length > 0
}

export default isRequestToJoinDomainAllowed
