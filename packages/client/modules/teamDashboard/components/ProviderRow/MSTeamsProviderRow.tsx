import {Add as AddIcon, Close as CloseIcon} from '@mui/icons-material'
import graphql from 'babel-plugin-relay/macro'
import {useState} from 'react'
import {useFragment} from 'react-relay'
import type {MSTeamsProviderRow_viewer$key} from '~/__generated__/MSTeamsProviderRow_viewer.graphql'
import MSTeamsProviderLogo from '../../../../components/MSTeamsProviderLogo'
import {MenuPosition} from '../../../../hooks/useCoords'
import useMenu from '../../../../hooks/useMenu'
import useMutationProps, {type MenuMutationProps} from '../../../../hooks/useMutationProps'
import {Providers} from '../../../../types/constEnums'
import MSTeamsConfigMenu from './MSTeamsConfigMenu'
import MSTeamsPanel from './MSTeamsPanel'
import ProviderRow from './ProviderRow'

interface Props {
  teamId: string
  viewerRef: MSTeamsProviderRow_viewer$key
}

graphql`
  fragment MSTeamsProviderRowTeamMemberIntegrations on TeamMemberIntegrations {
    msTeams {
      auth {
        provider {
          id
        }
      }
      teamNotificationSettings {
        ...NotificationSettings_settings
      }
    }
  }
`
const MSTeamsProviderRow = (props: Props) => {
  const {viewerRef, teamId} = props
  const viewer = useFragment(
    graphql`
      fragment MSTeamsProviderRow_viewer on User {
        ...MSTeamsPanel_viewer
        teamMember(teamId: $teamId) {
          integrations {
            ...MSTeamsProviderRowTeamMemberIntegrations @relay(mask: false)
          }
        }
      }
    `,
    viewerRef
  )
  const [isConnectClicked, setConnectClicked] = useState(false)
  const {togglePortal, originRef, menuPortal, menuProps} = useMenu(MenuPosition.UPPER_RIGHT)
  const {submitting, submitMutation, error, onError, onCompleted} = useMutationProps()
  const mutationProps = {
    submitting,
    submitMutation,
    onError,
    onCompleted
  } as MenuMutationProps
  const {teamMember} = viewer
  const {integrations} = teamMember!
  const {msTeams} = integrations
  const {auth} = msTeams

  if (window.__ACTION__.msTeamsDisabled) return null

  return (
    <>
      <ProviderRow
        connected={!!auth}
        onConnectClick={() => setConnectClicked(!isConnectClicked)}
        submitting={submitting}
        togglePortal={togglePortal}
        menuRef={originRef}
        providerName={Providers.MSTEAMS_NAME}
        providerDescription={Providers.MSTEAMS_DESC}
        providerLogo={<MSTeamsProviderLogo />}
        connectButtonText={!isConnectClicked ? 'Connect' : 'Cancel'}
        connectButtonIcon={!isConnectClicked ? <AddIcon /> : <CloseIcon />}
        error={error?.message}
      >
        {(auth || isConnectClicked) && <MSTeamsPanel teamId={teamId} viewerRef={viewer} />}
      </ProviderRow>
      {auth &&
        menuPortal(
          <MSTeamsConfigMenu
            menuProps={menuProps}
            mutationProps={mutationProps}
            providerId={auth.provider.id}
          />
        )}
    </>
  )
}

export default MSTeamsProviderRow
