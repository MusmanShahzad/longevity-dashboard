"use client"

import type React from "react"
import { X, User, Mail, MapPin, Calendar, Save } from "lucide-react"
import { Formik, Form, type FormikProps } from "formik"
import * as Yup from "yup"
import { Modal } from "@/components/molecules/modal"
import { FormGroup } from "@/components/molecules/form-group"
import { DateInput } from "@/components/atoms/date-input"
import { SelectInput } from "@/components/atoms/select-input"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/atoms/glass-card"
import { useUpdateUser } from "@/lib/hooks/use-users"
import type { User as UserType } from "@/lib/supabase"

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserType | null
  onUserUpdated: (user: UserType) => void
}

interface FormValues {
  id: string
  full_name: string
  email: string
  date_of_birth: string
  sex: string
  location: string
}

// Validation Schema
const validationSchema = Yup.object({
  full_name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .required("Full name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  date_of_birth: Yup.string()
    .required("Date of birth is required")
    .test("age", "Must be at least 1 year old", function(value) {
      if (!value) return true
      const birthDate = new Date(value)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 1
    })
    .test("not-future", "Date of birth cannot be in the future", function(value) {
      if (!value) return true
      const birthDate = new Date(value)
      const today = new Date()
      return birthDate <= today
    }),
  sex: Yup.string()
    .oneOf(["male", "female", "other"], "Please select a valid option")
    .required("Sex is required"),
  location: Yup.string()
    .max(255, "Location must be less than 255 characters")
})

// Sex options
const sexOptions = [
  { value: "", label: "Select sex" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]

// Reusable Components
const ModalHeader = ({ user, onClose }: { user: UserType, onClose: () => void }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center space-x-3">
      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
        <User className="h-6 w-6 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">Edit User Profile</h2>
        <p className="text-sm text-cyan-300">Update {user.full_name}'s information</p>
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
)

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
    <p className="text-red-400 text-sm">{message}</p>
  </div>
)

const UserForm = ({ formik }: { formik: FormikProps<FormValues> }) => (
  <Form className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormGroup label="Full Name" required>
        <div className="relative">
          <input
            type="text"
            name="full_name"
            value={formik.values.full_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter full name"
            className="w-full px-4 py-3 pl-12 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent hover:bg-white/10 transition-all duration-200"
          />
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {formik.touched.full_name && formik.errors.full_name && (
            <p className="mt-1 text-sm text-red-400">{formik.errors.full_name}</p>
          )}
        </div>
      </FormGroup>

      <FormGroup label="Email Address">
        <div className="relative">
          <input
            type="email"
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter email"
            className="w-full px-4 py-3 pl-12 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent hover:bg-white/10 transition-all duration-200"
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {formik.touched.email && formik.errors.email && (
            <p className="mt-1 text-sm text-red-400">{formik.errors.email}</p>
          )}
        </div>
      </FormGroup>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormGroup label="Date of Birth" required>
        <div className="relative">
          <DateInput
            value={formik.values.date_of_birth}
            onChange={(value) => formik.setFieldValue("date_of_birth", value)}
            placeholder="Select date of birth"
            disableFuture
            disabled
          />
          {formik.touched.date_of_birth && formik.errors.date_of_birth && (
            <p className="mt-1 text-sm text-red-400">{formik.errors.date_of_birth}</p>
          )}
        </div>
      </FormGroup>

      <FormGroup label="Sex" required>
        <SelectInput
          value={formik.values.sex}
          onChange={(value) => formik.setFieldValue("sex", value)}
          options={sexOptions}
          placeholder="Select sex"
        />
        {formik.touched.sex && formik.errors.sex && (
          <p className="mt-1 text-sm text-red-400">{formik.errors.sex}</p>
        )}
      </FormGroup>
    </div>

    <FormGroup label="Location">
      <div className="relative">
        <input
          type="text"
          name="location"
          value={formik.values.location}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="City, State/Country"
          className="w-full px-4 py-3 pl-12 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent hover:bg-white/10 transition-all duration-200"
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        {formik.touched.location && formik.errors.location && (
          <p className="mt-1 text-sm text-red-400">{formik.errors.location}</p>
        )}
      </div>
    </FormGroup>
  </Form>
)

export function UserEditModal({ isOpen, onClose, user, onUserUpdated }: UserEditModalProps) {
  const updateUserMutation = useUpdateUser()

  if (!user) return null

  const initialValues: FormValues = {
    id: user.id,
    full_name: user.full_name || "",
    email: user.email || "",
    date_of_birth: user.date_of_birth || "",
    sex: user.sex || "",
    location: user.location || "",
  }

  const handleSubmit = async (values: FormValues) => {
    try {
      const userInput = {
        full_name: values.full_name,
        email: values.email,
        date_of_birth: values.date_of_birth,
        sex: values.sex,
        location: values.location,
      }
      const result = await updateUserMutation.mutateAsync({
        id: user.id,
        userData: userInput
      })
      onUserUpdated(result)
      onClose()
    } catch (error) {
      // Error is handled by the mutation and displayed via updateUserMutation.error
      console.error("Failed to update user:", error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-2xl mx-4 h-[90vh] flex flex-col max-h-[90vh]">
        <div className="p-6 flex-shrink-0">
          <ModalHeader user={user} onClose={onClose} />
          {updateUserMutation.error && (
            <ErrorMessage message={updateUserMutation.error.message} />
          )}
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => (
            <>
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <UserForm formik={formik} />
              </div>

              <div className="flex-shrink-0 p-6 border-t border-white/10">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-white/5"
                    disabled={updateUserMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => formik.handleSubmit()}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={updateUserMutation.isPending || !formik.isValid || !formik.dirty}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Formik>
      </GlassCard>
    </Modal>
  )
}
