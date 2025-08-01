import bcrypt from 'bcryptjs'
import {GraphQLID, GraphQLNonNull, GraphQLString} from 'graphql'
import {Security, Threshold} from 'parabol-client/types/constEnums'
import {AuthIdentityTypeEnum} from '../../../client/types/constEnums'
import type AuthIdentityLocal from '../../database/types/AuthIdentityLocal'
import AuthToken from '../../database/types/AuthToken'
import getKysely from '../../postgres/getKysely'
import {getUserByEmail} from '../../postgres/queries/getUsersByEmails'
import updateUser from '../../postgres/queries/updateUser'
import blacklistJWT from '../../utils/blacklistJWT'
import encodeAuthToken from '../../utils/encodeAuthToken'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import rateLimit from '../rateLimit'
import ResetPasswordPayload from '../types/ResetPasswordPayload'

const resetPassword = {
  type: new GraphQLNonNull(ResetPasswordPayload),
  description: 'Reset the password for an account',
  args: {
    token: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'the password reset token'
    },
    newPassword: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The new password for the account'
    }
  },
  resolve: rateLimit({perMinute: 10, perHour: 100})(
    async (
      _source: unknown,
      {token, newPassword}: {token: string; newPassword: string},
      context: GQLContext
    ) => {
      if (process.env.AUTH_INTERNAL_DISABLED === 'true') {
        return {error: {message: 'Resetting password is disabled'}}
      }
      const pg = getKysely()
      const resetRequest = await pg
        .selectFrom('PasswordResetRequest')
        .selectAll()
        .where('token', '=', token)
        .executeTakeFirst()

      if (!resetRequest) {
        return {error: {message: 'Invalid reset token'}}
      }

      const {id: resetRequestId, email, time, isValid} = resetRequest
      const isExpired = time.getTime() + Threshold.RESET_PASSWORD_LIFESPAN < Date.now()
      if (isExpired || !isValid) {
        return {error: {message: 'Reset token expired'}}
      }

      // token is legit, let's invalidate it & set the new password
      const user = await getUserByEmail(email)
      if (!user) {
        return standardError(new Error(`User ${email} does not exist for password reset`))
      }
      const {id: userId, identities, tms, rol} = user
      const localIdentity = identities.find(
        (identity) => identity.type === AuthIdentityTypeEnum.LOCAL
      ) as AuthIdentityLocal
      if (!localIdentity) {
        return standardError(new Error(`User ${email} does not have a local identity`), {userId})
      }
      await pg
        .updateTable('PasswordResetRequest')
        .set({isValid: false})
        .where('id', '=', resetRequestId)
        .execute()

      // MUTATIVE
      localIdentity.hashedPassword = await bcrypt.hash(newPassword, Security.SALT_ROUNDS)
      localIdentity.isEmailVerified = true
      await Promise.all([
        updateUser({identities}, userId),
        pg.deleteFrom('FailedAuthRequest').where('email', '=', email).execute()
      ])
      context.authToken = new AuthToken({sub: userId, tms, rol})
      await blacklistJWT(userId, context.authToken.iat, context.socketId)
      return {
        userId,
        authToken: encodeAuthToken(context.authToken)
      }
    }
  )
}

export default resetPassword
