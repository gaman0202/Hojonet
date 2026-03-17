import { UserIcon, ChevronDownIcon } from "@/components/icons";

export default function RegisterLinePage() {
    return (
      <main className="min-h-screen w-full bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_50%,#FAF5FF_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-4 py-20">
          {/* Card */}
          <div className="flex w-full max-w-[448px] flex-col items-center rounded-2xl bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="relative flex w-full max-w-[384px] flex-col items-center mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                {/* user icon */}
                <UserIcon size={32} color="var(--color-primary)" />
              </div>
  
              <h1 className="mt-4 text-center text-2xl text-[var(--color-text-primary)]">
                新規登録
              </h1>
              <p className="mt-2 text-center text-base text-[var(--color-text-secondary)]">
                利用者として登録してください
              </p>
            </div>
  
            {/* Form */}
            <form className="flex w-full max-w-[384px] flex-col gap-4">
              {/* お名前 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  お名前
                </label>
                <input
                   type="text"
                   placeholder="田中太郎"
                   className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
                />
              </div>
  
              {/* 事業形態 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  事業形態
                </label>
  
                <div className="relative">
                  <select className="h-[47px] w-full appearance-none rounded-[10px] border border-[var(--color-border)] bg-white px-4 pr-10 text-base text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]">
                    <option value="">選択してください</option>
                    <option value="kk">株式会社</option>
                    <option value="gk">合同会社</option>
                    <option value="sole">個人事業主</option>
                    <option value="plan">創業予定</option>
                  </select>
  
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronDownIcon size={20} />
                  </span>
                </div>
              </div>
  
              {/* 会社名（事業形態抜き） */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  会社名（事業形態抜き）
                </label>
                <input
                   type="text"
                   placeholder="テックスタート"
                   className="h-[50px] w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]"
                />
              </div>
  
              {/* 所在地 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  所在地
                </label>
  
                <div className="relative">
                  <select className="h-[47px] w-full appearance-none rounded-[10px] border border-[var(--color-border)] bg-white px-4 pr-10 text-base text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]">
                    <option value="">選択してください</option>
                    <option value="tokyo">東京都</option>
                    <option value="osaka">大阪府</option>
                    <option value="kanagawa">神奈川県</option>
                    <option value="aichi">愛知県</option>
                    <option value="saitama">埼玉県</option>
                    <option value="chiba">千葉県</option>
                    <option value="hyogo">兵庫県</option>
                    <option value="hokkaido">北海道</option>
                    <option value="fukuoka">福岡県</option>
                    <option value="other">その他</option>
                  </select>
  
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronDownIcon size={20} />
                  </span>
                </div>
              </div>
  
              {/* 業種 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  業種
                </label>
  
                <div className="relative">
                  <select className="h-[47px] w-full appearance-none rounded-[10px] border border-[var(--color-border)] bg-white px-4 pr-10 text-base text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]">
                    <option value="">選択してください</option>
                    <option value="manu">製造業</option>
                    <option value="it">IT・情報通信業</option>
                    <option value="service">サービス業</option>
                    <option value="retail">小売業</option>
                    <option value="wholesale">卸売業</option>
                    <option value="food">飲食業</option>
                    <option value="construction">建設業</option>
                    <option value="medical">医療・福祉</option>
                    <option value="edu">教育</option>
                    <option value="other">その他</option>
                  </select>
  
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronDownIcon size={20} />
                  </span>
                </div>
              </div>
  
              {/* 従業員数 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  従業員数
                </label>
  
                <div className="relative">
                  <select className="h-[47px] w-full appearance-none rounded-[10px] border border-[var(--color-border)] bg-white px-4 pr-10 text-base text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(21,93,252,0.2)]">
                    <option value="">選択してください</option>
                    <option value="1-5">1〜5名</option>
                    <option value="6-10">6〜10名</option>
                    <option value="11-30">11〜30名</option>
                    <option value="31-50">31〜50名</option>
                    <option value="51-100">51〜100名</option>
                    <option value="101+">101名以上</option>
                  </select>
  
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronDownIcon size={20} />
                  </span>
                </div>
              </div>
  
              {/* Button */}
              <button
                type="submit"
                className="h-12 w-full rounded-[10px] bg-[var(--color-primary)] text-base text-white transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]"
              >
                登録する
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }
