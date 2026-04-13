import type { BranchOperatingHoursResponse } from '../services/client'

// Types matching AppointmentTimeSelection component
export interface AppointmentInterval {
  id: string
  start_time: string
  end_time: string
  cutoff_time?: number
  max_bookings?: number
  [key: string]: unknown
}

export interface BranchInterval {
  id: string
  start_time: string
  end_time: string
}

export interface AppointmentHoursData {
  [day: string]: AppointmentInterval[]
}

export interface BranchHoursData {
  [day: string]: BranchInterval[]
}

const DAYS_MAPPING = {
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday',
  Sunday: 'Sunday',
  PH: 'Public Holiday'
} as const

const createEmptyDaysFormat = (): AppointmentHoursData => ({
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
  "Public Holiday": []
})

const createEmptyBranchFormat = (): BranchHoursData => ({
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
  "Public Holiday": []
})

export const convertToAppointmentFormat = (hoursResponse: BranchOperatingHoursResponse): AppointmentHoursData => {
  const appointmentFormat = createEmptyDaysFormat()

  Object.entries(hoursResponse.operating_hours).forEach(([day, intervals]) => {
    const dayKey = DAYS_MAPPING[day as keyof typeof DAYS_MAPPING] || day
    if (appointmentFormat[dayKey] !== undefined) {
      appointmentFormat[dayKey] = intervals.map((interval: Record<string, unknown>, index: number) => ({
        id: (interval.id as string) || `${day}-${index}-${Date.now()}`,
        start_time: interval.start_time as string,
        end_time: interval.end_time as string,
        cutoff_time: (interval.cutoff_time as number) || 0,
        max_bookings: (interval.max_bookings as number) || 1
      }))
    }
  })

  return appointmentFormat
}

export const convertToBranchHoursFormat = (hoursResponse: { operating_hours?: Record<string, unknown[]> }): BranchHoursData => {
  if (!hoursResponse?.operating_hours) return createEmptyBranchFormat()
  
  const branchFormat = createEmptyBranchFormat()

  Object.entries(hoursResponse.operating_hours).forEach(([day, intervals]) => {
    const dayKey = DAYS_MAPPING[day as keyof typeof DAYS_MAPPING] || day
    if (branchFormat[dayKey] !== undefined && Array.isArray(intervals)) {
      branchFormat[dayKey] = intervals.map((interval, index: number) => ({
        id: ((interval as Record<string, unknown>).id as string) || `branch-${day}-${index}-${Date.now()}`,
        start_time: (interval as Record<string, unknown>).start_time as string,
        end_time: (interval as Record<string, unknown>).end_time as string
      }))
    }
  })

  return branchFormat
}

export const convertOperatingHoursToApiFormat = (operatingHoursData: AppointmentHoursData) => {
  const convertedAppointmentHours: Record<string, unknown> = {}
  const convertedBranchHours: Record<string, unknown> = {}
  
  Object.entries(operatingHoursData).forEach(([day, intervals]) => {
    // For appointment hours (with cutoff_time and max_bookings)
    convertedAppointmentHours[day] = intervals.map((interval) => ({
      start_time: interval.start_time,
      end_time: interval.end_time,
      cutoff_time: interval.cutoff_time || 0,
      max_bookings: interval.max_bookings || 1
    }))

    // For branch hours (basic, no cutoff_time or max_bookings)
    convertedBranchHours[day] = intervals.map((interval) => ({
      start_time: interval.start_time,
      end_time: interval.end_time,
      cutoff_time: 0
    }))
  })

  return {
    appointmentHours: convertedAppointmentHours,
    branchHours: convertedBranchHours
  }
}