'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {ChevronDownIcon } from '@/components/icons';

// Components
import SubsidyCard from './components/SubsidyCard';
// Data
import { industries, institutions, regionOptions, amountOptions } from './data';
import { Subsidy } from './types';

export default function SubsidiesPage() {
  const [subsidyList, setSubsidyList] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);
  // const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('すべて');
  const [selectedAmount, setSelectedAmount] = useState('すべて');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);

  const loadSubsidies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subsidies');
      if (!res.ok) throw new Error('補助金の取得に失敗しました。');
      const data: Subsidy[] = await res.json();
      
      // Client-side filtering
      let filtered = data;
      
      // Region filter
      if (selectedRegion !== 'すべて') {
        filtered = filtered.filter(s => s.location.includes(selectedRegion));
      }
      
      // Amount filter (simplified)
      if (selectedAmount !== 'すべて') {
        // Parse and filter by amount range (first number in amount string, e.g. 最大500万円 → 500)
        if (selectedAmount === '50万円以下') {
          filtered = filtered.filter(s => {
            const match = s.amount.replace(/,/g, '').match(/(\d+)/);
            return match && parseInt(match[1]) <= 50;
          });
        } else if (selectedAmount === '50万円〜200万円') {
          filtered = filtered.filter(s => {
            const match = s.amount.replace(/,/g, '').match(/(\d+)/);
            return match && parseInt(match[1]) >= 50 && parseInt(match[1]) <= 200;
          });
        } else if (selectedAmount === '200万円以上') {
          filtered = filtered.filter(s => {
            const match = s.amount.replace(/,/g, '').match(/(\d+)/);
            return match && parseInt(match[1]) >= 200;
          });
        }
      }

      // 機関 filter (実施機関)
      if (selectedInstitutions.length > 0) {
        filtered = filtered.filter(s =>
          s.implementingOrganization && selectedInstitutions.includes(s.implementingOrganization)
        );
      }

      // 業種 filter (タイトル・概要・対象取組にキーワードが含まれるか。「IT・情報通信」は「IT」「情報通信」のどちらかが含まれればマッチ)
      if (selectedIndustries.length > 0) {
        filtered = filtered.filter(s => {
          const searchStr = [
            s.title,
            s.overview,
            ...(s.eligibleActivities ?? []),
          ].join(' ').toLowerCase();
          return selectedIndustries.some(ind => {
            const parts = ind.split('・').filter(Boolean);
            return parts.some(part => searchStr.includes(part.toLowerCase()));
          });
        });
      }

      setSubsidyList(filtered);
    } catch (error) {
      console.error('Error loading subsidies:', error);
      setSubsidyList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRegion, selectedAmount, selectedIndustries, selectedInstitutions]);

  useEffect(() => {
    loadSubsidies();
  }, [loadSubsidies]);
  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  };

  const toggleInstitution = (institution: string) => {
    setSelectedInstitutions((prev) =>
      prev.includes(institution) ? prev.filter((i) => i !== institution) : [...prev, institution]
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Search Header Section */}
        <section className="w-full bg-white border-b border-[#E5E7EB]">
          <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-8 lg:px-20 py-3 sm:py-4 md:py-6 min-h-[100px] sm:min-h-[120px] md:min-h-[154px] flex flex-col justify-center items-center">
            <div className="w-full max-w-[880px] flex flex-col items-center gap-2.5 sm:gap-3 md:gap-4">
              <div className="w-full flex flex-row justify-center items-start">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[30px] font-normal text-[#101828] leading-6 sm:leading-7 md:leading-8 lg:leading-9 tracking-[0.395508px] text-center px-2">
                  補助金目録
                </h1>
              </div>
            
              {/* 検索機能（テキストボックス）はフェーズ1では非表示 */}
              {/*
              <div className="relative w-full h-[40px] sm:h-[44px] md:h-[50px]">
                <img
                  src="/icons/searchnoback.svg"
                  alt="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 bg-transparent p-0 rounded-none"
                />
                <input
                  type="text"
                  placeholder="補助金を検索..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full h-full pl-12 sm:pl-14 md:pl-14 pr-2.5 sm:pr-3 md:pr-4 py-2 sm:py-2.5 md:py-3 border border-[#D1D5DC] rounded-[10px] text-xs sm:text-sm md:text-base text-[rgba(10,10,10,0.5)] leading-[16px] sm:leading-[17px] md:leading-[19px] tracking-[-0.3125px] focus:outline-none focus:ring-2 focus:ring-[#155DFC]"
                />
              </div>
              */}
            </div>
          </div>
        </section>

        {/* Main Content Section */}
        <section className="w-full bg-[#F9FAFB]">
          <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-8 lg:px-20 py-3 sm:py-4 md:py-6">
            <div className="w-full flex flex-col lg:flex-row items-start gap-3 sm:gap-4 md:gap-6 max-w-[1280px] mx-auto">
              {/* Left Sidebar - Filters */}
              <aside className="w-full lg:w-[320px] flex-shrink-0 bg-white border border-[#E5E7EB] rounded-[14px] p-3 sm:p-4 md:p-6">
                <h2 className="text-base sm:text-base md:text-lg font-medium text-[#101828] leading-5 sm:leading-6 md:leading-7 tracking-[-0.439px] mb-3 sm:mb-4 md:mb-6">
                  絞り込み検索
                </h2>

                <div className="flex flex-col gap-6">
                  {/* Region Filter */}
                  <div className="flex flex-col items-start gap-1 sm:gap-1.5 md:gap-2">
                    <label className="text-xs sm:text-xs md:text-sm text-[#364153] leading-3 sm:leading-4 md:leading-5 tracking-[-0.15px]">
                      地域を選択
                    </label>
                    <div className="relative w-full">
                      <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="w-full h-[32px] sm:h-[36px] md:h-[36.5px] pl-2 sm:pl-2.5 pr-7 sm:pr-8 py-1.5 sm:py-2 bg-white border border-[#D1D5DC] rounded-[10px] text-xs sm:text-xs md:text-sm text-[#364153] leading-3 sm:leading-4 md:leading-5 tracking-[-0.15px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#155DFC]"
                      >
                        {regionOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon size={12} color="#364153" className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Amount Filter */}
                  <div className="flex flex-col items-start gap-1 sm:gap-1.5 md:gap-2">
                    <label className="text-xs sm:text-xs md:text-sm text-[#364153] leading-3 sm:leading-4 md:leading-5 tracking-[-0.15px]">
                      金額で絞る
                    </label>
                    <div className="relative w-full">
                      <select
                        value={selectedAmount}
                        onChange={(e) => setSelectedAmount(e.target.value)}
                        className="w-full h-[32px] sm:h-[36px] md:h-[36.5px] pl-2 sm:pl-2.5 pr-7 sm:pr-8 py-1.5 sm:py-2 bg-white border border-[#D1D5DC] rounded-[10px] text-xs sm:text-xs md:text-sm text-[#364153] leading-3 sm:leading-4 md:leading-5 tracking-[-0.15px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#155DFC]"
                      >
                        {amountOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon size={12} color="#364153" className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Industry Filter */}
                  <div className="flex flex-col items-start gap-1.5 sm:gap-2 md:gap-3">
                    <label className="text-xs sm:text-xs md:text-sm text-[#364153] leading-3 sm:leading-4 md:leading-5 tracking-[-0.15px]">
                      業種を選択
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-1.5 md:gap-2 w-full">
                      {industries.map((industry) => (
                        <label key={industry} className="flex flex-row items-center gap-2 sm:gap-2 cursor-pointer py-1.5 sm:py-0.5">
                          <input
                            type="checkbox"
                            checked={selectedIndustries.includes(industry)}
                            onChange={() => toggleIndustry(industry)}
                            className="w-5 h-5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 border border-[#D1D5DC] rounded cursor-pointer flex-shrink-0"
                          />
                          <span className="text-[10px] sm:text-xs md:text-sm text-[#364153] leading-4 sm:leading-4 md:leading-5 tracking-[-0.15px]">
                            {industry}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Institution Filter */}
                  <div className="flex flex-col items-start gap-1.5 sm:gap-2 md:gap-3">
                    <label className="text-xs sm:text-xs md:text-sm text-[#364153] leading-3 sm:leading-4 md:leading-5 tracking-[-0.15px]">
                      機関を選択
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-1.5 md:gap-2 w-full">
                      {institutions.map((institution) => (
                        <label key={institution} className="flex flex-row items-center gap-2 sm:gap-2 cursor-pointer py-1.5 sm:py-0.5">
                          <input
                            type="checkbox"
                            checked={selectedInstitutions.includes(institution)}
                            onChange={() => toggleInstitution(institution)}
                            className="w-5 h-5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 border border-[#D1D5DC] rounded cursor-pointer flex-shrink-0"
                          />
                          <span className="text-[10px] sm:text-xs md:text-sm text-[#364153] leading-4 sm:leading-4 md:leading-5 tracking-[-0.15px]">
                            {institution}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              {/* Right Content - Subsidy Cards */}
              <div className="flex-1 w-full min-w-0 lg:w-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#155DFC]"></div>
                    <p className="mt-4 text-[#4A5565]">読み込み中...</p>
                  </div>
                ) : subsidyList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-[14px] border border-[#E5E7EB]">
                    <p className="text-[#4A5565]">該当する補助金が見つかりませんでした</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                    {subsidyList.map((subsidy) => (
                      <SubsidyCard key={subsidy.id} subsidy={subsidy} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
