import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { role, getDefaultRouteForRole } = useAuth();

  const handleBackHome = () => {
    if (role) {
      navigate(getDefaultRouteForRole(role));
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)]">
        <div className="mx-auto w-20 h-20 bg-[#FEF2F2] rounded-full flex items-center justify-center text-[#EF4444] mb-6">
          <i className="fa-solid fa-shield-halved text-4xl"></i>
        </div>
        
        <h1 className="text-2xl font-bold text-[#0F172A] mb-3">Access Denied</h1>
        <p className="text-[#64748B] text-sm leading-relaxed mb-8">
          Sorry, you don't have permission to access this page. 
          Please contact your administrator if you believe this is an error.
        </p>

        <div className="space-y-3">
          <button 
            onClick={handleBackHome}
            className="w-full h-12 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] transition shadow-[0_8px_24px_-8px_rgba(37,99,235,0.4)]"
          >
            Back to Dashboard
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full h-12 bg-white text-[#475569] border border-[#E2E8F0] rounded-xl font-semibold text-sm hover:bg-[#F8FAFC] transition"
          >
            Go Back
          </button>
        </div>

        <div className="mt-8 pt-6 border-top border-[#F1F5F9] flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
            <i className="fa-solid fa-headset text-sm"></i>
          </div>
          <span className="text-xs font-medium text-[#2563EB]">Contact IT Support</span>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
