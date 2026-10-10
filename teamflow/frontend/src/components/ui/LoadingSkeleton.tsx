import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="h-5 bg-slate-100 rounded-full w-16" />
    </div>
    <div className="h-3 bg-slate-100 rounded w-3/4" />
    <div className="h-3 bg-slate-100 rounded w-1/2" />
    <div className="pt-2 flex items-center justify-between">
      <div className="h-6 w-6 rounded-full bg-slate-200" />
      <div className="h-3 bg-slate-100 rounded w-20" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr className="animate-pulse border-b border-slate-100">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-4 px-4">
        <div className="h-4 bg-slate-200/70 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm animate-pulse space-y-3">
    <div className="flex justify-between items-center">
      <div className="h-3.5 bg-slate-200 rounded w-24" />
      <div className="h-8 w-8 bg-slate-100 rounded-lg" />
    </div>
    <div className="h-7 bg-slate-200 rounded w-16" />
    <div className="h-3 bg-slate-100 rounded w-32" />
  </div>
);
