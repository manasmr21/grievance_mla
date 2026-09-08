import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import backgroundImage from '../../assets/images/bg-2.png'
import ForgotPassword from './ForgotPassword/ForgotPassword'
import TechnicalSupportContact from './TechnicalSupportContact'
import { captchaApi } from '../../services/api/api'
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaClock,
  FaUsers,
  FaBuilding,
  FaSync,
} from 'react-icons/fa'


const inputClasses =
  'h-12 w-full rounded-lg border border-[#E2E8F0] bg-white px-4 pl-11 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100'
const labelClasses = 'mb-2 block text-sm font-medium text-[#0F172A]'
const primaryButtonClasses =
  'h-12 w-full rounded-lg bg-[#2563EB] text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-blue-100'
const outlineButtonClasses =
  'flex h-12 w-full items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-100'
const textButtonClasses =
  'text-sm font-medium text-[#2563EB] transition hover:text-[#1D4ED8] focus:outline-none'

const FeatureIcon = ({ icon: Icon }) => (
  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[#2563EB] ring-1 ring-[#E2E8F0]/80 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
    <Icon className="h-7 w-7" />
  </div>
)

const BrandLogo = () => (
  <div className="flex items-center gap-4">
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-lg">
      <span className="text-lg font-bold tracking-tight">MLA</span>
    </div>
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] leading-tight">MLA Connect</h1>
      <p className="text-base font-medium text-[#0F172A]/70">Grievance Portal</p>
      <div className="mt-2 h-0.5 w-10 rounded-full bg-[#2563EB]" />
    </div>
  </div>
)

const Login = () => {
  const navigate = useNavigate()
  const { login, getDefaultRouteForRole } = useAuth()
  const [view, setView] = useState('login')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false)
  const [captchaError, setCaptchaError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCaptcha = async () => {
    setIsLoadingCaptcha(true)
    setCaptchaError('')
    try {
      const response = await captchaApi.generateCaptcha()
      if (response && response.success && response.data && response.data.image) {
        setCaptchaSvg(response.data.image)
        setCaptchaId(response.data.captchaId)
      } else {
        setCaptchaError('Failed to load captcha')
      }
    } catch (error) {
      console.error('Error generating captcha:', error)
      setCaptchaError('Error loading captcha')
    } finally {
      setIsLoadingCaptcha(false)
    }
  }

  useEffect(() => {
    if (view === 'login') {
      fetchCaptcha()
      setCaptchaCode('')
    }
  }, [view])

  const handleChange = (event) => {
    const { name, value } = event.target
    setCredentials((current) => ({ ...current, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!captchaCode) {
      alert('Please enter the captcha answer')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Verify captcha with the backend
      const verifyResponse = await captchaApi.verifyCaptcha(captchaCode, captchaId)
      if (!verifyResponse || !verifyResponse.success) {
        alert('Invalid captcha answer')
        setCaptchaCode('')
        fetchCaptcha()
        setIsSubmitting(false)
        return
      }

      // 2. Captcha is valid, proceed with login
      const authResult = await login(credentials.email.trim(), credentials.password.trim())

      const roleStr = authResult.activeRole
        ? (authResult.activeRole.code || authResult.activeRole.name).toLowerCase()
        : null
      navigate(getDefaultRouteForRole(roleStr))
    } catch (error) {
      alert(error.message || 'Login failed')
      console.error('Login failed:', error)
      setCaptchaCode('')
      fetchCaptcha() // Refresh captcha on failure
    } finally {
      setIsSubmitting(false)
    }
  }


  const renderPanel = () => {
    if (view === 'forgot-password') {
      return (
        <ForgotPassword
          inputClasses={inputClasses}
          labelClasses={labelClasses}
          primaryButtonClasses={primaryButtonClasses}
          outlineButtonClasses={outlineButtonClasses}
          textButtonClasses={textButtonClasses}
          onBack={() => setView('login')}
          onComplete={() => setView('login')}
        />
      )
    }

    return (
      <>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-md">
          <span className="text-sm font-bold">MLA</span>
        </div>

        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Welcome Back</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">Sign in to your account</p>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleLogin}>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-[#0F172A]">
              Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#94A3B8]">
                <FaEnvelope className="h-4 w-4" />
              </div>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 pl-10 text-xs text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100"
                value={credentials.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-medium text-[#0F172A]">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#94A3B8]">
                <FaLock className="h-4 w-4" />
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 pl-10 pr-10 text-xs text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100"
                value={credentials.password}
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
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex h-10 items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#f4f4f4] overflow-hidden">
                {captchaError ? (
                  <span className="flex-1 text-[10px] text-red-500 text-center px-1">{captchaError}</span>
                ) : (
                  <div
                    className="flex-1 h-full flex items-center justify-center captcha-svg"
                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  />
                )}
                <div className="h-6 w-px bg-[#E2E8F0] shrink-0" />
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={isLoadingCaptcha}
                  className="flex h-full items-center justify-center px-3 text-[#94A3B8] hover:text-[#2563EB] transition-colors shrink-0"
                  title="Refresh Captcha"
                >
                  <FaSync className={`h-3.5 w-3.5 ${isLoadingCaptcha ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter answer"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100"
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>
            <style>{`
              .captcha-svg svg {
                height: 100% !important;
                width: auto !important;
                max-width: 100% !important;
                display: block !important;
              }
            `}</style>
          </div>

          <div className="flex items-center justify-between gap-4 text-[11px]">
            {/* <label className="flex cursor-pointer items-center gap-2 text-[#64748B]">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-[#CBD5E1] accent-[#2563EB]"
                checked={rememberMe}
                onChange={() => setRememberMe((current) => !current)}
              />
              <span>Remember me</span>
            </label> */}

            <button
              type="button"
              className="font-medium text-[#2563EB] transition hover:text-[#1D4ED8]"
              onClick={() => setView('forgot-password')}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <TechnicalSupportContact />

          <p className="pt-1 text-center text-[12px] text-[#64748B]">
            Public grievances can be submitted without an account from the portal homepage.
          </p>
        </form>
      </>
    )
  }

  return (
    <main className="relative min-h-screen w-full bg-[#F8FAFC]">
      <div className="fixed inset-0 z-0">
        <img
          src={backgroundImage}
          alt="University campus walkway"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0F172A]/10 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[50%_50%] xl:grid-cols-[55%_45%]">
        <section className="relative hidden h-full flex-col lg:flex">
          <div className="relative flex h-full flex-col px-6 pb-6 pt-5 md:px-10 md:pb-8 md:pt-6 lg:px-12 lg:pb-8 lg:pt-6 xl:px-20 xl:pb-10 xl:pt-8">
            <div className="pt-2">
              <BrandLogo />
            </div>

            <div className="flex flex-1 items-center">
              <div className="max-w-lg text-left">
                <h2 className="text-3xl font-bold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-4xl xl:text-5xl">
                  <span className="block">Your Voice.</span>
                  <span className="block text-[#2563EB]">Our Commitment.</span>
                </h2>

                <div className="mt-3 h-1 w-10 rounded-full bg-[#2563EB]" />

                <p className="mt-3 max-w-md text-sm leading-5 text-[#0F172A]/70 lg:leading-6">
                  A smart and transparent platform to submit, track, and resolve grievances efficiently. Together, let's build a better campus experience.
                </p>

                <div className="mt-4 grid gap-3 lg:mt-6 lg:gap-4">
                  <div className="flex items-start gap-3 text-[#0F172A] lg:gap-4">
                    <FeatureIcon icon={FaShieldAlt} />
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold lg:text-sm">Secure &amp; Confidential</p>
                      <p className="mt-0.5 text-xs leading-4 text-[#0F172A]/60 lg:mt-1 lg:text-sm lg:leading-5">
                        Your information is safe and protected with us.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-[#0F172A] lg:gap-4">
                    <FeatureIcon icon={FaClock} />
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold lg:text-sm">Track in Real-Time</p>
                      <p className="mt-0.5 text-xs leading-4 text-[#0F172A]/60 lg:mt-1 lg:text-sm lg:leading-5">
                        Stay updated on the status of your grievance.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-[#0F172A] lg:gap-4">
                    <FeatureIcon icon={FaUsers} />
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold lg:text-sm">Better Together</p>
                      <p className="mt-0.5 text-xs leading-4 text-[#0F172A]/60 lg:mt-1 lg:text-sm lg:leading-5">
                        Let's work together to build a better and safer environment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto flex max-w-sm items-start gap-3 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] px-4 py-4 text-white shadow-[0_22px_60px_-34px_rgba(15,23,42,0.55)] lg:gap-4 lg:rounded-3xl lg:px-6 lg:py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25 lg:h-12 lg:w-12 lg:rounded-2xl">
                <FaBuilding className="h-6 w-6 text-white lg:h-7 lg:w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold lg:text-sm">Every voice matters.</p>
                <p className="mt-0.5 text-xs leading-4 text-white/85 lg:mt-1 lg:text-sm lg:leading-5">
                  Together we create a respectful and inclusive campus.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:px-12 lg:py-0">
          <div className="w-full max-w-[420px] rounded-2xl border border-white/60 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.25)] sm:max-w-[440px] sm:rounded-3xl sm:p-8 lg:p-10">
            {renderPanel()}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
