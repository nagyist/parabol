import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {useEffect} from 'react'
import {useFragment} from 'react-relay'
import type {BottomControlBarTips_meeting$key} from '~/__generated__/BottomControlBarTips_meeting.graphql'
import {MenuPosition} from '~/hooks/useCoords'
import useMenu from '~/hooks/useMenu'
import useTimeout from '~/hooks/useTimeout'
import type {TransitionStatus} from '~/hooks/useTransition'
import type LocalAtmosphere from '~/modules/demo/LocalAtmosphere'
import lazyPreload, {type LazyExoticPreload} from '~/utils/lazyPreload'
import type {NewMeetingPhaseTypeEnum} from '../__generated__/BottomControlBarTips_meeting.graphql'
import useAtmosphere from '../hooks/useAtmosphere'
import isDemoRoute from '../utils/isDemoRoute'
import BottomNavControl from './BottomNavControl'
import BottomNavIconLabel from './BottomNavIconLabel'
import Menu from './Menu'

const TallMenu = styled(Menu)({
  maxHeight: 320
})

const CheckInHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'CheckInHelpMenu' */ './MeetingHelp/CheckInHelpMenu')
)
const TeamHealthHelpMenu = lazyPreload(
  async () =>
    import(/* webpackChunkName: 'TeamHealthHelpMenu' */ './MeetingHelp/TeamHealthHelpMenu')
)

const ReflectHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'ReflectHelpMenu' */ './MeetingHelp/ReflectHelpMenu')
)
const DemoReflectHelpMenu = lazyPreload(
  async () =>
    import(/* webpackChunkName: 'DemoReflectHelpMenu' */ './MeetingHelp/DemoReflectHelpMenu')
)
const GroupHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'GroupHelpMenu' */ './MeetingHelp/GroupHelpMenu')
)
const DemoGroupHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'DemoGroupHelpMenu' */ './MeetingHelp/DemoGroupHelpMenu')
)
const VoteHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'VoteHelpMenu' */ './MeetingHelp/VoteHelpMenu')
)
const DemoVoteHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'DemoVoteHelpMenu' */ './MeetingHelp/DemoVoteHelpMenu')
)
const DiscussHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'DiscussHelpMenu' */ './MeetingHelp/DiscussHelpMenu')
)
const DemoDiscussHelpMenu = lazyPreload(
  async () =>
    import(/* webpackChunkName: 'DemoDiscussHelpMenu' */ './MeetingHelp/DemoDiscussHelpMenu')
)
const ActionMeetingAgendaItemsHelpMenu = lazyPreload(
  async () =>
    import(
      /* webpackChunkName: 'ActionMeetingAgendaItemsHelpMenu' */ './MeetingHelp/ActionMeetingAgendaItemsHelpMenu'
    )
)
const ActionMeetingFirstCallHelpMenu = lazyPreload(
  async () =>
    import(
      /* webpackChunkName: 'ActionMeetingFirstCallHelpMenu' */ './MeetingHelp/ActionMeetingFirstCallHelpMenu'
    )
)
const ActionMeetingLastCallHelpMenu = lazyPreload(
  async () =>
    import(
      /* webpackChunkName: 'ActionMeetingLastCallHelpMenu' */ './MeetingHelp/ActionMeetingLastCallHelpMenu'
    )
)
const UpdatesHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'UpdatesHelpMenu' */ './MeetingHelp/UpdatesHelpMenu')
)

const ScopeHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'ScopeHelpMenu' */ './MeetingHelp/ScopeHelpMenu')
)

const EstimateHelpMenu = lazyPreload(
  async () => import(/* webpackChunkName: 'EstimateHelpMenu' */ './MeetingHelp/EstimateHelpMenu')
)

const demoHelps: Partial<Record<NewMeetingPhaseTypeEnum, LazyExoticPreload<any>>> = {
  checkin: DemoReflectHelpMenu,
  reflect: DemoReflectHelpMenu,
  group: DemoGroupHelpMenu,
  vote: DemoVoteHelpMenu,
  discuss: DemoDiscussHelpMenu
}

const helps: Partial<Record<NewMeetingPhaseTypeEnum, LazyExoticPreload<any>>> = {
  checkin: CheckInHelpMenu,
  TEAM_HEALTH: TeamHealthHelpMenu,
  reflect: ReflectHelpMenu,
  group: GroupHelpMenu,
  vote: VoteHelpMenu,
  discuss: DiscussHelpMenu,
  updates: UpdatesHelpMenu,
  firstcall: ActionMeetingFirstCallHelpMenu,
  agendaitems: ActionMeetingAgendaItemsHelpMenu,
  lastcall: ActionMeetingLastCallHelpMenu,
  SCOPE: ScopeHelpMenu,
  ESTIMATE: EstimateHelpMenu
}

interface Props {
  cancelConfirm: (() => void) | undefined
  meeting: BottomControlBarTips_meeting$key
  status: TransitionStatus
  onTransitionEnd: () => void
}

const BottomControlBarTips = (props: Props) => {
  const {cancelConfirm, meeting: meetingRef, status, onTransitionEnd} = props
  const meeting = useFragment(
    graphql`
      fragment BottomControlBarTips_meeting on NewMeeting {
        ...VoteHelpMenu_meeting
        ...ReflectHelpMenu_settings
        id
        meetingType
        localPhase {
          phaseType
        }
        localStage {
          ...TeamHealthHelpMenu_stage
        }
        phases {
          phaseType
        }
      }
    `,
    meetingRef
  )

  const {localPhase, localStage, meetingType} = meeting
  const {phaseType} = localPhase
  const {menuProps, menuPortal, originRef, togglePortal, openPortal} = useMenu(
    MenuPosition.LOWER_LEFT
  )
  const atmosphere = useAtmosphere()
  const demoPauseOpen = useTimeout(1000)
  const menus = isDemoRoute() ? demoHelps : helps
  const MenuContent = menus[phaseType]
  useEffect(() => {
    if (demoPauseOpen && isDemoRoute()) {
      const {clientGraphQLServer} = atmosphere as unknown as LocalAtmosphere
      if (clientGraphQLServer.db._started) {
        openPortal()
      } else {
        // wait for the startBot event to occur
        clientGraphQLServer.once('startDemo', () => {
          openPortal()
        })
      }
    }
  }, [demoPauseOpen, openPortal])

  if (!MenuContent) {
    return null
  }

  return (
    <BottomNavControl
      dataCy={`tip-menu-toggle`}
      confirming={!!cancelConfirm}
      onClick={cancelConfirm || togglePortal}
      ref={originRef}
      status={status}
      onTransitionEnd={onTransitionEnd}
    >
      <BottomNavIconLabel icon='help_outline' iconColor='midGray' label={'Tips'} />
      {menuPortal(
        <TallMenu ariaLabel='Meeting tips' {...menuProps}>
          <MenuContent meetingType={meetingType} stageRef={localStage} meetingRef={meeting} />
        </TallMenu>
      )}
    </BottomNavControl>
  )
}

export default BottomControlBarTips
