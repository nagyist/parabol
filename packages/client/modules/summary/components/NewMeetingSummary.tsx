import graphql from 'babel-plugin-relay/macro'
import {useEffect} from 'react'
import {type PreloadedQuery, usePreloadedQuery} from 'react-relay'
import type {NewMeetingSummaryQuery} from '../../../__generated__/NewMeetingSummaryQuery.graphql'
import MeetingLockedOverlay from '../../../components/MeetingLockedOverlay'
import useDocumentTitle from '../../../hooks/useDocumentTitle'
import useRouter from '../../../hooks/useRouter'
import useSnacksForNewMeetings from '../../../hooks/useSnacksForNewMeetings'
import {APP_CORS_OPTIONS} from '../../../types/cors'
import {MEETING_SUMMARY_LABEL} from '../../../utils/constants'
import isDemoRoute from '../../../utils/isDemoRoute'
import makeHref from '../../../utils/makeHref'
import {demoTeamId} from '../../demo/initDB'
import MeetingSummaryEmail from '../../email/components/SummaryEmail/MeetingSummaryEmail/MeetingSummaryEmail'

interface Props {
  queryRef: PreloadedQuery<NewMeetingSummaryQuery>
  urlAction?: 'csv' | undefined
}

const query = graphql`
  query NewMeetingSummaryQuery($meetingId: ID!, $first: Int!, $after: DateTime, $nullId: ID) {
    ...DashTopBar_query
    viewer {
      ...DashSidebar_viewer
      meeting(meetingId: $meetingId) {
        ...MeetingSummaryEmail_meeting
        ...MeetingLockedOverlay_meeting
        id
        team {
          id
          name
        }
        name
      }
      teams {
        activeMeetings {
          ...useSnacksForNewMeetings_meetings
        }
      }
    }
  }
`

const NewMeetingSummary = (props: Props) => {
  const {urlAction, queryRef} = props
  const data = usePreloadedQuery<NewMeetingSummaryQuery>(query, queryRef)
  const {viewer} = data
  const {meeting: newMeeting, teams} = viewer
  const activeMeetings = teams.flatMap((team) => team.activeMeetings).filter(Boolean)
  const {history} = useRouter()
  useEffect(() => {
    if (!newMeeting) {
      history.replace('/meetings')
    }
  }, [history, newMeeting])
  if (!newMeeting) {
    return null
  }

  const {id: meetingId, name: meetingName, team} = newMeeting
  const {id: teamId, name: teamName} = team
  const title = `${meetingName} ${MEETING_SUMMARY_LABEL} | ${teamName}`
  // biome-ignore lint/correctness/useHookAtTopLevel: legacy
  useDocumentTitle(title, 'Summary')
  const meetingUrl = makeHref(`/meet/${meetingId}`)
  const teamDashUrl = `/team/${teamId}/tasks`
  const emailCSVUrl = isDemoRoute()
    ? `/retrospective-demo-summary/csv`
    : `/new-summary/${meetingId}/csv`
  // biome-ignore lint/correctness/useHookAtTopLevel: legacy
  useSnacksForNewMeetings(activeMeetings as any)
  return (
    <div className='flex h-full flex-1 overflow-auto bg-slate-200'>
      <div className='h-full w-full overflow-auto'>
        <MeetingSummaryEmail
          appOrigin={window.location.origin}
          urlAction={urlAction}
          isDemo={teamId === demoTeamId}
          meeting={newMeeting}
          referrer='meeting'
          meetingUrl={meetingUrl}
          teamDashUrl={teamDashUrl}
          emailCSVUrl={emailCSVUrl}
          corsOptions={APP_CORS_OPTIONS}
        />
      </div>
      <MeetingLockedOverlay meetingRef={newMeeting} />
    </div>
  )
}

export default NewMeetingSummary
