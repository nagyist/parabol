import graphql from 'babel-plugin-relay/macro'
import {Suspense} from 'react'
import {useFragment} from 'react-relay'
import MockScopingList from '~/modules/meeting/components/MockScopingList'
import gitlabScopingSearchResultsQuery, {
  type GitLabScopingSearchResultsQuery
} from '../__generated__/GitLabScopingSearchResultsQuery.graphql'
import type {GitLabScopingSearchResultsRoot_meeting$key} from '../__generated__/GitLabScopingSearchResultsRoot_meeting.graphql'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'
import GitLabScopingSearchResults from './GitLabScopingSearchResults'

interface Props {
  meetingRef: GitLabScopingSearchResultsRoot_meeting$key
}

export const gitlabIssueArgs = {
  sort: 'UPDATED_DESC',
  state: 'opened'
} as const

const GitLabScopingSearchResultsRoot = (props: Props) => {
  const {meetingRef} = props
  const meeting = useFragment(
    graphql`
      fragment GitLabScopingSearchResultsRoot_meeting on PokerMeeting {
        ...GitLabScopingSearchResults_meeting
        gitlabSearchQuery {
          queryString
          selectedProjectsIds
        }
        teamId
      }
    `,
    meetingRef
  )
  const {teamId, gitlabSearchQuery} = meeting
  const {queryString, selectedProjectsIds} = gitlabSearchQuery!
  const normalizedQueryString = queryString.trim()
  const normalizedSelectedProjectsIds = selectedProjectsIds?.length
    ? (selectedProjectsIds as string[])
    : null
  const queryRef = useQueryLoaderNow<GitLabScopingSearchResultsQuery>(
    gitlabScopingSearchResultsQuery,
    {
      teamId,
      queryString: normalizedQueryString,
      selectedProjectsIds: normalizedSelectedProjectsIds,
      ...gitlabIssueArgs
    }
  )
  return (
    <Suspense fallback={<MockScopingList />}>
      {queryRef && <GitLabScopingSearchResults queryRef={queryRef} meetingRef={meeting} />}
    </Suspense>
  )
}

export default GitLabScopingSearchResultsRoot
