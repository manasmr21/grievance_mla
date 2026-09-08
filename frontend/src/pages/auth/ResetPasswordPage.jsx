import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ResetPassword from './ForgotPassword/ResetPassword';
import Success from './ForgotPassword/Success';
import { userApi } from '../../services/api/api';
import AuthBackground from '../../components/auth/AuthBackground';
import {
  FaShieldAlt,
  FaClock,
  FaUsers,
  FaBuilding,
  FaLock,
} from 'react-icons/fa';

const inputClasses =
  'h-12 w-full rounded-lg border border-[#E2E8F0] bg-white px-4 pl-11 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100';
const labelClasses = 'mb-2 block text-sm font-medium text-[#0F172A]';
const primaryButtonClasses =
  'h-12 w-full rounded-lg bg-[#2563EB] text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-blue-100';
const outlineButtonClasses =
  'flex h-12 w-full items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-100';

const FeatureIcon = ({ icon: Icon }) => (
  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[#2563EB] ring-1 ring-[#E2E8F0]/80 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
    <Icon className="h-7 w-7" />
  </div>
);

const BrandLogo = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-[0_14px_36px_-20px_rgba(15,23,42,0.35)] ring-1 ring-white/50">
      <span className="text-xs font-bold">MLA</span>
    </div>
    <div>
      <h1 className="text-base font-bold text-[#0F172A] sm:text-lg">MLA Connect</h1>
      <p className="text-xs font-medium text-[#0F172A]/70 sm:text-sm">Grievance Portal</p>
    </div>
  </div>
);

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleResetPassword = async (newPassword) => {
    if (!token) {
      setApiError('Missing reset token. Please request a new password reset link.');
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const response = await userApi.resetPassword(token, newPassword.trim());
      if (response && response.success) {
        setResetComplete(true);
      } else {
        throw new Error(response?.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setApiError(err.message || 'The token is invalid or expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!token) {
      return (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <FaLock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">Invalid Reset Request</h2>
          <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
            The password reset link is invalid or incomplete. Please request a new password reset email.
          </p>
          <button
            type="button"
            className="h-10 w-full rounded-lg bg-[#2563EB] text-xs font-semibold text-white transition hover:bg-[#1D4ED8]"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      );
    }

    if (resetComplete) {
      return (
        <Success
          primaryButtonClasses={primaryButtonClasses}
          outlineButtonClasses={outlineButtonClasses}
          onDone={() => navigate('/login')}
        />
      );
    }

    return (
      <div className="relative">
        {apiError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-[#EF4444]">
            {apiError}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
            <div className="flex flex-col items-center gap-2 text-xs text-[#2563EB] font-semibold">
              <div className="h-6 w-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Updating password...
            </div>
          </div>
        )}
        <ResetPassword
          inputClasses={inputClasses}
          labelClasses={labelClasses}
          primaryButtonClasses={primaryButtonClasses}
          outlineButtonClasses={outlineButtonClasses}
          onBack={() => navigate('/login')}
          onContinue={handleResetPassword}
          loading={loading}
        />
      </div>
    );
  };

  return (
    <main className="relative min-h-screen w-full bg-[#F8FAFC]">
      <AuthBackground />

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
            {renderContent()}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ResetPasswordPage;
