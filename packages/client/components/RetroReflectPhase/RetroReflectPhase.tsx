import graphql from 'babel-plugin-relay/macro'
import React, {useState} from 'react'
import {Importer, ImporterField} from 'react-csv-importer'
import 'react-csv-importer/dist/index.css'
import {createFragmentContainer} from 'react-relay'
import useCallbackRef from '~/hooks/useCallbackRef'
import {RetroReflectPhase_meeting} from '~/__generated__/RetroReflectPhase_meeting.graphql'
import useAtmosphere from '../../hooks/useAtmosphere'
import useBreakpoint from '../../hooks/useBreakpoint'
import useMutationProps from '../../hooks/useMutationProps'
import CreateReflectionMutation from '../../mutations/CreateReflectionMutation'
import {Breakpoint} from '../../types/constEnums'
import {phaseLabelLookup} from '../../utils/meetings/lookups'
import MeetingContent from '../MeetingContent'
import MeetingHeaderAndPhase from '../MeetingHeaderAndPhase'
import MeetingTopBar from '../MeetingTopBar'
import PhaseHeaderDescription from '../PhaseHeaderDescription'
import PhaseHeaderTitle from '../PhaseHeaderTitle'
import PhaseWrapper from '../PhaseWrapper'
import {RetroMeetingPhaseProps} from '../RetroMeeting'
import StageTimerDisplay from '../StageTimerDisplay'
import PhaseItemColumn from './PhaseItemColumn'
import ReflectWrapperMobile from './ReflectionWrapperMobile'
import ReflectWrapperDesktop from './ReflectWrapperDesktop'

interface Props extends RetroMeetingPhaseProps {
  meeting: RetroReflectPhase_meeting
}

const RetroReflectPhase = (props: Props) => {
  const {avatarGroup, toggleSidebar, meeting} = props
  const [callbackRef, phaseRef] = useCallbackRef()
  const [activeIdx, setActiveIdx] = useState(0)
  const isDesktop = useBreakpoint(Breakpoint.SINGLE_REFLECTION_COLUMN)
  const {localPhase, endedAt, showSidebar, settings, id: meetingId} = meeting
  const {disableAnonymity} = settings
  if (!localPhase || !localPhase.reflectPrompts) return null
  const reflectPrompts = localPhase!.reflectPrompts
  const focusedPromptId = localPhase!.focusedPromptId
  const ColumnWrapper = isDesktop ? ReflectWrapperDesktop : ReflectWrapperMobile
  const {onCompleted, onError, submitMutation} = useMutationProps()
  const atmosphere = useAtmosphere()

  return (
    <MeetingContent ref={callbackRef}>
      <MeetingHeaderAndPhase hideBottomBar={!!endedAt}>
        <MeetingTopBar
          avatarGroup={avatarGroup}
          isMeetingSidebarCollapsed={!showSidebar}
          toggleSidebar={toggleSidebar}
        >
          <PhaseHeaderTitle>{phaseLabelLookup.reflect}</PhaseHeaderTitle>
          <PhaseHeaderDescription>
            {`Add ${disableAnonymity ? '' : 'anonymous'} reflections for each prompt`}
          </PhaseHeaderDescription>
        </MeetingTopBar>

        <Importer
          dataHandler={async (rows: any) => {
            // required, receives a list of parsed objects based on defined fields and user column mapping;
            // may be called several times if file is large
            // (if this callback returns a promise, the widget will wait for it before parsing more data)
            console.log('received batch of rows', rows)

            rows.map((row: any, idx: number) => {
              reflectPrompts.map(({id: promptId}) => {
                if (row[promptId].trim()) {
                  const input = {
                    content: `{"blocks":[{"key":"${(Math.random() + 1)
                      .toString(36)
                      .substring(4)}","text":"${
                      row[promptId]
                    }","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[],"data":{}}],"entityMap":{}}`,
                    meetingId,
                    promptId,
                    sortOrder: idx
                  }
                  submitMutation()
                  CreateReflectionMutation(atmosphere, {input}, {onError, onCompleted})
                }
              })
            })

            // mock timeout to simulate processing
            await new Promise((resolve) => setTimeout(resolve, 500))
          }}
          chunkSize={10000} // optional, internal parsing chunk size in bytes
          defaultNoHeader={true} // optional, keeps "data has headers" checkbox off by default
          restartable={false} // optional, lets user choose to upload another file when import is complete
        >
          {reflectPrompts.map(({id, question}) => (
            <ImporterField key={id} name={id} label={question} />
          ))}
        </Importer>

        <PhaseWrapper>
          <StageTimerDisplay meeting={meeting} />
          <ColumnWrapper
            setActiveIdx={setActiveIdx}
            activeIdx={activeIdx}
            focusedIdx={reflectPrompts.findIndex(({id}) => id === focusedPromptId)}
          >
            {reflectPrompts.map((prompt, idx) => (
              <PhaseItemColumn
                key={prompt.id}
                meeting={meeting}
                prompt={prompt}
                idx={idx}
                phaseRef={phaseRef}
                isDesktop={isDesktop}
              />
            ))}
          </ColumnWrapper>
        </PhaseWrapper>
      </MeetingHeaderAndPhase>
    </MeetingContent>
  )
}

graphql`
  fragment RetroReflectPhase_phase on ReflectPhase {
    focusedPromptId
    reflectPrompts {
      ...PhaseItemColumn_prompt
      id
      question
      sortOrder
    }
  }
`

export default createFragmentContainer(RetroReflectPhase, {
  meeting: graphql`
    fragment RetroReflectPhase_meeting on RetrospectiveMeeting {
      ...StageTimerDisplay_meeting
      ...StageTimerControl_meeting
      ...PhaseItemColumn_meeting
      endedAt
      id
      localPhase {
        ...RetroReflectPhase_phase @relay(mask: false)
      }
      localStage {
        isComplete
      }
      phases {
        ...RetroReflectPhase_phase @relay(mask: false)
      }
      showSidebar
      settings {
        disableAnonymity
      }
    }
  `
})
