'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { BarChartIcon, BuildingIcon, LocationIcon, DocumentIcon, LogOutIcon } from '@/components/icons';
import { MasterTable, type MasterRow } from './MasterTable';

interface Stats {
  subsidiesCount: number;
  casesCount: number;
  expertGroupsCount: number;
  customerGroupsCount: number;
  regionsCount: number;
  institutionsCount: number;
  industriesCount: number;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [regions, setRegions] = useState<MasterRow[]>([]);
  const [institutions, setInstitutions] = useState<MasterRow[]>([]);
  const [industries, setIndustries] = useState<MasterRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) {
          setStats(null);
          return;
        }
        const data = await res.json();
        setStats(data.stats ?? null);
        setRegions(data.regions ?? []);
        setInstitutions(data.institutions ?? []);
        setIndustries(data.industries ?? []);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = stats
    ? [
        { label: '登録補助金', value: stats.subsidiesCount, unit: '件', icon: BarChartIcon, color: '#9810FA' },
        { label: '案件数', value: stats.casesCount, unit: '件', icon: BarChartIcon, color: '#1447E6' },
        { label: '専門家グループ', value: stats.expertGroupsCount, unit: 'グループ', icon: BuildingIcon, color: '#8200DB' },
        { label: '顧客グループ', value: stats.customerGroupsCount, unit: 'グループ', icon: BuildingIcon, color: '#0E7490' },
      ]
    : [];

  return (
    <div className="flex flex-row min-h-screen bg-[#F9FAFB]">
      <AdminSidebar activeItem="settings" />

      <main className="flex flex-col items-start w-full min-w-0">
        <div className="flex flex-col items-start px-4 sm:px-6 py-4 sm:py-6 gap-4 w-full bg-white border-b border-[#E5E7EB]">
          <h1 className="text-2xl sm:text-[30px] font-normal leading-8 sm:leading-[36px] tracking-[0.395508px] text-[#101828]">
            設定
          </h1>
          <p className="text-sm sm:text-base font-normal leading-6 tracking-[-0.3125px] text-[#4A5565]">
            システム概要とマスタデータの参照
          </p>
        </div>

        <div className="flex flex-col items-start px-4 sm:px-6 pt-6 pb-20 lg:pb-8 gap-6 w-full">
          {loading ? (
            <p className="text-[#4A5565]">読み込み中...</p>
          ) : (
            <>
              {/* システム概要 */}
              <div className="flex flex-col w-full">
                <h2 className="text-lg font-normal leading-7 tracking-[-0.439px] text-[#101828] mb-4">
                  システム概要
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {statCards.map((card) => {
                    const IconComponent = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="flex flex-row items-center gap-4 p-4 bg-white border border-[#E5E7EB] rounded-[14px]"
                      >
                        <div
                          className="flex items-center justify-center w-12 h-12 rounded-[10px] flex-shrink-0"
                          style={{ backgroundColor: `${card.color}18` }}
                        >
                          <IconComponent size={24} color={card.color} />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-2xl font-normal leading-8 tracking-[0.395508px] text-[#101828]">
                            {card.value}
                            <span className="text-sm font-normal text-[#6A7282] ml-1">{card.unit}</span>
                          </span>
                          <span className="text-sm font-normal leading-5 tracking-[-0.15px] text-[#6A7282]">
                            {card.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* マスタデータ */}
              <div className="flex flex-col w-full gap-6">
                <h2 className="text-lg font-normal leading-7 tracking-[-0.439px] text-[#101828]">
                  マスタデータ
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                  <MasterTable
                    title="地域"
                    count={regions.length}
                    icon={LocationIcon}
                    rows={regions}
                    emptyMessage="地域データがありません"
                  />
                  <MasterTable
                    title="実施機関"
                    count={institutions.length}
                    icon={BuildingIcon}
                    rows={institutions}
                    emptyMessage="実施機関データがありません"
                  />
                  <MasterTable
                    title="業種"
                    count={industries.length}
                    icon={DocumentIcon}
                    rows={industries}
                    emptyMessage="業種データがありません"
                  />
                </div>
              </div>

              {/* ログアウト - 現在フェーズでは設定画面内にのみ配置 */}
              <div className="w-full pt-6 border-t border-[#E5E7EB] flex justify-end">
                <Link
                  href="/logout"
                  className="inline-flex flex-row items-center gap-2 px-3 py-2 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                >
                  <LogOutIcon size={18} color="#4A5565" />
                  <span className="text-sm text-[#4A5565]">ログアウト</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
