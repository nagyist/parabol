import {GraphQLID, GraphQLNonNull, GraphQLObjectType} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import getKysely from '../../postgres/getKysely'
import {getUserId} from '../../utils/authorization'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import NotificationStatusEnum, {
  type NotificationStatusEnumType
} from '../types/NotificationStatusEnum'

export default {
  type: new GraphQLObjectType({
    name: 'SetNotificationStatusPayload',
    fields: {}
  }),
  description: 'set the interaction status of a notifcation',
  args: {
    notificationId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The id of the notification'
    },
    status: {
      type: new GraphQLNonNull(NotificationStatusEnum)
    }
  },
  async resolve(
    _source: unknown,
    {notificationId, status}: {notificationId: string; status: NotificationStatusEnumType},
    {authToken, dataLoader, socketId: mutatorId}: GQLContext
  ) {
    const pg = getKysely()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}

    // AUTH
    const viewerId = getUserId(authToken)
    const notification = await dataLoader.get('notifications').load(notificationId)

    if (!notification || notification.userId !== viewerId) {
      return standardError(new Error('Notification not found'), {
        userId: viewerId
      })
    }

    // RESOLUTION
    await pg.updateTable('Notification').set({status}).where('id', '=', notificationId).execute()
    // mutate dataloader cache
    notification.status = status

    const data = {notificationId}
    publish(
      SubscriptionChannel.NOTIFICATION,
      viewerId,
      'SetNotificationStatusPayload',
      data,
      subOptions
    )
    return data
  }
}
