import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowRightIcon,  DocumentIcon, CheckCircleIcon, HumansIcon, RealTimeChatIcon } from '@/components/icons';

// Components
import HomeSubsidyList from './components/HomeSubsidyList';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full bg-[linear-gradient(135deg,#155DFC_0%,#193CB8_100%)]">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-[30.5px] py-12 sm:py-16 lg:py-0 min-h-[400px] sm:min-h-[450px] lg:h-[468px] flex flex-col items-center justify-center gap-6 sm:gap-8 lg:gap-0 relative">
            {/* Title and Subtitle Container */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 w-full lg:w-[1232px] lg:h-[92px] lg:absolute lg:top-16 lg:left-1/2 lg:-translate-x-1/2 px-4">
              {/* Title */}
              <h1 className="w-full lg:w-[1232px] text-center text-2xl sm:text-3xl md:text-4xl lg:text-[48px] font-medium text-white leading-tight sm:leading-[48px] tracking-[0.351562px]">
                補助金申請、もっと簡単に
              </h1>

              {/* Subtitle */}
              <p className="w-full lg:w-[1232px] text-center text-sm sm:text-base lg:text-[20px] font-normal text-[#DBEAFE] leading-6 sm:leading-7 lg:leading-[28px] tracking-[-0.449px]">
                専門行政書士と一緒に進めるスマート補助金プラットフォーム
              </p>
            </div>

            {/* Cards Container */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-6 w-full max-w-[900px] lg:w-[896px] lg:h-[200px] lg:absolute lg:top-[204px] lg:left-1/2 lg:-translate-x-1/2 px-4 sm:px-0">
              {/* Search Card */}
              <Link
                href="/subsidies"
                className="flex flex-col items-start w-full sm:w-[436px] h-auto sm:h-[200px] bg-white rounded-2xl pt-6 sm:pt-8 px-6 sm:px-8 pb-6 sm:pb-0 gap-4 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] hover:shadow-[0px_25px_30px_-5px_rgba(0,0,0,0.15),0px_10px_12px_-6px_rgba(0,0,0,0.15)] transition-shadow"
              >
                {/* Icon and Text Container */}
                <div className="flex flex-row justify-between items-start w-full sm:w-[372px] h-auto sm:h-14 gap-4 sm:gap-[292px]">
                  {/* Icon Circle */}
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] bg-[#DBEAFE] flex-shrink-0">
                    <Image src="/icons/search.svg" alt="Search" width={44} height={44} className="w-11 h-11" />
                  </div>

                  {/* Arrow Icon */}
                  <ArrowRightIcon size={20} color="#99A1AF" className="flex-shrink-0" />
                </div>

                {/* Text Container */}
                <div className="flex flex-col gap-0 w-full sm:w-[372px]">
                  {/* Title */}
                  <h3 className="w-full sm:w-[372px] h-auto sm:h-8 text-lg sm:text-xl lg:text-[24px] font-medium text-[#101828] leading-7 sm:leading-8 lg:leading-[32px] tracking-[0.07px]">
                    補助金目録
                  </h3>

                  {/* Subtitle */}
                  <p className="w-full sm:w-[372px] h-auto sm:h-6 text-sm sm:text-base font-normal text-[#4A5565] leading-5 sm:leading-6 tracking-[-0.3125px]">
                    自分に合った補助金を探してみましょう
                  </p>
                </div>
              </Link>

              {/* Dashboard Card */}
              <Link
                href="/dashboard"
                className="flex flex-col items-start w-full sm:w-[436px] h-auto sm:h-[200px] bg-white rounded-2xl pt-6 sm:pt-8 px-6 sm:px-8 pb-6 sm:pb-0 gap-4 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] hover:shadow-[0px_25px_30px_-5px_rgba(0,0,0,0.15),0px_10px_12px_-6px_rgba(0,0,0,0.15)] transition-shadow"
              >
                {/* Icon and Text Container */}
                <div className="flex flex-row justify-between items-start w-full sm:w-[372px] h-auto sm:h-14 gap-4 sm:gap-[292px]">
                  {/* Icon Circle */}
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] bg-[#F3E8FF] flex-shrink-0">
                    <Image src="/icons/dashboard.svg" alt="Dashboard" width={44} height={44} className="w-11 h-11" />
                  </div>

                  {/* Arrow Icon */}
                  <ArrowRightIcon size={20} color="#99A1AF" className="flex-shrink-0" />
                </div>

                {/* Text Container */}
                <div className="flex flex-col gap-0 w-full sm:w-[372px]">
                  {/* Title */}
                  <h3 className="w-full sm:w-[372px] h-auto sm:h-8 text-lg sm:text-xl lg:text-[24px] font-medium text-[#101828] leading-7 sm:leading-8 lg:leading-[32px] tracking-[0.07px]">
                    マイダッシュボード
                  </h3>

                  {/* Subtitle */}
                  <p className="w-full sm:w-[372px] h-auto sm:h-6 text-sm sm:text-base font-normal text-[#4A5565] leading-5 sm:leading-6 tracking-[-0.3125px]">
                    進行中の案件を確認しましょう
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Expert Section */}
        <section className="w-full bg-white">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-6 pt-12 sm:pt-16 lg:pt-20 pb-0 flex flex-col items-start gap-8 sm:gap-12 lg:gap-16">
            {/* Title and Subtitle Container */}
            <div className="flex flex-col items-start gap-3 sm:gap-4 w-full">
              {/* Title */}
              <h2 className="w-full text-center text-2xl sm:text-3xl lg:text-[36px] font-medium text-[#101828] leading-8 sm:leading-9 lg:leading-[40px] tracking-[0.369px] px-4">
                専門家と一緒に安心申請
              </h2>

              {/* Subtitle */}
              <p className="w-full text-center text-base sm:text-lg lg:text-[20px] font-normal text-[#4A5565] leading-6 sm:leading-7 lg:leading-[28px] tracking-[-0.449px] px-4">
                複雑な補助金申請、専門家が最初から最後までサポートします
              </p>
            </div>

            {/* Cards Container - 카드 간격 24px */}
            <div className="w-full flex flex-wrap justify-center gap-[24px]">
              {/* Card 1: 専門相談 */}
              <div className="flex flex-col items-center w-full sm:w-[290px] h-auto sm:h-[224px] bg-white border border-[#E5E7EB] rounded-[14px] py-6 sm:py-7 px-6 sm:px-[72px] gap-3">
                {/* Icon Circle */}
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#DBEAFE]">
                  <HumansIcon size={32} color="#155DFC" />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-[18px] font-medium text-[#101828] leading-[140%] tracking-[-0.439px] text-center">
                  専門相談
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm font-normal text-[#4A5565] leading-4 sm:leading-5 tracking-[-0.15px] text-center">
                  補助金専門行政書士の<br />1:1カスタム相談
                </p>
              </div>

              {/* Card 2: 書類作成支援 */}
              <div className="flex flex-col items-center w-full sm:w-[290px] h-auto sm:h-[224px] bg-white border border-[#E5E7EB] rounded-[14px] py-6 sm:py-7 px-6 sm:px-[25px] gap-3">
                {/* Icon Circle */}
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#F3E8FF]">
                  <DocumentIcon size={28} color="#9810FA" />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-[18px] font-medium text-[#101828] leading-[140%] tracking-[-0.439px] text-center">
                  書類作成支援
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm font-normal text-[#4A5565] leading-4 sm:leading-5 tracking-[-0.15px] text-center">
                  複雑な事業計画書と<br />申請書作成代行
                </p>
              </div>

              {/* Card 3: リアルタイムコミュニケーション */}
              <div className="flex flex-col items-center w-full sm:w-[290px] h-auto sm:h-[224px] bg-white border border-[#E5E7EB] rounded-[14px] py-6 sm:py-7 px-6 sm:px-[25px] gap-2">
                {/* Icon Circle */}
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#DCFCE7]">
                  <RealTimeChatIcon size={32} color="#00A63E" />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-[18px] font-medium text-[#101828] leading-[140%] tracking-[-0.439px] text-center">
                  リアルタイム<br />コミュニケーション
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm font-normal text-[#4A5565] leading-4 sm:leading-5 tracking-[-0.15px] text-center">
                  プラットフォームメッセージと<br />LINEでいつでも連絡
                </p>
              </div>

              {/* Card 4: 採択率向上 */}
              <div className="flex flex-col items-center w-full sm:w-[290px] h-auto sm:h-[224px] bg-white border border-[#E5E7EB] rounded-[14px] py-6 sm:py-7 px-6 sm:px-[25px] gap-3">
                {/* Icon Circle */}
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFEDD4]">
                  <CheckCircleIcon size={28} color="#F54900" />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-[18px] font-medium text-[#101828] leading-[140%] tracking-[-0.439px] text-center">
                  採択率向上
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm font-normal text-[#4A5565] leading-4 sm:leading-5 tracking-[-0.15px] text-center">
                  専門家のレビューで<br />高い承認成功率
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subsidy List Section - API 募集中のみ表示 */}
        <HomeSubsidyList />
      </main>

      <Footer />
    </div>
  );
}
