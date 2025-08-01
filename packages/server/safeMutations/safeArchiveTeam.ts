import {sql} from 'kysely'
import type {DataLoaderWorker} from '../graphql/graphql'
import getKysely from '../postgres/getKysely'

const safeArchiveTeam = async (teamId: string, dataLoader: DataLoaderWorker) => {
  const pg = getKysely()
  const now = new Date()
  const teamMembers = await dataLoader.get('teamMembersByTeamId').load(teamId)
  const userIds = teamMembers.map((tm) => tm.userId)
  const [removedSuggestedActions, team] = await Promise.all([
    pg
      .updateTable('SuggestedAction')
      .set({removedAt: now})
      .where('teamId', '=', teamId)
      .returning('id')
      .execute(),
    pg
      .updateTable('Team')
      .set({isArchived: true})
      .where('id', '=', teamId)
      .returningAll()
      .executeTakeFirst(),
    pg
      .updateTable('TeamInvitation')
      .set({expiresAt: sql`CURRENT_TIMESTAMP`})
      .where('teamId', '=', teamId)
      .where('acceptedAt', 'is', null)
      .execute()
  ])
  dataLoader.clearAll(['teamMembers', 'users', 'teams'])
  const users = await Promise.all(userIds.map((userId) => dataLoader.get('users').load(userId)))
  return {
    removedSuggestedActionIds: removedSuggestedActions.map(({id}) => id),
    team: team ?? null,
    users
  }
}

export default safeArchiveTeam
