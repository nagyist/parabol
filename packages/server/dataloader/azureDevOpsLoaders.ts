import DataLoader from 'dataloader'
import {decode} from 'jsonwebtoken'
import getAzureDevOpsDimensionFieldMaps from '../postgres/queries/getAzureDevOpsDimensionFieldMaps'
import type {IntegrationProviderAzureDevOps} from '../postgres/queries/getIntegrationProvidersByIds'
import insertTaskEstimate from '../postgres/queries/insertTaskEstimate'
import removeTeamMemberIntegrationAuthQuery from '../postgres/queries/removeTeamMemberIntegrationAuth'
import upsertTeamMemberIntegrationAuth from '../postgres/queries/upsertTeamMemberIntegrationAuth'
import type {TeamMemberIntegrationAuth} from '../postgres/types'
import AzureDevOpsServerManager, {
  type ProjectRes,
  type Resource,
  type TeamProjectReference,
  type WorkItem
} from '../utils/AzureDevOpsServerManager'
import {getInstanceId} from '../utils/azureDevOps/azureDevOpsFieldTypeToId'
import {Logger} from '../utils/Logger'
import logError from '../utils/logError'
import type RootDataLoader from './RootDataLoader'

type TeamUserKey = {
  teamId: string
  userId: string
}

export interface AzureDevOpsAllUserWorkItemsKey {
  teamId: string
  userId: string
  queryString: string | null
  projectKeyFilters: string[] | null
  isWIQL: boolean
  limit?: number
}

export interface AzureDevOpsAccessibleOrgsKey {
  userId: string
  teamId: string
  accountId: string
}

export interface AzureDevOpsProjectsKey {
  userId: string
  teamId: string
  accountName: string
}

export interface AzureDevOpsRemoteProjectKey {
  userId: string
  teamId: string
  instanceId: string
  projectId: string
}

export interface AzureDevOpsIssueKey {
  teamId: string
  userId: string
  instanceId: string
  issueKey: string
  viewerId: string
  taskId?: string
}

export interface AzureDevOpsWorkItemKey {
  teamId: string
  taskId?: string
  userId: string
  instanceId: string
  projectId: string
  viewerId: string
  workItemId: string
}

export interface AzureDevOpsWorkItemsKey {
  userId: string
  teamId: string
  instanceId: string
  projectId: string
}

export interface AzureDevOpsDimensionFieldMapKey {
  teamId: string
  dimensionName: string
  instanceId: string
  projectKey: string
  workItemType: string
}

export interface AzureDevOpsDimensionFieldMapEntry {
  teamId: string
  dimensionName: string
  fieldName: string
  fieldId: string
  instanceId: string
  fieldType: string
  projectKey: string
  workItemType: string
}

export interface AzureDevOpsWorkItem {
  id: string
  title: string
  teamProject: string
  url: string
  state: string
  type: string
  descriptionHTML: string
  service: 'azureDevOps'
  teamId: string
  userId: string
}

export interface AzureUserInfo {
  displayName: string
  publicAlias: string
  emailAddress: string
  id: string
  coreRevision: number
  revision: number
  timeStamp: string
}

export interface AzureAccountProject extends TeamProjectReference {
  userId: string
  teamId: string
  instanceId: string
  projectId: string
  service: 'azureDevOps'
}

export interface AzureProject extends ProjectRes {
  userId: string
  teamId: string
  service: 'azureDevOps'
}

export const freshAzureDevOpsAuth = (parent: RootDataLoader) => {
  return new DataLoader<TeamUserKey, TeamMemberIntegrationAuth | null, string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId}) => {
          const azureDevOpsAuthToRefresh = await parent
            .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
            .load({
              service: 'azureDevOps',
              teamId,
              userId
            })
          if (azureDevOpsAuthToRefresh === null) {
            return null
          }
          const {
            accessToken: existingAccessToken,
            refreshToken,
            providerId
          } = azureDevOpsAuthToRefresh
          if (!refreshToken) {
            return null
          }
          const decodedToken = existingAccessToken && (decode(existingAccessToken) as any)
          const now = new Date()
          const inAMinute = Math.floor((now.getTime() + 60000) / 1000)
          if (!decodedToken || decodedToken.exp < inAMinute) {
            const provider = await parent.get('integrationProviders').loadNonNull(providerId)
            const manager = new AzureDevOpsServerManager(
              azureDevOpsAuthToRefresh,
              provider as IntegrationProviderAzureDevOps
            )
            const oauthRes = await manager.refresh(refreshToken)
            if (oauthRes instanceof Error) {
              // Azure refresh token only lasts 24 hrs for SPAs. User must manually re-auth after that: https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4104
              if (oauthRes.message === 'invalid_grant') {
                await removeTeamMemberIntegrationAuthQuery('azureDevOps', teamId, userId)
              }
              return null
            }
            const {accessToken, refreshToken: newRefreshToken} = oauthRes
            const updatedRefreshToken = newRefreshToken || refreshToken
            const newAzureDevOpsAuth = {
              ...azureDevOpsAuthToRefresh,
              accessToken,
              refreshToken: updatedRefreshToken
            }
            await upsertTeamMemberIntegrationAuth(newAzureDevOpsAuth)
            return newAzureDevOpsAuth
          }
          return azureDevOpsAuthToRefresh
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : null))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.userId}:${key.teamId}`
    }
  )
}

export const azureDevOpsAllWorkItems = (parent: RootDataLoader) => {
  return new DataLoader<AzureDevOpsAllUserWorkItemsKey, AzureDevOpsWorkItem[] | Error, string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId, queryString, projectKeyFilters, isWIQL, limit}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) {
            return new Error('Failed to fetch a new access token, try re-authenticating')
          }
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )

          const restResult = await manager.getAllUserWorkItems(
            queryString,
            projectKeyFilters,
            isWIQL,
            limit
          )

          const {error, workItems} = restResult
          if (error !== undefined || workItems === undefined) {
            return error ?? new Error('Failed to fetch work items')
          }

          const mappedWorkItems: AzureDevOpsWorkItem[] = await Promise.all(
            workItems.map(async (returnedWorkItem): Promise<AzureDevOpsWorkItem> => {
              const instanceId = getInstanceId(new URL(returnedWorkItem.url))
              const mappedWorkItem = await getMappedAzureDevOpsWorkItem(
                userId,
                teamId,
                instanceId,
                returnedWorkItem,
                parent
              )
              return mappedWorkItem
            })
          )

          return mappedWorkItems
        })
      )
      return results.map((result) =>
        result.status === 'fulfilled' ? result.value : new Error('Failed to fetch work items')
      )
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.teamId}:${key.userId}`
    }
  )
}

export const azureDevUserInfo = (parent: RootDataLoader) => {
  return new DataLoader<TeamUserKey, AzureUserInfo | undefined, string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) {
            return undefined
          }
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )
          const restResult = await manager.getMe()
          const {error, azureDevOpsUser} = restResult
          if (error !== undefined || azureDevOpsUser === undefined) {
            Logger.log(error)
            return undefined
          }
          return {
            ...azureDevOpsUser
          }
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : undefined))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.teamId}:${key.userId}`
    }
  )
}

export const allAzureDevOpsAccessibleOrgs = (parent: RootDataLoader) => {
  return new DataLoader<TeamUserKey, Resource[], string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) {
            return []
          }
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )
          const userInfo = await parent.get('azureDevUserInfo').load({teamId, userId})
          if (!userInfo) return []
          const {id} = userInfo
          const results = await manager.getAccessibleOrgs(id)
          const {error, accessibleOrgs} = results
          // handle error if defined
          Logger.log(error)
          return accessibleOrgs.map((resource) => ({
            ...resource
          }))
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : []))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.userId}:${key.teamId}`
    }
  )
}

export const allAzureDevOpsProjects = (parent: RootDataLoader) => {
  return new DataLoader<TeamUserKey, AzureAccountProject[], string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) {
            return []
          }
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          if (!provider) {
            return []
          }
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )
          const {error, projects} = await manager.getAllUserProjects()
          if (error !== undefined) {
            Logger.log(error)
            return []
          }
          const resultReferences = [] as TeamProjectReference[]
          if (projects !== null) resultReferences.push(...projects)
          return resultReferences.map((project) => {
            const instanceId = getInstanceId(project.url)
            return {
              ...project,
              instanceId,
              userId,
              projectId: project.id,
              teamId,
              service: 'azureDevOps' as const
            }
          })
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : []))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.userId}:${key.teamId}`
    }
  )
}

export const azureDevOpsProject = (parent: RootDataLoader) => {
  return new DataLoader<AzureDevOpsRemoteProjectKey, AzureProject | null, string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({instanceId, userId, teamId, projectId}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) return null
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          if (!provider) return null
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )
          const projectRes = await manager.getProject(instanceId, projectId)
          if (projectRes instanceof Error) {
            Logger.log(projectRes)
            return null
          }
          return {
            ...projectRes,
            teamId,
            userId,
            self: projectRes._links.self.href,
            instanceId,
            service: 'azureDevOps' as const
          }
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : null))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.userId}:${key.teamId}:${key.instanceId}:${key.projectId}`
    }
  )
}

export const azureDevOpsDimensionFieldMap = (parent: RootDataLoader) => {
  return new DataLoader<
    AzureDevOpsDimensionFieldMapKey,
    AzureDevOpsDimensionFieldMapEntry | null,
    string
  >(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({teamId, dimensionName, instanceId, projectKey, workItemType}) => {
          const azureDevOpsDimensionFieldMap = await getAzureDevOpsDimensionFieldMaps(
            teamId,
            dimensionName,
            instanceId,
            projectKey,
            workItemType
          )
          if (!azureDevOpsDimensionFieldMap) {
            return null
          }
          return {
            ...azureDevOpsDimensionFieldMap
          } as AzureDevOpsDimensionFieldMapEntry
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : null))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) =>
        `${key.teamId}:${key.dimensionName}:${key.instanceId}:${key.projectKey}:${key.workItemType}`
    }
  )
}

const getProjectId = (url: URL) => {
  const firstIndex = url.pathname.indexOf('/', 1)
  const seconedIndex = url.pathname.indexOf('/', firstIndex + 1)
  return url.pathname.substring(firstIndex + 1, seconedIndex)
}

export const azureDevOpsUserStory = (parent: RootDataLoader) => {
  return new DataLoader<AzureDevOpsWorkItemKey, AzureDevOpsWorkItem | null, string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({teamId, userId, instanceId, workItemId}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) {
            return null
          }
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )
          const workItemIds: number[] = []
          const workItemNum = parseInt(workItemId)
          if (!isNaN(workItemNum)) {
            workItemIds.push(workItemNum)
          }
          const restResult = await manager.getWorkItemData(instanceId, workItemIds)
          const {error, workItems} = restResult
          if (error !== undefined || workItems.length !== 1 || !workItems[0]) {
            Logger.log(error)
            return null
          } else {
            const returnedWorkItem: WorkItem = workItems[0]
            const azureDevOpsWorkItem = await getMappedAzureDevOpsWorkItem(
              userId,
              teamId,
              instanceId,
              returnedWorkItem,
              parent
            )
            return azureDevOpsWorkItem
          }
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : null))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: (key) => `${key.teamId}:${key.userId}:${key.instanceId}:${key.workItemId}`
    }
  )
}

export const azureDevOpsWorkItem = (parent: RootDataLoader) => {
  return new DataLoader<AzureDevOpsWorkItemKey, AzureDevOpsWorkItem | null, string>(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId, instanceId, workItemId, taskId}) => {
          const [auth, estimates] = await Promise.all([
            parent.get('freshAzureDevOpsAuth').load({teamId, userId}),
            taskId ? parent.get('latestTaskEstimates').load(taskId) : []
          ])
          if (!auth) return null
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )
          const workItemDataResponse = await manager.getWorkItemData(instanceId, [
            parseInt(workItemId)
          ])
          if (workItemDataResponse instanceof Error) {
            logError(workItemDataResponse, {
              userId,
              tags: {instanceId, workItemId, teamId}
            })
            return null
          }
          const {workItems: returnedWorkItems} = workItemDataResponse
          if (returnedWorkItems.length !== 1 || !returnedWorkItems[0]) return null
          const returnedWorkItem = returnedWorkItems[0]
          const azureDevOpsWorkItem = await getMappedAzureDevOpsWorkItem(
            userId,
            teamId,
            instanceId,
            returnedWorkItem,
            parent
          )

          // update our records
          await Promise.all(
            estimates.map((estimate) => {
              const {azureDevOpsFieldName, label, discussionId, name, taskId, userId} = estimate
              if (!azureDevOpsFieldName) {
                return undefined
              }
              let freshEstimate = ''
              if (azureDevOpsWorkItem.type === 'User Story') {
                freshEstimate = returnedWorkItem.fields['Microsoft.VSTS.Scheduling.StoryPoints']
              } else if (azureDevOpsWorkItem.type === 'Task') {
                freshEstimate =
                  returnedWorkItem.fields['Microsoft.VSTS.Scheduling.OriginalEstimate']
              }
              if (freshEstimate === label) return undefined
              // mutate current dataloader
              estimate.label = freshEstimate
              return insertTaskEstimate({
                changeSource: 'external',
                discussionId,
                azureDevOpsFieldName,
                label: freshEstimate,
                name,
                meetingId: null,
                stageId: null,
                taskId,
                userId
              })
            })
          )
          return azureDevOpsWorkItem
        })
      )
      return results.map((result) => (result.status === 'fulfilled' ? result.value : null))
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: ({userId, teamId, instanceId, workItemId}) =>
        `${userId}:${teamId}:${instanceId}:${workItemId}`
    }
  )
}

export type AzureDevOpsProjectProcessTemplateKey = {
  userId: string
  teamId: string
  instanceId: string
  projectId: string
}
export type AzureDevOpsProjectProcessTemplate = {
  error?: Error
  projectTemplate?: string
}

export const azureDevOpsProjectProcessTemplate = (parent: RootDataLoader) => {
  return new DataLoader<
    AzureDevOpsProjectProcessTemplateKey,
    AzureDevOpsProjectProcessTemplate,
    string
  >(
    async (keys) => {
      const results = await Promise.allSettled(
        keys.map(async ({userId, teamId, instanceId, projectId}) => {
          const auth = await parent.get('freshAzureDevOpsAuth').load({teamId, userId})
          if (!auth) return null
          const provider = await parent.get('integrationProviders').loadNonNull(auth.providerId)
          const manager = new AzureDevOpsServerManager(
            auth,
            provider as IntegrationProviderAzureDevOps
          )

          return manager.getProjectProcessTemplate(instanceId, projectId)
        })
      )
      return results.map((result) =>
        result.status === 'fulfilled' && result.value
          ? result.value
          : {error: new Error('Failed to get project process template')}
      )
    },
    {
      ...parent.dataLoaderOptions,
      cacheKeyFn: ({userId, teamId, instanceId, projectId}) =>
        `${userId}:${teamId}:${instanceId}:${projectId}`
    }
  )
}

const getMappedAzureDevOpsWorkItem = async (
  userId: string,
  teamId: string,
  instanceId: string,
  returnedWorkItem: WorkItem,
  dataLoader: RootDataLoader
) => {
  const mappedUrl = returnedWorkItem._links['html']?.href ?? returnedWorkItem.url
  const azureDevOpsWorkItem = {
    id: returnedWorkItem.id.toString(),
    title: returnedWorkItem.fields['System.Title'],
    teamProject: getProjectId(new URL(returnedWorkItem.url)),
    url: mappedUrl,
    state: returnedWorkItem.fields['System.State'],
    type: returnedWorkItem.fields['System.WorkItemType'],
    descriptionHTML: returnedWorkItem.fields['System.Description']
      ? returnedWorkItem.fields['System.Description']
      : '',
    service: 'azureDevOps',
    teamId,
    userId
  } as AzureDevOpsWorkItem

  const projectResult = await dataLoader.get('azureDevOpsProjectProcessTemplate').load({
    userId,
    teamId,
    instanceId,
    projectId: azureDevOpsWorkItem.teamProject
  })
  const {error: projectResultError, projectTemplate} = projectResult
  if (projectResultError) {
    const workItemId = returnedWorkItem.id.toString()
    logError(projectResultError, {
      userId,
      tags: {instanceId, workItemId, teamId}
    })
  } else {
    azureDevOpsWorkItem.type = `${projectTemplate}:${returnedWorkItem.fields['System.WorkItemType']}`
  }
  return azureDevOpsWorkItem
}
