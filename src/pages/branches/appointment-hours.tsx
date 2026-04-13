import { useParams, useNavigate } from "react-router-dom"
import { Card, Alert, message, Breadcrumb } from "antd"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import AppointmentTimeSelection from "../../components/AppointmentTimeSelection"
import { TIME_SELECTION_CONFIGS } from "../../components/timeSelectionConfigs"
import {
  getBranchApiAdminBranchesBranchIdGet,
  getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet,
  updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut,
  getBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdGet,
} from "../../services/client"
import type {
  ApiError,
  UpdateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPutData,
  SuccessResponse,
  BranchResponse
} from "../../services/client"
import {
  convertToAppointmentFormat,
  convertToBranchHoursFormat,
  convertOperatingHoursToApiFormat,
  type AppointmentHoursData
} from "../../utils/operatingHoursConverters"


export default function BranchAppointmentHours() {
  const { branchId } = useParams<{ branchId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // Fetch branch details for the title
  const branchQuery = useQuery<BranchResponse, ApiError>({
    queryKey: ['branch', branchId],
    queryFn: () => getBranchApiAdminBranchesBranchIdGet({
      branchId: branchId!
    }),
    enabled: !!branchId
  })

  // Fetch appointment operating hours for the branch
  const appointmentOperatingHoursQuery = useQuery({
    queryKey: ['appointment-operating-hours', branchId],
    queryFn: () => getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet({
      branchId: branchId!
    }),
    enabled: !!branchId
  })

  // Fetch branch basic operating hours for background display
  const branchOperatingHoursQuery = useQuery({
    queryKey: ['branch-operating-hours', branchId],
    queryFn: () => getBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdGet({
      branchId: branchId!
    }),
    enabled: !!branchId
  })

  // Update appointment operating hours mutation
  const updateAppointmentOperatingHoursMutation = useMutation<
    SuccessResponse,
    ApiError,
    UpdateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPutData
  >({
    mutationFn: (data) => updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-operating-hours', branchId] })
      message.success('Appointment operating hours updated successfully')
    },
    onError: (error: ApiError) => {
      handleMutationError(error, 'appointment operating hours update')
    }
  })

  const handleOperatingHoursUpdate = async (operatingHoursData: AppointmentHoursData) => {
    if (!branchId) return

    // Convert the modular time selection format back to API format
    const { appointmentHours } = convertOperatingHoursToApiFormat(operatingHoursData)

    try {
      // Update appointment operating hours
      await updateAppointmentOperatingHoursMutation.mutateAsync({
        branchId: branchId,
        requestBody: appointmentHours
      })
    } catch (error) {
      console.error('Failed to update operating hours:', error)
    }
  }

  const appointmentOperatingHours = appointmentOperatingHoursQuery.data
  const branchOperatingHours = branchOperatingHoursQuery.data

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
      <div className="p-6">
        <Breadcrumb className="mb-4" items={[
          {
            title: 'Branches',
            onClick: () => navigate('/branches')
          },
          {
            title: `${branchQuery.data?.data?.name} - Appointment Hours` || 'Loading...'
          }
        ]} />

        <QueryStateHandler
          query={branchQuery}
          onRetry={() => branchQuery.refetch()}
          loadingSkeleton={<Card loading />}
          isEmpty={(data) => !data}
          emptyTitle="Branch not found"
          emptyDescription="The requested branch could not be found."
        >
          {() => (
            <div>
              {appointmentOperatingHours && branchOperatingHours ? (
                <AppointmentTimeSelection
                  branchName={branchQuery.data?.data?.name}
                  loading={updateAppointmentOperatingHoursMutation.isPending}
                  appointmentHours={convertToAppointmentFormat(appointmentOperatingHours)}
                  branchHours={convertToBranchHoursFormat(branchOperatingHours)}
                  onSave={handleOperatingHoursUpdate}
                  config={TIME_SELECTION_CONFIGS.APPOINTMENT}
                  defaultInterval={{
                    cutoff_time: 0,
                    max_bookings: 1
                  }}
                />
              ) : (
                <Alert
                  message="Operating Hours Not Available"
                  description="Unable to load operating hours for this branch. Both appointment and branch operating hours are required."
                  type="warning"
                  showIcon
                />
              )}
            </div>
          )}
        </QueryStateHandler>
      </div>
    </ErrorBoundary>
  )
}