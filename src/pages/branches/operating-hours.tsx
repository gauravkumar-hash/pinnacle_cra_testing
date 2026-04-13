import { useParams, useNavigate } from "react-router-dom"
import { Card, Alert, Breadcrumb, App, Skeleton } from "antd"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { getBranchApiAdminBranchesBranchIdGet, ApiError, createClinicOperatingHourApiAdminBranchesBranchIdOperatingHoursPost, deleteOperatingHourApiAdminBranchesBranchIdOperatingHoursDeleteDelete, DayOfWeek, getOperatingHoursApiAdminBranchesBranchIdOperatingHoursGet } from "../../services/client"
import { getErrorMsg } from "../../utils"
import TimeSelection from "../../components/TimeSelection"


export default function BranchOperatingHours() {
  const { branchId } = useParams<{ branchId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Convert time string (HH:mm:ss) to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Convert minutes from midnight to time string (HH:mm:ss)
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
  }

  // Fetch branch details for the title
  const branchQuery = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => getBranchApiAdminBranchesBranchIdGet({
      branchId: branchId!
    }),
    enabled: !!branchId
  })

  // Fetch operating hours
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['branches', branchId, 'operating_hours'],
    queryFn: () => getOperatingHoursApiAdminBranchesBranchIdOperatingHoursGet({ branchId: branchId! }),
    enabled: !!branchId
  })

  const mutateProps = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'operating_hours'] })
      queryClient.invalidateQueries({ queryKey: ['branches', branchId] })
    },
    onError: (error: ApiError) => message.error(getErrorMsg(error))
  }
  const createMutation = useMutation({ mutationFn: createClinicOperatingHourApiAdminBranchesBranchIdOperatingHoursPost, ...mutateProps })
  const deleteMutation = useMutation({ mutationFn: deleteOperatingHourApiAdminBranchesBranchIdOperatingHoursDeleteDelete, ...mutateProps })

  // Convert operating hours data to TimeSelection format
  const convertToTimeSelectionFormat = () => {
    if (!data?.data) return {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
      PH: []
    }

    const timeFormat: { [key: string]: Array<{ id: string; start: number; end: number; cutoff_time?: number }> } = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
      PH: []
    }

    data.data.forEach((hour) => {
      const dayKey = hour.day === 'Public Holiday' ? 'PH' : hour.day
      if (timeFormat[dayKey] !== undefined) {
        timeFormat[dayKey].push({
          id: hour.id.toString(),
          start: timeToMinutes(hour.start_time),
          end: timeToMinutes(hour.end_time),
          cutoff_time: hour.cutoff_time || 0
        })
      }
    })

    return timeFormat
  }

  // Handle save from TimeSelection component
  const handleTimeSelectionSave = async (hours: any) => {
    if (!branchId) return

    setIsSaving(true)
    try {
      // Get all existing IDs
      const existingIds = data?.data?.map(h => h.id) || []
      
      // Collect all new operating hours
      const newHours: Array<{ day: string; start_time: string; end_time: string; cutoff_time: number }> = []
      
      Object.entries(hours).forEach(([day, intervals]) => {
        const dayName = day === 'PH' ? 'Public Holiday' : day;
        (intervals as Array<{ start: number; end: number; cutoff_time?: number }>).forEach((interval) => {
          newHours.push({
            day: dayName as DayOfWeek,
            start_time: minutesToTime(interval.start),
            end_time: minutesToTime(interval.end),
            cutoff_time: interval.cutoff_time || 0
          })
        })
      })

      // Delete existing hours if any
      if (existingIds.length > 0) {
        await deleteMutation.mutateAsync({ branchId, requestBody: { ids: existingIds } })
      }

      // Create new hours
      for (const hour of newHours) {
        await createMutation.mutateAsync({
          branchId,
          requestBody: {
            day: hour.day as DayOfWeek,
            start_time: hour.start_time,
            end_time: hour.end_time,
            cutoff_time: hour.cutoff_time
          }
        })
      }

      message.success('Operating hours saved successfully')
      queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'operating_hours'] })
      queryClient.invalidateQueries({ queryKey: ['branches', branchId] })
    } catch (error) {
      message.error('Failed to save operating hours')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!branchId) {
    return (
      <div className="p-6">
        <Alert
          message="Invalid Branch"
          description="No branch ID provided."
          type="error"
          showIcon
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-6 w-full">
        <Breadcrumb className="mb-4"
          items={[
            { 
              title: 'Branches',
              onClick: () => navigate('/branches')
            },
            {
              title: `${branchQuery.data?.data?.name} - Operating Hours` || 'Loading...'
            }
          ]}
        />

        <QueryStateHandler
          query={branchQuery as any}
          onRetry={() => branchQuery.refetch()}
          loadingSkeleton={<Card loading />}
          isEmpty={(data: any) => !data}
          emptyTitle="Branch not found"
          emptyDescription="The requested branch could not be found."
        >
          {() => (
            <Card>
              {isPending ? (
                <Skeleton />
              ) : isError ? (
                <div>{error?.message}</div>
              ) : (
                <TimeSelection
                  branchName={branchQuery.data?.data?.name}
                  initialHours={convertToTimeSelectionFormat()}
                  onSave={handleTimeSelectionSave}
                  loading={isSaving}
                />
              )}
            </Card>
          )}
        </QueryStateHandler>
      </div>
    </ErrorBoundary>
  )
}