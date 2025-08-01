import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {type RefObject, useMemo} from 'react'
import {useFragment} from 'react-relay'
import type {MeetingsDash_viewer$key} from '~/__generated__/MeetingsDash_viewer.graphql'
import useAtmosphere from '../hooks/useAtmosphere'
import useBreakpoint from '../hooks/useBreakpoint'
import useCardsPerRow from '../hooks/useCardsPerRow'
import useDocumentTitle from '../hooks/useDocumentTitle'
import useTransition from '../hooks/useTransition'
import {Breakpoint, EmptyMeetingViewMessage, Layout} from '../types/constEnums'
import getSafeRegex from '../utils/getSafeRegex'
import {useQueryParameterParser} from '../utils/useQueryParameterParser'
import DemoMeetingCard from './DemoMeetingCard'
import MeetingCard from './MeetingCard'
import MeetingsDashEmpty from './MeetingsDashEmpty'
import MeetingsDashHeader from './MeetingsDashHeader'
import StartMeetingFAB from './StartMeetingFAB'
import TutorialMeetingCard from './TutorialMeetingCard'

interface Props {
  meetingsDashRef: RefObject<HTMLDivElement>
  viewer: MeetingsDash_viewer$key | null
}

const Wrapper = styled('div')<{maybeTabletPlus: boolean}>(({maybeTabletPlus}) => ({
  padding: maybeTabletPlus ? 0 : 16,
  display: 'flex',
  flexWrap: 'wrap',
  position: 'relative'
}))

const EmptyContainer = styled('div')({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  height: '100%',
  maxWidth: Layout.TASK_COLUMNS_MAX_WIDTH,
  padding: '16px 8px',
  position: 'relative'
})

const MeetingsDash = (props: Props) => {
  const {meetingsDashRef, viewer: viewerRef} = props
  const viewer = useFragment(
    graphql`
      fragment MeetingsDash_viewer on User {
        id
        dashSearch
        preferredName
        teams {
          ...MeetingsDashActiveMeetings @relay(mask: false)
        }
        ...MeetingsDashHeader_viewer
      }
    `,
    viewerRef
  )
  const atmosphere = useAtmosphere()
  const {teamIds: teamFilterIds} = useQueryParameterParser(atmosphere.viewerId)
  const {teams = [], preferredName = '', dashSearch} = viewer ?? {}
  const activeMeetings = useMemo(() => {
    const meetingSeriesMeetings = teams
      .flatMap((team) => team.activeMeetingSeries)
      .filter((meetingSeries) => !meetingSeries.cancelledAt)
      .sort((a, b) => {
        return a.createdAt > b.createdAt ? -1 : 1
      })
      .map((meetingSeries) => meetingSeries.mostRecentMeeting)
    const otherActiveMeetings = teams
      .flatMap((team) => team.activeMeetings)
      .filter(Boolean)
      .filter((meeting) => !meeting.meetingSeries || meeting.meetingSeries.cancelledAt)
      .sort((a, b) => {
        return a.createdAt > b.createdAt ? -1 : 1
      })
    return [...meetingSeriesMeetings, ...otherActiveMeetings]
  }, [teams])
  const filteredMeetings = useMemo(() => {
    const searchedMeetings = dashSearch
      ? activeMeetings.filter(({name}) => name && name.match(getSafeRegex(dashSearch, 'i')))
      : activeMeetings
    const filteredMeetings = teamFilterIds
      ? searchedMeetings.filter((node) => teamFilterIds.includes(node.teamId))
      : searchedMeetings
    return filteredMeetings.map((meeting, displayIdx) => ({
      ...meeting,
      key: meeting.id,
      displayIdx
    }))
  }, [activeMeetings, dashSearch, teamFilterIds])
  const transitioningMeetings = useTransition(filteredMeetings)
  const maybeTabletPlus = useBreakpoint(Breakpoint.FUZZY_TABLET)
  const cardsPerRow = useCardsPerRow(meetingsDashRef)
  const hasFilteredMeetings = filteredMeetings.length > 0
  useDocumentTitle('Meetings | Parabol', 'Meetings')
  if (!viewer || !cardsPerRow) return null

  return (
    <>
      <MeetingsDashHeader viewerRef={viewer} />
      {hasFilteredMeetings ? (
        <Wrapper maybeTabletPlus={maybeTabletPlus}>
          {transitioningMeetings.map((meeting) => {
            const {child} = meeting
            const {id, displayIdx} = child
            return (
              <MeetingCard
                key={id}
                displayIdx={displayIdx}
                meeting={meeting.child}
                onTransitionEnd={meeting.onTransitionEnd}
                status={meeting.status}
              />
            )
          })}
        </Wrapper>
      ) : (
        <EmptyContainer>
          <MeetingsDashEmpty
            name={preferredName}
            message={
              dashSearch
                ? EmptyMeetingViewMessage.NO_SEARCH_RESULTS_ON_THE_TEAM
                : EmptyMeetingViewMessage.NO_ACTIVE_MEETINGS_ON_THE_TEAM
            }
            isTeamFilterSelected={!!teamFilterIds}
          />
          {!teamFilterIds ? (
            <Wrapper maybeTabletPlus={maybeTabletPlus}>
              <DemoMeetingCard />
              <TutorialMeetingCard type='retro' />
              <TutorialMeetingCard type='standup' />
              <TutorialMeetingCard type='poker' />
            </Wrapper>
          ) : null}
        </EmptyContainer>
      )}
      <StartMeetingFAB />
    </>
  )
}

graphql`
  fragment MeetingsDash_meeting on NewMeeting {
    ...MeetingCard_meeting
    ...useSnacksForNewMeetings_meetings
    id
    teamId
    name
    createdAt
  }
`

graphql`
  fragment MeetingsDashActiveMeetings on Team {
    activeMeetings {
      ...MeetingsDash_meeting @relay(mask: false)
      meetingSeries {
        createdAt
        cancelledAt
      }
    }
    activeMeetingSeries {
      id
      createdAt
      cancelledAt
      mostRecentMeeting {
        ...MeetingsDash_meeting @relay(mask: false)
      }
    }
  }
`

export default MeetingsDash
