import {AuthenticationError} from 'parabol-client/types/constEnums'
import encodeAuthToken from '../../../utils/encodeAuthToken'
import attemptLogin from '../../mutations/helpers/attemptLogin'
import type {MutationResolvers} from '../resolverTypes'

const loginWithPassword: MutationResolvers['loginWithPassword'] = async (
  _source,
  {email, password},
  context
) => {
  const loginAttempt = await attemptLogin(email, password, context.ip)
  if (loginAttempt.userId) {
    context.authToken = loginAttempt.authToken
    return {
      userId: loginAttempt.userId,
      authToken: encodeAuthToken(loginAttempt.authToken),
      isNewUser: false
    }
  }
  const {error} = loginAttempt
  if (error === AuthenticationError.USER_EXISTS_GOOGLE) {
    return {error: {message: 'Try logging in with Google'}}
  } else if (error === AuthenticationError.USER_EXISTS_MICROSOFT) {
    return {error: {message: 'Try logging in with Microsoft'}}
  } else if (
    error === AuthenticationError.INVALID_PASSWORD ||
    error === AuthenticationError.USER_NOT_FOUND
  ) {
    return {error: {message: 'Invalid email or password'}}
  } else if (error === AuthenticationError.MISSING_HASH) {
    return {error: {message: error}}
  }
  return {error: {message: 'Unknown Error'}}
}

export default loginWithPassword
