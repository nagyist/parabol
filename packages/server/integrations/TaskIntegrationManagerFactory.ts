import type {JSONContent} from '@tiptap/core'
import type {GraphQLResolveInfo} from 'graphql'
import type {DataLoaderWorker, GQLContext} from '../graphql/graphql'
import type {IntegrationProviderServiceEnumType} from '../graphql/types/IntegrationProviderServiceEnum'
import type {
  IntegrationProviderAzureDevOps,
  IntegrationProviderJiraServer
} from '../postgres/queries/getIntegrationProvidersByIds'
import type {Task} from '../postgres/types'
import AzureDevOpsServerManager from '../utils/AzureDevOpsServerManager'
import GitHubServerManager from './github/GitHubServerManager'
import GitLabServerManager from './gitlab/GitLabServerManager'
import JiraIntegrationManager from './jira/JiraIntegrationManager'
import JiraServerRestManager from './jiraServer/JiraServerRestManager'
import LinearServerManager from './linear/LinearServerManager'

export type CreateTaskResponse =
  | {
      integrationHash: string
      // TODO: include issueId for GitHub in hash or store integration.issueId for all integrations
      // See https://github.com/ParabolInc/parabol/issues/6252
      issueId: string
      integration: NonNullable<Task['integration']>
    }
  | Error

export interface TaskIntegrationManager {
  title: string

  createTask(params: {
    rawContentJSON: JSONContent
    integrationRepoId: string
    context?: GQLContext
    info?: GraphQLResolveInfo
  }): Promise<CreateTaskResponse>

  addCreatedBySomeoneElseComment(
    viewerName: string,
    assigneeName: string,
    teamName: string,
    teamDashboardUrl: string,
    issueId: string,
    integrationHash?: string
  ): Promise<string | Error>
}

export default class TaskIntegrationManagerFactory {
  public static async initManager(
    dataLoader: DataLoaderWorker,
    service: IntegrationProviderServiceEnumType,
    {teamId, userId}: {teamId: string; userId: string},
    context: GQLContext,
    info: GraphQLResolveInfo
  ): Promise<
    | JiraIntegrationManager
    | GitHubServerManager
    | JiraServerRestManager
    | GitLabServerManager
    | AzureDevOpsServerManager
    | LinearServerManager
    | null
  > {
    if (service === 'jira') {
      const auth = await dataLoader.get('freshAtlassianAuth').load({teamId, userId})
      return auth && new JiraIntegrationManager(auth)
    }

    if (service === 'github') {
      const auth = await dataLoader.get('githubAuth').load({teamId, userId})
      return auth && new GitHubServerManager(auth, context, info)
    }

    if (service === 'gitlab') {
      const auth = await dataLoader.get('freshGitlabAuth').load({teamId, userId})
      if (!auth) return null
      const {providerId} = auth
      const provider = await dataLoader.get('integrationProviders').load(providerId)
      if (!provider?.serverBaseUrl) return null
      return new GitLabServerManager(auth, context, info, provider.serverBaseUrl)
    }

    if (service === 'jiraServer') {
      const auth = await dataLoader
        .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
        .load({service: 'jiraServer', teamId, userId})

      if (!auth) {
        return null
      }
      const provider = await dataLoader.get('integrationProviders').loadNonNull(auth.providerId)

      return new JiraServerRestManager(auth, provider as IntegrationProviderJiraServer)
    }

    if (service === 'azureDevOps') {
      const auth = await dataLoader
        .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
        .load({service: 'azureDevOps', teamId, userId})

      if (!auth) {
        return null
      }
      const provider = await dataLoader.get('integrationProviders').loadNonNull(auth.providerId)

      return new AzureDevOpsServerManager(auth, provider as IntegrationProviderAzureDevOps)
    }

    if (service === 'linear') {
      const auth = await dataLoader
        .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
        .load({service: 'linear', teamId, userId})

      if (!auth) {
        return null
      }

      return new LinearServerManager(auth, context, info)
    }

    return null
  }
}
