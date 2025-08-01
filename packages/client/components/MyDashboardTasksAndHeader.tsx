import graphql from 'babel-plugin-relay/macro'
import {type PreloadedQuery, usePreloadedQuery} from 'react-relay'
import type {MyDashboardTasksAndHeaderQuery} from '../__generated__/MyDashboardTasksAndHeaderQuery.graphql'
import UserTasksHeader from '../modules/userDashboard/components/UserTasksHeader/UserTasksHeader'
import UserColumnsContainer from '../modules/userDashboard/containers/UserColumns/UserColumnsContainer'

interface Props {
  queryRef: PreloadedQuery<MyDashboardTasksAndHeaderQuery>
}

const MyDashboardTasksAndHeader = (props: Props) => {
  const {queryRef} = props
  const data = usePreloadedQuery<MyDashboardTasksAndHeaderQuery>(
    graphql`
      query MyDashboardTasksAndHeaderQuery($after: DateTime, $userIds: [ID!], $teamIds: [ID!]) {
        viewer {
          ...UserTasksHeader_viewer
          ...UserColumnsContainer_viewer
        }
      }
    `,
    queryRef
  )
  const {viewer} = data
  return (
    <>
      <UserTasksHeader viewerRef={viewer} />
      <UserColumnsContainer viewerRef={viewer} />
    </>
  )
}

export default MyDashboardTasksAndHeader
