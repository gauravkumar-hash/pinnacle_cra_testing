import React, { useState, useRef, useCallback } from "react"
import { Card, Button, Typography, Modal, Form, Input, InputNumber, Select } from "antd"
import { DeleteOutlined, EditOutlined } from "@ant-design/icons"

const { Title, Text } = Typography

interface TimeInterval {
  id: string
  start: number // minutes from midnight
  end: number // minutes from midnight
  cutoff_time?: number // cutoff time in minutes
}

interface OperatingHours {
  [key: string]: TimeInterval[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "PH"]
const HOURS_IN_DAY = 24
const MINUTES_IN_HOUR = 60
const GRID_HEIGHT = 600
const HOUR_HEIGHT = GRID_HEIGHT / HOURS_IN_DAY

const formatTime = (minutes: number): string => {
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

interface TimeBlockProps {
  interval: TimeInterval
  onUpdate: (id: string, start: number, end: number) => void
  onDelete: (id: string) => void
  onEdit: (interval: TimeInterval) => void
}

const TimeBlock: React.FC<TimeBlockProps> = ({ interval, onUpdate, onDelete, onEdit }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<"top" | "bottom" | null>(null)
  const [dragStart, setDragStart] = useState({ y: 0, startTime: 0, endTime: 0 })

  const top = (interval.start / (HOURS_IN_DAY * MINUTES_IN_HOUR)) * GRID_HEIGHT
  const height = ((interval.end - interval.start) / (HOURS_IN_DAY * MINUTES_IN_HOUR)) * GRID_HEIGHT

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, action: "drag" | "resize-top" | "resize-bottom") => {
      e.preventDefault()
      e.stopPropagation()

      if (action === "drag") {
        setIsDragging(true)
        setDragStart({
          y: e.clientY,
          startTime: interval.start,
          endTime: interval.end,
        })
      } else if (action === "resize-top") {
        setIsResizing("top")
        setDragStart({
          y: e.clientY,
          startTime: interval.start,
          endTime: interval.end,
        })
      } else if (action === "resize-bottom") {
        setIsResizing("bottom")
        setDragStart({
          y: e.clientY,
          startTime: interval.start,
          endTime: interval.end,
        })
      }
    },
    [interval],
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
        onUpdate(interval.id, Math.round(newStart / 15) * 15, interval.end)
      } else if (isResizing === "bottom") {
        const newEnd = Math.max(
          dragStart.startTime + 15,
          Math.min(dragStart.endTime + deltaMinutes, HOURS_IN_DAY * MINUTES_IN_HOUR),
        )
        onUpdate(interval.id, interval.start, Math.round(newEnd / 15) * 15)
      }
    },
    [isDragging, isResizing, dragStart, interval, onUpdate],
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
      className={`absolute left-1 right-1 bg-blue-500 rounded-md shadow-md cursor-move transition-all hover:shadow-lg ${
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
          <div className="font-semibold">{formatTime(interval.start)} - {formatTime(interval.end)}</div>
          <div className="text-xs opacity-90">Cutoff: {interval.cutoff_time}m</div>
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
  intervals: TimeInterval[]
  onUpdateInterval: (id: string, start: number, end: number) => void
  onDeleteInterval: (id: string) => void
  onEditInterval: (interval: TimeInterval) => void
  onAddInterval: (start: number) => void
}

const DayColumn: React.FC<DayColumnProps> = ({ day, intervals, onUpdateInterval, onDeleteInterval, onEditInterval, onAddInterval }) => {
  const columnRef = useRef<HTMLDivElement>(null)

  const handleColumnClick = (e: React.MouseEvent) => {
    if (!columnRef.current) return

    const rect = columnRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const clickedMinutes = Math.round(((y / GRID_HEIGHT) * (HOURS_IN_DAY * MINUTES_IN_HOUR)) / 15) * 15

    // Check if click is on an existing interval
    const clickedInterval = intervals.find(
      (interval) => clickedMinutes >= interval.start && clickedMinutes <= interval.end,
    )

    if (!clickedInterval) {
      // Add new 1-hour interval
      onAddInterval(Math.max(0, Math.min(clickedMinutes, (HOURS_IN_DAY - 1) * MINUTES_IN_HOUR)))
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="text-center font-medium text-sm mb-2 p-2 bg-gray-50 rounded-t-md">{day}</div>
      <div
        ref={columnRef}
        className="relative border border-gray-200 rounded-b-md cursor-pointer"
        style={{ height: `${GRID_HEIGHT}px` }}
        onClick={handleColumnClick}
      >
        <TimeGrid showTiming={day === 'Monday'} />
        {intervals.map((interval) => (
          <TimeBlock 
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

export interface TimeSelectionProps {
  initialHours?: OperatingHours
  onSave?: (hours: OperatingHours) => void
  branchName?: string
  loading?: boolean
}

interface IntervalFormModalProps {
  open: boolean
  interval: TimeInterval | null
  onSave: (values: any) => void
  onCancel: () => void
  isNew?: boolean
}

const IntervalFormModal: React.FC<IntervalFormModalProps> = ({
  open,
  interval,
  onSave,
  onCancel,
  isNew = false
}) => {
  const [form] = Form.useForm()

  React.useEffect(() => {
    if (open && interval) {
      const startMinutes = interval.start
      const endMinutes = interval.end
      const startTime = formatTime(startMinutes)
      const endTime = formatTime(endMinutes)
      
      form.setFieldsValue({
        start_time: startTime,
        end_time: endTime,
        cutoff_time: interval.cutoff_time || 0
      })
    }
  }, [open, interval, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // Validate time format and convert to minutes
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timePattern.test(values.start_time) || !timePattern.test(values.end_time)) {
        form.setFields([{ name: 'general', errors: ['Please enter valid time in HH:MM format'] }])
        return
      }

      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      const startMinutes = parseTime(values.start_time)
      const endMinutes = parseTime(values.end_time)
      
      if (startMinutes >= endMinutes) {
        form.setFields([{ name: 'general', errors: ['End time must be after start time'] }])
        return
      }
      
      onSave({
        start_time: values.start_time,
        end_time: values.end_time,
        cutoff_time: values.cutoff_time || 0
      })
      form.resetFields()
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  return (
    <Modal
      title={isNew ? "Add Operating Hours" : "Edit Operating Hours"}
      open={open}
      onOk={handleSubmit}
      onCancel={() => {
        form.resetFields()
        onCancel()
      }}
      width={400}
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

        <Form.Item
          name="cutoff_time"
          label="Cutoff Time (minutes)"
          rules={[{ required: false }]}
        >
          <InputNumber 
            min={0} 
            max={120} 
            style={{ width: '100%' }}
            placeholder="Enter cutoff time in minutes"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function TimeSelection({ initialHours, onSave, branchName, loading }: TimeSelectionProps) {
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(() => {
    if (initialHours) return initialHours
    
    const initial: OperatingHours = {}
    DAYS.forEach((day) => {
      initial[day] = [
        {
          id: `${day}-1`,
          start: 9 * 60, // 9:00 AM
          end: 17 * 60, // 5:00 PM
          cutoff_time: 0
        },
      ]
    })
    return initial
  })

  const [modalState, setModalState] = useState<{
    open: boolean
    interval: TimeInterval | null
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

  const updateInterval = useCallback((day: string, id: string, start: number, end: number) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: prev[day].map((interval) => (interval.id === id ? { ...interval, start, end } : interval)),
    }))
  }, [])

  const deleteInterval = useCallback((day: string, id: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: prev[day].filter((interval) => interval.id !== id),
    }))
  }, [])

  const editInterval = useCallback((day: string, interval: TimeInterval) => {
    setModalState({
      open: true,
      interval,
      day,
      isNew: false
    })
  }, [])

  const addInterval = useCallback((day: string, start: number) => {
    const newInterval: TimeInterval = {
      id: `${day}-${Date.now()}`,
      start,
      end: Math.min(start + 60, HOURS_IN_DAY * MINUTES_IN_HOUR), // 1 hour duration
      cutoff_time: 0
    }

    setModalState({
      open: true,
      interval: newInterval,
      day,
      isNew: true
    })
  }, [])

  const clearDaySlots = useCallback((day: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: [],
    }))
  }, [])

  const copyFromSourceToDestination = useCallback(
    (sourceDay: string, destinationDay: string) => {
      const sourceIntervals = operatingHours[sourceDay]
      setOperatingHours((prev) => ({
        ...prev,
        [destinationDay]: sourceIntervals.map((interval) => ({
          ...interval,
          id: `${destinationDay}-${Date.now()}-${Math.random()}`,
        }))
      }))
    },
    [operatingHours],
  )

  const copyToAllDays = useCallback(
    (sourceDay: string) => {
      const sourceIntervals = operatingHours[sourceDay]
      setOperatingHours((prev) => {
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
    [operatingHours],
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

  const handleModalSave = useCallback((values: any) => {
    if (!modalState.day || !modalState.interval) return

    // Convert time strings back to minutes
    const startMinutes = values.start_time.split(':').reduce((acc: number, time: string) => (60 * acc) + +time, 0)
    const endMinutes = values.end_time.split(':').reduce((acc: number, time: string) => (60 * acc) + +time, 0)

    const updatedInterval: TimeInterval = {
      ...modalState.interval,
      start: startMinutes,
      end: endMinutes,
      cutoff_time: values.cutoff_time || 0
    }

    if (modalState.isNew) {
      setOperatingHours((prev) => ({
        ...prev,
        [modalState.day!]: [...prev[modalState.day!], updatedInterval].sort((a, b) => a.start - b.start),
      }))
    } else {
      setOperatingHours((prev) => ({
        ...prev,
        [modalState.day!]: prev[modalState.day!].map((interval) => 
          interval.id === modalState.interval!.id ? updatedInterval : interval
        ),
      }))
    }

    setModalState({ open: false, interval: null, day: null, isNew: false })
  }, [modalState])

  return (
    <>
      <div className="text-center mb-4">
        <Title level={3}>
          {branchName ? `${branchName} - Operating Hours` : "Clinic Operating Hours"}
        </Title>
        <Text type="secondary">
          Click on any time slot to add operating hours. Drag to move, resize from edges, or delete intervals.
        </Text>
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
                      {day === "PH" ? "PH" : day.slice(0, 3)}
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
                      {day === "PH" ? "PH" : day.slice(0, 3)}
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
                Copy {sourceDay === "PH" ? "PH" : sourceDay.slice(0, 3)} to {destinationDay === "All" ? "All" : (destinationDay === "PH" ? "PH" : destinationDay.slice(0, 3))}
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
                      {day === "PH" ? "PH" : day.slice(0, 3)}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              
              <Button 
                danger 
                size="small" 
                onClick={handleClearOperation}
              >
                Clear {clearDay === "PH" ? "PH" : clearDay.slice(0, 3)}
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
                intervals={operatingHours[day]}
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
          <Title level={4}>Current Operating Hours:</Title>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {DAYS.map((day) => (
              <div key={day} className="flex justify-between">
                <Text strong>{day}:</Text>
                <Text>
                  {operatingHours[day].length === 0
                    ? "Closed"
                    : operatingHours[day]
                        .sort((a, b) => a.start - b.start)
                        .map((interval) => {
                          let timeStr = `${formatTime(interval.start)}-${formatTime(interval.end)}`
                          if (interval.cutoff_time && interval.cutoff_time > 0) {
                            timeStr += ` (Cutoff: ${interval.cutoff_time}m)`
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
              onClick={() => onSave(operatingHours)}
              loading={loading}
            >
              Save Operating Hours
            </Button>
          </div>
        )}
      </div>

      <IntervalFormModal
        open={modalState.open}
        interval={modalState.interval}
        onSave={handleModalSave}
        onCancel={() => setModalState({ open: false, interval: null, day: null, isNew: false })}
        isNew={modalState.isNew}
      />
    </>
  )
}