import graphql from 'babel-plugin-relay/macro'
import {Suspense} from 'react'
import {useFragment} from 'react-relay'
import taskFooterIntegrateMenuQuery, {
  type TaskFooterIntegrateMenuQuery
} from '../__generated__/TaskFooterIntegrateMenuQuery.graphql'
import type {TaskFooterIntegrateMenuRoot_task$key} from '../__generated__/TaskFooterIntegrateMenuRoot_task.graphql'
import type {MenuProps} from '../hooks/useMenu'
import type {MenuMutationProps} from '../hooks/useMutationProps'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'
import type {UseTaskChild} from '../hooks/useTaskChildFocus'
import {LoaderSize} from '../types/constEnums'
import LoadingComponent from './LoadingComponent/LoadingComponent'
import TaskFooterIntegrateMenu from './TaskFooterIntegrateMenu'

interface Props {
  menuProps: MenuProps
  loadingDelay: number
  loadingWidth: number
  mutationProps: MenuMutationProps
  task: TaskFooterIntegrateMenuRoot_task$key
  useTaskChild: UseTaskChild
}

const TaskFooterIntegrateMenuRoot = (props: Props) => {
  const {menuProps, loadingDelay, loadingWidth, mutationProps, task: taskRef, useTaskChild} = props
  const task = useFragment(
    graphql`
      fragment TaskFooterIntegrateMenuRoot_task on Task {
        teamId
        userId
        ...TaskFooterIntegrateMenu_task
      }
    `,
    taskRef
  )
  const {teamId, userId} = task
  useTaskChild('integrate')
  const queryRef = useQueryLoaderNow<TaskFooterIntegrateMenuQuery>(taskFooterIntegrateMenuQuery, {
    teamId,
    userId: userId || ''
  })
  return (
    <Suspense
      fallback={
        <LoadingComponent
          delay={loadingDelay}
          spinnerSize={LoaderSize.MENU}
          height={loadingWidth ? LoaderSize.MENU : undefined}
          width={loadingWidth}
          showAfter={loadingWidth ? 0 : undefined}
        />
      }
    >
      {queryRef && (
        <TaskFooterIntegrateMenu
          queryRef={queryRef}
          menuProps={menuProps}
          mutationProps={mutationProps}
          task={task}
        />
      )}
    </Suspense>
  )
}

export default TaskFooterIntegrateMenuRoot
