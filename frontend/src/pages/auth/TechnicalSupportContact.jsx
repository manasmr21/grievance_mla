import { FaEnvelope, FaUser } from 'react-icons/fa'

const SUPPORT_NAME = 'Dr. Lalatendu Muduli'
const SUPPORT_EMAIL = 'support@mlaconnect.in'

const TechnicalSupportContact = () => (
  <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF]/60 px-3 py-2.5">
    <p className="mb-2 text-[10px] font-semibold text-[#0F172A]">Technical Support</p>
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white">
        <FaUser className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#0F172A]">{SUPPORT_NAME}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
        >
          <FaEnvelope className="h-3 w-3 shrink-0" />
          <span className="truncate">{SUPPORT_EMAIL}</span>
        </a>
      </div>
    </div>
  </div>
)

export default TechnicalSupportContact
