import type {JSONContent} from '@tiptap/core'
import type {GraphQLResolveInfo} from 'graphql'
import {splitTipTapContent} from 'parabol-client/shared/tiptap/splitTipTapContent'
import type {GitHubAuth} from '../../../postgres/queries/getGitHubAuthByUserIdTeamId'
import type {
  CreateIssueMutation,
  CreateIssueMutationVariables,
  GetRepoInfoQuery,
  GetRepoInfoQueryVariables
} from '../../../types/githubTypes'
import {convertTipTapToMarkdown} from '../../../utils/convertTipTapToMarkdown'
import getGitHubRequest from '../../../utils/getGitHubRequest'
import createIssueMutation from '../../../utils/githubQueries/createIssue.graphql'
import getRepoInfo from '../../../utils/githubQueries/getRepoInfo.graphql'
import type {GQLContext} from '../../graphql'

const createGitHubTask = async (
  rawContent: JSONContent,
  repoOwner: string,
  repoName: string,
  githubAuth: GitHubAuth,
  context: GQLContext,
  info: GraphQLResolveInfo
) => {
  const {accessToken, login} = githubAuth
  const {title, bodyContent} = splitTipTapContent(rawContent)
  const body = convertTipTapToMarkdown(bodyContent)
  const githubRequest = getGitHubRequest(info, context, {
    accessToken
  })
  const [repoInfo, repoError] = await githubRequest<GetRepoInfoQuery, GetRepoInfoQueryVariables>(
    getRepoInfo,
    {
      assigneeLogin: login,
      repoName,
      repoOwner
    }
  )
  if (repoError) {
    return {error: repoError}
  }

  const {repository, user} = repoInfo
  if (!repository || !user) {
    return {
      error: new Error('GitHub repo/user not found')
    }
  }

  const {id: repositoryId} = repository
  const {id: ghAssigneeId} = user
  const [createIssueData, createIssueError] = await githubRequest<
    CreateIssueMutation,
    CreateIssueMutationVariables
  >(createIssueMutation, {
    input: {
      title,
      body,
      repositoryId,
      assigneeIds: [ghAssigneeId]
    }
  })
  if (createIssueError) {
    return {error: createIssueError}
  }

  const {createIssue} = createIssueData
  if (!createIssue) {
    return {error: new Error('GitHub create issue failed')}
  }
  const {issue} = createIssue
  if (!issue) {
    return {error: new Error('GitHub create issue failed')}
  }

  const {number: issueNumber, id: issueId} = issue

  return {issueNumber, issueId}
}

export default createGitHubTask
