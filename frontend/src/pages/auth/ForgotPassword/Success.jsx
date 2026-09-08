import { FaCheckCircle, FaStar } from 'react-icons/fa'

const Success = ({ primaryButtonClasses, outlineButtonClasses, onDone }) => {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative mb-6">
        <div className="absolute -left-3 -top-1 text-[#F59E0B]">
          <FaStar className="h-3 w-3" />
        </div>
        <div className="absolute -right-2 -top-2 text-[#F59E0B]">
          <FaStar className="h-3 w-3" />
        </div>
        <div className="absolute -left-1 top-10 text-[#3B82F6]">
          <FaStar className="h-2 w-2" />
        </div>
        <div className="absolute -right-3 top-8 text-[#3B82F6]">
          <FaStar className="h-2 w-2" />
        </div>
        
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#10B981]">
          <FaCheckCircle className="h-8 w-8" />
        </div>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Password Reset!</h2>
        <p className="mt-1 text-xs text-[#64748B]">Your password has been reset successfully.</p>
        <p className="mt-3 text-xs text-[#64748B]">You can now sign in with your new password.</p>
      </div>

      <button
        type="button"
        className="h-10 w-full rounded-lg bg-[#2563EB] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
        onClick={onDone}
      >
        Sign In Now
      </button>
    </div>
  )
}

export default Success
