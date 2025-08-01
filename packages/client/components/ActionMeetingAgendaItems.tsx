import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {useRef} from 'react'
import {useFragment} from 'react-relay'
import type {ActionMeetingAgendaItems_meeting$key} from '~/__generated__/ActionMeetingAgendaItems_meeting.graphql'
import useBreakpoint from '~/hooks/useBreakpoint'
import EditorHelpModalContainer from '../containers/EditorHelpModalContainer/EditorHelpModalContainer'
import MeetingCopy from '../modules/meeting/components/MeetingCopy/MeetingCopy'
import MeetingPhaseHeading from '../modules/meeting/components/MeetingPhaseHeading/MeetingPhaseHeading'
import {Breakpoint} from '../types/constEnums'
import {phaseLabelLookup} from '../utils/meetings/lookups'
import type {ActionMeetingPhaseProps} from './ActionMeeting'
import Avatar from './Avatar/Avatar'
import {type DiscussionThreadables, Header as DiscussionThreadHeader} from './DiscussionThreadList'
import DiscussionThreadListEmptyState from './DiscussionThreadListEmptyState'
import DiscussionThreadRoot from './DiscussionThreadRoot'
import MeetingContent from './MeetingContent'
import MeetingHeaderAndPhase from './MeetingHeaderAndPhase'
import MeetingTopBar from './MeetingTopBar'
import PhaseHeaderTitle from './PhaseHeaderTitle'
import PhaseWrapper from './PhaseWrapper'
import StageTimerDisplay from './StageTimerDisplay'

interface Props extends ActionMeetingPhaseProps {
  meeting: ActionMeetingAgendaItems_meeting$key
}

const AgendaVerbatim = styled('div')({
  alignItems: 'center',
  display: 'flex',
  margin: '0 auto'
})

const StyledHeading = styled(MeetingPhaseHeading)({
  marginLeft: 16,
  fontSize: 24
})

const StyledCopy = styled(MeetingCopy)({
  margin: '16px 0 0'
})

const ThreadColumn = styled('div')<{isDesktop: boolean}>(({isDesktop}) => ({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  height: '100%',
  overflow: 'auto',
  paddingTop: 4,
  paddingBottom: isDesktop ? 16 : 8,
  width: '100%',
  maxWidth: 700
}))

const ActionMeetingAgendaItems = (props: Props) => {
  const {avatarGroup, toggleSidebar, meeting: meetingRef} = props
  const meeting = useFragment(
    graphql`
      fragment ActionMeetingAgendaItems_meeting on ActionMeeting {
        ...StageTimerDisplay_meeting
        ...StageTimerControl_meeting
        showSidebar
        endedAt
        facilitatorUserId
        phases {
          stages {
            ...ActionMeetingAgendaItemsStage @relay(mask: false)
          }
        }
        localStage {
          ...ActionMeetingAgendaItemsStage @relay(mask: false)
        }
      }
    `,
    meetingRef
  )
  const {showSidebar, endedAt, localStage} = meeting
  const {agendaItem, discussionId} = localStage
  const isDesktop = useBreakpoint(Breakpoint.SINGLE_REFLECTION_COLUMN)
  const meetingContentRef = useRef<HTMLDivElement>(null)
  // optimistic updater could remove the agenda item
  if (!agendaItem) return null
  const {content, teamMember} = agendaItem
  const {user} = teamMember
  const {picture, preferredName} = user
  const allowedThreadables: DiscussionThreadables[] = endedAt ? [] : ['comment', 'task', 'poll']
  return (
    <MeetingContent ref={meetingContentRef}>
      <MeetingHeaderAndPhase hideBottomBar={!!endedAt}>
        <MeetingTopBar
          avatarGroup={avatarGroup}
          isMeetingSidebarCollapsed={!showSidebar}
          toggleSidebar={toggleSidebar}
        >
          <PhaseHeaderTitle>{phaseLabelLookup.agendaitems}</PhaseHeaderTitle>
        </MeetingTopBar>
        <PhaseWrapper>
          <AgendaVerbatim>
            <Avatar picture={picture} className={'h-16 w-16'} />
            <StyledHeading>{content}</StyledHeading>
          </AgendaVerbatim>
          <StyledCopy>{`${preferredName}, what do you need?`}</StyledCopy>
          <StageTimerDisplay meeting={meeting} />
          <ThreadColumn isDesktop={isDesktop}>
            <DiscussionThreadRoot
              meetingContentRef={meetingContentRef}
              discussionId={discussionId!}
              allowedThreadables={allowedThreadables}
              header={
                <DiscussionThreadHeader>{'Discussion & Takeaway Tasks'}</DiscussionThreadHeader>
              }
              emptyState={
                <DiscussionThreadListEmptyState
                  allowTasks={true}
                  isReadOnly={allowedThreadables.length === 0}
                />
              }
            />
          </ThreadColumn>
          <EditorHelpModalContainer />
        </PhaseWrapper>
      </MeetingHeaderAndPhase>
    </MeetingContent>
  )
}

graphql`
  fragment ActionMeetingAgendaItemsStage on AgendaItemsStage {
    discussionId
    agendaItem {
      content
      teamMember {
        user {
          picture
          preferredName
        }
      }
    }
  }
`

export default ActionMeetingAgendaItems
