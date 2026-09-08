import { useState } from 'react'
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaCircle } from 'react-icons/fa'

const ResetPassword = ({
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  outlineButtonClasses,
  onBack,
  onContinue,
  loading = false,
}) => {
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setPasswords((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!passwords.password || !passwords.confirmPassword) {
      setError('Enter and confirm your new password.')
      return
    }

    if (passwords.password !== passwords.confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }

    setError('')
    onContinue(passwords.password)
  }

  const pwd = passwords.password
  const requirements = [
    { label: 'At least 8 characters long', met: pwd.length >= 8 },
    { label: 'Includes uppercase and lowercase letters', met: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) },
    { label: 'Includes a number or special character', met: /[0-9!@#$%^&*]/.test(pwd) },
  ]

  const StepIndicator = () => (
    <div className="mb-6 flex items-start justify-center gap-1 sm:gap-2">
      {['Email', 'OTP', 'New Password', 'Complete'].map((label, index) => {
        const stepNum = index + 1
        const isActive = stepNum === 3
        const isCompleted = stepNum < 3

        return (
          <div key={label} className="flex items-start gap-1 sm:gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm ${
                  isActive
                    ? 'bg-[#2563EB] text-white'
                    : isCompleted
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white text-[#64748B] ring-1 ring-[#E2E8F0]'
                }`}
              >
                {isCompleted ? <FaCheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : stepNum}
              </div>
              <p
                className={`mt-1.5 text-[10px] font-medium sm:mt-2 sm:text-[11px] ${
                  isActive || isCompleted ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                }`}
              >
                {label}
              </p>
            </div>
            {index < 3 && <div className="mt-3 h-px w-5 bg-[#E2E8F0] sm:mt-4 sm:w-8" />}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
        <FaLock className="h-6 w-6" />
      </div>

      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">New Password</h2>
        <p className="mt-0.5 text-xs text-[#64748B]">Create a strong new password</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-[#EF4444]">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-xs font-medium text-[#0F172A]">
            New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#94A3B8]">
              <FaLock className="h-4 w-4" />
            </div>
            <input
              id="new-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 pl-10 pr-10 text-xs text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100"
              value={passwords.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[#94A3B8] transition hover:text-[#2563EB]"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <FaEye className="h-4 w-4" /> : <FaEyeSlash className="h-4 w-4" />}
            </button>
          </div>

          <ul className="mt-2 space-y-1">
            {requirements.map((req) => (
              <li key={req.label} className="flex items-center gap-2 text-[10px] text-[#64748B]">
                {req.met ? (
                  <FaCheckCircle className="h-3 w-3 shrink-0 text-[#10B981]" />
                ) : (
                  <FaCircle className="h-1.5 w-1.5 shrink-0 text-[#CBD5E1]" />
                )}
                <span className={req.met ? 'text-[#0F172A]' : ''}>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-xs font-medium text-[#0F172A]">
            Confirm Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#94A3B8]">
              <FaLock className="h-4 w-4" />
            </div>
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter password"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 pl-10 pr-10 text-xs text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100"
              value={passwords.confirmPassword}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[#94A3B8] transition hover:text-[#2563EB]"
              onClick={() => setShowConfirm((current) => !current)}
            >
              {showConfirm ? <FaEye className="h-4 w-4" /> : <FaEyeSlash className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] transition hover:bg-gray-50" onClick={onBack}>
            Back
          </button>
           <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating...</span>
              </>
            ) : (
              'Update'
            )}
          </button>
        </div>
      </form>
    </>
  )
}

export default ResetPassword
