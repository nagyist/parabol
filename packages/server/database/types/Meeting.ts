import generateUID from '../../generateUID'
import type {MeetingTypeEnum} from '../../postgres/types/Meeting'
import type {NewMeetingPhase} from '../../postgres/types/NewMeetingPhase'
import type GenericMeetingPhase from './GenericMeetingPhase'

interface Input {
  id?: string | null
  teamId: string
  meetingType: MeetingTypeEnum
  meetingCount: number
  name?: string | null
  // Every meeting has at least one phase
  phases: [NewMeetingPhase, ...NewMeetingPhase[]]
  facilitatorUserId: string
  meetingSeriesId?: number | null
  scheduledEndTime?: Date | null
  summary?: string | null
  sentimentScore?: number | null
}

const namePrefix = {
  action: 'Check-in',
  retrospective: 'Retro'
} as Record<MeetingTypeEnum, string>
export default abstract class Meeting {
  id: string
  isLegacy?: boolean // true if old version of action meeting
  createdAt = new Date()
  updatedAt = new Date()
  createdBy: string | null
  endedAt: Date | undefined | null = undefined
  facilitatorStageId: string
  facilitatorUserId: string | null
  meetingCount: number
  meetingNumber: number
  name: string
  summarySentAt: Date | undefined | null = undefined
  teamId: string
  meetingType: MeetingTypeEnum
  phases: GenericMeetingPhase[]
  meetingSeriesId?: number | null
  scheduledEndTime?: Date | null
  summary?: string | null
  sentimentScore?: number | null
  usedReactjis?: Record<string, number> | null
  slackTs?: string | number | null
  engagement?: number | null

  constructor(input: Input) {
    const {
      id,
      teamId,
      facilitatorUserId,
      meetingCount,
      meetingType,
      name,
      phases,
      meetingSeriesId,
      scheduledEndTime,
      summary,
      sentimentScore
    } = input
    this.id = id ?? generateUID()
    this.createdBy = facilitatorUserId
    this.facilitatorStageId = phases[0]?.stages[0]?.id
    this.facilitatorUserId = facilitatorUserId
    this.meetingCount = meetingCount
    this.meetingNumber = meetingCount + 1
    this.meetingType = meetingType
    this.name = name ?? `${namePrefix[meetingType]} #${this.meetingNumber}`
    this.phases = phases
    this.teamId = teamId
    this.meetingSeriesId = meetingSeriesId
    this.scheduledEndTime = scheduledEndTime
    this.summary = summary
    this.sentimentScore = sentimentScore
  }
}
