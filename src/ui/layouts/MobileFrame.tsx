import { PropsWithChildren } from 'react';

export function MobileFrame({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto min-h-screen w-full max-w-md border-x border-slate-800 bg-slate-900 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

