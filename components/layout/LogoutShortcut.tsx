'use client';

import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

interface LogoutShortcutProps {
  onLogout: () => void | Promise<void>;
}

export default function LogoutShortcut({ onLogout }: LogoutShortcutProps) {
  // CTRL+Lでログアウト
  useHotkeys(
    'ctrl+l',
    async (e: KeyboardEvent) => {
      e.preventDefault();
      await onLogout();
    },
    { enableOnFormTags: true }
  );

  return null; // このコンポーネントはUIを表示しない
}
