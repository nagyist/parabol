import toTeamMemberId from '../../../../client/utils/relay/toTeamMemberId'
import type {Integrationproviderserviceenum} from '../../../postgres/types/pg'
import type {AddTeamMemberIntegrationAuthSuccessResolvers} from '../resolverTypes'

export type AddTeamMemberIntegrationAuthSuccessSource = {
  service: Integrationproviderserviceenum
  teamId: string
  userId: string
}

const AddTeamMemberIntegrationAuthSuccess: AddTeamMemberIntegrationAuthSuccessResolvers = {
  integrationAuth: async ({service, teamId, userId}, _args, {dataLoader}) => {
    return (await dataLoader
      .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
      .load({service, teamId, userId}))!
  },
  teamMember: ({teamId, userId}, _args, {dataLoader}) => {
    const teamMemberId = toTeamMemberId(teamId, userId)
    return dataLoader.get('teamMembers').loadNonNull(teamMemberId)
  },
  user: async ({userId}, _args, {dataLoader}) => {
    return dataLoader.get('users').loadNonNull(userId)
  }
}

export default AddTeamMemberIntegrationAuthSuccess
