import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {JiraFieldMenu_stage$data} from '../__generated__/JiraFieldMenu_stage.graphql'
import type {PokerMeeting_meeting$data} from '../__generated__/PokerMeeting_meeting.graphql'
import type {UpdateJiraDimensionFieldMutation as TUpdateJiraDimensionFieldMutation} from '../__generated__/UpdateJiraDimensionFieldMutation.graphql'
import type {DiscriminateProxy} from '../types/generics'
import type {StandardMutation} from '../types/relayMutations'
import createProxyRecord from '../utils/relay/createProxyRecord'

graphql`
  fragment UpdateJiraDimensionFieldMutation_team on UpdateDimensionFieldSuccess {
    meeting {
      phases {
        ... on EstimatePhase {
          stages {
            serviceField {
              name
              type
            }
          }
        }
      }
    }
  }
`

const mutation = graphql`
  mutation UpdateJiraDimensionFieldMutation(
    $taskId: ID!
    $dimensionName: String!
    $fieldId: ID!
    $meetingId: ID!
  ) {
    updateJiraDimensionField(
      taskId: $taskId
      dimensionName: $dimensionName
      fieldId: $fieldId
      meetingId: $meetingId
    ) {
      ... on ErrorPayload {
        error {
          message
        }
      }
      ...UpdateJiraDimensionFieldMutation_team @relay(mask: false)
    }
  }
`

const UpdateJiraDimensionFieldMutation: StandardMutation<TUpdateJiraDimensionFieldMutation> = (
  atmosphere,
  variables,
  {onCompleted, onError}
) => {
  return commitMutation<TUpdateJiraDimensionFieldMutation>(atmosphere, {
    mutation,
    variables,
    optimisticUpdater: (store) => {
      const {meetingId, dimensionName, fieldId} = variables
      const meeting = store.get<PokerMeeting_meeting$data>(meetingId)
      if (!meeting) return
      // handle meeting records
      const phases = meeting.getLinkedRecords('phases')
      const estimatePhase = phases.find((phase) => phase.getValue('phaseType') === 'ESTIMATE')!
      const stages = estimatePhase.getLinkedRecords<JiraFieldMenu_stage$data[]>('stages')
      stages.forEach((stage) => {
        const dimensionRef = stage.getLinkedRecord('dimensionRef')
        const dimensionRefName = dimensionRef.getValue('name')
        if (dimensionRefName !== dimensionName) return
        const task = stage.getLinkedRecord('task')
        const _integration = task.getLinkedRecord('integration')
        if (_integration.getValue('__typename') !== 'JiraIssue') return
        const integration = _integration as DiscriminateProxy<typeof _integration, 'JiraIssue'>
        const possibleEstimationFields = integration.getValue('possibleEstimationFields')
        const selectedField = possibleEstimationFields.find((field) => field.fieldId === fieldId)
        if (!selectedField) {
          return
        }
        const nextServiceField = createProxyRecord(store, 'ServiceField', {
          name: selectedField.fieldName,
          // the type being a number is just a guess
          type: 'number'
        })
        stage.setLinkedRecord(nextServiceField, 'serviceField')
      })
    },
    onCompleted,
    onError
  })
}

export default UpdateJiraDimensionFieldMutation
