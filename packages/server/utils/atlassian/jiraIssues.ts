import stringify from 'fast-json-stable-stringify'
import ms from 'ms'
import {RateLimitError} from 'parabol-client/utils/AtlassianManager'
import sleep from 'parabol-client/utils/sleep'
import type AtlassianServerManager from '../AtlassianServerManager'
import type {JiraGetIssueRes} from '../AtlassianServerManager'
import getRedis from '../getRedis'

const ISSUE_TTL_MS = ms('1d')
const MAX_ATTEMPT_DURATION = ms('9s')

type StoreAndNetworkRequests = CacheHit | CacheMiss | CacheError

interface RequestsInit {
  firstToResolve: (value: unknown) => void
  cachedIssue: undefined
}
interface CacheHit {
  firstToResolve: (value: unknown) => void
  cachedIssue: string
}
interface CacheMiss {
  firstToResolve: (value: unknown) => void
  cachedIssue: null
}
type CacheError = RequestsInit

/* helper fn to only do jira request side effects and return nothing */
const getIssueFromJira = async (
  manager: AtlassianServerManager,
  cloudId: string,
  issueKey: string,
  pushUpdateToClient: (
    issue: JiraGetIssueRes
  ) => void /* cb invoked when we get a fresher jira issue */,
  extraFieldIds: string[],
  extraExpand: string[] = [],
  redisKey: string,
  requests: StoreAndNetworkRequests, // resolve originally created promise in outer fn
  tryUntil: Date
): Promise<void> => {
  // get issue from external network (jira api)
  const res = await manager.getIssue(cloudId, issueKey, extraFieldIds, extraExpand)

  if (res instanceof RateLimitError) {
    const {retryAt} = res
    if (retryAt > tryUntil) {
      requests.firstToResolve(res)
      return
    }
    const delay = Math.max(0, retryAt.getTime() - Date.now())
    await sleep(delay)
    return getIssueFromJira(
      manager,
      cloudId,
      issueKey,
      pushUpdateToClient,
      extraFieldIds,
      extraExpand,
      redisKey,
      requests,
      tryUntil
    )
  } else if (res instanceof Error) {
    /*
     * does nothing if redis already returned a res, else resolve with error
     * don't wait for redis if it's unresponsive and still hasn't returned
     */
    requests.firstToResolve(res)
    return
  }

  const redis = getRedis()
  const issueFromJiraStr = stringify(res)
  // got a successful response from jira
  if (!requests.cachedIssue) {
    // redis is unresponsive or returned null
    requests.firstToResolve(res)
    redis.set(redisKey, issueFromJiraStr, 'PX', ISSUE_TTL_MS) // set cache behind
  } else {
    // there was a cached value in redis, firstToResolve already called
    if (issueFromJiraStr !== requests.cachedIssue) {
      // update redis & push an update via pubsub
      pushUpdateToClient(res as JiraGetIssueRes)
      redis.set(redisKey, issueFromJiraStr, 'PX', ISSUE_TTL_MS) // set cache behind
    }
    // if they're equal, do nothing
  }
}

export const getIssue = async (
  manager: AtlassianServerManager,
  cloudId: string,
  issueKey: string,
  pushUpdateToClient: (
    issue: JiraGetIssueRes
  ) => void /* cb invoked when we get a fresher issue from jira */,
  extraFieldIds: string[] = [],
  extraExpand: string[] = []
) => {
  return new Promise<Awaited<ReturnType<(typeof manager)['getIssue']>>>((resolve) => {
    const requests = {
      firstToResolve: resolve,
      cachedIssue: undefined
    } as StoreAndNetworkRequests

    const redisKey = `jira:${cloudId}:${issueKey}:${stringify(extraFieldIds)}${
      extraExpand.length > 0 ? stringify(extraExpand) : ''
    }`

    const redis = getRedis()
    // get issue from redis
    redis.get(redisKey).then((res) => {
      requests.cachedIssue = res
      if (res) {
        requests.firstToResolve(JSON.parse(res))
      }
    })
    const tryUntil = new Date(Date.now() + MAX_ATTEMPT_DURATION)
    getIssueFromJira(
      manager,
      cloudId,
      issueKey,
      pushUpdateToClient,
      extraFieldIds,
      extraExpand,
      redisKey,
      requests, // pass requests obj so jira retries resolve the originally returned promise
      tryUntil
    )
  })
}
