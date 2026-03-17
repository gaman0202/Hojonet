'use client';

import { useState, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { ArrowLeftIcon, ArrowRightIcon, SaveIcon, ChevronDownIcon } from '@/components/icons';
import { createClient } from '@/utils/supabase/client';

// Types
interface HearingFormData {
  companyName: string;
  prefecture: string;
  businessDescription: string;
  employeeCount: string;
  sales: string;
  needsSupport: 'yes' | 'no' | '';
  supportTypes: string[];
  /** 行政書士支援の種類（4つから1つ選択） */
  supportType: string;
}

// Data
const PREFECTURE_OPTIONS = [
  '選択してください',
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const EMPLOYEE_COUNT_OPTIONS = [
  '選択してください',
  '1〜5名',
  '6〜10名',
  '11〜20名',
  '21〜50名',
  '51〜100名',
  '101名以上',
];

const SUPPORT_TYPE_OPTIONS = [
  '事業計画書の作成',
  '申請書類の作成',
  '全体的なサポート',
  '相談のみ',
];

interface SubsidyInfo {
  title: string;
  region: string;
  formTitle: string;
  amount: string;
}

export default function HearingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const expertIdFromUrl = searchParams.get('expertId'); // 補助金詳細で「この専門家に相談する」で選んだ専門家
  const [storedExpertId, setStoredExpertId] = useState<string | null>(null);
  const selectedExpertId = expertIdFromUrl?.trim() || storedExpertId;
  const [selectedExpertName, setSelectedExpertName] = useState<string | null>(null);

  useEffect(() => {
    if (expertIdFromUrl?.trim()) {
      try {
        sessionStorage.setItem(`hearing_expertId_${id}`, expertIdFromUrl.trim());
        setStoredExpertId(expertIdFromUrl.trim());
      } catch {
        setStoredExpertId(expertIdFromUrl.trim());
      }
    } else {
      try {
        const saved = sessionStorage.getItem(`hearing_expertId_${id}`);
        if (saved) setStoredExpertId(saved);
      } catch {
        // ignore
      }
    }
  }, [id, expertIdFromUrl]);

  // 選択された専門家の名前を取得（表示・submitで同じ専門家が担当者になる）
  useEffect(() => {
    if (!selectedExpertId?.trim()) {
      setSelectedExpertName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', selectedExpertId.trim())
        .maybeSingle();
      if (!cancelled && data?.full_name) setSelectedExpertName(data.full_name);
      else if (!cancelled) setSelectedExpertName(null);
    })();
    return () => { cancelled = true; };
  }, [selectedExpertId]);

  const [subsidyInfo, setSubsidyInfo] = useState<SubsidyInfo>({
    title: '補助金ヒアリング',
    region: '',
    formTitle: 'ヒアリングフォーム',
    amount: '',
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileMissing, setIsProfileMissing] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const DRAFT_KEY = `hearing_draft_${id}`;

  const [formData, setFormData] = useState<HearingFormData>({
    companyName: '',
    prefecture: '',
    businessDescription: '',
    employeeCount: '',
    sales: '',
    needsSupport: '',
    supportTypes: [],
    supportType: '',
  });

  // Fetch subsidy info and check auth
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      // Debug: Check Supabase connection
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Check auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session check:', { session: !!session, sessionError, userId: session?.user?.id });
      
      if (!session) {
        router.push(`/login?redirect=/hearing/${id}`);
        return;
      }
      setUserId(session.user.id);

      // Fetch subsidy info (id를 숫자로 변환)
      const subsidyId = parseInt(id, 10);
      console.log('Fetching subsidy with ID:', subsidyId, 'from string:', id);
      
      if (isNaN(subsidyId)) {
        setError('無効な補助金IDです。');
        return;
      }
      
      const { data: subsidy, error: subsidyError, status, statusText } = await supabase
        .from('subsidies')
        .select(`*, m_regions(name)`)
        .eq('id', subsidyId)
        .single();

      console.log('Subsidy query result:', { 
        subsidy, 
        subsidyError, 
        status, 
        statusText,
        hasData: !!subsidy 
      });

      if (subsidyError || !subsidy) {
        console.error('Subsidy not found - Full error:', JSON.stringify(subsidyError, null, 2));
        setError(`補助金ID ${id} が見つかりません。補助金一覧から選択してください。`);
        return;
      }

      setSubsidyInfo({
        title: subsidy.title,
        region: subsidy.m_regions?.name || '全国',
        formTitle: `${subsidy.title}ヒアリングフォーム`,
        amount: subsidy.amount_description || '',
      });

      // localStorage から下書きを復元
      try {
        const saved = localStorage.getItem(`hearing_draft_${id}`);
        if (saved) {
          const parsed = JSON.parse(saved) as HearingFormData;
          setFormData(parsed);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 4000);
        }
      } catch {
        // 無視
      }
    }
    loadData();
  }, [id, router]);

  // Calculate progress based on filled fields
  const calculateProgress = () => {
    let filled = 0;
    const total = 6;
    if (formData.companyName) filled++;
    if (formData.prefecture && formData.prefecture !== '選択してください') filled++;
    if (formData.businessDescription) filled++;
    if (formData.employeeCount && formData.employeeCount !== '選択してください') filled++;
    if (formData.sales) filled++;
    if (formData.supportType) filled++;
    return Math.round((filled / total) * 100);
  };

  const progress = calculateProgress();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupportTypeRadio = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      supportType: type,
      needsSupport: type ? 'yes' : '',
      supportTypes: type ? [type] : [],
    }));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch {
      // localStorage が使えない環境では無視
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      router.push(`/login?redirect=/hearing/${id}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setIsProfileMissing(false);

    try {
      const subsidyId = parseInt(id, 10);
      if (isNaN(subsidyId)) {
        throw new Error('無効な補助金IDです。');
      }

      const res = await fetch('/api/hearing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subsidyId,
          expertId: selectedExpertId?.trim() || null,
          formData: {
            companyName: formData.companyName,
            prefecture: formData.prefecture,
            businessDescription: formData.businessDescription,
            employeeCount: formData.employeeCount,
            sales: formData.sales,
            needsSupport: formData.supportType ? 'yes' : formData.needsSupport,
            supportTypes: formData.supportType ? [formData.supportType] : formData.supportTypes,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error_code === 'profile_missing') {
          setIsProfileMissing(true);
          setError(data.error || 'プロフィール情報の登録が必要です。');
          return;
        }
        throw new Error(data.error || '案件の作成に失敗しました。');
      }

      const caseId = data.caseId;
      if (caseId) {
        localStorage.setItem(`hearing_data_${caseId}`, JSON.stringify({
          ...formData,
          submittedAt: new Date().toISOString(),
        }));
        // 提出完了後は下書きを削除
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* 無視 */ }
        window.location.href = `/dashboard/cases/${caseId}`;
      } else {
        throw new Error('案件IDが返されませんでした。');
      }
    } catch (err) {
      console.error('Error creating case:', err);
      setError(err instanceof Error ? err.message : '案件の作成に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <section className="w-full bg-white border-b border-black sm:border-[#E5E7EB] sticky top-0 z-10 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-[327.5px]">
            <div className="w-full max-w-[785px] mx-auto flex flex-col gap-2 sm:gap-3 py-3 sm:py-4">
              {/* Top Row: Back and Save */}
              <div className="flex flex-row justify-between items-center">
                <button
                  onClick={() => router.back()}
                  className="flex flex-row items-center gap-2 sm:gap-2 hover:opacity-70 transition-opacity"
                >
                  <ArrowLeftIcon size={16} color="#4A5565" className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline text-base text-[#4A5565] leading-6 tracking-[-0.3125px]">戻る</span>
                </button>

                <button
                  onClick={handleSaveDraft}
                  className="flex flex-row items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-0 h-[29px] sm:h-[42px] border border-[#D1D5DC] rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
                >
                  <SaveIcon size={14} color="#364153" className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-base text-[#364153] leading-4 sm:leading-6 tracking-[-0.3125px]">一時保存</span>
                </button>
              </div>

              {/* Title and Progress */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex flex-row justify-between items-center">
                  <h1 className="text-[11px] sm:text-sm text-[#4A5565] leading-4 sm:leading-5 tracking-[-0.086px] sm:tracking-[-0.15px]">
                    {subsidyInfo.formTitle}
                  </h1>
                  <span className="text-[11px] sm:text-sm text-[#4A5565] leading-4 sm:leading-5 tracking-[-0.086px] sm:tracking-[-0.15px]">{progress}% 完了</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 sm:h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#155DFC] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="flex-1 bg-[#F9FAFB] pb-24">
          <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-[327.5px] py-6">
            <div className="w-full max-w-[785px] mx-auto flex flex-col gap-4">
              {/* Draft Restored Banner */}
              {draftRestored && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-blue-600">前回の入力内容を復元しました。</p>
                </div>
              )}

              {/* Draft Saved Toast */}
              {draftSaved && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs sm:text-sm text-green-600">一時保存しました。</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className={`flex flex-col items-center px-4 sm:px-6 py-3 sm:py-4 border rounded-xl gap-2 sm:gap-3 ${isProfileMissing ? 'bg-amber-50 border-amber-300' : 'bg-red-100 border-red-300'}`}>
                  <p className={`text-[11px] sm:text-sm leading-[15px] sm:leading-5 tracking-[-0.086px] sm:tracking-[-0.15px] text-center ${isProfileMissing ? 'text-amber-700' : 'text-red-600'}`}>
                    {error}
                  </p>
                  {isProfileMissing && (
                    <a
                      href={`/dashboard/profile/edit?redirect=/hearing/${id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#155DFC] hover:bg-[#1248C4] text-white text-xs sm:text-sm rounded-lg transition-colors"
                    >
                      プロフィールを登録する
                    </a>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="flex flex-col sm:flex-row justify-center items-center px-3 sm:px-6 py-2.5 sm:py-[9px] bg-[#E5E7EB] rounded-xl sm:rounded-full gap-1 sm:gap-0">
                <p className="text-[11px] sm:text-sm text-[#364153] leading-[15px] sm:leading-5 tracking-[-0.086px] sm:tracking-[-0.15px] text-center">
                  {subsidyInfo.region}：「{subsidyInfo.title}」申請のためのヒアリングを開始します。担当者が作成した質問に順番にお答えください。
                  {selectedExpertName && (
                    <span className="block sm:inline mt-1 sm:mt-0 sm:ml-1 font-medium text-[#101828]">
                      担当者：{selectedExpertName}
                    </span>
                  )}
                </p>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Company Name */}
                <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-3 sm:p-4 pl-4 sm:pl-[34px] isolate">
                  <div className="absolute left-0 top-0 w-1.5 sm:w-[10px] h-full bg-[#155DFC] rounded-l-xl z-10"></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="flex flex-row items-center gap-1">
                      <span className="text-[13px] sm:text-base text-[#101828] leading-6 tracking-[-0.389px] sm:tracking-[-0.3125px]">会社名</span>
                      <span className="text-[13px] sm:text-base text-[#E7000B] leading-6">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="会社名"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full h-10 sm:h-[50px] px-3 sm:px-4 py-2 sm:py-3 border border-[#D1D5DC] rounded-[10px] text-[13px] sm:text-base text-[#101828] font-medium leading-4 sm:leading-[19px] tracking-[-0.389px] sm:tracking-[-0.3125px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] placeholder:text-[#9CA3AF] placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Prefecture */}
                <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-3 sm:p-4 pl-4 sm:pl-[34px] isolate">
                  <div className="absolute left-0 top-0 w-1.5 sm:w-[10px] h-full bg-[#155DFC] rounded-l-xl z-10"></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="flex flex-row items-center gap-1">
                      <span className="text-[13px] sm:text-base text-[#101828] leading-6 tracking-[-0.389px] sm:tracking-[-0.3125px]">事業所の所在地（都道府県）</span>
                      <span className="text-[13px] sm:text-base text-[#E7000B] leading-6">*</span>
                    </label>
                    <div className="relative w-full">
                      <select
                        value={formData.prefecture}
                        onChange={(e) => handleInputChange('prefecture', e.target.value)}
                        className="w-full h-10 sm:h-[47px] pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-3 bg-white border border-[#D1D5DC] rounded-[10px] text-[13px] sm:text-base text-[#101828] font-medium leading-5 sm:leading-[19px] tracking-[-0.389px] sm:tracking-[-0.3125px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#155DFC]"
                      >
                        {PREFECTURE_OPTIONS.map((option) => (
                          <option key={option} value={option === '選択してください' ? '' : option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon size={16} color="#4A5565" className="sm:w-5 sm:h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Description */}
                <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-3 sm:p-4 pl-4 sm:pl-[34px] isolate">
                  <div className="absolute left-0 top-0 w-1.5 sm:w-[10px] h-full bg-[#155DFC] rounded-l-xl z-10"></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="flex flex-row items-center gap-1">
                      <span className="text-[13px] sm:text-base text-[#101828] leading-6 tracking-[-0.389px] sm:tracking-[-0.3125px]">現在の主要事業内容を簡単にご説明ください。</span>
                      <span className="text-[13px] sm:text-base text-[#E7000B] leading-6">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="事業内容"
                      value={formData.businessDescription}
                      onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                      className="w-full h-10 sm:h-[50px] px-3 sm:px-4 py-2 sm:py-3 border border-[#D1D5DC] rounded-[10px] text-[13px] sm:text-base text-[#101828] font-medium leading-4 sm:leading-[19px] tracking-[-0.389px] sm:tracking-[-0.3125px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] placeholder:text-[#9CA3AF] placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Employee Count */}
                <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-3 sm:p-4 pl-4 sm:pl-[34px] isolate">
                  <div className="absolute left-0 top-0 w-1.5 sm:w-[10px] h-full bg-[#155DFC] rounded-l-xl z-10"></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="flex flex-row items-center gap-1">
                      <span className="text-[13px] sm:text-base text-[#101828] leading-6 tracking-[-0.389px] sm:tracking-[-0.3125px]">従業員数</span>
                      <span className="text-[13px] sm:text-base text-[#E7000B] leading-6">*</span>
                    </label>
                    <div className="relative w-full">
                      <select
                        value={formData.employeeCount}
                        onChange={(e) => handleInputChange('employeeCount', e.target.value)}
                        className="w-full h-10 sm:h-[47px] pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-3 bg-white border border-[#D1D5DC] rounded-[10px] text-[13px] sm:text-base text-[#101828] font-medium leading-5 sm:leading-[19px] tracking-[-0.389px] sm:tracking-[-0.3125px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#155DFC]"
                      >
                        {EMPLOYEE_COUNT_OPTIONS.map((option) => (
                          <option key={option} value={option === '選択してください' ? '' : option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon size={16} color="#4A5565" className="sm:w-5 sm:h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales */}
                <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-3 sm:p-4 pl-4 sm:pl-[34px] isolate">
                  <div className="absolute left-0 top-0 w-1.5 sm:w-[10px] h-full bg-[#155DFC] rounded-l-xl z-10"></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="flex flex-row items-center gap-1">
                      <span className="text-[13px] sm:text-base text-[#101828] leading-6 tracking-[-0.389px] sm:tracking-[-0.3125px]">決算年度の売上高（概算で結構です）</span>
                      <span className="text-[13px] sm:text-base text-[#E7000B] leading-6">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="100,000"
                      value={formData.sales}
                      onChange={(e) => handleInputChange('sales', e.target.value)}
                      className="w-full h-10 sm:h-[50px] px-3 sm:px-4 py-2 sm:py-3 border border-[#D1D5DC] rounded-[10px] text-[13px] sm:text-base text-[#101828] font-medium leading-4 sm:leading-[19px] tracking-[-0.389px] sm:tracking-[-0.3125px] focus:outline-none focus:ring-2 focus:ring-[#155DFC] placeholder:text-[#9CA3AF] placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* 行政書士からの支援を希望されますか？（4つから1つ選択） */}
                <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-3 sm:p-4 pl-4 sm:pl-[34px] isolate">
                  <div className="absolute left-0 top-0 w-1.5 sm:w-[10px] h-full bg-[#155DFC] rounded-l-xl z-10"></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="flex flex-row items-center gap-1">
                      <span className="text-[13px] sm:text-base text-[#101828] leading-6 tracking-[-0.389px] sm:tracking-[-0.3125px]">行政書士からの支援を希望されますか？</span>
                      <span className="text-[13px] sm:text-base text-[#E7000B] leading-6">*</span>
                    </label>
                    <div className="flex flex-row flex-wrap items-start gap-x-6 gap-y-3 sm:gap-x-10 sm:gap-y-3">
                      {SUPPORT_TYPE_OPTIONS.map((type) => (
                        <label key={type} className="flex flex-row items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="supportType"
                            value={type}
                            checked={formData.supportType === type}
                            onChange={() => handleSupportTypeRadio(type)}
                            className="w-4 h-4 sm:w-5 sm:h-5 border border-[#D1D5DC] rounded-full cursor-pointer"
                          />
                          <span className="text-[13px] sm:text-base text-[#101828] leading-5 sm:leading-[19px] tracking-[-0.389px] sm:tracking-[-0.3125px]">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Button Bar */}
        <section className="w-full bg-white border-t border-[#E5E7EB] shadow-[0px_0px_54px_rgba(0,0,0,0.16)] fixed bottom-0 left-0 right-0 z-10">
          <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-8 lg:px-12 py-4 sm:py-6">
            <div className="w-full max-w-[785px] mx-auto flex flex-row justify-between items-center gap-6 sm:gap-10">
              <button
                onClick={() => router.back()}
                className="flex flex-row items-center gap-1.5 px-4 py-2 h-[42px] border border-[#D1D5DC] rounded-lg hover:bg-[#F3F4F6] transition-colors"
              >
                <ArrowLeftIcon size={16} color="#4A5565" className="sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base text-[#4A5565] leading-6 tracking-[-0.3125px]">戻る</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || progress < 100}
                className={`flex flex-row items-center gap-1.5 px-4 py-2 h-[42px] rounded-lg transition-colors ${
                  submitting || progress < 100
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#155DFC] hover:bg-[#1248C4]'
                }`}
              >
                <span className="text-sm sm:text-base text-white leading-6 tracking-[-0.3125px]">
                  {submitting ? '送信中...' : '提出'}
                </span>
                {!submitting && <ArrowRightIcon size={16} color="#FFFFFF" className="sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
