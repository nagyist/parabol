import {Threshold} from 'parabol-client/types/constEnums'
import type {Task} from '../../../postgres/types'

const connectionFromTasks = <T extends {updatedAt: Date} = Task>(
  tasks: T[],
  first: number = Threshold.MAX_NUMBER_OF_TASKS_TO_LOAD,
  error?: {message: string}
) => {
  const nodes = tasks.slice(0, first)
  const edges = nodes.map((node) => ({
    cursor: node.updatedAt,
    node
  }))
  const firstEdge = edges[0]
  // If we return a real error, yoga will thow and mask it
  const sanitizedError = error instanceof Error ? {message: error.message} : error
  return {
    error: sanitizedError,
    edges,
    pageInfo: {
      startCursor: firstEdge && firstEdge.cursor,
      endCursor: firstEdge ? edges[edges.length - 1]!.cursor : new Date(),
      hasNextPage: tasks.length > nodes.length,
      hasPreviousPage: false
    }
  }
}

export default connectionFromTasks
