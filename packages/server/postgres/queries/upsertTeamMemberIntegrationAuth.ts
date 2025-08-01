import getPg from '../getPg'
import {
  type IntegrationProviderServiceEnum,
  upsertTeamMemberIntegrationAuthQuery
} from './generated/upsertTeamMemberIntegrationAuthQuery'

interface ITeamMemberIntegrationAuthBaseInput {
  service: IntegrationProviderServiceEnum
  providerId: number
  teamId: string
  userId: string
}

export interface ITeamMemberIntegrationAuthOAuth1Input extends ITeamMemberIntegrationAuthBaseInput {
  accessToken: string
  accessTokenSecret: string
}

export interface ITeamMemberIntegrationAuthOAuth2Input extends ITeamMemberIntegrationAuthBaseInput {
  accessToken: string
  refreshToken: string | undefined
  scopes: string
  expiresAt: Date | null
}

type ITeamMemberIntegrationAuthInput =
  | ITeamMemberIntegrationAuthOAuth1Input
  | ITeamMemberIntegrationAuthOAuth2Input
  | ITeamMemberIntegrationAuthBaseInput

const upsertTeamMemberIntegrationAuth = async (auth: ITeamMemberIntegrationAuthInput) => {
  return upsertTeamMemberIntegrationAuthQuery.run({auth} as any, getPg())
}
export default upsertTeamMemberIntegrationAuth
