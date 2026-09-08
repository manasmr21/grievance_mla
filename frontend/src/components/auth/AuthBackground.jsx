import grievanceLogo from '../../assets/images/grievance-logo.png';

const AuthBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#F8FAFC]">
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 45%, #DBEAFE 100%)',
      }}
    />
    <div
      className="absolute inset-0 opacity-[0.045]"
      style={{
        backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
    <div
      className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
    />
    <div
      className="pointer-events-none absolute -bottom-32 -left-20 h-[360px] w-[360px] rounded-full opacity-15"
      style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }}
    />
    <img
      src={grievanceLogo}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[12%] left-[8%] hidden h-48 w-48 opacity-[0.06] lg:block xl:h-56 xl:w-56"
    />
  </div>
);

export default AuthBackground;
