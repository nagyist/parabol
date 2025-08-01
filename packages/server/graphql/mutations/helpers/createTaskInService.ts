import type {JSONContent} from '@tiptap/core'
import type {GraphQLResolveInfo} from 'graphql'
import AzureDevOpsIssueId from 'parabol-client/shared/gqlIds/AzureDevOpsIssueId'
import GitLabIssueId from 'parabol-client/shared/gqlIds/GitLabIssueId'
import IntegrationProviderId from 'parabol-client/shared/gqlIds/IntegrationProviderId'
import GitHubIssueId from '../../../../client/shared/gqlIds/GitHubIssueId'
import GitHubRepoId from '../../../../client/shared/gqlIds/GitHubRepoId'
import IntegrationRepoId from '../../../../client/shared/gqlIds/IntegrationRepoId'
import JiraIssueId from '../../../../client/shared/gqlIds/JiraIssueId'
import JiraProjectId from '../../../../client/shared/gqlIds/JiraProjectId'
import JiraProjectKeyId from '../../../../client/shared/gqlIds/JiraProjectKeyId'
import LinearIssueId from '../../../../client/shared/gqlIds/LinearIssueId'
import {removeNodeByType} from '../../../../client/shared/tiptap/removeNodeByType'
import type {GQLContext} from '../../graphql'
import type {CreateTaskIntegrationInput} from '../createTask'
import createAzureTask from './createAzureTask'
import createGitHubTask from './createGitHubTask'
import createGitLabTask from './createGitLabTask'
import createJiraTask from './createJiraTask'
import createLinearTask from './createLinearTask'

const createTaskInService = async (
  integrationInput: CreateTaskIntegrationInput | null | undefined,
  rawContent: JSONContent,
  accessUserId: string,
  teamId: string,
  context: GQLContext,
  info: GraphQLResolveInfo
) => {
  if (!integrationInput) return {integrationHash: undefined, integration: undefined}
  const {dataLoader} = context
  const {service, serviceProjectHash} = integrationInput
  const taglessContentJSON = removeNodeByType(rawContent, 'taskTag')
  if (service === 'jira') {
    const atlassianAuth = await dataLoader
      .get('freshAtlassianAuth')
      .load({userId: accessUserId, teamId})
    if (!atlassianAuth) {
      return {
        error: new Error('Cannot create jira task without a valid jira token')
      }
    }
    const {cloudId, projectKey} = JiraProjectId.split(serviceProjectHash)
    const jiraTaskRes = await createJiraTask(taglessContentJSON, cloudId, projectKey, atlassianAuth)
    if (jiraTaskRes.error) return {error: jiraTaskRes.error}
    const {issueKey} = jiraTaskRes
    const integrationRepoId = IntegrationRepoId.join({
      cloudId,
      projectKey,
      service
    })
    return {
      integration: {
        service: 'jira' as const,
        projectKey: JiraProjectKeyId.join(issueKey),
        accessUserId,
        cloudId,
        issueKey
      },
      integrationHash: JiraIssueId.join(cloudId, issueKey),
      integrationRepoId
    }
  } else if (service === 'github') {
    const {repoOwner, repoName} = GitHubRepoId.split(serviceProjectHash)
    const githubAuth = await dataLoader.get('githubAuth').load({userId: accessUserId, teamId})
    if (!githubAuth) {
      return {
        error: new Error('Cannot create GitHub task without a valid GitHub token')
      }
    }
    const githubTaskRes = await createGitHubTask(
      taglessContentJSON,
      repoOwner,
      repoName,
      githubAuth,
      context,
      info
    )
    if (githubTaskRes.error) {
      return {error: githubTaskRes.error}
    }
    const {issueNumber} = githubTaskRes
    const integrationRepoId = IntegrationRepoId.join({
      nameWithOwner: serviceProjectHash,
      service
    })
    return {
      integration: {
        service: 'github' as const,
        accessUserId,
        nameWithOwner: serviceProjectHash,
        issueNumber
      },
      integrationHash: GitHubIssueId.join(serviceProjectHash, issueNumber),
      integrationRepoId
    }
  } else if (service === 'gitlab') {
    const gitlabAuth = await dataLoader.get('freshGitlabAuth').load({teamId, userId: accessUserId})
    if (!gitlabAuth) {
      return {
        error: new Error('Cannot create GitLab task without a valid GitLab token')
      }
    }
    const gitlabTaskRes = await createGitLabTask(
      taglessContentJSON,
      serviceProjectHash,
      gitlabAuth,
      context,
      info,
      dataLoader
    )
    if (gitlabTaskRes.error) {
      return {error: gitlabTaskRes.error}
    }
    const {gid, providerId, fullPath} = gitlabTaskRes
    const integrationRepoId = IntegrationRepoId.join({fullPath, service})
    const integrationProviderId = IntegrationProviderId.join(providerId)
    return {
      integration: {
        service: 'gitlab' as const,
        accessUserId,
        providerId: integrationProviderId,
        gid
      },
      integrationHash: GitLabIssueId.join(integrationProviderId, gid),
      integrationRepoId
    }
  } else if (service === 'azureDevOps') {
    const azureAuth = await dataLoader
      .get('freshAzureDevOpsAuth')
      .load({teamId, userId: accessUserId})
    if (!azureAuth) {
      return {
        error: new Error('Cannot create Azure task without a valid token')
      }
    }
    const azureTaskRes = await createAzureTask(
      taglessContentJSON,
      serviceProjectHash,
      azureAuth,
      dataLoader
    )
    if (azureTaskRes instanceof Error) return {error: azureTaskRes}
    const {integrationHash} = azureTaskRes
    const {instanceId, issueKey, projectKey} = AzureDevOpsIssueId.split(integrationHash)
    // TODO: fix inconsistencies with projectKey & projectId: https://github.com/ParabolInc/parabol/issues/7073
    const integrationRepoId = IntegrationRepoId.join({
      instanceId,
      projectId: projectKey,
      service
    })
    return {
      integration: {
        service: 'azureDevOps' as const,
        instanceId,
        accessUserId,
        projectKey,
        issueKey
      },
      integrationHash,
      integrationRepoId
    }
  } else if (service === 'linear') {
    const linearAuth = await dataLoader
      .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
      .load({service: 'linear', teamId, userId: accessUserId})
    if (!linearAuth?.accessToken) {
      return {
        error: new Error('Cannot create Linear task without a valid token')
      }
    }
    const linearTaskRes = await createLinearTask(
      taglessContentJSON,
      serviceProjectHash,
      linearAuth,
      context,
      info
    )
    if (linearTaskRes.error) {
      return {error: linearTaskRes.error}
    }
    const {issueId, repoId} = linearTaskRes
    const integrationRepoId = IntegrationRepoId.join({
      teamId,
      id: issueId,
      service
    })
    return {
      integration: {
        service: 'linear' as const,
        accessUserId,
        issueId,
        repoId
      },
      integrationHash: LinearIssueId.join(repoId, issueId),
      integrationRepoId
    }
  }
  return {error: new Error('Unknown integration')}
}

export default createTaskInService
