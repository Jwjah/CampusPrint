'use client';
import dynamic from 'next/dynamic';

const PrintStudio = dynamic(() => import('@/components/print-studio/PrintStudio'), {
  ssr: false,
});

export default function PrintStudioPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050510] text-white">
      <PrintStudio />
    </div>
  );
}
