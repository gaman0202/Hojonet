import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BackLink from '@/components/layout/BackLink';

export const metadata = {
  title: 'プライバシーポリシー | 補助NET',
  description: '補助NETのプライバシーポリシーです。',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="w-full bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-20 py-8 md:py-12">
            <div className="max-w-[800px] mx-auto">
              <h1 className="text-2xl sm:text-3xl font-normal text-[#101828] tracking-[0.395508px] mb-2">
                プライバシーポリシー
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
                <p>
                  補助NET（以下「本サービス」といいます）を運営する当社は、ユーザーの個人情報の保護を重要な責務と認識し、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定め、これを遵守します。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">1. 収集する情報</h2>
                <p className="mb-3">当社は、本サービスの提供にあたり、以下の情報を収集することがあります。</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>識別情報</strong>：氏名、メールアドレス、電話番号、住所等、ご登録いただく情報</li>
                  <li><strong>法人情報</strong>：会社名、事業内容、従業員数、業種等（企業・団体としてご利用の場合）</li>
                  <li><strong>利用情報</strong>：ログイン履歴、補助金の検索・閲覧履歴、申請に関するやりとり、専門家とのメッセージ等</li>
                  <li><strong>技術情報</strong>：IPアドレス、ブラウザ種類、端末情報、Cookie等（サービスの改善・セキュリティのため）</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">2. 利用目的</h2>
                <p className="mb-3">収集した情報は、以下の目的で利用します。</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>本サービスの提供、維持、改善</li>
                  <li>補助金情報のご案内、専門家とのマッチング・紹介</li>
                  <li>お問い合わせへの対応、重要なお知らせの送信</li>
                  <li>利用規約に違反する行為への対応、不正利用の防止</li>
                  <li>統計・分析によるサービス品質の向上（個人を特定しない形式での利用を含む）</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">3. 第三者への提供</h2>
                <p>
                  当社は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。ただし、本サービスの運営上、専門家（行政書士等）への案件情報の共有、クラウドサービス・決済代行等の業務委託先への預託は、本サービスの提供に必要な範囲で行うことがあります。この場合、当社は当該委託先に対し、適切な監督を行います。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">4.  Cookie・類似技術</h2>
                <p>
                  本サービスでは、利便性の向上やアクセス解析のため、Cookieおよびこれに類する技術を使用することがあります。ブラウザの設定によりCookieを無効にすることも可能ですが、その場合、一部の機能が利用できなくなる場合があります。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">5. 保存期間</h2>
                <p>
                  個人情報は、利用目的の達成に必要な期間、または法令で定められた期間保存します。アカウント削除後も、取引記録の保存等、法令に基づき必要な範囲で一定期間保存することがあります。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">6. セキュリティ</h2>
                <p>
                  個人情報の漏えい、滅失、毀損を防ぐため、アクセス制限、暗号化、従業員教育等の合理的なセキュリティ対策を講じます。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">7. 開示・訂正・削除等</h2>
                <p>
                  ユーザーご本人から、ご自身の個人情報の開示、訂正、削除、利用停止等を求められた場合、ご本人確認の上、法令に従って対応します。お問い合わせは、本サービス内のお問い合わせ窓口または当社が別途定める方法で受け付けます。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">8. 本ポリシーの変更</h2>
                <p>
                  当社は、必要に応じて本ポリシーを変更することがあります。重要な変更がある場合は、本サービス上での掲示、メール通知等の方法でお知らせします。変更後の利用により、変更に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-base font-medium text-[#101828] mb-3">9. お問い合わせ</h2>
                <p>
                  本ポリシーおよび個人情報の取扱いに関するお問い合わせは、本サービス内のお問い合わせフォーム、または当社が指定する連絡先までご連絡ください。
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
