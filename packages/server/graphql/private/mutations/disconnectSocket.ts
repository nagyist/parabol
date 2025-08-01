import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import {analytics} from '../../../utils/analytics/analytics'
import getListeningUserIds, {RedisCommand} from '../../../utils/getListeningUserIds'
import getRedis from '../../../utils/getRedis'
import publish from '../../../utils/publish'
import type {UserPresence} from '../../private/mutations/connectSocket'
import type {MutationResolvers} from '../resolverTypes'

const disconnectSocket: MutationResolvers['disconnectSocket'] = async (
  _source,
  {userId, socketId},
  {dataLoader}
) => {
  const redis = getRedis()

  // RESOLUTION
  const [user, userPresence] = await Promise.all([
    dataLoader.get('users').load(userId),
    redis.lrange(`presence:${userId}`, 0, -1)
  ])
  if (!user) {
    // user could've been deleted & then key not wiped
    await redis.del(`presence:${userId}`)
    throw new Error(`User does not exist: ${userId}`)
  }
  const tms = user.tms ?? []
  const disconnectingSocket = userPresence.find(
    (socket) => (JSON.parse(socket) as UserPresence).socketId === socketId
  )
  if (!disconnectingSocket) {
    // this happens a lot on server restart in dev mode
    if (!__PRODUCTION__) return {user}
    throw new Error(`Called disconnect without a valid socket: ${socketId}`)
  }
  await redis.lrem(`presence:${userId}`, 0, disconnectingSocket)

  // If this is the last socket, tell everyone they're offline
  if (userPresence.length === 1) {
    const listeningUserIds = await getListeningUserIds(RedisCommand.REMOVE, tms, userId)
    const subOptions = {mutatorId: socketId}
    const data = {user}
    listeningUserIds.forEach((onlineUserId) => {
      publish(
        SubscriptionChannel.NOTIFICATION,
        onlineUserId,
        'DisconnectSocketPayload',
        data,
        subOptions
      )
    })
  }
  analytics.websocketDisconnected(user, {
    socketCount: userPresence.length,
    socketId,
    tms
  })
  return {user}
}

export default disconnectSocket
