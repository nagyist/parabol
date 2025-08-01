import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {RecordProxy, RecordSourceSelectorProxy} from 'relay-runtime'
import type {DeleteCommentMutation_meeting$data} from '~/__generated__/DeleteCommentMutation_meeting.graphql'
import safeRemoveNodeFromArray from '~/utils/relay/safeRemoveNodeFromArray'
import safeRemoveNodeFromConn from '~/utils/relay/safeRemoveNodeFromConn'
import type {DeleteCommentMutation as TDeleteCommentMutation} from '../__generated__/DeleteCommentMutation.graphql'
import {plaintextToTipTap} from '../shared/tiptap/plaintextToTipTap'
import type {SharedUpdater, SimpleMutation} from '../types/relayMutations'
import getDiscussionThreadConn from './connections/getDiscussionThreadConn'

graphql`
  fragment DeleteCommentMutation_meeting on DeleteCommentSuccess {
    comment {
      id
      isActive
      content
      threadParentId
      discussionId
    }
  }
`

const mutation = graphql`
  mutation DeleteCommentMutation($commentId: ID!, $meetingId: ID!) {
    deleteComment(commentId: $commentId, meetingId: $meetingId) {
      ... on ErrorPayload {
        error {
          message
        }
      }
      ...DeleteCommentMutation_meeting @relay(mask: false)
    }
  }
`

export const handleRemoveReply = (
  nodeId: string,
  threadParentId: string,
  store: RecordSourceSelectorProxy
) => {
  // delete w/o tombstone
  const threadParent = store.get(threadParentId)
  if (!threadParent) return
  safeRemoveNodeFromArray(nodeId, threadParent, 'replies')
  const isParentActive = threadParent.getValue('isActive')
  const isParentComment = threadParent.getValue('__typename') === 'Comment'
  if (isParentComment && !isParentActive) {
    handleDeleteComment(threadParent as any, store)
  }
}

const handleDeleteComment = (
  comment: RecordProxy<DeleteCommentMutation_meeting$data['comment']>,
  store: RecordSourceSelectorProxy
) => {
  const commentId = comment.getValue('id')
  const replies = comment.getLinkedRecords('replies')
  const threadParentId = comment.getValue('threadParentId')
  if (threadParentId) {
    handleRemoveReply(commentId, threadParentId, store)
    return
  }
  if (replies && replies.length > 0) {
    const TOMBSTONE = JSON.stringify(plaintextToTipTap('[deleted]'))
    comment.setValue(TOMBSTONE, 'content')
    comment.setValue(false, 'isActive')
  } else {
    const discussionId = comment.getValue('discussionId')
    if (discussionId) {
      const threadConn = getDiscussionThreadConn(store, discussionId)
      safeRemoveNodeFromConn(commentId, threadConn)
      const discussion = store.get(discussionId)
      if (discussion) {
        discussion.setValue((discussion.getValue('commentCount') as number) - 1, 'commentCount')
      }
    }
  }
}

export const deleteCommentMeetingUpdater: SharedUpdater<DeleteCommentMutation_meeting$data> = (
  payload,
  {store}
) => {
  const comment = payload.getLinkedRecord('comment')
  if (!comment) return
  handleDeleteComment(comment, store)
}

const DeleteCommentMutation: SimpleMutation<TDeleteCommentMutation> = (atmosphere, variables) => {
  return commitMutation<TDeleteCommentMutation>(atmosphere, {
    mutation,
    variables,
    updater: (store) => {
      const payload = store.getRootField('deleteComment')
      deleteCommentMeetingUpdater(payload as any, {atmosphere, store})
    },
    optimisticUpdater: (store) => {
      const {commentId} = variables
      const comment = store.get(commentId)
      if (!comment) return
      handleDeleteComment(comment as any, store)
    }
  })
}

export default DeleteCommentMutation
