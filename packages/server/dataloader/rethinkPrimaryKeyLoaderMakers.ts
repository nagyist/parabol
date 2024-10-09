import RethinkPrimaryKeyLoaderMaker from './RethinkPrimaryKeyLoaderMaker'

/**
 * all rethink dataloader types which also must exist in {@link rethinkDriver/RethinkSchema}
 */
export const newFeatures = new RethinkPrimaryKeyLoaderMaker('NewFeature')
export const notifications = new RethinkPrimaryKeyLoaderMaker('Notification')
export const tasks = new RethinkPrimaryKeyLoaderMaker('Task')
export const teamInvitations = new RethinkPrimaryKeyLoaderMaker('TeamInvitation')
