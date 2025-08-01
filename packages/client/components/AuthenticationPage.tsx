import styled from '@emotion/styled'
import useCanonical from '~/hooks/useCanonical'
import useAtmosphere from '../hooks/useAtmosphere'
import useRouter from '../hooks/useRouter'
import getValidRedirectParam from '../utils/getValidRedirectParam'
import {AUTH_DIALOG_WIDTH} from './AuthenticationDialog'
import GenericAuthentication, {type AuthPageSlug, type GotoAuthPage} from './GenericAuthentication'
import TeamInvitationWrapper from './TeamInvitationWrapper'

const CopyBlock = styled('div')({
  marginBottom: 48,
  width: 'calc(100vw - 16px)',
  // must be no wider than the auth popup width to keep it looking clean
  maxWidth: AUTH_DIALOG_WIDTH,
  textAlign: 'center'
})

interface Props {
  page: AuthPageSlug
}

const AuthenticationPage = (props: Props) => {
  const {history} = useRouter()
  const {page} = props
  const atmosphere = useAtmosphere()
  const {authObj} = atmosphere
  useCanonical(page)
  if (authObj) {
    const nextUrl = getValidRedirectParam() || '/meetings'
    // always replace otherwise they could get stuck in a back-button loop
    setTimeout(() => history.replace(nextUrl))
    return null
  }
  const goToPage: GotoAuthPage = (page, search?) => {
    const url = search ? `/${page}${search}` : `/${page}`
    history.push(url)
  }
  return (
    <TeamInvitationWrapper>
      <CopyBlock>
        <h1>
          Better Meetings, <br />
          Less Effort
        </h1>
        <p>92&#37; of users agreed that Parabol improves the efficiency of their meetings.</p>
      </CopyBlock>
      <GenericAuthentication page={page} goToPage={goToPage} />
    </TeamInvitationWrapper>
  )
}
export default AuthenticationPage
