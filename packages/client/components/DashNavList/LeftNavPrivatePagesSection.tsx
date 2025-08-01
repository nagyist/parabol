import AddIcon from '@mui/icons-material/Add'
import graphql from 'babel-plugin-relay/macro'
import {useState} from 'react'
import {useFragment} from 'react-relay'
import {useHistory} from 'react-router'
import type {LeftNavPrivatePagesSection_viewer$key} from '../../__generated__/LeftNavPrivatePagesSection_viewer.graphql'
import {useCreatePageMutation} from '../../mutations/useCreatePageMutation'
import {cn} from '../../ui/cn'
import {LeftNavHeader} from './LeftNavHeader'
import {LeftNavHeaderButton} from './LeftNavHeaderButton'
import {LeftNavItemButtons} from './LeftNavItemButtons'
import {LeftNavPageLink} from './LeftNavPageLink'

interface Props {
  viewerRef: LeftNavPrivatePagesSection_viewer$key
}
export const LeftNavPrivatePagesSection = (props: Props) => {
  const {viewerRef} = props
  const connectionKey = 'User_privatePages'
  const viewer = useFragment(
    graphql`
      fragment LeftNavPrivatePagesSection_viewer on User {
        draggingPageId
        draggingPageIsPrivate
        privatePages: pages(parentPageId: $nullId, first: 500, isPrivate: true)
          @connection(key: "User_privatePages") {
          edges {
            node {
              ...LeftNavPageLink_page
              id
              title
              isPrivate
            }
          }
        }
      }
    `,
    viewerRef
  )
  const {draggingPageId, draggingPageIsPrivate, privatePages} = viewer
  const {edges} = privatePages
  const firstPageId = edges[0]?.node.id
  const canDropBelow = draggingPageId && draggingPageId !== firstPageId
  const lastPageId = edges.at(-1)?.node.id
  const canDropIn = draggingPageId && draggingPageId !== lastPageId
  const [execute, submitting] = useCreatePageMutation()
  const history = useHistory()
  const addPrivatePage = (e: React.MouseEvent) => {
    // the parent will toggle show/hide
    e.stopPropagation()
    if (submitting) return
    execute({
      variables: {},
      onCompleted: (response) => {
        const {createPage} = response
        const {page} = createPage
        const {id} = page
        const [_, pageCode] = id.split(':')
        history.push(`/pages/${pageCode}`)
      }
    })
  }
  const [showChildren, setShowChildren] = useState(true)
  const toggleChildren = () => {
    setShowChildren(!showChildren)
  }
  return (
    <div data-pages-connection={'User_privatePages'}>
      <div
        onClick={toggleChildren}
        data-drop-in={canDropIn ? '' : undefined}
        className={cn(
          'group flex flex-1 cursor-pointer items-center rounded-md py-0.5 pl-3 font-semibold text-xs leading-5 data-[drop-in]:hover:bg-sky-300/70',
          !draggingPageId && 'hover:bg-slate-300'
        )}
      >
        <LeftNavHeader>{'Private Pages'}</LeftNavHeader>
        <LeftNavItemButtons>
          <LeftNavHeaderButton
            Icon={AddIcon}
            onClick={addPrivatePage}
            tooltip={'Add a private page'}
          />
        </LeftNavItemButtons>
      </div>
      <div className={cn('relative hidden min-h-1 pb-4', showChildren && 'block')}>
        <div
          className={cn(
            '-top-0.5 absolute left-0 z-20 hidden h-1 w-full hover:bg-sky-500/80 data-[drop-below]:flex',
            canDropBelow ? 'cursor-grabbing' : 'cursor-no-drop'
          )}
          data-drop-below={canDropBelow ? '' : undefined}
          data-drop-idx={-1}
        ></div>
        {edges.map((edge, idx) => {
          const {node} = edge
          const {id} = node
          return (
            <LeftNavPageLink
              key={id}
              pageRef={node}
              pageAncestors={[]}
              draggingPageId={draggingPageId}
              isLastChild={idx === edges.length - 1}
              dropIdx={idx}
              nextPeerId={edges[idx + 1]?.node.id || null}
              connectionKey={connectionKey}
              draggingPageIsPrivate={draggingPageIsPrivate || null}
            />
          )
        })}
      </div>
    </div>
  )
}
