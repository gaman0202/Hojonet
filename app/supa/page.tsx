// 修正後: App Routerのpage.tsxで非同期コンポーネントを使用
import { supabase } from '@/utils/supabaseClient';

export default async function SupaPage() {
    const { data: regions, error } = await supabase.from('m_regions').select('id, name');
    if (error) {
        console.error('データ取得エラー:', error);
        return <div>データのロード中にエラーが発生しました。</div>;
    }

    return (
        <div>
            <h1>地域一覧 (Server Fetched)</h1>
            {regions?.length ? (
                regions.map((region) => (
                    <div key={region.id}>{region.name}</div>
                ))
            ) : (
                <p>登録されている地域はありません。</p>
            )}
        </div>
    );
}

// 注意: Next.js 13以降、デフォルトはサーバーコンポーネントです。
// この方法で取得されたデータは、レンダリング前にサーバー側で完全に準備されます。