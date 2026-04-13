import { useParams, useNavigate } from "react-router-dom"
import { message, Typography, Card, Alert, Breadcrumb } from "antd"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import AppointmentTimeSelection from "../../components/AppointmentTimeSelection"
import { TIME_SELECTION_CONFIGS } from "../../components/timeSelectionConfigs"
import {
  getOnsiteBranchApiAdminAppointmentsV1OnsiteBranchesOnsiteIdGet,
  getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet,
  updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut,
  getBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdGet,
  updateBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdPut,
} from "../../services/client"
import type {
  OnsiteBranchDetails as OnsiteBranchDetailsType,
  ApiError,
  UpdateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPutData,
  UpdateBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdPutData,
  SuccessResponse
} from "../../services/client"
import {
  convertToAppointmentFormat,
  convertToBranchHoursFormat,
  convertOperatingHoursToApiFormat,
  type AppointmentHoursData
} from "../../utils/operatingHoursConverters"

const { Title } = Typography
// Days mapping for conversion between API and UI

export default function OnsiteBranchDetails() {
  const { branchId } = useParams<{ branchId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // Fetch onsite branch details
  const onsiteBranchQuery = useQuery<OnsiteBranchDetailsType, ApiError>({
    queryKey: ['onsite-branch', branchId],
    queryFn: () => getOnsiteBranchApiAdminAppointmentsV1OnsiteBranchesOnsiteIdGet({
      onsiteId: Number(branchId!)
    }),
    enabled: !!branchId
  })

  // Fetch appointment operating hours for the branch
  const appointmentOperatingHoursQuery = useQuery({
    queryKey: ['appointment-operating-hours', onsiteBranchQuery.data?.branch_id],
    queryFn: () => getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet({
      branchId: onsiteBranchQuery.data!.branch_id
    }),
    enabled: !!onsiteBranchQuery.data?.branch_id
  })

  // Fetch branch basic operating hours for background display
  const branchOperatingHoursQuery = useQuery({
    queryKey: ['branch-operating-hours', onsiteBranchQuery.data?.branch_id],
    queryFn: () => getBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdGet({
      branchId: onsiteBranchQuery.data!.branch_id
    }),
    enabled: !!onsiteBranchQuery.data?.branch_id
  })

  // Update appointment operating hours mutation
  const updateAppointmentOperatingHoursMutation = useMutation<
    SuccessResponse,
    ApiError,
    UpdateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPutData
  >({
    mutationFn: (data) => updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-operating-hours', onsiteBranchQuery.data?.branch_id] })
      message.success('Appointment operating hours updated successfully')
    },
    onError: (error: ApiError) => {
      handleMutationError(error, 'appointment operating hours update')
    }
  })

  // Update branch operating hours mutation
  const updateBranchOperatingHoursMutation = useMutation<
    SuccessResponse,
    ApiError,
    UpdateBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdPutData
  >({
    mutationFn: (data) => updateBranchBasicOperatingHoursApiAdminAppointmentsV1BranchOperatingHoursBranchIdPut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-operating-hours', onsiteBranchQuery.data?.branch_id] })
      message.success('Branch operating hours updated successfully')
    },
    onError: (error: ApiError) => {
      handleMutationError(error, 'branch operating hours update')
    }
  })


  const handleOperatingHoursUpdate = async (operatingHoursData: AppointmentHoursData) => {
    if (!onsiteBranchQuery.data) return

    // Convert the modular time selection format back to API format
    const { appointmentHours, branchHours } = convertOperatingHoursToApiFormat(operatingHoursData)

    try {
      // Update appointment operating hours
      await updateAppointmentOperatingHoursMutation.mutateAsync({
        branchId: onsiteBranchQuery.data.branch_id,
        requestBody: appointmentHours
      })

      // For onsite branches, sync branch operating hours with appointment hours
      // (UIUX logic: onsite branches have same branch and appointment hours)
      if (onsiteBranchQuery.data) {
        await updateBranchOperatingHoursMutation.mutateAsync({
          branchId: onsiteBranchQuery.data.branch_id,
          requestBody: branchHours
        })
      }
    } catch (error) {
      console.error('Failed to update operating hours:', error)
    }
  }

  const branch = onsiteBranchQuery.data
  const appointmentOperatingHours = appointmentOperatingHoursQuery.data
  const branchOperatingHours = branchOperatingHoursQuery.data
  if (!branchId) {
    return (
      <div className="p-6">
        <Alert
          message="Invalid Onsite Branch"
          description="No onsite branch ID provided."
          type="error"
          showIcon
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-6 w-full">
        <Breadcrumb className="mb-4" items={[
          {
            title: 'Appointments',
            onClick: () => navigate('/appointments')
          },
          {
            title: 'Onsite Branches',
            onClick: () => navigate('/appointments/onsite-branches')
          },
          {
            title: branch?.branch_name || 'Loading...'
          }
        ]} />
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Title level={2} className="mb-0">
              {branch?.branch_name || 'Loading...'}
            </Title>
          </div>
        </div>

        <QueryStateHandler<OnsiteBranchDetailsType>
          query={onsiteBranchQuery}
          onRetry={() => onsiteBranchQuery.refetch()}
          loadingSkeleton={<Card loading />}
          isEmpty={(data: OnsiteBranchDetailsType) => !data}
          emptyTitle="Onsite branch not found"
          emptyDescription="The requested onsite branch could not be found."
        >
          {() => (
            <div>
              {appointmentOperatingHours && branchOperatingHours ? (
                <AppointmentTimeSelection
                  branchName={branch?.branch_name}
                  loading={updateAppointmentOperatingHoursMutation.isPending || updateBranchOperatingHoursMutation.isPending}
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