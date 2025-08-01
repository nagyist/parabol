import graphql from 'babel-plugin-relay/macro'
import type {MeetingSummaryEmail_meeting$key} from 'parabol-client/__generated__/MeetingSummaryEmail_meeting.graphql'
import type * as React from 'react'
import {useEffect} from 'react'
import {useFragment} from 'react-relay'
import type {CorsOptions} from '../../../../../types/cors'
// import './reactEmailDeclarations'
import SummarySheet from './SummarySheet'
import ViewInBrowserHeader from './ViewInBrowserHeader'

const parentStyles = {
  WebkitTextSizeAdjust: '100%',
  msTextSizeAdjust: '100%',
  msoTableLspace: '0pt',
  msoTableRspace: '0pt',
  borderCollapse: 'collapse',
  margin: '0px auto'
} as React.CSSProperties

export type MeetingSummaryReferrer = 'meeting' | 'email' | 'history'

interface Props {
  emailCSVUrl: string
  isDemo?: boolean
  meeting: MeetingSummaryEmail_meeting$key
  referrer: MeetingSummaryReferrer
  referrerUrl?: string
  teamDashUrl: string
  meetingUrl: string
  appOrigin: string
  urlAction?: 'csv'
  corsOptions: CorsOptions
}

const pagePadding = {
  paddingTop: 24
}

const PagePadding = () => {
  return (
    <table align='center' width='100%'>
      <tbody>
        <tr>
          <td style={pagePadding} />
        </tr>
      </tbody>
    </table>
  )
}

const MeetingSummaryEmail = (props: Props) => {
  const {referrer, referrerUrl, meeting: meetingRef, teamDashUrl} = props
  const meeting = useFragment(
    graphql`
      fragment MeetingSummaryEmail_meeting on NewMeeting {
        id
        ...SummarySheet_meeting
      }
    `,
    meetingRef
  )
  useEffect(() => {
    document.body.style.overflow = ''
    document.body.style.position = ''
  })
  return (
    <table width='100%' align='center' style={parentStyles}>
      <tbody>
        <tr>
          <td align='center'>
            <table width={600} align='center' style={parentStyles}>
              <tbody>
                <tr>
                  <td>
                    <PagePadding />
                    <ViewInBrowserHeader referrerUrl={referrerUrl} referrer={referrer} />
                    <SummarySheet {...props} meeting={meeting} teamDashUrl={teamDashUrl} />
                    <PagePadding />
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export default MeetingSummaryEmail
