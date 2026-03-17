import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#101828]">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col items-center gap-4 px-6 py-6 sm:py-12 md:py-20">
        {/* Links */}
        <div className="w-full flex flex-row justify-center items-center gap-6 sm:gap-12">
          <Link
            href="/terms"
            className="text-sm text-[#99A1AF] leading-5 tracking-[-0.15px] hover:text-white transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-[#99A1AF] leading-5 tracking-[-0.15px] hover:text-white transition-colors"
          >
            プライバシーポリシー
          </Link>
        </div>

        {/* Copyright */}
        <div className="w-full flex flex-row justify-center items-center">
          <p className="text-xs sm:text-sm text-[#99A1AF] leading-5 sm:leading-6 tracking-[-0.15px] sm:tracking-[-0.3125px] text-center">
            © 2025 補助NET. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
