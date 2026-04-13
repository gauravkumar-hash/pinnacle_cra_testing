import React, { useState, useRef, useCallback } from "react"
import { Button, Typography, Modal, Select, Space, Table, Tag, Checkbox } from "antd"
import { DeleteOutlined, EditOutlined } from "@ant-design/icons"
import { DebounceSelect } from "./DebounceSelect"
import { 
  searchInventoryApiAdminCorporateCodesV2InventorySearchGet, 
  InventoryItemInfo,
  getCorporateCodesV2ApiAdminCorporateCodesV2Get,
  CorporateCodeV2Row 
} from "@/services/client"
import { useQuery } from "@tanstack/react-query"

const { Text } = Typography

interface CorporateCodeOverride {
  corporateCodeId: string
  inventoryItems: InventoryItemInfo[] // Changed to support multiple items
}

interface TimeInterval {
  id: string
  start: number // minutes from midnight
  end: number // minutes from midnight
  amount?: number
  inventoryItem?: InventoryItemInfo // Legacy field - kept for backward compatibility
  publicRateItems?: InventoryItemInfo[] // Public rate service items (consultation fees)
  corporateCodeOverrides?: CorporateCodeOverride[] // New field for per-corporate-code overrides
}

interface RatesConfig {
  [key: string]: TimeInterval[]
}

const DAYS = ["MON-FRI", "SAT", "SUN", "PH"]
const HOURS_IN_DAY = 24
const MINUTES_IN_HOUR = 60
const MAX_MINUTES_IN_DAY = 24 * 60 - 1 // 23:59 = 1439 minutes
const GRID_HEIGHT = 600
const HOUR_HEIGHT = GRID_HEIGHT / HOURS_IN_DAY

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// Generate time options for dropdown (every 15 minutes)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const totalMinutes = hour * 60 + minute
      const label = formatTime(totalMinutes)
      options.push({ label, value: totalMinutes })
    }
  }
  // Add 23:59 as the final time option (end of day)
  options.push({ label: "23:59", value: 24 * 60 - 1 })
  return options
}

const timeOptions = generateTimeOptions()

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
  onDoubleClick: (interval: TimeInterval) => void
}

const TimeBlock: React.FC<TimeBlockProps> = ({ interval, onUpdate, onDelete, onDoubleClick }) => {
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
            MAX_MINUTES_IN_DAY - (dragStart.endTime - dragStart.startTime),
          ),
        )
        const newEnd = newStart + (dragStart.endTime - dragStart.startTime)
        onUpdate(interval.id, Math.round(newStart / 15) * 15, Math.min(Math.round(newEnd / 15) * 15, MAX_MINUTES_IN_DAY))
      } else if (isResizing === "top") {
        const newStart = Math.max(0, Math.min(dragStart.startTime + deltaMinutes, dragStart.endTime - 15))
        onUpdate(interval.id, Math.round(newStart / 15) * 15, interval.end)
      } else if (isResizing === "bottom") {
        const newEnd = Math.max(
          dragStart.startTime + 15,
          Math.min(dragStart.endTime + deltaMinutes, MAX_MINUTES_IN_DAY),
        )
        onUpdate(interval.id, interval.start, Math.min(Math.round(newEnd / 15) * 15, MAX_MINUTES_IN_DAY))
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

  // Calculate total price for color coding
  const calculateTotalPrice = (): number => {
    let totalPrice = 0
    
    // Add public rate items price
    if (interval.publicRateItems && interval.publicRateItems.length > 0) {
      totalPrice += interval.publicRateItems.reduce((sum, item) => sum + (item.price || 0), 0)
    }
    
    // Add legacy inventory item price
    if (interval.inventoryItem && interval.inventoryItem.price) {
      totalPrice += interval.inventoryItem.price
    }
    
    return totalPrice
  }
  
  const totalPrice = calculateTotalPrice()
  const hasAnyRates = (interval.publicRateItems && interval.publicRateItems.length > 0) || (interval.corporateCodeOverrides && interval.corporateCodeOverrides.length > 0) || interval.inventoryItem
  
  // Price-based color coding
  const getPriceBasedColors = () => {
    if (!hasAnyRates || totalPrice <= 0) {
      return { bg: "bg-gray-400", hover: "bg-gray-500" } // No rates configured
    }
    
    if (totalPrice <= 20) {
      return { bg: "bg-blue-300", hover: "bg-blue-400" } // Low price: Light Blue
    } else if (totalPrice <= 30) {
      return { bg: "bg-blue-500", hover: "bg-blue-600" } // Medium price: Moderate Blue  
    } else {
      return { bg: "bg-blue-800", hover: "bg-blue-900" } // High price: Dark Blue
    }
  }
  
  const colors = getPriceBasedColors()
  const bgColor = colors.bg
  const hoverBgColor = colors.hover

  return (
    <div
      className={`absolute left-1 right-1 ${bgColor} rounded-md shadow-md cursor-move transition-all hover:shadow-lg ${
        isDragging || isResizing ? `shadow-lg scale-105 ${hoverBgColor}` : ""
      }`}
      style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
      onMouseDown={(e) => handleMouseDown(e, "drag")}
      onDoubleClick={() => onDoubleClick(interval)}
    >
      {/* Resize handle - top */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black hover:bg-opacity-20 rounded-t-md"
        onMouseDown={(e) => handleMouseDown(e, "resize-top")}
      />

      {/* Content */}
      <div className="px-2 py-1 text-white text-xs font-medium flex items-center justify-between h-full">
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold">{formatTime(interval.start)} - {formatTime(interval.end)}</div>
          <div className="truncate text-xs">
            {totalPrice > 0 ? (
              <div>
                Public Rate Total: ${totalPrice.toFixed(2)}
                {interval.corporateCodeOverrides && interval.corporateCodeOverrides.length > 0 && ` + ${interval.corporateCodeOverrides.length} overrides`}
              </div>
            ) : (
              'Click to set rates'
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 ml-1">
          <Button
            type="text"
            size="small"
            className="h-5 w-5 p-0 text-white hover:text-blue-200"
            icon={<EditOutlined className="text-xs" />}
            onClick={(e) => {
              e.stopPropagation()
              onDoubleClick(interval)
            }}
          />
          <Button
            type="text"
            size="small"
            className="h-5 w-5 p-0 text-white hover:text-red-200"
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
  onAddInterval: (start: number) => void
  onEditInterval: (interval: TimeInterval) => void
}

const DayColumn: React.FC<DayColumnProps> = ({ 
  day, 
  intervals, 
  onUpdateInterval, 
  onDeleteInterval, 
  onAddInterval,
  onEditInterval
}) => {
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
      onAddInterval(Math.max(0, Math.min(clickedMinutes, MAX_MINUTES_IN_DAY - 60)))
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
        <TimeGrid showTiming={day === 'MON-FRI'} />
        {intervals.map((interval) => (
          <TimeBlock 
            key={interval.id} 
            interval={interval} 
            onUpdate={onUpdateInterval} 
            onDelete={onDeleteInterval}
            onDoubleClick={onEditInterval}
          />
        ))}
      </div>
    </div>
  )
}

export interface DynamicRatesTimeSelectionProps {
  initialRates?: RatesConfig
  onIntervalUpdate?: (day: string, interval: TimeInterval) => void
  onIntervalDelete?: (day: string, interval: TimeInterval) => void
  loading?: boolean
}

export default function DynamicRatesTimeSelection({ 
  initialRates, 
  onIntervalUpdate,
  onIntervalDelete
}: DynamicRatesTimeSelectionProps) {
  const [ratesConfig, setRatesConfig] = useState<RatesConfig>(() => {
    if (initialRates) return initialRates
    
    const initial: RatesConfig = {}
    DAYS.forEach((day) => {
      initial[day] = []
    })
    return initial
  })

  // Update internal state when initialRates prop changes (after data invalidation)
  React.useEffect(() => {
    if (initialRates) {
      setRatesConfig(initialRates)
    }
  }, [initialRates])

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingInterval, setEditingInterval] = useState<{ day: string; interval: TimeInterval } | null>(null)
  const [editStartTime, setEditStartTime] = useState<number>(0)
  const [editEndTime, setEditEndTime] = useState<number>(0)
  const [publicRateItems, setPublicRateItems] = useState<InventoryItemInfo[]>([])
  const [corporateCodeOverrides, setCorporateCodeOverrides] = useState<{[corporateCodeId: string]: InventoryItemInfo[] | null}>({})

  // Fetch corporate rates for display in modal
  const corporateRatesQuery = useQuery({
    queryKey: ['corporate_rates_v2'],
    queryFn: getCorporateCodesV2ApiAdminCorporateCodesV2Get,
    enabled: editModalVisible // Only fetch when modal is open
  })

  const updateInterval = useCallback((day: string, id: string, start: number, end: number) => {
    setRatesConfig((prev) => ({
      ...prev,
      [day]: prev[day].map((interval) => (interval.id === id ? { ...interval, start, end } : interval)),
    }))
  }, [])

  const deleteInterval = useCallback((day: string, id: string) => {
    const interval = ratesConfig[day].find(interval => interval.id === id)
    if (!interval) return
    
    Modal.confirm({
      title: 'Delete Time Slot',
      content: (
        <div>
          <p>Are you sure you want to delete this time slot?</p>
          <p><strong>Day:</strong> {day}</p>
          <p><strong>Time:</strong> {formatTime(interval.start)} - {formatTime(interval.end)}</p>
          {interval.publicRateItems && interval.publicRateItems.length > 0 && (
            <p><strong>Services:</strong> {interval.publicRateItems.length} item(s)</p>
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        setRatesConfig((prev) => ({
          ...prev,
          [day]: prev[day].filter((interval) => interval.id !== id),
        }))
        
        // Call parent delete handler if provided
        if (onIntervalDelete) {
          onIntervalDelete(day, interval)
        }
      }
    })
  }, [ratesConfig, onIntervalDelete])

  const addInterval = useCallback((day: string, start: number) => {
    const newInterval: TimeInterval = {
      id: `${day}-${Date.now()}`,
      start,
      end: Math.min(start + 60, MAX_MINUTES_IN_DAY), // 1 hour duration
      amount: undefined, // Don't set a default amount
      inventoryItem: undefined
    }

    setRatesConfig((prev) => ({
      ...prev,
      [day]: [...prev[day], newInterval].sort((a, b) => a.start - b.start),
    }))
  }, [])


  const fetchInventoryOptions = async (search: string): Promise<Array<{ label: string; value: string }>> => {
    if (!search || search.trim().length < 2) {
      return [];
    }
    
    try {
      const response = await searchInventoryApiAdminCorporateCodesV2InventorySearchGet({ 
        search: search.trim() 
      });
      
      return response.map((item) => ({
        label: `${item.code} - ${item.name} ${item.price ? `($${item.price.toFixed(2)})` : ''}`,
        value: JSON.stringify({
          id: item.id,
          code: item.code,
          name: item.name,
          price: item.price
        })
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  };

  const handleEditInterval = useCallback((day: string, interval: TimeInterval) => {
    setEditingInterval({ day, interval })
    
    // Initialize public rate items from existing data
    setPublicRateItems(interval.publicRateItems || [])
    
    // Initialize corporate code overrides from existing data
    const overrides: {[corporateCodeId: string]: InventoryItemInfo[] | null} = {}
    if (interval.corporateCodeOverrides) {
      interval.corporateCodeOverrides.forEach(override => {
        overrides[override.corporateCodeId] = override.inventoryItems
      })
    }
    setCorporateCodeOverrides(overrides)
    
    setEditStartTime(interval.start)
    setEditEndTime(interval.end)
    setEditModalVisible(true)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingInterval) {
      // Validate times
      if (editEndTime <= editStartTime) {
        Modal.error({
          title: 'Invalid Time Range',
          content: 'End time must be after start time',
        })
        return
      }
      
      // Convert corporate code overrides to the correct format
      const corporateCodeOverrideArray: CorporateCodeOverride[] = Object.entries(corporateCodeOverrides)
        .filter(([, inventoryItems]) => inventoryItems !== null && inventoryItems.length > 0)
        .map(([corporateCodeId, inventoryItems]) => ({
          corporateCodeId,
          inventoryItems: inventoryItems!
        }))
      
      const updatedInterval: TimeInterval = { 
        ...editingInterval.interval, 
        start: editStartTime,
        end: editEndTime,
        publicRateItems: publicRateItems.length > 0 ? publicRateItems : undefined,
        corporateCodeOverrides: corporateCodeOverrideArray.length > 0 ? corporateCodeOverrideArray : undefined,
        // Keep legacy fields for backward compatibility
        amount: editingInterval.interval.amount,
        inventoryItem: editingInterval.interval.inventoryItem
      }
      
      setRatesConfig((prev) => ({
        ...prev,
        [editingInterval.day]: prev[editingInterval.day]
          .map((interval) =>
            interval.id === editingInterval.interval.id ? updatedInterval : interval
          )
          .sort((a, b) => a.start - b.start), // Re-sort after update
      }))

      if (onIntervalUpdate) {
        onIntervalUpdate(editingInterval.day, updatedInterval)
      }
    }
    setEditModalVisible(false)
    setEditingInterval(null)
    setEditStartTime(0)
    setEditEndTime(0)
    setPublicRateItems([])
    setCorporateCodeOverrides({})
  }, [editingInterval, editStartTime, editEndTime, publicRateItems, corporateCodeOverrides, onIntervalUpdate])

  return (
    <>
      <div className="text-center mb-4">
        <Text type="secondary">
          Click to add time slots, double-click to set rates. Drag to move, resize from edges.
        </Text>
        
        {/* Price-based Color Legend */}
        <div className="flex justify-center items-center mt-3 gap-6">
          <Text className="text-sm font-medium">Price Color Legend:</Text>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <Text className="text-xs">≤ $20 (Light)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <Text className="text-xs">≤ $30 (Moderate)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-800 rounded"></div>
            <Text className="text-xs">&gt; $30 (Dark)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <Text className="text-xs">No rates</Text>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Time selection grid */}
        <div className="relative">
          {/* Time labels column */}
          <div className="absolute left-0 top-8 w-12 z-10">
            <div style={{ height: `${GRID_HEIGHT}px` }} className="relative">
              {/* This space is for time labels rendered by TimeGrid */}
            </div>
          </div>

          {/* Days grid - 4 columns */}
          <div className="ml-12 grid grid-cols-4 gap-2">
            {DAYS.map((day) => (
              <DayColumn
                key={day}
                day={day}
                intervals={ratesConfig[day]}
                onUpdateInterval={(id, start, end) => updateInterval(day, id, start, end)}
                onDeleteInterval={(id) => deleteInterval(day, id)}
                onAddInterval={(start) => addInterval(day, start)}
                onEditInterval={(interval) => handleEditInterval(day, interval)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Edit Rate Modal */}
      <Modal
        title="Edit Time Slot & Rate"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingInterval(null)
          setEditStartTime(0)
          setEditEndTime(0)
          setPublicRateItems([])
          setCorporateCodeOverrides({})
        }}
        width={800}
      >
        {editingInterval && (
          <Space direction="vertical" className="w-full" size="large">
            {/* Time Slot Configuration */}
            <div>
              <Text strong>Day: </Text>
              <Text>{editingInterval.day}</Text>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text strong className="block mb-2">Start Time:</Text>
                <Select
                  className="w-full"
                  value={editStartTime}
                  onChange={setEditStartTime}
                  placeholder="Select start time"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {timeOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value} label={option.label}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text strong className="block mb-2">End Time:</Text>
                <Select
                  className="w-full"
                  value={editEndTime}
                  onChange={setEditEndTime}
                  placeholder="Select end time"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {timeOptions
                    .filter(option => option.value > editStartTime)
                    .map((option) => (
                      <Select.Option key={option.value} value={option.value} label={option.label}>
                        {option.label}
                      </Select.Option>
                    ))}
                </Select>
              </div>
            </div>

            {/* Public Rate Configuration */}
            <div>
              <Text strong className="block mb-3">Public Rate Services (Consultation Fees):</Text>
              <Text type="secondary" className="block mb-3 text-sm">
                Select the default consultation fee services that apply to all users without corporate codes during this time slot.
              </Text>
              <DebounceSelect
                mode="multiple"
                className="w-full"
                value={publicRateItems.map(item => ({
                  label: `${item.code} - ${item.name} ${item.price ? `($${item.price.toFixed(2)})` : ''}`,
                  value: item.id
                }))}
                placeholder="Search and select consultation fee services..."
                fetchOptions={fetchInventoryOptions}
                onChange={(selected: unknown) => {
                  const selectedItems = selected as Array<{ label: string; value: string }> | undefined;
                  if (selectedItems && selectedItems.length > 0) {
                    try {
                      const inventoryItems = selectedItems.map(item => JSON.parse(item.value));
                      setPublicRateItems(inventoryItems);
                    } catch (e) {
                      console.error('Failed to parse inventory items:', e)
                    }
                  } else {
                    setPublicRateItems([]);
                  }
                }}
                style={{ width: '100%' }}
                showSearch
                allowClear
                size="small"
              />
            </div>

            {/* Corporate Rates with Individual Override Options */}
            <div>
              <Text strong className="block mb-3">Corporate Rates & Override Options:</Text>
              {corporateRatesQuery.isLoading ? (
                <Text type="secondary">Loading corporate rates...</Text>
              ) : corporateRatesQuery.error ? (
                <Text type="danger">Failed to load corporate rates</Text>
              ) : (
                <Table
                  dataSource={corporateRatesQuery.data || []}
                  size="small"
                  pagination={false}
                  scroll={{ y: 300 }}
                  rowKey="id"
                  columns={[
                    {
                      title: 'Code',
                      dataIndex: 'code',
                      width: 100,
                      render: (code: string, record: CorporateCodeV2Row) => (
                        <span>
                          {code}<br/>
                          {!corporateCodeOverrides[record.id!] && (
                            <Tag color="blue" className="ml-1">Default</Tag>
                          )}
                          {corporateCodeOverrides[record.id!] && (
                            <Tag color="orange" className="ml-1">Override</Tag>
                          )}
                        </span>
                      )
                    },
                    {
                      title: 'Default Services & Pricing',
                      dataIndex: 'inventory_items',
                      width: 250,
                      render: (items: InventoryItemInfo[], record: CorporateCodeV2Row) => {
                        if (!items || items.length === 0) return '-';
                        const isOverridden = corporateCodeOverrides[record.id!];
                        return (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {items.map((item) => (
                              <Tag 
                                key={item.id} 
                                color={isOverridden ? "default" : "blue"}
                                style={{ opacity: isOverridden ? 0.6 : 1 }}
                              >
                                {item.code} - {item.name} {item.price ? `($${item.price.toFixed(2)})` : ''}
                              </Tag>
                            ))}
                          </Space>
                        );
                      }
                    },
                    {
                      title: 'Override Service',
                      key: 'override',
                      width: 300,
                      render: (_, record: CorporateCodeV2Row) => {
                        const currentOverride = corporateCodeOverrides[record.id!];
                        return (
                          <div>
                            <Checkbox
                              checked={!!currentOverride}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Show override selector for this corporate code
                                  setCorporateCodeOverrides(prev => ({
                                    ...prev,
                                    [record.id!]: [] // empty array means override enabled but no items selected yet
                                  }))
                                } else {
                                  // Remove override for this corporate code
                                  setCorporateCodeOverrides(prev => {
                                    const newOverrides = { ...prev }
                                    delete newOverrides[record.id!]
                                    return newOverrides
                                  })
                                }
                              }}
                              className="mb-2"
                            >
                              Override with custom services
                            </Checkbox>
                            
                            {corporateCodeOverrides[record.id!] !== undefined && (
                              <DebounceSelect
                                mode="multiple"
                                className="w-full"
                                value={currentOverride && currentOverride.length > 0 ? currentOverride.map(item => ({
                                  label: `${item.code} - ${item.name} ${item.price ? `($${item.price.toFixed(2)})` : ''}`,
                                  value: item.id
                                })) : []}
                                placeholder="Search for services..."
                                fetchOptions={fetchInventoryOptions}
                                onChange={(selected: unknown) => {
                                  const selectedItems = selected as Array<{ label: string; value: string }> | undefined;
                                  if (selectedItems && selectedItems.length > 0) {
                                    try {
                                      const inventoryItems = selectedItems.map(item => JSON.parse(item.value));
                                      setCorporateCodeOverrides(prev => ({
                                        ...prev,
                                        [record.id!]: inventoryItems
                                      }))
                                    } catch (e) {
                                      console.error('Failed to parse inventory items:', e)
                                    }
                                  } else {
                                    setCorporateCodeOverrides(prev => ({
                                      ...prev,
                                      [record.id!]: []
                                    }))
                                  }
                                }}
                                style={{ width: '100%' }}
                                showSearch
                                allowClear
                                size="small"
                              />
                            )}
                          </div>
                        );
                      }
                    }
                  ]}
                />
              )}
              <Text type="secondary" className="text-xs mt-2 block">
                Check "Override with custom services" for any corporate code you want to apply different services during this time slot. You can select multiple services per corporate code. Unchecked codes will use their default rates.
              </Text>
            </div>
          </Space>
        )}
      </Modal>
    </>
  )
}