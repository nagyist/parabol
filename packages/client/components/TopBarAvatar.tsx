import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {useFragment} from 'react-relay'
import type {TopBarAvatar_viewer$key} from '~/__generated__/TopBarAvatar_viewer.graphql'
import {MenuPosition} from '~/hooks/useCoords'
import useMenu from '~/hooks/useMenu'
import lazyPreload from '~/utils/lazyPreload'
import {PALETTE} from '../styles/paletteV3'
import defaultUserAvatar from '../styles/theme/images/avatar-user.svg'
import Avatar from './Avatar/Avatar'

const AvatarWrapper = styled('button')({
  background: 'transparent',
  border: 'none',
  borderRadius: 100,
  marginLeft: 8,
  padding: 4,
  ':focus-visible': {
    boxShadow: `0 0 0 2px ${PALETTE.SKY_400}`,
    cursor: 'pointer',
    outline: 'none'
  },
  ':active': {
    boxShadow: '0 0 0 2px transparent'
  }
})

const StandardHubUserMenu = lazyPreload(
  () => import(/* webpackChunkName: 'StandardHubUserMenu' */ './StandardHubUserMenu')
)

interface Props {
  viewer: TopBarAvatar_viewer$key | null
}

const TopBarAvatar = (props: Props) => {
  const {viewer: viewerRef} = props
  const viewer = useFragment(
    graphql`
      fragment TopBarAvatar_viewer on User {
        picture
        ...StandardHubUserMenu_viewer
      }
    `,
    viewerRef
  )
  const userAvatar = viewer?.picture ?? defaultUserAvatar
  const {togglePortal, originRef, menuPortal, menuProps} = useMenu<HTMLDivElement>(
    MenuPosition.UPPER_RIGHT
  )
  return (
    <>
      <AvatarWrapper onClick={togglePortal}>
        <Avatar
          onMouseEnter={StandardHubUserMenu.preload}
          ref={originRef}
          picture={userAvatar}
          className='h-10 w-10 cursor-pointer'
        />
        {viewer && menuPortal(<StandardHubUserMenu menuProps={menuProps} viewerRef={viewer} />)}
      </AvatarWrapper>
    </>
  )
}

export default TopBarAvatar
