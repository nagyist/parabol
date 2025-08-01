import getKysely from '../../../postgres/getKysely'
import type {QueryResolvers} from '../resolverTypes'

const getAllFeatureFlags: QueryResolvers['getAllFeatureFlags'] = async () => {
  const pg = getKysely()

  return await pg.selectFrom('FeatureFlag').selectAll().orderBy('featureName').execute()
}

export default getAllFeatureFlags
