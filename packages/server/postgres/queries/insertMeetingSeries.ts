import getPg from '../getPg'
import {
  type IInsertMeetingSeriesQueryParams,
  insertMeetingSeriesQuery
} from './generated/insertMeetingSeriesQuery'

export const insertMeetingSeries = async (meetingSeries: IInsertMeetingSeriesQueryParams) => {
  const results = await insertMeetingSeriesQuery.run(meetingSeries, getPg())
  return results[0]!.id
}
