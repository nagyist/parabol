import styled from '@emotion/styled'
import {Lock} from '@mui/icons-material'
import graphql from 'babel-plugin-relay/macro'
import {lazy, Suspense, useEffect} from 'react'
import {useFragment} from 'react-relay'
import type {MeetingLockedOverlay_meeting$key} from '~/__generated__/MeetingLockedOverlay_meeting.graphql'
import useAtmosphere from '../hooks/useAtmosphere'
import useRouter from '../hooks/useRouter'
import {modalShadow} from '../styles/elevation'
import {PALETTE} from '../styles/paletteV3'
import {Radius} from '../types/constEnums'
import SendClientSideEvent from '../utils/SendClientSideEvent'
import PrimaryButton from './PrimaryButton'

const UnpaidTeamModalRoot = lazy(
  () =>
    import(
      /* webpackChunkName: 'UnpaidTeamModalRoot' */ '../modules/teamDashboard/containers/UnpaidTeamModal/UnpaidTeamModalRoot'
    )
)

interface Props {
  meetingRef: MeetingLockedOverlay_meeting$key
}

const DialogOverlay = styled('div')({
  position: 'fixed',
  top: 0,
  width: '100%',
  height: '100%',
  backdropFilter: 'blur(3px)',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflowY: 'auto'
})

const DialogContainer = styled('div')({
  display: 'flex',
  backgroundColor: 'white',
  borderRadius: Radius.DIALOG,
  boxShadow: modalShadow,
  flexDirection: 'column',
  marginBottom: 100,
  maxHeight: '90vh',
  maxWidth: 'calc(100vw - 48px)',
  minWidth: 280,
  width: 512,
  alignItems: 'center',
  padding: 24
})

const DialogTitle = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  color: PALETTE.SLATE_700,
  fontSize: 14,
  justifyContent: 'space-around',
  fontWeight: 600,
  lineHeight: '20px',
  margin: '16px 16px 8px',
  paddingTop: 2
})

const DialogBody = styled('div')({
  fontSize: 14,
  lineHeight: '20px',
  textAlign: 'center',
  padding: '4px 48px 16px 48px'
})

const LockIcon = styled(Lock)({
  borderRadius: '100%',
  color: PALETTE.GRAPE_500,
  display: 'block',
  userSelect: 'none',
  height: 40,
  width: 40,
  svg: {
    height: 40,
    width: 40
  }
})

const MeetingLockedOverlay = (props: Props) => {
  const {meetingRef} = props
  const meeting = useFragment(
    graphql`
      fragment MeetingLockedOverlay_meeting on NewMeeting {
        id
        locked
        teamId
        organization {
          id
          name
          isPaid
          viewerOrganizationUser {
            id
          }
        }
      }
    `,
    meetingRef
  )
  const {id: meetingId, teamId, locked, organization} = meeting
  const {id: orgId, name: orgName, viewerOrganizationUser, isPaid} = organization
  const canUpgrade = !!viewerOrganizationUser

  const atmosphere = useAtmosphere()
  const {history} = useRouter()
  useEffect(() => {
    if (locked) {
      SendClientSideEvent(atmosphere, 'Upgrade CTA Viewed', {
        upgradeCTALocation: 'directMeetingLinkLock',
        upgradeTier: 'team',
        meetingId
      })
    }
  }, [locked])

  useEffect(() => {
    if (locked) {
      // lock scrolling of the background, not super critical but looks nicer without scroll bar
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
    return undefined
  }, [locked])

  const onClick = () => {
    SendClientSideEvent(atmosphere, 'Upgrade CTA Clicked', {
      upgradeCTALocation: 'directMeetingLinkLock',
      upgradeTier: 'team',
      meetingId
    })
    history.push(`/me/organizations/${orgId}`)
  }

  if (!locked) return null

  if (!isPaid) {
    return (
      <Suspense fallback={''}>
        <UnpaidTeamModalRoot teamId={teamId} />
      </Suspense>
    )
  }

  return (
    <DialogOverlay>
      <DialogContainer>
        <LockIcon />
        <DialogTitle>Past Meetings Locked</DialogTitle>
        {canUpgrade ? (
          <>
            <DialogBody>
              Your plan includes 30 days of meeting history. Unlock the full meeting history of{' '}
              <i>{orgName}</i> by upgrading.
            </DialogBody>
            <PrimaryButton onClick={onClick}>Unlock Past Meetings</PrimaryButton>
          </>
        ) : (
          <>
            <DialogBody>
              The plan of <i>{orgName}</i> includes only 30 days of meeting history.
            </DialogBody>
          </>
        )}
      </DialogContainer>
    </DialogOverlay>
  )
}

export default MeetingLockedOverlay
