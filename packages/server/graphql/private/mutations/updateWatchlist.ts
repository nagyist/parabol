import getUsersByDomain from '../../../postgres/queries/getUsersByDomain'
import {getUsersByEmails} from '../../../postgres/queries/getUsersByEmails'
import updateUser from '../../../postgres/queries/updateUser'
import type {MutationResolvers} from '../resolverTypes'

const updateWatchlist: MutationResolvers['updateWatchlist'] = async (
  _source,
  {includeInWatchlist, emails, domain}
) => {
  // RESOLUTION
  const users = [] as Awaited<ReturnType<typeof getUsersByEmails>>
  if (emails) {
    const usersByEmail = await getUsersByEmails(emails)
    users.push(...usersByEmail)
  }
  if (domain) {
    const usersByDomain = await getUsersByDomain(domain)
    users.push(...usersByDomain)
  }
  const userIds = users.map(({id}) => id).filter((id): id is string => !!id)
  if (users.length === 0) {
    return {
      error: {message: 'No users found matching the email or domain'}
    }
  }
  await updateUser({isWatched: includeInWatchlist}, userIds)

  return {success: true}
}

export default updateWatchlist
