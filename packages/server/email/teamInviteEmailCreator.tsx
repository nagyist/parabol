import Oy from 'oy-vey'
import TeamInvite, {type TeamInviteProps} from 'parabol-client/modules/email/components/TeamInvite'
import {headCSS} from 'parabol-client/modules/email/styles'

const subjectLine = (inviterName: string): string => `${inviterName} has invited you to Parabol`

const teamInviteText = (props: TeamInviteProps) => {
  const {inviteeName, inviteeEmail, inviterName, inviterEmail, inviteLink, teamName} = props
  return `
Hello ${inviteeName || inviteeEmail},

${inviterName} (${inviterEmail}) has invited you to join a team on Parabol: ${teamName}

Parabol is software for remote teams to run online retrospective and check-in meetings.

Get started here: ${inviteLink}

Your friends,
The Parabol Product Team
`
}

export default (props: TeamInviteProps) => {
  const subject = subjectLine(props.inviterName)
  return {
    subject,
    body: teamInviteText(props),
    html: Oy.renderTemplate(<TeamInvite {...props} />, {
      headCSS,
      title: subject,
      previewText: subject
    })
  }
}
