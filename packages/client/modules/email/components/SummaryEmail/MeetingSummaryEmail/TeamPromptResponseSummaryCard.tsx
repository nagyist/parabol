import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import type {TeamPromptResponseSummaryCard_stage$key} from 'parabol-client/__generated__/TeamPromptResponseSummaryCard_stage.graphql'
import type * as React from 'react'
import {useFragment} from 'react-relay'
import {PALETTE} from '~/styles/paletteV3'
import {useTipTapContext} from '../../../../../components/TipTapProvider'

const responseSummaryCardStyles: React.CSSProperties = {
  padding: '12px',
  width: '100%'
}

const promptResponseStyles: React.CSSProperties = {
  minHeight: '40px',
  lineHeight: '20px',
  border: 'solid',
  borderWidth: '1px',
  borderColor: PALETTE.SLATE_300,
  borderRadius: '4px',
  padding: '12px 16px 12px 16px',
  overflow: 'auto',
  wordWrap: 'break-word'
}

const avatarStyles: React.CSSProperties = {
  borderRadius: '100%',
  minWidth: 48
}

// Note: Emotion doesn't work in email, so these styles will only be present in the app.
const StyledEditor = styled('div')`
  min-height: 40px;
  line-height: 1.25;

  ul,
  ol {
    list-style-position: outside;
    padding-inline-start: 16px;
    margin-block-start: 4px;
    margin-block-end: 4px;
  }

  ol {
    margin-inline-start: 4px;
  }

  p.is-editor-empty:first-of-type::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  p:empty::after {
    content: '\\00A0';
  }

  p {
    margin-block-start: 4px;
    margin-block-end: 4px;
  }

  hr {
    border-top: 1px solid ${PALETTE.SLATE_300};
  }

  [data-type='mention'] {
    background-color: ${PALETTE.GOLD_100};
    border-radius: 2;
    font-weight: 600;
  }

  a {
    text-decoration: underline;
    color: ${PALETTE.SLATE_600};
    :hover {
      cursor: pointer;
    }
  }
`

interface Props {
  stageRef: TeamPromptResponseSummaryCard_stage$key
}

const TeamPromptResponseSummaryCard = (props: Props) => {
  const {stageRef} = props
  const stage = useFragment(
    graphql`
      fragment TeamPromptResponseSummaryCard_stage on TeamPromptResponseStage {
        id
        teamMember {
          user {
            id
            rasterPicture
            preferredName
          }
        }
        response {
          plaintextContent
          content
          createdAt
        }
      }
    `,
    stageRef
  )
  const {teamMember, response} = stage
  const {user} = teamMember
  const {rasterPicture, preferredName} = user
  const contentJSON = response ? JSON.parse(response.content) : null
  const {generateHTML} = useTipTapContext()
  const html = generateHTML(contentJSON)

  return (
    <div style={responseSummaryCardStyles}>
      <div style={{display: 'flex', padding: '0 8px', marginBottom: 12}}>
        <img height='48' src={rasterPicture} style={avatarStyles} width='48' />
        <h3 style={{padding: '0 8px', margin: 'auto auto auto 0'}}>{preferredName}</h3>
      </div>
      <div style={promptResponseStyles}>
        <StyledEditor dangerouslySetInnerHTML={{__html: html}} />
      </div>
    </div>
  )
}

export default TeamPromptResponseSummaryCard
