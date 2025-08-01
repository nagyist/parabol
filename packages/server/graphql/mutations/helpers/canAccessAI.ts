import {Threshold} from 'parabol-client/types/constEnums'
import type {Team} from '../../../postgres/types'
import type {DataLoaderWorker} from '../../graphql'
import {getFeatureTier} from '../../types/helpers/getFeatureTier'

const canAccessAI = async (team: Team, dataLoader: DataLoaderWorker) => {
  const {qualAIMeetingsCount, orgId} = team
  const org = await dataLoader.get('organizations').loadNonNull(orgId)

  if (!org.useAI) return false

  if (getFeatureTier(org) !== 'starter') return true
  return qualAIMeetingsCount < Threshold.MAX_QUAL_AI_MEETINGS
}

export default canAccessAI
