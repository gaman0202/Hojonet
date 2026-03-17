'use client';

import { useRouter } from 'next/navigation';

export default function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-[#155DFC] hover:underline text-sm text-left bg-transparent border-none cursor-pointer p-0"
    >
      ← 前のページへ戻る
    </button>
  );
}
