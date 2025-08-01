import type {NotifyPromoteToOrgLeaderResolvers} from '../resolverTypes'

const NotifyPromoteToOrgLeader: NotifyPromoteToOrgLeaderResolvers = {
  __isTypeOf: ({type}) => type === 'PROMOTE_TO_BILLING_LEADER',
  organization: async ({orgId}, _args, {dataLoader}) => {
    return dataLoader.get('organizations').loadNonNull(orgId)
  }
}

export default NotifyPromoteToOrgLeader
