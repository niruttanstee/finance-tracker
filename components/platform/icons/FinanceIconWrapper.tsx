'use client';

export function FinanceIconWrapper() {
  return (
    <div
      className="w-[76px] h-[76px] rounded-[18px] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)',
      }}
    >
      <svg
        className="w-9 h-9 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </div>
  );
}
