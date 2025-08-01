import styled from '@emotion/styled'
import {ExpandMore} from '@mui/icons-material'
import graphql from 'babel-plugin-relay/macro'
import {useFragment} from 'react-relay'
import {PALETTE} from '~/styles/paletteV3'
import type {GitLabFieldDimensionDropdown_stage$key} from '../__generated__/GitLabFieldDimensionDropdown_stage.graphql'
import {MenuPosition} from '../hooks/useCoords'
import useMenu from '../hooks/useMenu'
import interpolateVotingLabelTemplate from '../shared/interpolateVotingLabelTemplate'
import {SprintPokerDefaults} from '../types/constEnums'
import GitLabFieldMenu from './GitLabFieldMenu'
import PlainButton from './PlainButton/PlainButton'

interface Props {
  clearError: () => void
  isFacilitator: boolean
  stageRef: GitLabFieldDimensionDropdown_stage$key
  submitScore(): void
}

const Wrapper = styled(PlainButton)<{isFacilitator: boolean}>(({isFacilitator}) => ({
  color: PALETTE.SLATE_700,
  cursor: isFacilitator ? undefined : 'default',
  display: 'flex',
  paddingRight: isFacilitator ? undefined : 8,
  userSelect: 'none',
  ':hover,:focus,:active': {
    opacity: isFacilitator ? '50%' : undefined
  }
}))

const CurrentValue = styled('div')({
  fontSize: 14
})

const StyledIcon = styled(ExpandMore)<{isFacilitator: boolean}>(({isFacilitator}) => ({
  height: 18,
  width: 18,
  display: isFacilitator ? undefined : 'none'
}))

const labelLookup = {
  [SprintPokerDefaults.GITLAB_FIELD_TIME_ESTIMATE]:
    SprintPokerDefaults.GITLAB_FIELD_TIME_ESTIMATE_LABEL,
  [SprintPokerDefaults.GITLAB_FIELD_WEIGHT]: SprintPokerDefaults.GITLAB_FIELD_WEIGHT_LABEL,
  [SprintPokerDefaults.SERVICE_FIELD_COMMENT]: SprintPokerDefaults.SERVICE_FIELD_COMMENT_LABEL,
  [SprintPokerDefaults.SERVICE_FIELD_NULL]: SprintPokerDefaults.SERVICE_FIELD_NULL_LABEL
}

const GitLabFieldDimensionDropdown = (props: Props) => {
  const {clearError, stageRef, isFacilitator, submitScore} = props
  const stage = useFragment(
    graphql`
      fragment GitLabFieldDimensionDropdown_stage on EstimateStage {
        ...GitLabFieldMenu_stage
        finalScore
        serviceField {
          name
        }
      }
    `,
    stageRef
  )
  const {finalScore, serviceField} = stage
  const {name: serviceFieldName} = serviceField
  const {togglePortal, menuPortal, originRef, menuProps} = useMenu<HTMLButtonElement>(
    MenuPosition.UPPER_RIGHT,
    {
      isDropdown: true,
      id: 'gitlabFieldMenu'
    }
  )

  const onClick = () => {
    if (!isFacilitator) return
    togglePortal()
    clearError()
  }

  const label =
    labelLookup[serviceFieldName as keyof typeof labelLookup] ||
    interpolateVotingLabelTemplate(serviceFieldName, finalScore)

  return (
    <>
      <Wrapper isFacilitator={isFacilitator} onClick={onClick} ref={originRef}>
        <CurrentValue>{label}</CurrentValue>
        <StyledIcon isFacilitator={isFacilitator} />
      </Wrapper>
      {menuPortal(
        <GitLabFieldMenu menuProps={menuProps} stageRef={stage} submitScore={submitScore} />
      )}
    </>
  )
}

export default GitLabFieldDimensionDropdown
