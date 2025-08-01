import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {Droppable, type DroppableProvided, type DroppableStateSnapshot} from 'react-beautiful-dnd'
import {useFragment} from 'react-relay'
import type {TaskColumn_teams$key} from '~/__generated__/TaskColumn_teams.graphql'
import type {AreaEnum, TaskStatusEnum} from '~/__generated__/UpdateTaskMutation.graphql'
import type {TaskColumn_tasks$key} from '../../../../__generated__/TaskColumn_tasks.graphql'
import useModal from '../../../../hooks/useModal'
import {PALETTE} from '../../../../styles/paletteV3'
import {BezierCurve, DroppableType} from '../../../../types/constEnums'
import {DONE, TEAM_DASH, USER_DASH} from '../../../../utils/constants'
import {taskStatusLabels} from '../../../../utils/taskStatus'
import ArchiveAllDoneTasksModal from './ArchiveAllDoneTasksModal'
import TaskColumnAddTask from './TaskColumnAddTask'
import TaskColumnInner from './TaskColumnInner'

const Column = styled('div')<{isDragging: boolean}>(({isDragging}) => ({
  background: isDragging ? PALETTE.SLATE_300 : undefined,
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  position: 'relative',
  transition: `background 300ms ${BezierCurve.DECELERATE}`
}))

const ColumnHeader = styled('div')({
  color: PALETTE.SLATE_700,
  display: 'flex !important',
  lineHeight: '24px',
  padding: 12,
  position: 'relative',
  minWidth: '256px'
})

const ColumnBody = styled('div')({
  flex: 1,
  height: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
  minHeight: 200,
  paddingBottom: 8
})

const StatusLabel = styled('div')({
  fontWeight: 600,
  textTransform: 'capitalize'
})

const TasksCount = styled('div')({
  color: PALETTE.SLATE_500,
  marginLeft: 8
})

const StatusLabelBlock = styled('div')<{userCanAdd: boolean | undefined}>(({userCanAdd}) => ({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  fontSize: 16,
  marginLeft: userCanAdd ? 8 : 16
}))

interface Props {
  area: AreaEnum
  isViewerMeetingSection?: boolean
  meetingId?: string
  myTeamMemberId?: string
  tasks: TaskColumn_tasks$key
  status: TaskStatusEnum
  teamMemberFilterId?: string | null
  teams: TaskColumn_teams$key | null | undefined
}

const TaskColumn = (props: Props) => {
  const {
    area,
    isViewerMeetingSection,
    meetingId,
    myTeamMemberId,
    teamMemberFilterId,
    status,
    tasks: tasksRef,
    teams: teamsRef
  } = props
  const tasks = useFragment(
    graphql`
      fragment TaskColumn_tasks on Task
      @relay(plural: true)
      @argumentDefinitions(meetingId: {type: "ID"}) {
        ...TaskColumnAddTask_tasks
        ...TaskColumnInner_tasks @arguments(meetingId: $meetingId)
        id
      }
    `,
    tasksRef
  )
  const teams = useFragment(
    graphql`
      fragment TaskColumn_teams on Team @relay(plural: true) {
        ...TaskColumnAddTask_teams
      }
    `,
    teamsRef
  )
  const label = taskStatusLabels[status]
  const userCanAdd = area === TEAM_DASH || area === USER_DASH || isViewerMeetingSection
  const {togglePortal, modalPortal} = useModal()
  return (
    <Droppable droppableId={status} type={DroppableType.TASK}>
      {(dropProvided: DroppableProvided, dropSnapshot: DroppableStateSnapshot) => (
        <Column isDragging={dropSnapshot.isDraggingOver}>
          <ColumnHeader>
            <TaskColumnAddTask
              area={area}
              isViewerMeetingSection={isViewerMeetingSection}
              status={status}
              tasks={tasks}
              meetingId={meetingId}
              myTeamMemberId={myTeamMemberId}
              teamMemberFilterId={teamMemberFilterId || ''}
              teams={teams}
            />
            <StatusLabelBlock userCanAdd={userCanAdd}>
              <StatusLabel>{label}</StatusLabel>
              {tasks.length > 0 && <TasksCount>{tasks.length}</TasksCount>}
              {status === DONE && (
                <a onClick={togglePortal} className='ml-auto cursor-pointer text-slate-600 text-sm'>
                  Archive all
                </a>
              )}
            </StatusLabelBlock>
            {modalPortal(
              <ArchiveAllDoneTasksModal
                closeModal={togglePortal}
                taskIds={tasks.map((t) => t.id)}
              />
            )}
          </ColumnHeader>
          <ColumnBody {...dropProvided.droppableProps} ref={dropProvided.innerRef}>
            <TaskColumnInner
              area={area}
              tasks={tasks}
              isViewerMeetingSection={isViewerMeetingSection}
              meetingId={meetingId}
            />
            {dropProvided.placeholder}
          </ColumnBody>
        </Column>
      )}
    </Droppable>
  )
}

export default TaskColumn
