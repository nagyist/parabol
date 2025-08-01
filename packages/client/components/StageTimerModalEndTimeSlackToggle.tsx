import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {useFragment} from 'react-relay'
import type {SetSlackNotificationMutation as TSetSlackNotificationMutation} from '../__generated__/SetSlackNotificationMutation.graphql'
import type {
  SlackNotificationEventEnum,
  StageTimerModalEndTimeSlackToggle_facilitator$key
} from '../__generated__/StageTimerModalEndTimeSlackToggle_facilitator.graphql'
import useAtmosphere from '../hooks/useAtmosphere'
import useMutationProps from '../hooks/useMutationProps'
import NotificationErrorMessage from '../modules/notifications/components/NotificationErrorMessage'
import SetSlackNotificationMutation from '../mutations/SetSlackNotificationMutation'
import {ICON_SIZE} from '../styles/typographyV2'
import SlackClientManager from '../utils/SlackClientManager'
import Checkbox from './Checkbox'
import PlainButton from './PlainButton/PlainButton'

interface Props {
  facilitator: StageTimerModalEndTimeSlackToggle_facilitator$key
}

const ButtonRow = styled(PlainButton)({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%'
})

const Label = styled('div')({
  cursor: 'pointer',
  fontSize: 14,
  minWidth: 160,
  padding: '8px 0 8px 8px',
  userSelect: 'none'
})

const Note = styled('div')({
  fontSize: 12,
  fontStyle: 'italic',
  padding: '8px 0 8px 0px',
  textAlign: 'center',
  userSelect: 'none'
})

const StyledCheckbox = styled(Checkbox)({
  fontSize: ICON_SIZE.MD18,
  marginRight: 8,
  textAlign: 'center',
  userSelect: 'none',
  width: ICON_SIZE.MD24
})

const Block = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  width: '100%'
})

const StyledNotificationErrorMessage = styled(NotificationErrorMessage)({
  paddingBottom: 8
})

const isNotificationActive = (integration: {
  isActive: boolean
  teamNotificationSettings: {events: readonly SlackNotificationEventEnum[]} | null | undefined
}) => {
  const {isActive, teamNotificationSettings} = integration
  if (!isActive || !teamNotificationSettings) return false
  const {events} = teamNotificationSettings
  if (!events) return false
  return (
    events.includes('MEETING_STAGE_TIME_LIMIT_START') ||
    events.includes('MEETING_STAGE_TIME_LIMIT_END')
  )
}

const StageTimerModalEndTimeSlackToggle = (props: Props) => {
  const {facilitator: facilitatorRef} = props
  const facilitator = useFragment(
    graphql`
      fragment StageTimerModalEndTimeSlackToggle_facilitator on TeamMember {
        teamId
        integrations {
          mattermost {
            isActive
            teamNotificationSettings {
              id
              events
            }
          }
          msTeams {
            isActive
            teamNotificationSettings {
              id
              events
            }
          }
          slack {
            isActive
            defaultTeamChannelId
            notifications {
              channelId
              event
            }
          }
        }
      }
    `,
    facilitatorRef
  )
  const {integrations, teamId} = facilitator
  const {mattermost, slack, msTeams} = integrations
  const notifications = slack?.notifications ?? []
  const timeLimitEvent = notifications.find(
    (notification) => notification.event === 'MEETING_STAGE_TIME_LIMIT_START'
  )
  const slackToggleActive = (timeLimitEvent && !!timeLimitEvent.channelId) || false
  const atmosphere = useAtmosphere()
  const mutationProps = useMutationProps()
  const {onError, onCompleted, submitMutation, error, submitting} = mutationProps
  const isMattermostActive = isNotificationActive(mattermost)
  const isMSTeamsActive = isNotificationActive(msTeams)
  const noActiveIntegrations = !slack?.isActive && !isMattermostActive && !isMSTeamsActive

  const onClick = () => {
    if (slack?.isActive) {
      if (submitting) return
      const {defaultTeamChannelId} = slack
      submitMutation()
      const variables = {
        slackChannelId: slackToggleActive ? null : defaultTeamChannelId,
        slackNotificationEvents: ['MEETING_STAGE_TIME_LIMIT_START'],
        teamId
      } as TSetSlackNotificationMutation['variables']
      SetSlackNotificationMutation(atmosphere, variables, {
        onError,
        onCompleted
      })
    } else {
      SlackClientManager.openOAuth(atmosphere, teamId, mutationProps)
    }
  }
  return (
    <Block>
      {SlackClientManager.isAvailable && (slack?.isActive || noActiveIntegrations) && (
        <ButtonRow onClick={onClick}>
          <StyledCheckbox active={slackToggleActive} />
          <Label>{'Notify team via Slack'}</Label>
        </ButtonRow>
      )}
      {isMattermostActive && <Note>{'Notifying via Mattermost'}</Note>}
      {isMSTeamsActive && <Note>{'Notifying via MS Teams'}</Note>}
      <StyledNotificationErrorMessage error={error} />
    </Block>
  )
}

export default StageTimerModalEndTimeSlackToggle
