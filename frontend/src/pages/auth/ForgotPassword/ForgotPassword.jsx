import { useState } from 'react'
import { FaLock, FaEnvelope, FaCheckCircle } from 'react-icons/fa'
import { userApi } from '../../../services/api/api'
import TechnicalSupportContact from '../TechnicalSupportContact'

const ForgotPassword = ({
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  outlineButtonClasses,
  textButtonClasses,
  onBack,
  onComplete,
}) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  const handleEmailSubmit = async (event) => {
    event.preventDefault()

    if (!email) {
      setError('Please enter the email address linked to your account.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await userApi.forgotPassword(email)
      if (response && response.success) {
        setLinkSent(true)
      } else {
        throw new Error(response?.message || 'Failed to send reset link.')
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (linkSent) {
    return (
      <div className="flex flex-col items-center py-2">
        <div className="relative mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#10B981]">
            <FaCheckCircle className="h-8 w-8" />
          </div>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Link Sent!</h2>
          <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
            We have sent a password reset link to:<br/>
            <strong className="text-[#0F172A]">{email}</strong>
          </p>
          <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
            Please check your inbox (and spam folder) and click the link to reset your password.
          </p>
        </div>

        <button
          type="button"
          className="h-10 w-full rounded-lg bg-[#2563EB] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
          onClick={onBack}
        >
          Back to Login
        </button>

        <div className="mt-4">
          <TechnicalSupportContact />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
        <FaLock className="h-6 w-6" />
      </div>

      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Forgot Password</h2>
        <p className="mt-0.5 text-xs text-[#64748B]">Reset your account password</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-[#EF4444]">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleEmailSubmit}>
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-xs font-medium text-[#0F172A]">
            Email
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#94A3B8]">
              <FaEnvelope className="h-4 w-4" />
            </div>
            <input
              id="forgot-email"
              type="email"
              placeholder="Enter your registered email"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 pl-10 text-xs text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

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
              <span>Sending link...</span>
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>

        <TechnicalSupportContact />

        <p className="pt-1 text-center text-[11px] text-[#64748B]">
          Remember your password?{' '}
          <button type="button" className="font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]" onClick={onBack}>
            Sign In
          </button>
        </p>
      </form>
    </>
  )
}

export default ForgotPassword;
