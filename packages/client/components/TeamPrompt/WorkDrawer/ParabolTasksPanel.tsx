import graphql from 'babel-plugin-relay/macro'
import {useState} from 'react'
import {useFragment} from 'react-relay'
import type {ParabolTasksPanel_meeting$key} from '../../../__generated__/ParabolTasksPanel_meeting.graphql'
import type {TaskStatusEnum} from '../../../__generated__/ParabolTasksResultsQuery.graphql'
import useAtmosphere from '../../../hooks/useAtmosphere'
import CreateTaskMutation from '../../../mutations/CreateTaskMutation'
import {TaskStatus} from '../../../types/constEnums'
import {cn} from '../../../ui/cn'
import {meetingColumnArray} from '../../../utils/constants'
import dndNoise from '../../../utils/dndNoise'
import SendClientSideEvent from '../../../utils/SendClientSideEvent'
import {taskStatusLabels} from '../../../utils/taskStatus'
import AddTaskButton from '../../AddTaskButton'
import ParabolTasksResultsRoot from './ParabolTasksResultsRoot'

interface Props {
  meetingRef: ParabolTasksPanel_meeting$key
}

const ParabolTasksPanel = (props: Props) => {
  const {meetingRef} = props

  const meeting = useFragment(
    graphql`
      fragment ParabolTasksPanel_meeting on TeamPromptMeeting {
        id
        teamId
      }
    `,
    meetingRef
  )

  const atmosphere = useAtmosphere()
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusEnum>(TaskStatus.DONE)

  const handleAddTask = () => {
    CreateTaskMutation(
      atmosphere,
      {
        newTask: {
          status: selectedStatus,
          meetingId: meeting.id,
          teamId: meeting.teamId,
          userId: atmosphere.viewerId,
          sortOrder: dndNoise()
        }
      },
      {}
    )
  }

  const trackTabNavigated = (label: string) => {
    SendClientSideEvent(atmosphere, 'Your Work Drawer Tag Navigated', {
      service: 'PARABOL',
      buttonLabel: label
    })
  }

  return (
    <>
      <div>
        <div className='my-4 flex gap-2 px-4'>
          {meetingColumnArray.map((status) => (
            <div
              key={status}
              className={cn(
                'shrink-0 cursor-pointer rounded-full px-4 py-2 text-slate-800 text-sm leading-3',
                status === selectedStatus
                  ? 'bg-grape-700 font-semibold text-white focus:text-white'
                  : 'border border-slate-300 bg-white'
              )}
              onClick={() => {
                trackTabNavigated(taskStatusLabels[status])
                setSelectedStatus(status)
              }}
            >
              {taskStatusLabels[status]}
            </div>
          ))}
        </div>
      </div>
      <ParabolTasksResultsRoot selectedStatus={selectedStatus} />
      <div className='flex items-center justify-center border-slate-200 border-t border-solid p-2'>
        <AddTaskButton onClick={handleAddTask} />
      </div>
    </>
  )
}

export default ParabolTasksPanel
