import React from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>PROTOTYPE DEMONSTRATION ONLY:</strong> Not an official 911/emergency dispatch service. Requests are not automatically transmitted to official agencies.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 font-semibold text-red-700">
          <PhoneCall className="w-3 h-3" />
          <span>Life-Threatening Emergency? Dial 911 / 112</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-l-4 border-resq-red p-4 rounded-r-md shadow-sm mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-resq-red mt-0.5" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold text-red-800 tracking-wide uppercase">
            Emergency Coordination Prototype Limitation Notice
          </h3>
          <div className="mt-1 text-sm text-red-700 leading-relaxed">
            <p>
              <strong>RESQNET</strong> is an incident coordination prototype designed for simulated disaster triage and volunteer response operations. It is <strong>not</strong> an official emergency dispatch service. Requests submitted here are not automatically forwarded to government or municipal emergency services.
            </p>
            <p className="mt-1 font-semibold text-red-900 flex items-center gap-1">
              <PhoneCall className="w-4 h-4 text-red-600 inline" />
              If you or anyone around you is in immediate danger, please immediately contact your local official emergency services (Dial 911 / 112 or local emergency line).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
