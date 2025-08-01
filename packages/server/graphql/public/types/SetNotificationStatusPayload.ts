import type {SetNotificationStatusPayloadResolvers} from '../resolverTypes'

export type SetNotificationStatusPayloadSource = {
  notificationId: string
}

const SetNotificationStatusPayload: SetNotificationStatusPayloadResolvers = {
  notification: ({notificationId}, _args, {dataLoader}) => {
    return dataLoader.get('notifications').loadNonNull(notificationId)
  }
}

export default SetNotificationStatusPayload
