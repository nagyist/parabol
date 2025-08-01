import graphql from 'babel-plugin-relay/macro'
import type {TeamPromptResponseSummary_meeting$key} from 'parabol-client/__generated__/TeamPromptResponseSummary_meeting.graphql'
import {useFragment} from 'react-relay'
import getPhaseByTypename from '~/utils/getPhaseByTypename'
import {isNotNull} from '~/utils/predicates'
import sortByISO8601Date from '~/utils/sortByISO8601Date'
import TeamPromptResponseSummaryCard from './TeamPromptResponseSummaryCard'

interface Props {
  meetingRef: TeamPromptResponseSummary_meeting$key
}

const TeamPromptResponseSummary = (props: Props) => {
  const {meetingRef} = props
  const meeting = useFragment(
    graphql`
      fragment TeamPromptResponseSummary_meeting on TeamPromptMeeting {
        phases {
          ... on TeamPromptResponsesPhase {
            __typename
            stages {
              id
              response {
                plaintextContent
                createdAt
              }
              ...TeamPromptResponseSummaryCard_stage
            }
          }
        }
      }
    `,
    meetingRef
  )
  const {phases} = meeting
  const phase = getPhaseByTypename(phases, 'TeamPromptResponsesPhase')
  const allStages = phase.stages.filter(isNotNull)

  const orderedNonEmptyStages = allStages
    .filter((stage) => !!stage.response?.plaintextContent)
    .sort((stageA, stageB) =>
      sortByISO8601Date(stageA.response!.createdAt, stageB.response!.createdAt)
    )

  return (
    <tr style={{width: '100%'}}>
      <td style={{padding: '24px', width: '100%'}}>
        {orderedNonEmptyStages.map((stage) => (
          <TeamPromptResponseSummaryCard key={stage.id} stageRef={stage} />
        ))}
      </td>
    </tr>
  )
}

export default TeamPromptResponseSummary
