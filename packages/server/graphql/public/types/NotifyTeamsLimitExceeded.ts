import type {NotifyTeamsLimitExceededResolvers} from '../resolverTypes'

const NotifyTeamsLimitExceeded: NotifyTeamsLimitExceededResolvers = {
  __isTypeOf: ({type}) => type === 'TEAMS_LIMIT_EXCEEDED',
  orgPicture: async ({orgPicture}, _args, {dataLoader}) => {
    if (!orgPicture) return null
    return dataLoader.get('fileStoreAsset').load(orgPicture)
  }
}

export default NotifyTeamsLimitExceeded
