import getPg from '../getPg'
import {getPollsByIdsQuery, type IGetPollsByIdsQueryResult} from './generated/getPollsByIdsQuery'

export interface Poll extends IGetPollsByIdsQueryResult {}

const getPollsByIds = async (ids: readonly number[]) => getPollsByIdsQuery.run({ids}, getPg())

export default getPollsByIds
