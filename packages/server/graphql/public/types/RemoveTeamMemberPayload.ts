import nullIfEmpty from 'parabol-client/utils/nullIfEmpty'
import type {KickedOutNotification} from '../../../postgres/types/Notification'
import {getUserId} from '../../../utils/authorization'
import type {GQLContext} from '../../graphql'
import isValid from '../../isValid'
import type {RemoveTeamMemberPayloadResolvers} from '../resolverTypes'

export type RemoveTeamMemberPayloadSource = {
  teamMemberId: string
  teamId: string
  taskIds: string[]
  userId: string
  notificationId: string
}

const RemoveTeamMemberPayload: RemoveTeamMemberPayloadResolvers = {
  teamMember: async ({teamMemberId}, _args, {dataLoader}: GQLContext) => {
    return dataLoader.get('teamMembers').loadNonNull(teamMemberId)
  },
  team: async ({teamId}, _args, {dataLoader}) => {
    return dataLoader.get('teams').loadNonNull(teamId)
  },
  updatedTasks: async (
    {taskIds}: {taskIds: string[]},
    _args: unknown,
    {authToken, dataLoader}: GQLContext
  ) => {
    if (!taskIds || taskIds.length === 0) return null
    const tasks = (await dataLoader.get('tasks').loadMany(taskIds)).filter(isValid)
    const {userId} = tasks[0]!
    const isViewer = userId === getUserId(authToken)
    const teamTasks = tasks.filter(({teamId}) => authToken.tms.includes(teamId))
    return isViewer ? teamTasks : nullIfEmpty(teamTasks.filter((p) => !p.tags.includes('private')))
  },
  user: async ({userId}, _args, {dataLoader}) => {
    return dataLoader.get('users').loadNonNull(userId)
  },
  kickOutNotification: async ({notificationId}, _args, {authToken, dataLoader}) => {
    if (!notificationId) return null
    const viewerId = getUserId(authToken)
    const notification = await dataLoader
      .get('notifications')
      .load<KickedOutNotification>(notificationId)
    if (!notification || notification.userId !== viewerId) return null
    return notification
  }
}

export default RemoveTeamMemberPayload
