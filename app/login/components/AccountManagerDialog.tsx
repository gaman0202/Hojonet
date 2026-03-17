'use client';

import React, { useState, useEffect } from 'react';
import { XIcon } from '@/components/icons';

interface Account {
  email: string;
  password: string;
}

interface AccountManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accounts: Account[]) => void;
  accounts: Account[];
}

const STORAGE_KEY = 'login_accounts';
const MAX_ACCOUNTS = 10;

export default function AccountManagerDialog({
  isOpen,
  onClose,
  onSave,
  accounts: initialAccounts,
}: AccountManagerDialogProps) {
  // textareaの内容を管理
  const [textareaValue, setTextareaValue] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const saved = loadAccounts();
      if (saved.length > 0) {
        // 保存されたアカウントを一行形式（email,password）に変換して改行区切りで結合
        const lines = saved.map((acc) => `${acc.email},${acc.password}`);
        setTextareaValue(lines.join('\n'));
      } else {
        setTextareaValue('');
      }
    }
  }, [isOpen]);

  const loadAccounts = (): Account[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
    return [];
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaValue(e.target.value);
  };

  const parseAccount = (input: string): Account | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return {
        email: parts[0],
        password: parts.slice(1).join(','), // パスワードにカンマが含まれる場合に対応
      };
    }
    return null;
  };

  const handleSave = () => {
    // textareaの各行をパースしてアカウント情報に変換
    const lines = textareaValue.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const validAccounts: Account[] = [];

    lines.forEach((line) => {
      const account = parseAccount(line);
      if (account && account.email && account.password) {
        validAccounts.push(account);
      }
    });

    if (validAccounts.length === 0) {
      alert('少なくとも1つのアカウント情報を入力してください。\n形式: email,password（1行に1つ）');
      return;
    }

    if (validAccounts.length > MAX_ACCOUNTS) {
      alert(`最大${MAX_ACCOUNTS}個のアカウントまで保存できます。`);
      return;
    }

    // localStorageに保存
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validAccounts));
      } catch (error) {
        console.error('Failed to save accounts:', error);
        alert('アカウント情報の保存に失敗しました。');
        return;
      }
    }

    onSave(validAccounts);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <h2 className="text-xl font-semibold text-[#0A0A0A]">アカウント管理</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="閉じる"
          >
            <XIcon size={20} color="#6A7282" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#364153]">
              アカウント情報（1行に1つ、形式: email,password）
            </label>
            <textarea
              value={textareaValue}
              onChange={handleTextareaChange}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  onClose();
                }
              }}
              className="w-full min-h-[300px] px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#0A0A0A] font-mono text-sm focus:border-[#155DFC] focus:outline-none focus:ring-2 focus:ring-[#155DFC]/20 resize-y select-text"
              placeholder="email1,password1&#10;email2,password2&#10;email3,password3&#10;..."
              rows={10}
            />
          </div>

          <p className="mt-4 text-xs text-[#6A7282] text-center">
            CTRL+1 で1番目のアカウント、CTRL+2 で2番目のアカウント...というようにログインできます（最大{MAX_ACCOUNTS}個）
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#6A7282] hover:text-[#364153] transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm bg-[#155DFC] text-white rounded-lg hover:bg-[#155DFC]/90 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// localStorageからアカウントを読み込む関数（エクスポート）
export function loadAccountsFromStorage(): Account[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Failed to load accounts:', error);
  }
  return [];
}
