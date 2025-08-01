import type {JSONContent} from '@tiptap/core'
import JiraIssueId from 'parabol-client/shared/gqlIds/JiraIssueId'
import JiraProjectId from 'parabol-client/shared/gqlIds/JiraProjectId'
import createJiraTask from '../../graphql/mutations/helpers/createJiraTask'
import type {AtlassianAuth} from '../../postgres/queries/getAtlassianAuthByUserIdTeamId'
import AtlassianServerManager from '../../utils/AtlassianServerManager'
import makeCreateJiraTaskComment from '../../utils/makeCreateJiraTaskComment'
import type {CreateTaskResponse, TaskIntegrationManager} from '../TaskIntegrationManagerFactory'

export default class JiraIntegrationManager
  extends AtlassianServerManager
  implements TaskIntegrationManager
{
  public title = 'Jira'
  private readonly auth: AtlassianAuth

  constructor(auth: AtlassianAuth) {
    super(auth.accessToken)
    this.auth = auth
  }

  async addCreatedBySomeoneElseComment(
    viewerName: string,
    assigneeName: string,
    teamName: string,
    teamDashboardUrl: string,
    issueId: string
  ): Promise<string | Error> {
    const {cloudId, issueKey} = JiraIssueId.split(issueId)
    const comment = makeCreateJiraTaskComment(viewerName, assigneeName, teamName, teamDashboardUrl)
    const res = await this.addComment(cloudId, issueKey, comment)
    if (res instanceof Error) {
      return res
    }
    return res.id
  }

  async createTask({
    rawContentJSON,
    integrationRepoId
  }: {
    rawContentJSON: JSONContent
    integrationRepoId: string
  }): Promise<CreateTaskResponse> {
    const {cloudId, projectKey} = JiraProjectId.split(integrationRepoId)

    const res = await createJiraTask(rawContentJSON, cloudId, projectKey, this.auth)

    if (res.error) return res.error

    const {issueKey} = res
    const integrationHash = JiraIssueId.join(cloudId, issueKey)

    return {
      integrationHash,
      issueId: integrationHash,
      integration: {
        accessUserId: this.auth.userId,
        service: 'jira',
        cloudId,
        issueKey,
        projectKey
      }
    }
  }
}
