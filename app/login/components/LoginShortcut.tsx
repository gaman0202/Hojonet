'use client';

import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import AccountManagerDialog, { loadAccountsFromStorage } from './AccountManagerDialog';

interface Account {
  email: string;
  password: string;
}

interface LoginShortcutProps {
  onLogin: (email: string, password: string) => Promise<void>;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
}

export default function LoginShortcut({
  onLogin,
  setEmail,
  setPassword,
}: LoginShortcutProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // アカウント情報を読み込む
  useEffect(() => {
    const loadedAccounts = loadAccountsFromStorage();
    setAccounts(loadedAccounts);
  }, []);

  // Shift+Enterでダイアログを開く
  useHotkeys(
    'shift+enter',
    (e: KeyboardEvent) => {
      e.preventDefault();
      setIsDialogOpen(true);
    },
    { enableOnFormTags: true }
  );

  // CTRL+1-9でアカウントをログイン
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // CTRL+1-9を検出
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        const key = e.key;
        const num = parseInt(key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          const accountIndex = num - 1;
          if (accounts[accountIndex]) {
            const account = accounts[accountIndex];
            setEmail(account.email);
            setPassword(account.password);
            // 少し待ってからログイン実行
            setTimeout(async () => {
              await onLogin(account.email, account.password);
            }, 100);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [accounts, onLogin, setEmail, setPassword]);

  const handleSaveAccounts = (savedAccounts: Account[]) => {
    setAccounts(savedAccounts);
  };

  return (
    <AccountManagerDialog
      isOpen={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
      onSave={handleSaveAccounts}
      accounts={accounts}
    />
  );
}
