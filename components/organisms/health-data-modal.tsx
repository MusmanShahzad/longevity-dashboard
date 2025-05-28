"use client"

import type React from "react"
import type { User } from "@/lib/supabase"
import { useState, useEffect, useCallback, useRef } from "react"
import { Formik, Form, type FormikProps } from "formik"
import * as Yup from "yup"
import { 
  X, Activity, Moon, Calendar, Lightbulb, AlertTriangle, 
  CheckCircle, AlertCircle, History, ArrowLeft, ChevronDown 
} from "lucide-react"
import { Modal } from "@/components/molecules/modal"
import { FormGroup } from "@/components/molecules/form-group"
import { NumberInput } from "@/components/atoms/number-input"
import { PercentageInput } from "@/components/atoms/percentage-input"
import { DateInput } from "@/components/atoms/date-input"
import { CalculatedField } from "@/components/molecules/calculated-field"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/atoms/glass-card"
import { useHealthAlerts } from "@/lib/hooks/use-health-alerts"
import { useSleepDataWithMutation } from "@/lib/hooks/use-sleep-data"
import { SelectInput } from "@/components/atoms/select-input"

// Types
interface HealthDataModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: User | null
  onDataUpdate?: () => void
}

interface FormValues {
  totalSleepHours: number
  timeInBed: number
  remPercentage: number
  date: string
  // New optional fields for enhanced metrics
  sleepLatency?: number
  hrvOvernight?: number
  chronotype?: 'morning' | 'evening' | 'intermediate' | null
  timingConsistency?: number
}

interface Suggestion {
  type: "warning" | "info" | "success"
  title: string
  description: string
  suggestion: string
}

interface ModalState {
  isUpdating: boolean
  backendSuggestions: Suggestion[]
  showSuggestions: boolean
  isCheckingData: boolean
  savedSuggestionsCount: number
  error: string
  success: string
  shieldScore: number
}

// Validation Schema
const validationSchema = Yup.object({
  totalSleepHours: Yup.number()
    .min(0.1, "Sleep hours must be greater than 0")
    .max(24, "Sleep hours cannot exceed 24")
    .required("Total sleep hours is required"),
  timeInBed: Yup.number()
    .min(0.1, "Time in bed must be greater than 0")
    .max(24, "Time in bed cannot exceed 24")
    .required("Time in bed is required")
    .test("sleep-efficiency", "Sleep hours cannot be more than time in bed", function(value) {
      const { totalSleepHours } = this.parent
      return !value || !totalSleepHours || totalSleepHours <= value
    }),
  remPercentage: Yup.number()
    .min(0, "REM percentage cannot be negative")
    .max(100, "REM percentage cannot exceed 100"),
  date: Yup.string()
    .required("Date is required")
    .test("not-future", "Cannot add sleep data for future dates", function(value) {
      if (!value) return true
      const selectedDate = new Date(value)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return selectedDate <= today
    }),
  // New optional field validations
  sleepLatency: Yup.number()
    .min(0, "Sleep latency cannot be negative")
    .max(300, "Sleep latency seems unusually high (>5 hours)")
    .optional(),
  hrvOvernight: Yup.number()
    .min(1, "HRV must be greater than 0")
    .max(200, "HRV seems unusually high")
    .optional(),
  chronotype: Yup.string()
    .oneOf(['morning', 'evening', 'intermediate', ''], "Invalid chronotype")
    .optional(),
  timingConsistency: Yup.number()
    .min(0, "Timing consistency cannot be negative")
    .max(12, "Timing consistency seems unusually high")
    .optional()
})

// Suggestion configuration
const SUGGESTION_CONFIG = {
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  info: { icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" }
} as const

// Reusable Components
const StatusMessage = ({ type, message }: { type: 'error' | 'success' | 'warning' | 'info', message: string }) => {
  const configs = {
    error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    info: { icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" }
  }
  
  const config = configs[type]
  const Icon = config.icon

  return (
    <div className={`mt-4 p-3 rounded-lg border flex items-center space-x-2 ${config.bg}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
      <p className={`text-sm ${config.color}`}>{message}</p>
    </div>
  )
}

const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center space-x-2">
    <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
    <p className="text-blue-400 text-sm">{message}</p>
  </div>
)

const ModalHeader = ({ 
  isUpdating, 
  formValues, 
  currentUser, 
  savedSuggestionsCount, 
  showSuggestions,
  onClose,
  onBack 
}: {
  isUpdating: boolean
  formValues: FormValues
  currentUser: User | null
  savedSuggestionsCount: number
  showSuggestions: boolean
  onClose: () => void
  onBack?: () => void
}) => (
  <div className="flex-shrink-0 p-6 border-b border-white/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${showSuggestions 
          ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
          : 'bg-gradient-to-br from-cyan-500 to-blue-500'
        }`}>
          {showSuggestions ? (
            <Lightbulb className="h-6 w-6 text-white" />
          ) : (
            <Activity className="h-6 w-6 text-white" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {showSuggestions 
              ? "AI Health Insights" 
              : isUpdating ? "Update Sleep Data" : "Add Sleep Data"
            }
          </h2>
          <p className="text-sm text-cyan-300">
            {showSuggestions
              ? `Personalized recommendations for ${new Date(formValues.date).toLocaleDateString()}`
              : isUpdating
                ? `Update sleep information for ${new Date(formValues.date).toLocaleDateString()}`
                : `Record your sleep information for ${currentUser?.full_name}`}
          </p>
          {savedSuggestionsCount > 0 && (
            <div className="flex items-center space-x-1 mt-1">
              <History className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-400">
                {savedSuggestionsCount} suggestions saved across all dates
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {showSuggestions && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-gray-400 hover:text-white hover:bg-white/10"
            title="Back to form"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  </div>
)

const SuggestionItem = ({ suggestion, index }: { suggestion: Suggestion, index: number }) => {
  const config = SUGGESTION_CONFIG[suggestion.type] || SUGGESTION_CONFIG.info
  const Icon = config.icon

  return (
    <div key={index} className={`p-4 rounded-lg border ${config.bg}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="text-sm font-medium text-white">{suggestion.title}</h4>
            <p className="text-xs text-gray-300">{suggestion.description}</p>
          </div>
          <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xs text-cyan-300">
              <span className="font-medium">💡 AI Suggestion:</span> {suggestion.suggestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const SuggestionsView = ({ 
  suggestions, 
  formValues, 
  onClose,
  onBack 
}: { 
  suggestions: Suggestion[]
  formValues: FormValues
  onClose: () => void
  onBack: () => void
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mx-auto mb-4 flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Data Saved Successfully!</h3>
      <p className="text-gray-300">
        Here are your personalized AI insights for {new Date(formValues.date).toLocaleDateString()}:
      </p>
      {suggestions.length > 0 && (
        <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">
            💾 {suggestions.length} new suggestion{suggestions.length !== 1 ? "s" : ""} saved to your health insights
          </p>
        </div>
      )}
    </div>

    {suggestions.length === 0 ? (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <h4 className="text-lg font-semibold text-white mb-2">Excellent Sleep Quality!</h4>
        <p className="text-gray-400">
          Your sleep metrics are all within optimal ranges. Keep up the great work!
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <SuggestionItem key={index} suggestion={suggestion} index={index} />
        ))}
      </div>
    )}

    <div className="text-center">
      <p className="text-sm text-gray-400">
        These suggestions have been saved to your Health Insights and are organized by date.
      </p>
    </div>

    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        onClick={onBack}
        variant="outline"
        className="border-gray-600 text-gray-300 hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Form
      </Button>
      <Button
        onClick={onClose}
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
      >
        Close & View Dashboard
      </Button>
    </div>
  </div>
)

const SleepForm = ({ 
  formik, 
  modalState, 
  sleepEfficiency, 
  onDateChange 
}: {
  formik: FormikProps<FormValues>
  modalState: ModalState
  sleepEfficiency: number
  onDateChange: (date: string) => void
}) => {
  // Calculate overall form completion
  const coreFieldsCompleted = [
    formik.values.totalSleepHours > 0,
    formik.values.timeInBed > 0,
    formik.values.remPercentage > 0,
    formik.values.date
  ].filter(Boolean).length

  const enhancedFieldsCompleted = [
    formik.values.sleepLatency !== undefined && formik.values.sleepLatency > 0,
    formik.values.hrvOvernight !== undefined && formik.values.hrvOvernight > 0,
    formik.values.chronotype !== null && formik.values.chronotype !== undefined,
    formik.values.timingConsistency !== undefined && formik.values.timingConsistency >= 0
  ].filter(Boolean).length

  const totalFieldsCompleted = coreFieldsCompleted + enhancedFieldsCompleted
  const totalFields = 8 // 4 core + 4 enhanced
  const completionPercentage = (totalFieldsCompleted / totalFields) * 100

  return (
  <Form className="space-y-6">
    {/* Date Selection */}
    <FormGroup label="Date" description="Select the date for this sleep data" required>
      <div className="relative">
        <DateInput
          value={formik.values.date}
          onChange={(value) => {
            formik.setFieldValue('date', value)
            onDateChange(value)
          }}
          placeholder="Select date"
          disableFuture={true}
        />
        {formik.touched.date && formik.errors.date && (
          <p className="mt-1 text-sm text-red-400">{formik.errors.date}</p>
        )}
      </div>
    </FormGroup>

    {/* Sleep Data Section */}
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Moon className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Sleep Metrics</h3>
        </div>
        <div className="text-xs font-medium px-3 py-1 rounded-full bg-gray-700/50 text-gray-300">
          {totalFieldsCompleted}/{totalFields} fields completed
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Form Completion</span>
          <span>{completionPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormGroup
          label="Total Sleep Hours"
          description="Actual hours of sleep (excluding time awake in bed)"
          required
        >
          <NumberInput
            value={formik.values.totalSleepHours}
            onChange={(value) => formik.setFieldValue('totalSleepHours', value)}
            placeholder="7.5"
            min={0}
            max={24}
            step={0.1}
            suffix="hours"
          />
          {formik.touched.totalSleepHours && formik.errors.totalSleepHours && (
            <p className="mt-1 text-sm text-red-400">{formik.errors.totalSleepHours}</p>
          )}
        </FormGroup>

        <FormGroup 
          label="Time in Bed" 
          description="Total hours spent in bed (including time awake)" 
          required
        >
          <NumberInput
            value={formik.values.timeInBed}
            onChange={(value) => formik.setFieldValue('timeInBed', value)}
            placeholder="8.0"
            min={0}
            max={24}
            step={0.1}
            suffix="hours"
          />
          {formik.touched.timeInBed && formik.errors.timeInBed && (
            <p className="mt-1 text-sm text-red-400">{formik.errors.timeInBed}</p>
          )}
        </FormGroup>
      </div>

      <FormGroup
        label="REM Sleep Percentage"
        description="REM (Rapid Eye Movement) sleep is vital for memory and learning. Typically 20–25% of total sleep."
        tooltip="REM sleep is crucial for cognitive function, memory consolidation, and emotional regulation. Most adults spend 20-25% of their sleep time in REM."
      >
        <PercentageInput
          value={formik.values.remPercentage}
          onChange={(value) => formik.setFieldValue('remPercentage', value)}
          placeholder="22"
          min={0}
          max={100}
        />
        {formik.touched.remPercentage && formik.errors.remPercentage && (
          <p className="mt-1 text-sm text-red-400">{formik.errors.remPercentage}</p>
        )}
      </FormGroup>

      {/* Live Calculated Field */}
      <CalculatedField
        label="Sleep Efficiency"
        value={sleepEfficiency}
        description="Calculated as (Total Sleep Hours ÷ Time in Bed) × 100%"
        isGood={sleepEfficiency >= 85}
        compact={true}
      />

      {/* Section Divider with Scroll Hint */}
      <div className="relative my-6">
        <div className="border-t border-gray-600/30"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gray-800 px-4 py-2 rounded-full border border-green-500/30 flex items-center space-x-2 animate-pulse">
            <span className="text-sm text-green-400 font-medium">More metrics below</span>
            <ChevronDown className="h-4 w-4 text-green-400" />
          </div>
        </div>
      </div>

      {/* Enhanced Metrics Section */}
      <div 
        data-enhanced-metrics
        className="space-y-4 mt-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20"
      >
                  <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Enhanced Sleep Analytics</h3>
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded font-medium">
              🚀 Advanced
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-300 bg-blue-500/20 px-3 py-1 rounded-full">
              Boost your bio-age accuracy
            </div>
            <div className="text-xs font-medium px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
              {enhancedFieldsCompleted}/4 completed
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-300 mb-4 p-3 rounded bg-blue-500/10 border border-blue-500/20">
          <span className="text-blue-300 font-medium">💡 Pro Tip:</span> Adding these metrics can improve your biological age calculation by up to 25% accuracy!
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Enhanced Metrics Progress</span>
            <span>{enhancedFieldsCompleted}/4</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(enhancedFieldsCompleted / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup
            label="Sleep Latency"
            description="Time taken to fall asleep (minutes)"
            tooltip="How long it takes you to fall asleep after getting into bed. Optimal is under 20 minutes."
          >
            <div className="relative">
              <NumberInput
                value={formik.values.sleepLatency ?? 0}
                onChange={(value) => {
                  console.log('🔢 Sleep Latency changed:', value)
                  formik.setFieldValue('sleepLatency', value >= 0 ? value : undefined)
                }}
                placeholder="15"
                min={0}
                max={300}
                step={1}
                suffix="minutes"
              />
              {formik.values.sleepLatency !== undefined && formik.values.sleepLatency >= 0 && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
              )}
            </div>
            {formik.touched.sleepLatency && formik.errors.sleepLatency && (
              <p className="mt-1 text-sm text-red-400">{formik.errors.sleepLatency}</p>
            )}
          </FormGroup>

          <FormGroup
            label="HRV Overnight"
            description="Heart Rate Variability during sleep (ms)"
            tooltip="Higher HRV generally indicates better recovery and autonomic nervous system health. Optimal is above 50ms."
          >
            <div className="relative">
              <NumberInput
                value={formik.values.hrvOvernight ?? 0}
                onChange={(value) => {
                  console.log('💓 HRV changed:', value)
                  formik.setFieldValue('hrvOvernight', value > 0 ? value : undefined)
                }}
                placeholder="45"
                min={1}
                max={200}
                step={1}
                suffix="ms"
              />
              {formik.values.hrvOvernight !== undefined && formik.values.hrvOvernight > 0 && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
              )}
            </div>
            {formik.touched.hrvOvernight && formik.errors.hrvOvernight && (
              <p className="mt-1 text-sm text-red-400">{formik.errors.hrvOvernight}</p>
            )}
          </FormGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup
            label="Chronotype"
            description="Your natural sleep-wake preference"
            tooltip="Morning types prefer early bedtimes and wake times, evening types prefer later schedules."
          >
            <div className="relative">
              <SelectInput
                key={`chronotype-${formik.values.chronotype}-${formik.values.date}`}
                value={formik.values.chronotype ?? ''}
                onChange={(value) => {
                  console.log('🌅 Chronotype changed:', value)
                  formik.setFieldValue('chronotype', value || null)
                }}
                placeholder="Select chronotype"
                options={[
                  { value: 'morning', label: 'Morning Person (Early Bird)' },
                  { value: 'intermediate', label: 'Intermediate (Flexible)' },
                  { value: 'evening', label: 'Evening Person (Night Owl)' }
                ]}
              />
              {formik.values.chronotype && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
              )}
            </div>
            {formik.touched.chronotype && formik.errors.chronotype && (
              <p className="mt-1 text-sm text-red-400">{formik.errors.chronotype}</p>
            )}
          </FormGroup>

          <FormGroup
            label="Timing Consistency"
            description="Sleep schedule variation (hours)"
            tooltip="How much your bedtime varies from day to day. Lower is better for sleep quality."
          >
            <div className="relative">
              <NumberInput
                value={formik.values.timingConsistency ?? 0}
                onChange={(value) => formik.setFieldValue('timingConsistency', value >= 0 ? value : undefined)}
                placeholder="0.5"
                min={0}
                max={12}
                step={0.1}
                suffix="hours"
              />
              {formik.values.timingConsistency !== undefined && formik.values.timingConsistency >= 0 && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
              )}
            </div>
            {formik.touched.timingConsistency && formik.errors.timingConsistency && (
              <p className="mt-1 text-sm text-red-400">{formik.errors.timingConsistency}</p>
            )}
          </FormGroup>
        </div>
      </div>
    </div>
  </Form>
  )
}

export function HealthDataModal({ isOpen, onClose, currentUser, onDataUpdate }: HealthDataModalProps) {
  // React Query hooks
  const { data: healthAlertsData } = useHealthAlerts(currentUser?.id || '')
  const { 
    findDataForDate, 
    createSleepDataEntry, 
    isCreating 
  } = useSleepDataWithMutation(currentUser?.id || '')

  // State management
  const [modalState, setModalState] = useState<ModalState>({
    isUpdating: false,
    backendSuggestions: [],
    showSuggestions: false,
    isCheckingData: false,
    savedSuggestionsCount: 0,
    shieldScore: 0,
    error: "",
    success: ""
  })

  const [sleepEfficiency, setSleepEfficiency] = useState<number>(0)
  const [showEnhancedHint, setShowEnhancedHint] = useState<boolean>(true)

  // Refs for debouncing and scroll handling
  const dateCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Initial form values
  const initialValues: FormValues = {
    totalSleepHours: 0,
    timeInBed: 0,
    remPercentage: 0,
    date: new Date().toISOString().split("T")[0],
    // New optional fields
    sleepLatency: undefined,
    hrvOvernight: undefined,
    chronotype: null,
    timingConsistency: undefined
  }

  // Update suggestions count when health alerts data changes
  useEffect(() => {
    if (healthAlertsData?.alerts) {
      setModalState(prev => ({ 
        ...prev, 
        savedSuggestionsCount: healthAlertsData.alerts.length 
      }))
    }
  }, [healthAlertsData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dateCheckTimeoutRef.current) {
        clearTimeout(dateCheckTimeoutRef.current)
      }
    }
  }, [])

  // Reset modal state when opened (but preserve suggestions if they exist)
  useEffect(() => {
    if (isOpen) {
      setModalState(prev => ({
        isUpdating: false,
        backendSuggestions: prev.showSuggestions ? prev.backendSuggestions : [],
        showSuggestions: prev.showSuggestions || false,
        isCheckingData: false,
        savedSuggestionsCount: healthAlertsData?.alerts?.length || 0,
        shieldScore: prev.showSuggestions ? prev.shieldScore : 0,
        error: "",
        success: prev.showSuggestions ? prev.success : ""
      }))
      if (!modalState.showSuggestions) {
        setSleepEfficiency(0)
      }
    }
  }, [isOpen, healthAlertsData])

  const checkExistingData = useCallback((date: string, setFieldValue: (field: string, value: any) => void) => {
    if (!currentUser || !date) return

    setModalState(prev => ({ ...prev, isCheckingData: true }))

    try {
      const existingRecord = findDataForDate(date)
      console.log("existingRecord", existingRecord)

      if (existingRecord) {
        setModalState(prev => ({ ...prev, isUpdating: true }))
        setFieldValue('totalSleepHours', existingRecord.total_sleep_hours || 0)
        setFieldValue('timeInBed', existingRecord.time_in_bed || 0)
        setFieldValue('remPercentage', existingRecord.rem_percentage || 0)
        // Set new optional fields if they exist
        setFieldValue('sleepLatency', existingRecord.sleep_latency_minutes || undefined)
        setFieldValue('hrvOvernight', existingRecord.hrv_overnight || undefined)
        console.log('🔄 Setting chronotype from existing record:', existingRecord.chronotype)
        setFieldValue('chronotype', existingRecord.chronotype || null)
        setFieldValue('timingConsistency', existingRecord.timing_consistency_hours || undefined)
      } else {
        setModalState(prev => ({ ...prev, isUpdating: false }))
        setFieldValue('totalSleepHours', 0)
        setFieldValue('timeInBed', 0)
        setFieldValue('remPercentage', 0)
        // Reset new optional fields
        setFieldValue('sleepLatency', undefined)
        setFieldValue('hrvOvernight', undefined)
        setFieldValue('chronotype', null)
        setFieldValue('timingConsistency', undefined)
      }
    } catch (error) {
      console.error("Failed to check existing data:", error)
    } finally {
      setModalState(prev => ({ ...prev, isCheckingData: false }))
    }
  }, [currentUser, findDataForDate])

  const handleDateChange = useCallback((newDate: string, setFieldValue: (field: string, value: any) => void) => {
    if (dateCheckTimeoutRef.current) {
      clearTimeout(dateCheckTimeoutRef.current)
    }

    dateCheckTimeoutRef.current = setTimeout(() => {
      checkExistingData(newDate, setFieldValue)
    }, 500)
  }, [checkExistingData])

  const handleSubmit = async (values: FormValues) => {
    console.log('🚀 handleSubmit called with values:', values)
    
    if (!currentUser) {
      setModalState(prev => ({ ...prev, error: "No current user selected" }))
      return
    }

    setModalState(prev => ({ ...prev, error: "", success: "" }))

    try {
      console.log('📋 Form values before processing:', values)
      console.log('📋 Enhanced metrics check:', {
        sleepLatency: values.sleepLatency,
        sleepLatencyCheck: values.sleepLatency !== undefined && values.sleepLatency !== null,
        hrvOvernight: values.hrvOvernight,
        hrvCheck: values.hrvOvernight !== undefined && values.hrvOvernight !== null,
        chronotype: values.chronotype,
        chronotypeCheck: !!values.chronotype,
        timingConsistency: values.timingConsistency,
        timingCheck: values.timingConsistency !== undefined && values.timingConsistency !== null
      })

      const requestData = {
        date: values.date,
        total_sleep_hours: values.totalSleepHours,
        time_in_bed: values.timeInBed,
        rem_percentage: values.remPercentage,
        // Include new optional fields if they have values (including 0)
        ...(values.sleepLatency !== undefined && values.sleepLatency !== null && { sleep_latency_minutes: values.sleepLatency }),
        ...(values.hrvOvernight !== undefined && values.hrvOvernight !== null && { hrv_overnight: values.hrvOvernight }),
        ...(values.chronotype && { chronotype: values.chronotype }),
        ...(values.timingConsistency !== undefined && values.timingConsistency !== null && { timing_consistency_hours: values.timingConsistency })
      }
      
      console.log('📤 Sending sleep data request:', requestData)
      const data = await createSleepDataEntry(requestData)

      setModalState(prev => ({
        ...prev,
        success: data.message || "Sleep data saved successfully!",
        backendSuggestions: data.suggestions || [],
        showSuggestions: true,
        shieldScore: data.sleepData.shield_score || 0,
        savedSuggestionsCount: prev.savedSuggestionsCount + (data.suggestions?.length || 0)
      }))

      // Don't refresh data immediately - wait until modal is closed
      // This allows users to see AI suggestions without data refresh interference
    } catch (error) {
      console.error("Failed to save sleep data:", error)
      setModalState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred while saving data"
      }))
    }
  }

  const handleBackToForm = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      showSuggestions: false,
      error: "",
      success: ""
    }))
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-5xl mx-4 h-[95vh] flex flex-col max-h-[95vh]">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => {
            // Calculate sleep efficiency in real-time
            useEffect(() => {
              if (formik.values.timeInBed > 0) {
                const efficiency = (formik.values.totalSleepHours / formik.values.timeInBed) * 100
                setSleepEfficiency(Math.min(efficiency, 100))
              } else {
                setSleepEfficiency(0)
              }
            }, [formik.values.totalSleepHours, formik.values.timeInBed])

            // Check existing data when modal opens
            useEffect(() => {
              if (isOpen && currentUser) {
                checkExistingData(formik.values.date, formik.setFieldValue)
              }
            }, [isOpen, currentUser])

            // Debug: Log form values whenever they change
            useEffect(() => {
              console.log('📝 Current form values:', formik.values)
            }, [formik.values])

            return (
              <>
                {/* Header */}
                <ModalHeader
                  isUpdating={modalState.isUpdating}
                  formValues={formik.values}
                  currentUser={currentUser}
                  savedSuggestionsCount={modalState.savedSuggestionsCount}
                  showSuggestions={modalState.showSuggestions}
                  onClose={onClose}
                  onBack={handleBackToForm}
                />

                {/* Status Messages */}
                <div className="flex-shrink-0 px-6">
                  {modalState.error && <StatusMessage type="error" message={modalState.error} />}
                  {modalState.success && !modalState.showSuggestions && <StatusMessage type="success" message={modalState.success} />}
                  {modalState.isUpdating && !modalState.isCheckingData && !modalState.showSuggestions && (
                    <StatusMessage 
                      type="warning" 
                      message={`You are updating existing sleep data for ${new Date(formik.values.date).toLocaleDateString()}`} 
                    />
                  )}
                  {modalState.isCheckingData && <LoadingSpinner message="Checking for existing data..." />}
                </div>

                {/* Content */}
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto p-6 min-h-0 scroll-smooth relative"
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement
                    const scrolled = target.scrollTop > 200
                    setShowEnhancedHint(!scrolled)
                  }}
                >
                  {/* Floating Enhanced Metrics Hint */}
                  {!modalState.showSuggestions && showEnhancedHint && (
                    <div className="fixed bottom-24 right-8 z-50 animate-bounce">
                      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm font-medium">
                        <Activity className="h-4 w-4" />
                        <span>Enhanced metrics available below!</span>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                
                  {modalState.showSuggestions ? (
                    <>
                      {modalState.shieldScore && modalState.showSuggestions && (
                        <div className="flex-shrink-0 flex justify-center gap-2 mb-4 flex-col items-center">
                          <div className="text-lg font-semibold text-white">SHIELD Score</div>
                          <div className="text-3xl font-bold text-green-400">{modalState.shieldScore}</div>
                        </div>
                      )}
                      <SuggestionsView
                        suggestions={modalState.backendSuggestions}
                        formValues={formik.values}
                        onClose={onClose}
                        onBack={handleBackToForm}
                      />
                    </>
                  ) : (
                    <SleepForm
                      formik={formik}
                      modalState={modalState}
                      sleepEfficiency={sleepEfficiency}
                      onDateChange={(date) => handleDateChange(date, formik.setFieldValue)}
                    />
                  )}
                </div>

                {/* Footer */}
                {!modalState.showSuggestions && (
                  <div className="flex-shrink-0 p-6 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-white/5"
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => formik.handleSubmit()}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                        disabled={isCreating || !formik.isValid}
                      >
                        {isCreating
                          ? modalState.isUpdating ? "Updating..." : "Saving..."
                          : modalState.isUpdating ? "Update Sleep Data" : "Save Sleep Data"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )
          }}
        </Formik>
      </GlassCard>
    </Modal>
  )
}
