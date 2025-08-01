import getKysely from '../../../postgres/getKysely'
import {getUsersByEmails} from '../../../postgres/queries/getUsersByEmails'
import type {MutationResolvers} from '../resolverTypes'

const toggleAllowInsights: MutationResolvers['toggleAllowInsights'] = async (
  _source,
  {suggestedTier, domain, emails},
  {dataLoader}
) => {
  const pg = getKysely()
  const organizations = await dataLoader.get('organizationsByActiveDomain').load(domain)
  if (organizations.length === 0) {
    return {
      error: {
        message: `No organizations match ${domain}. First call 'setOrganizationDomain'`
      }
    }
  }
  const orgIds = organizations.map(({id}) => id)
  if (emails.length < 1) {
    return {error: {message: 'Must include at least 1 email'}}
  }
  const users = await getUsersByEmails(emails)
  if (users.length === 0) {
    return {error: {message: 'No users found using supplied emails'}}
  }
  const userIds = users.map(({id}) => id)
  const recordsReplaced = await Promise.all(
    userIds.map(async (userId) => {
      return await pg
        .updateTable('OrganizationUser')
        .set({suggestedTier})
        .where('userId', '=', userId)
        .where('orgId', 'in', orgIds)
        .where('removedAt', 'is', null)
        .returning('id')
        .execute()
    })
  )
  return {organizationUsersAffected: recordsReplaced.flat().length}
}

export default toggleAllowInsights
