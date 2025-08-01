/*
  GraphQL Shield has a great API but it uses graphql-middleware, which is horrendously slow.
  This is because the middleware wraps every single field. yikes!
  It also does typechecks in runtime that we can do at build time

  resolver-composition uses a barebones middleware, but the API is lacking (e.g. no caching, uses dot-separated strings for fields)
  So, I kept the Shield API for rules, but I don't run it through graphql-middleware
  Unfortunately, it still requires graphql-middleware, which is why it's a dependency

  This file accepts resolvers and permissions and applies permissions as higher order functions to those resolvers
*/
import {defaultFieldResolver, GraphQLError} from 'graphql'
import type {IRules} from 'graphql-shield'
import {allow} from 'graphql-shield'
import hash from 'object-hash'
import {Logger} from '../utils/Logger'
import type {ResolverFn} from './private/resolverTypes'

// hack to get ShieldRule since it's not exported from graphql-shield
export type ShieldRule = Extract<IRules, {resolve: any}>

type Resolver = ResolverFn<any, any, any, any>

const options = {
  allowExternalErrors: false,
  debug: false,
  fallbackRule: allow,
  fallbackError: () => new Error(''),
  hashFunction: hash
}

const wrapResolve =
  (resolve: Resolver, rule: ShieldRule): Resolver =>
  async (source, args, context, info) => {
    if (!context._shield) {
      context._shield = {
        cache: {}
      }
    }
    try {
      const res = await rule.resolve(source, args, context, info, options)
      if (res === true) {
        return await resolve(source, args, context, info)
      } else {
        if (res === false) return new GraphQLError('Not authorized')
        if (typeof res === 'string') return new GraphQLError(res)
        return res
      }
    } catch (err) {
      if (!(err instanceof GraphQLError)) {
        Logger.log(err)
      }
      throw err
    }
  }

type ResolverMap = {
  // This type causes too much recursion, so I set it to any
  // {[FieldName: string]: R<any, any, any, any>} | GraphQLScalarType | SubscriptionResolvers
  readonly [TypeName: string]: any
}

interface PermissionMap {
  readonly [TypeName: string]: {
    readonly [FieldName: string]: ShieldRule
  }
}

const composeResolvers = <T extends ResolverMap>(resolverMap: T, permissionMap: PermissionMap) => {
  // clone the resolver map to keep this fn pure
  const nextResolverMap = {...resolverMap}
  Object.entries(permissionMap).forEach((entry) => {
    const typeName = entry[0] as keyof T
    const ruleFieldMap = entry[1]
    // only clone field maps that will be mutated by permissions
    nextResolverMap[typeName] = {...nextResolverMap[typeName]}
    const nextResolverFieldMap = nextResolverMap[typeName]
    if (!nextResolverFieldMap) throw new Error(`No resolver exists for type: ${String(typeName)}`)
    Object.entries(ruleFieldMap).forEach(([fieldName, rule]) => {
      if (fieldName === '*') {
        // apply this rule to every member of the nextResolverFieldMap
        // Note: Permissions don't get applied to fields that don't have custom resolvers!
        // If this becomes a problem, we'll need to use the schema to get the typeMaps
        Object.entries(nextResolverFieldMap).forEach(([resolverFieldName, resolve]) => {
          // the wildcard is just a default value. if the field has a specific rule, use that
          if (ruleFieldMap[resolverFieldName]) return
          nextResolverFieldMap[resolverFieldName] = wrapResolve(resolve as Resolver, rule)
        })
      } else {
        // use default if a resolver isn't provided, e.g. a field exists in the DB but only available to superusers via GQL
        const unwrappedResolver = nextResolverFieldMap[fieldName] || defaultFieldResolver
        nextResolverFieldMap[fieldName] = wrapResolve(unwrappedResolver, rule)
      }
    })
  })
  return nextResolverMap
}

export default composeResolvers
