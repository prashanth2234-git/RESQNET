import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-resq-border p-8 text-center shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShieldAlert className="w-8 h-8 text-resq-blue" />
        </div>
        <h1 className="text-4xl font-black text-resq-text font-mono">404</h1>
        <h2 className="text-base font-bold text-slate-800">Operational Route Not Found</h2>
        <p className="text-xs text-resq-muted leading-relaxed">
          The requested coordinate or disaster incident record does not exist or may have been archived.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Return to Incident Hub
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
