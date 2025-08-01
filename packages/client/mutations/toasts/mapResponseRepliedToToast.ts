import graphql from 'babel-plugin-relay/macro'
import type {mapResponseRepliedToToast_notification$data} from '../../__generated__/mapResponseRepliedToToast_notification.graphql'
import type {Snack} from '../../components/Snackbar'
import type {OnNextHistoryContext} from '../../types/relayMutations'
import makeNotificationToastKey from './makeNotificationToastKey'

graphql`
  fragment mapResponseRepliedToToast_notification on NotifyResponseReplied {
    id
    author {
      id
      preferredName
    }
    response {
      id
    }
    meeting {
      id
      name
    }
  }
`

const mapResponseRepliedToToast = (
  notification: mapResponseRepliedToToast_notification$data,
  {history}: OnNextHistoryContext
): Snack | null => {
  if (!notification) return null
  const {id: notificationId, meeting, author, response} = notification
  const authorName = author ? author.preferredName : 'Anonymous'
  const {id: meetingId, name: meetingName} = meeting

  // :TODO: (jmtaber129): Check if we're already open to the relevant standup response discussion
  // thread, and do nothing if we are.

  return {
    key: makeNotificationToastKey(notificationId),
    autoDismiss: 10,
    message: `${authorName} replied to your response in ${meetingName}.`,
    action: {
      label: 'See the discussion',
      callback: () => {
        history.push(`/meet/${meetingId}/responses?responseId=${encodeURIComponent(response.id)}`)
      }
    }
  }
}

export default mapResponseRepliedToToast
