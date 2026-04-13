import React, { useState, useRef, useCallback } from "react"
import { Card, Button, Typography, Modal, Form, Input, InputNumber, Select } from "antd"
import { DeleteOutlined, EditOutlined } from "@ant-design/icons"

const { Title, Text } = Typography

// Generic interface for time intervals that can be extended
interface BaseTimeInterval {
  id: string
  start_time: string  // "HH:MM" format
  end_time: string    // "HH:MM" format
}

// Extended interface for appointment operating hours format
interface AppointmentInterval extends BaseTimeInterval {
  cutoff_time?: number
  max_bookings?: number
  [key: string]: any // Allow additional fields
}

// Branch operating hours for background display
interface BranchInterval extends BaseTimeInterval {
  // Basic branch hours without additional appointment-specific fields
}

interface AppointmentHoursData {
  [day: string]: AppointmentInterval[]
}

interface BranchHoursData {
  [day: string]: BranchInterval[]
}

interface TimeSelectionConfig {
  fields: {
    id: string
    label: string
    type: 'number' | 'text'
    required?: boolean
    min?: number
    max?: number
    defaultValue?: any
  }[]
  validation?: (values: any) => string | null
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Public Holiday"]
const HOURS_IN_DAY = 24
const MINUTES_IN_HOUR = 60
const GRID_HEIGHT = 600
const HOUR_HEIGHT = GRID_HEIGHT / HOURS_IN_DAY

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

const TimeGrid: React.FC<{ showTiming?: boolean }> = ({ showTiming }) => (
  <div className="absolute inset-0 pointer-events-none">
    {Array.from({ length: HOURS_IN_DAY + 1 }).map((_, hour) => (
      <div
        key={hour}
        className="absolute left-0 right-0 border-t border-gray-200"
        style={{ top: `${hour * HOUR_HEIGHT}px` }}
      >
        {showTiming && (
          <span className="absolute -left-12 -top-2 text-xs text-gray-500 w-10 text-right">
            {hour < 24 ? `${hour.toString().padStart(2, "0")}:00` : ""}
          </span>
        )}
      </div>
    ))}
  </div>
)

// Background component for branch operating hours
interface BranchBackgroundProps {
  intervals: BranchInterval[]
}

const BranchBackground: React.FC<BranchBackgroundProps> = ({ intervals }) => {
  return (
    <>
      {intervals.map((interval, index) => {
        const startMinutes = timeToMinutes(interval.start_time)
        const endMinutes = timeToMinutes(interval.end_time)
        const top = (startMinutes / (HOURS_IN_DAY * MINUTES_IN_HOUR)) * GRID_HEIGHT
        const height = ((endMinutes - startMinutes) / (HOURS_IN_DAY * MINUTES_IN_HOUR)) * GRID_HEIGHT

        return (
          <div
            key={`branch-bg-${index}`}
            className="absolute left-0 right-0 bg-green-100 opacity-40 border border-green-200"
            style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
            title={`Branch Hours: ${interval.start_time} - ${interval.end_time}`}
          />
        )
      })}
    </>
  )
}

interface AppointmentBlockProps {
  interval: AppointmentInterval
  onUpdate: (id: string, start: number, end: number) => void
  onDelete: (id: string) => void
  onEdit: (interval: AppointmentInterval) => void
}

const AppointmentBlock: React.FC<AppointmentBlockProps> = ({ interval, onUpdate, onDelete, onEdit }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<"top" | "bottom" | null>(null)
  const [dragStart, setDragStart] = useState({ y: 0, startTime: 0, endTime: 0 })

  const startMinutes = timeToMinutes(interval.start_time)
  const endMinutes = timeToMinutes(interval.end_time)
  
  const top = (startMinutes / (HOURS_IN_DAY * MINUTES_IN_HOUR)) * GRID_HEIGHT
  const height = ((endMinutes - startMinutes) / (HOURS_IN_DAY * MINUTES_IN_HOUR)) * GRID_HEIGHT

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, action: "drag" | "resize-top" | "resize-bottom") => {
      e.preventDefault()
      e.stopPropagation()

      if (action === "drag") {
        setIsDragging(true)
        setDragStart({
          y: e.clientY,
          startTime: startMinutes,
          endTime: endMinutes,
        })
      } else if (action === "resize-top") {
        setIsResizing("top")
        setDragStart({
          y: e.clientY,
          startTime: startMinutes,
          endTime: endMinutes,
        })
      } else if (action === "resize-bottom") {
        setIsResizing("bottom")
        setDragStart({
          y: e.clientY,
          startTime: startMinutes,
          endTime: endMinutes,
        })
      }
    },
    [startMinutes, endMinutes],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !isResizing) return

      const deltaY = e.clientY - dragStart.y
      const deltaMinutes = (deltaY / GRID_HEIGHT) * (HOURS_IN_DAY * MINUTES_IN_HOUR)

      if (isDragging) {
        const newStart = Math.max(
          0,
          Math.min(
            dragStart.startTime + deltaMinutes,
            HOURS_IN_DAY * MINUTES_IN_HOUR - (dragStart.endTime - dragStart.startTime),
          ),
        )
        const newEnd = newStart + (dragStart.endTime - dragStart.startTime)
        onUpdate(interval.id, Math.round(newStart / 15) * 15, Math.round(newEnd / 15) * 15)
      } else if (isResizing === "top") {
        const newStart = Math.max(0, Math.min(dragStart.startTime + deltaMinutes, dragStart.endTime - 15))
        onUpdate(interval.id, Math.round(newStart / 15) * 15, endMinutes)
      } else if (isResizing === "bottom") {
        const newEnd = Math.max(
          dragStart.startTime + 15,
          Math.min(dragStart.endTime + deltaMinutes, HOURS_IN_DAY * MINUTES_IN_HOUR),
        )
        onUpdate(interval.id, startMinutes, Math.round(newEnd / 15) * 15)
      }
    },
    [isDragging, isResizing, dragStart, interval.id, onUpdate, startMinutes, endMinutes],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(null)
  }, [])

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      className={`absolute left-1 right-1 bg-blue-500 rounded-md shadow-md cursor-move transition-all hover:shadow-lg border-2 border-blue-600 z-10 ${
        isDragging || isResizing ? "shadow-lg scale-105 bg-blue-600" : ""
      }`}
      style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
      onMouseDown={(e) => handleMouseDown(e, "drag")}
    >
      {/* Resize handle - top */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black hover:bg-opacity-20 rounded-t-md"
        onMouseDown={(e) => handleMouseDown(e, "resize-top")}
      />

      {/* Content */}
      <div className="px-2 py-1 text-white text-xs font-medium flex items-center justify-between h-full">
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{interval.start_time} - {interval.end_time}</div>
          {interval.max_bookings && (
            <div className="text-xs opacity-90">Max: {interval.max_bookings} slots</div>
          )}
          {interval.cutoff_time && interval.cutoff_time > 0 && (
            <div className="text-xs opacity-90">Cutoff: {interval.cutoff_time}m</div>
          )}
        </div>
        <div className="flex flex-col gap-1 ml-1">
          <Button
            type="text"
            size="small"
            className="h-4 w-4 p-0 text-white hover:bg-blue-600"
            icon={<EditOutlined className="text-xs" />}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(interval)
            }}
          />
          <Button
            type="text"
            size="small"
            className="h-4 w-4 p-0 text-white hover:bg-red-500"
            icon={<DeleteOutlined className="text-xs" />}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(interval.id)
            }}
          />
        </div>
      </div>

      {/* Resize handle - bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black hover:bg-opacity-20 rounded-b-md"
        onMouseDown={(e) => handleMouseDown(e, "resize-bottom")}
      />
    </div>
  )
}

interface DayColumnProps {
  day: string
  appointmentIntervals: AppointmentInterval[]
  branchIntervals: BranchInterval[]
  onUpdateInterval: (id: string, start: number, end: number) => void
  onDeleteInterval: (id: string) => void
  onEditInterval: (interval: AppointmentInterval) => void
  onAddInterval: (start: number) => void
}

const DayColumn: React.FC<DayColumnProps> = ({ 
  day, 
  appointmentIntervals,
  branchIntervals,
  onUpdateInterval, 
  onDeleteInterval, 
  onEditInterval,
  onAddInterval 
}) => {
  const columnRef = useRef<HTMLDivElement>(null)

  const handleColumnClick = (e: React.MouseEvent) => {
    if (!columnRef.current) return

    const rect = columnRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const clickedMinutes = Math.round(((y / GRID_HEIGHT) * (HOURS_IN_DAY * MINUTES_IN_HOUR)) / 15) * 15

    // Check if click is on an existing appointment interval
    const clickedInterval = appointmentIntervals.find((interval) => {
      const startMinutes = timeToMinutes(interval.start_time)
      const endMinutes = timeToMinutes(interval.end_time)
      return clickedMinutes >= startMinutes && clickedMinutes <= endMinutes
    })

    if (!clickedInterval) {
      // Always allow adding new appointment intervals regardless of branch hours
      onAddInterval(Math.max(0, Math.min(clickedMinutes, (HOURS_IN_DAY - 1) * MINUTES_IN_HOUR)))
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="text-center font-medium text-sm mb-2 p-2 bg-gray-50 rounded-t-md">
        <div>{day}</div>
        <div className="text-xs text-gray-500 mt-1">
          Branch: {branchIntervals.length > 0 ? `${branchIntervals.length} slot(s)` : "Closed"}
        </div>
      </div>
      <div
        ref={columnRef}
        className="relative border border-gray-200 rounded-b-md cursor-pointer bg-gray-50"
        style={{ height: `${GRID_HEIGHT}px` }}
        onClick={handleColumnClick}
      >
        <TimeGrid showTiming={day === 'Monday'} />
        
        {/* Branch operating hours background */}
        <BranchBackground intervals={branchIntervals} />
        
        {/* Appointment intervals (interactive) */}
        {appointmentIntervals.map((interval) => (
          <AppointmentBlock 
            key={interval.id} 
            interval={interval} 
            onUpdate={onUpdateInterval} 
            onDelete={onDeleteInterval}
            onEdit={onEditInterval}
          />
        ))}
      </div>
    </div>
  )
}

export interface AppointmentTimeSelectionProps {
  appointmentHours?: AppointmentHoursData
  branchHours?: BranchHoursData
  onSave?: (hours: AppointmentHoursData) => void
  branchName?: string
  loading?: boolean
  config?: TimeSelectionConfig
  defaultInterval?: Partial<AppointmentInterval>
}

interface IntervalFormModalProps {
  open: boolean
  interval: AppointmentInterval | null
  config: TimeSelectionConfig
  onSave: (values: any) => void
  onCancel: () => void
  isNew?: boolean
}

const IntervalFormModal: React.FC<IntervalFormModalProps> = ({
  open,
  interval,
  config,
  onSave,
  onCancel,
  isNew = false
}) => {
  const [form] = Form.useForm()

  React.useEffect(() => {
    if (open && interval) {
      const formValues: any = {
        start_time: interval.start_time,
        end_time: interval.end_time,
      }
      
      // Set values for configured fields
      config.fields.forEach(field => {
        if (field.id !== 'start_time' && field.id !== 'end_time') {
          formValues[field.id] = interval[field.id] ?? field.defaultValue
        }
      })
      
      form.setFieldsValue(formValues)
    }
  }, [open, interval, form, config])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // Custom validation if provided
      if (config.validation) {
        const error = config.validation(values)
        if (error) {
          form.setFields([{ name: 'general', errors: [error] }])
          return
        }
      }
      
      onSave(values)
      form.resetFields()
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  return (
    <Modal
      title={isNew ? "Add Appointment Hours" : "Edit Appointment Hours"}
      open={open}
      onOk={handleSubmit}
      onCancel={() => {
        form.resetFields()
        onCancel()
      }}
      width={500}
    >
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="start_time"
            label="Start Time"
            rules={[{ required: true, message: 'Please enter start time' }]}
          >
            <Input placeholder="HH:MM" />
          </Form.Item>
          
          <Form.Item
            name="end_time"
            label="End Time"
            rules={[{ required: true, message: 'Please enter end time' }]}
          >
            <Input placeholder="HH:MM" />
          </Form.Item>
        </div>

        {config.fields.map(field => {
          if (field.id === 'start_time' || field.id === 'end_time') return null
          
          return (
            <Form.Item
              key={field.id}
              name={field.id}
              label={field.label}
              rules={field.required ? [{ required: true, message: `Please enter ${field.label.toLowerCase()}` }] : []}
            >
              {field.type === 'number' ? (
                <InputNumber 
                  min={field.min} 
                  max={field.max} 
                  style={{ width: '100%' }}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              ) : (
                <Input placeholder={`Enter ${field.label.toLowerCase()}`} />
              )}
            </Form.Item>
          )
        })}
      </Form>
    </Modal>
  )
}

export default function AppointmentTimeSelection({ 
  appointmentHours, 
  branchHours = {},
  onSave, 
  branchName, 
  loading,
  config = {
    fields: [
      { id: 'cutoff_time', label: 'Cutoff Time (minutes)', type: 'number', min: 0, max: 120, defaultValue: 0 },
      { id: 'max_bookings', label: 'Max Bookings', type: 'number', min: 1, max: 100, defaultValue: 1 }
    ]
  },
  defaultInterval = {}
}: AppointmentTimeSelectionProps) {
  const [appointmentOperatingHours, setAppointmentOperatingHours] = useState<AppointmentHoursData>(() => {
    if (appointmentHours) return appointmentHours
    
    const initial: AppointmentHoursData = {}
    DAYS.forEach((day) => {
      initial[day] = []
    })
    return initial
  })

  const [modalState, setModalState] = useState<{
    open: boolean
    interval: AppointmentInterval | null
    day: string | null
    isNew: boolean
  }>({
    open: false,
    interval: null,
    day: null,
    isNew: false
  })

  const [sourceDay, setSourceDay] = useState<string>("Monday")
  const [destinationDay, setDestinationDay] = useState<string>("All")
  const [clearDay, setClearDay] = useState<string>("Monday")

  const updateInterval = useCallback((day: string, id: string, startMinutes: number, endMinutes: number) => {
    setAppointmentOperatingHours((prev) => ({
      ...prev,
      [day]: prev[day].map((interval) => 
        interval.id === id 
          ? { 
              ...interval, 
              start_time: minutesToTime(startMinutes), 
              end_time: minutesToTime(endMinutes) 
            } 
          : interval
      ),
    }))
  }, [])

  const deleteInterval = useCallback((day: string, id: string) => {
    setAppointmentOperatingHours((prev) => ({
      ...prev,
      [day]: prev[day].filter((interval) => interval.id !== id),
    }))
  }, [])

  const editInterval = useCallback((day: string, interval: AppointmentInterval) => {
    setModalState({
      open: true,
      interval,
      day,
      isNew: false
    })
  }, [])

  const addInterval = useCallback((day: string, startMinutes: number) => {
    const newInterval: AppointmentInterval = {
      id: `${day}-${Date.now()}`,
      start_time: minutesToTime(startMinutes),
      end_time: minutesToTime(Math.min(startMinutes + 60, HOURS_IN_DAY * MINUTES_IN_HOUR)),
      ...defaultInterval
    }

    // Set default values from config
    config.fields.forEach(field => {
      if (field.id !== 'start_time' && field.id !== 'end_time' && field.defaultValue !== undefined) {
        newInterval[field.id] = field.defaultValue
      }
    })

    setModalState({
      open: true,
      interval: newInterval,
      day,
      isNew: true
    })
  }, [config, defaultInterval])

  const handleModalSave = useCallback((values: AppointmentInterval) => {
    if (!modalState.day || !modalState.interval) return

    const updatedInterval = {
      ...modalState.interval,
      ...values
    }

    if (modalState.isNew) {
      setAppointmentOperatingHours((prev) => ({
        ...prev,
        [modalState.day!]: [...prev[modalState.day!], updatedInterval].sort((a, b) => 
          timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        ),
      }))
    } else {
      setAppointmentOperatingHours((prev) => ({
        ...prev,
        [modalState.day!]: prev[modalState.day!].map((interval) => 
          interval.id === modalState.interval!.id ? updatedInterval : interval
        ),
      }))
    }

    setModalState({ open: false, interval: null, day: null, isNew: false })
  }, [modalState])

  const clearDaySlots = useCallback((day: string) => {
    setAppointmentOperatingHours((prev) => ({
      ...prev,
      [day]: [],
    }))
  }, [])

  const copyFromSourceToDestination = useCallback(
    (sourceDay: string, destinationDay: string) => {
      const sourceIntervals = appointmentOperatingHours[sourceDay]
      setAppointmentOperatingHours((prev) => ({
        ...prev,
        [destinationDay]: sourceIntervals.map((interval) => ({
          ...interval,
          id: `${destinationDay}-${Date.now()}-${Math.random()}`,
        }))
      }))
    },
    [appointmentOperatingHours],
  )

  const copyToAllDays = useCallback(
    (sourceDay: string) => {
      const sourceIntervals = appointmentOperatingHours[sourceDay]
      setAppointmentOperatingHours((prev) => {
        const updated = { ...prev }
        DAYS.forEach((day) => {
          if (day !== sourceDay) {
            updated[day] = sourceIntervals.map((interval) => ({
              ...interval,
              id: `${day}-${Date.now()}-${Math.random()}`,
            }))
          }
        })
        return updated
      })
    },
    [appointmentOperatingHours],
  )

  const handleCopyOperation = useCallback(() => {
    if (destinationDay === "All") {
      copyToAllDays(sourceDay)
    } else {
      copyFromSourceToDestination(sourceDay, destinationDay)
    }
  }, [sourceDay, destinationDay, copyToAllDays, copyFromSourceToDestination])

  const handleClearOperation = useCallback(() => {
    clearDaySlots(clearDay)
  }, [clearDay, clearDaySlots])

  return (
    <>
      <Card className="w-full">
        <div className="text-center mb-4">
          <Title level={3}>
            {branchName ? `${branchName} - Appointment Hours` : "Appointment Hours"}
          </Title>
          <div className="space-y-1">
            <Text type="secondary">
              Click anywhere to add appointment slots. Drag to move, resize from edges, edit for details.
            </Text>
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span className="text-gray-600">Branch Operating Hours</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-600">Appointment Hours</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Controls */}
          <div className="space-y-4">
            {/* Copy Controls */}
            <Card type="inner" size="small">
              <div className="flex flex-wrap items-center gap-3 justify-center">
                <div className="flex items-center gap-2">
                  <Text strong>Src:</Text>
                  <Select
                    value={sourceDay}
                    onChange={setSourceDay}
                    style={{ width: 120 }}
                    size="small"
                  >
                    {DAYS.map(day => (
                      <Select.Option key={day} value={day}>
                        {day === "Public Holiday" ? "PH" : day.slice(0, 3)}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Text strong>Dst:</Text>
                  <Select
                    value={destinationDay}
                    onChange={setDestinationDay}
                    style={{ width: 120 }}
                    size="small"
                  >
                    <Select.Option value="All">All Days</Select.Option>
                    {DAYS.map(day => (
                      <Select.Option key={day} value={day}>
                        {day === "Public Holiday" ? "PH" : day.slice(0, 3)}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                
                <Button 
                  type="primary" 
                  size="small" 
                  onClick={handleCopyOperation}
                  disabled={sourceDay === destinationDay}
                >
                  Copy {sourceDay === "Public Holiday" ? "PH" : sourceDay.slice(0, 3)} to {destinationDay === "All" ? "All" : (destinationDay === "Public Holiday" ? "PH" : destinationDay.slice(0, 3))}
                </Button>
              </div>
            </Card>

            {/* Clear Controls */}
            <Card type="inner" size="small">
              <div className="flex flex-wrap items-center gap-3 justify-center">
                <div className="flex items-center gap-2">
                  <Text strong>Clear:</Text>
                  <Select
                    value={clearDay}
                    onChange={setClearDay}
                    style={{ width: 120 }}
                    size="small"
                  >
                    {DAYS.map(day => (
                      <Select.Option key={day} value={day}>
                        {day === "Public Holiday" ? "PH" : day.slice(0, 3)}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                
                <Button 
                  danger 
                  size="small" 
                  onClick={handleClearOperation}
                >
                  Clear {clearDay === "Public Holiday" ? "PH" : clearDay.slice(0, 3)}
                </Button>
              </div>
            </Card>
          </div>

          {/* Time selection grid */}
          <div className="relative">
            {/* Time labels column */}
            <div className="absolute left-0 top-8 w-12 z-10">
              <div style={{ height: `${GRID_HEIGHT}px` }} className="relative">
                {/* This space is for time labels rendered by TimeGrid */}
              </div>
            </div>

            {/* Days grid */}
            <div className="ml-12 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {DAYS.map((day) => (
                <DayColumn
                  key={day}
                  day={day}
                  appointmentIntervals={appointmentOperatingHours[day]}
                  branchIntervals={branchHours[day] || []}
                  onUpdateInterval={(id, start, end) => updateInterval(day, id, start, end)}
                  onDeleteInterval={(id) => deleteInterval(day, id)}
                  onEditInterval={(interval) => editInterval(day, interval)}
                  onAddInterval={(start) => addInterval(day, start)}
                />
              ))}
            </div>
          </div>

          {/* Summary */}
          <Card type="inner" className="mt-6">
            <Title level={4}>Current Appointment Hours:</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {DAYS.map((day) => (
                <div key={day} className="flex justify-between">
                  <Text strong>{day}:</Text>
                  <Text>
                    {appointmentOperatingHours[day].length === 0
                      ? "No appointments"
                      : appointmentOperatingHours[day]
                          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
                          .map((interval) => {
                            let timeStr = `${interval.start_time}-${interval.end_time}`
                            if (interval.max_bookings && interval.max_bookings > 1) {
                              timeStr += ` (Max: ${interval.max_bookings} slots, Cutoff: ${interval.cutoff_time} mins)`
                            }
                            return timeStr
                          })
                          .join(", ")}
                  </Text>
                </div>
              ))}
            </div>
          </Card>

          {/* Save button */}
          {onSave && (
            <div className="text-center mt-4">
              <Button 
                type="primary" 
                size="large" 
                onClick={() => onSave(appointmentOperatingHours)}
                loading={loading}
              >
                Save Appointment Hours
              </Button>
            </div>
          )}
        </div>
      </Card>

      <IntervalFormModal
        open={modalState.open}
        interval={modalState.interval}
        config={config}
        onSave={handleModalSave}
        onCancel={() => setModalState({ open: false, interval: null, day: null, isNew: false })}
        isNew={modalState.isNew}
      />
    </>
  )
}