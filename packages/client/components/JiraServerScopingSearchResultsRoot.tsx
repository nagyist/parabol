import graphql from 'babel-plugin-relay/macro'
import {Suspense} from 'react'
import {useFragment} from 'react-relay'
import MockScopingList from '~/modules/meeting/components/MockScopingList'
import jiraServerScopingSearchResultsQuery, {
  type JiraServerScopingSearchResultsQuery
} from '../__generated__/JiraServerScopingSearchResultsQuery.graphql'
import type {JiraServerScopingSearchResultsRoot_meeting$key} from '../__generated__/JiraServerScopingSearchResultsRoot_meeting.graphql'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'
import JiraServerScopingSearchResults from './JiraServerScopingSearchResults'

interface Props {
  meetingRef: JiraServerScopingSearchResultsRoot_meeting$key
}

const JiraServerScopingSearchResultsRoot = (props: Props) => {
  const {meetingRef} = props
  const meeting = useFragment(
    graphql`
      fragment JiraServerScopingSearchResultsRoot_meeting on PokerMeeting {
        ...JiraServerScopingSearchResults_meeting
        teamId
        jiraServerSearchQuery {
          projectKeyFilters
          queryString
          isJQL
        }
      }
    `,
    meetingRef
  )

  const {teamId, jiraServerSearchQuery} = meeting
  const {queryString, projectKeyFilters, isJQL} = jiraServerSearchQuery
  const normalizedQueryString = queryString.trim()
  const queryRef = useQueryLoaderNow<JiraServerScopingSearchResultsQuery>(
    jiraServerScopingSearchResultsQuery,
    {
      teamId,
      queryString: normalizedQueryString,
      isJQL,
      projectKeyFilters: projectKeyFilters as string[]
    }
  )

  return (
    <Suspense fallback={<MockScopingList />}>
      {queryRef && <JiraServerScopingSearchResults meetingRef={meeting} queryRef={queryRef} />}
    </Suspense>
  )
}

export default JiraServerScopingSearchResultsRoot
