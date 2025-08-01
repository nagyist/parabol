import {GraphQLObjectType} from 'graphql'
import type {GQLContext} from '../graphql'
import StandardMutationError from './StandardMutationError'
import TemplateDimension from './TemplateDimension'

const MovePokerTemplateDimensionPayload = new GraphQLObjectType<any, GQLContext>({
  name: 'MovePokerTemplateDimensionPayload',
  fields: () => ({
    error: {
      type: StandardMutationError
    },
    dimension: {
      type: TemplateDimension,
      resolve: ({dimensionId}, _args: unknown, {dataLoader}) => {
        if (!dimensionId) return null
        return dataLoader.get('templateDimensions').load(dimensionId)
      }
    }
  })
})

export default MovePokerTemplateDimensionPayload
