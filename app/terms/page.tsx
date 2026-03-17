import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BackLink from '@/components/layout/BackLink';

export const metadata = {
  title: '利用規約 | 補助NET',
  description: '補助NETの利用規約です。',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="w-full bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-20 py-8 md:py-12">
            <div className="max-w-[800px] mx-auto">
              <h1 className="text-2xl sm:text-3xl font-normal text-[#101828] tracking-[0.395508px] mb-2">
                利用規約
              </h1>
              <p className="text-sm text-[#6A7282]">
                最終更新日：2025年2月1日
              </p>
            </div>
          </div>
        </section>

        <section className="w-full bg-white">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-20 py-8 md:py-12">
            <div className="max-w-[800px] mx-auto space-y-10 text-[#364153] text-sm leading-relaxed">
              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第1条（適用）</h2>
                <p>
                  本利用規約（以下「本規約」といいます）は、補助NET（以下「本サービス」といいます）の利用条件を定めるものです。登録ユーザーの皆様（以下「ユーザー」といいます）には、本規約に同意いただいた上で、本サービスをご利用いただきます。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第2条（定義）</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>「本サービス」とは、補助金情報の検索・申請支援および専門家とのマッチング等を提供するプラットフォームを指します。</li>
                  <li>「ユーザー」とは、本サービスに登録し、本規約に同意の上で本サービスを利用する法人・個人を指します。</li>
                  <li>「専門家」とは、本サービス上で補助金申請等の支援を行う行政書士等の有資格者を指します。</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第3条（登録）</h2>
                <p>
                  本サービスの利用には、所定の方法による登録が必要です。ユーザーは、真実・正確・最新の情報を登録するものとし、虚偽の申告を行ってはなりません。登録情報に変更が生じた場合は、速やかに当社所定の方法で更新するものとします。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第4条（禁止事項）</h2>
                <p className="mb-3">ユーザーは、本サービスの利用に際し、以下の行為を行ってはなりません。</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>法令または公序良俗に反する行為</li>
                  <li>当社、他のユーザー、専門家または第三者の権利を侵害する行為</li>
                  <li>本サービスの運営を妨害する行為、またはそのおそれのある行為</li>
                  <li>不正アクセス、不正なデータの送受信、改ざん・消去の試み</li>
                  <li>本サービスで得た情報を、本サービスの目的以外に利用する行為</li>
                  <li>その他、当社が不適切と判断する行為</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第5条（本サービスの変更・停止）</h2>
                <p>
                  当社は、ユーザーへの事前の通知なく、本サービスの内容の全部または一部を変更し、または提供を一時的に停止することがあります。これによりユーザーに生じた損害について、当社は原則として責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第6条（免責事項）</h2>
                <p>
                  本サービスに掲載する補助金情報の正確性・完全性・有用性等について、当社は保証しません。補助金の申請・採択の可否は各公募機関の判断によるものであり、本サービスを通じた情報提供・専門家紹介は、結果を保証するものではありません。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第7条（規約の変更）</h2>
                <p>
                  当社は、必要に応じて本規約を変更することがあります。変更後の規約は、本サービス上での掲示その他適切な方法で通知した時点から効力を生じるものとします。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">第8条（準拠法・管轄）</h2>
                <p>
                  本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社本店所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
                </p>
              </section>

              <div className="pt-6 border-t border-[#E5E7EB]">
                <BackLink />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
