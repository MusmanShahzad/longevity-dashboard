"use client"

import type React from "react"
import type { User } from "@/lib/supabase"
import { useState, useEffect, useCallback, useRef } from "react"
import { Formik, Form, type FormikProps } from "formik"
import * as Yup from "yup"
import { 
  X, Activity, Moon, Calendar, Lightbulb, AlertTriangle, 
  CheckCircle, AlertCircle, History 
} from "lucide-react"
import { Modal } from "@/components/molecules/modal"
import { FormGroup } from "@/components/molecules/form-group"
import { NumberInput } from "@/components/atoms/number-input"
import { PercentageInput } from "@/components/atoms/percentage-input"
import { DateInput } from "@/components/atoms/date-input"
import { CalculatedField } from "@/components/molecules/calculated-field"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/atoms/glass-card"

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
    })
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
  onClose 
}: {
  isUpdating: boolean
  formValues: FormValues
  currentUser: User | null
  savedSuggestionsCount: number
  onClose: () => void
}) => (
  <div className="flex-shrink-0 p-6 border-b border-white/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isUpdating ? "Update Sleep Data" : "Add Sleep Data"}
          </h2>
          <p className="text-sm text-cyan-300">
            {isUpdating
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
  onClose 
}: { 
  suggestions: Suggestion[]
  formValues: FormValues
  onClose: () => void 
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
        These suggestions have been saved to your Health Insights and are organized by date. Modal will close automatically.
      </p>
    </div>

    <div className="flex justify-center">
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
}) => (
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
        />
        {formik.touched.date && formik.errors.date && (
          <p className="mt-1 text-sm text-red-400">{formik.errors.date}</p>
        )}
      </div>
    </FormGroup>

    {/* Sleep Data Section */}
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Moon className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Sleep Metrics</h3>
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
      />
    </div>
  </Form>
)

export function HealthDataModal({ isOpen, onClose, currentUser, onDataUpdate }: HealthDataModalProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refs for debouncing and request management
  const dateCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initial form values
  const initialValues: FormValues = {
    totalSleepHours: 0,
    timeInBed: 0,
    remPercentage: 0,
    date: new Date().toISOString().split("T")[0]
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dateCheckTimeoutRef.current) {
        clearTimeout(dateCheckTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setModalState({
        isUpdating: false,
        backendSuggestions: [],
        showSuggestions: false,
        isCheckingData: false,
        savedSuggestionsCount: 0,
        shieldScore: 0,
        error: "",
        success: ""
      })
      setSleepEfficiency(0)
      setIsSubmitting(false)

      if (currentUser) {
        fetchSuggestionsCount()
      }
    }
  }, [isOpen, currentUser])

  const fetchSuggestionsCount = async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/health-alerts?user_id=${currentUser.id}`)
      const data = await response.json()
      if (response.ok && data.alerts) {
        setModalState(prev => ({ ...prev, savedSuggestionsCount: data.alerts.length }))
      }
    } catch (error) {
      console.error("Failed to fetch suggestions count:", error)
    }
  }

  const checkExistingData = useCallback(async (date: string, setFieldValue: (field: string, value: any) => void) => {
    if (!currentUser || !date) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setModalState(prev => ({ ...prev, isCheckingData: true }))

      const response = await fetch(`/api/sleep-data?user_id=${currentUser.id}`, {
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()

      if (response.ok && data.sleepData) {
        const existingRecord = data.sleepData.find((record: any) => record.date === date)

        if (existingRecord) {
          setModalState(prev => ({ ...prev, isUpdating: true }))
          setFieldValue('totalSleepHours', existingRecord.total_sleep_hours || 0)
          setFieldValue('timeInBed', existingRecord.time_in_bed || 0)
          setFieldValue('remPercentage', existingRecord.rem_percentage || 0)
        } else {
          setModalState(prev => ({ ...prev, isUpdating: false }))
          setFieldValue('totalSleepHours', 0)
          setFieldValue('timeInBed', 0)
          setFieldValue('remPercentage', 0)
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Failed to check existing data:", error)
      }
    } finally {
      setModalState(prev => ({ ...prev, isCheckingData: false }))
    }
  }, [currentUser])

  const handleDateChange = useCallback((newDate: string, setFieldValue: (field: string, value: any) => void) => {
    if (dateCheckTimeoutRef.current) {
      clearTimeout(dateCheckTimeoutRef.current)
    }

    dateCheckTimeoutRef.current = setTimeout(() => {
      checkExistingData(newDate, setFieldValue)
    }, 500)
  }, [checkExistingData])

  const handleSubmit = async (values: FormValues) => {
    if (!currentUser) {
      setModalState(prev => ({ ...prev, error: "No current user selected" }))
      return
    }

    setIsSubmitting(true)
    setModalState(prev => ({ ...prev, error: "", success: "" }))

    try {
      const response = await fetch("/api/sleep-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          date: values.date,
          total_sleep_hours: values.totalSleepHours,
          time_in_bed: values.timeInBed,
          rem_percentage: values.remPercentage,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save sleep data")
      }

      setModalState(prev => ({
        ...prev,
        success: data.message || "Sleep data saved successfully!",
        backendSuggestions: data.suggestions || [],
        showSuggestions: true,
        shieldScore: data.sleepData.shield_score || 0,
        savedSuggestionsCount: prev.savedSuggestionsCount + (data.suggestions?.length || 0)
      }))

      if (onDataUpdate) {
        onDataUpdate()
      }
    } catch (error) {
      console.error("Failed to save sleep data:", error)
      setModalState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred while saving data"
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-4xl mx-4 h-[90vh] flex flex-col max-h-[90vh]">
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

            return (
              <>
                {/* Header */}
                <ModalHeader
                  isUpdating={modalState.isUpdating}
                  formValues={formik.values}
                  currentUser={currentUser}
                  savedSuggestionsCount={modalState.savedSuggestionsCount}
                  onClose={onClose}
                />

                {/* Status Messages */}
                <div className="flex-shrink-0 px-6">
                  {modalState.error && <StatusMessage type="error" message={modalState.error} />}
                  {modalState.success && <StatusMessage type="success" message={modalState.success} />}
                  {modalState.isUpdating && !modalState.isCheckingData && (
                    <StatusMessage 
                      type="warning" 
                      message={`You are updating existing sleep data for ${new Date(formik.values.date).toLocaleDateString()}`} 
                    />
                  )}
                  {modalState.isCheckingData && <LoadingSpinner message="Checking for existing data..." />}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                
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
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => formik.handleSubmit()}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                        disabled={isSubmitting || !formik.isValid}
                      >
                        {isSubmitting
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
