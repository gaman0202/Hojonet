'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadIcon } from '@/components/icons';
import { validateUploadFile, getAcceptAttribute } from '@/lib/uploadValidation';

interface FileDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  uploading?: boolean;
  compact?: boolean; // trueならボタン風の小さい表示
}

export default function FileDropzone({ onFile, disabled, uploading, compact }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setDragError(null);
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      setDragError(validation.error ?? 'ファイルが無効です。');
      return;
    }
    onFile(file);
  }, [onFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) setDragging(true);
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [disabled, uploading, handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-row items-center gap-2 px-4 py-2 rounded-[10px] border-2 border-dashed transition-colors cursor-pointer select-none ${
            disabled || uploading
              ? 'border-[#D1D5DC] bg-[#F9FAFB] opacity-50 cursor-not-allowed'
              : dragging
              ? 'border-[#155DFC] bg-[#EFF6FF]'
              : 'border-[#D1D5DC] bg-white hover:border-[#155DFC] hover:bg-[#F0F5FF]'
          }`}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
        >
          <UploadIcon size={16} color={dragging ? '#155DFC' : '#4A5565'} />
          <span className={`text-sm leading-5 ${dragging ? 'text-[#155DFC]' : 'text-[#364153]'}`}>
            {uploading ? 'アップロード中...' : dragging ? 'ここに放す' : 'ファイルを選択またはドラッグ'}
          </span>
        </div>
        {dragError && (
          <p className="text-xs text-red-500 px-1">{dragError}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={getAcceptAttribute()}
          onChange={handleChange}
          disabled={disabled || uploading}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 w-full rounded-[14px] border-2 border-dashed py-8 px-4 transition-colors cursor-pointer select-none ${
          disabled || uploading
            ? 'border-[#D1D5DC] bg-[#F9FAFB] opacity-50 cursor-not-allowed'
            : dragging
            ? 'border-[#155DFC] bg-[#EFF6FF]'
            : 'border-[#D1D5DC] bg-white hover:border-[#155DFC] hover:bg-[#F0F5FF]'
        }`}
      >
        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${dragging ? 'bg-[#DBEAFE]' : 'bg-[#F3F4F6]'}`}>
          <UploadIcon size={24} color={dragging ? '#155DFC' : '#6A7282'} />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className={`text-sm font-medium ${dragging ? 'text-[#155DFC]' : 'text-[#101828]'}`}>
            {uploading
              ? 'アップロード中...'
              : dragging
              ? 'ここにファイルを放してください'
              : 'ファイルをドラッグ＆ドロップ'}
          </p>
          {!uploading && !dragging && (
            <p className="text-xs text-[#6A7282]">
              またはクリックしてファイルを選択
            </p>
          )}
        </div>
        <p className="text-xs text-[#9CA3AF]">
          PDF, Word, Excel, PowerPoint, 画像, ZIP（最大10MB）
        </p>
      </div>
      {dragError && (
        <p className="text-xs text-red-500 px-1">{dragError}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={getAcceptAttribute()}
        onChange={handleChange}
        disabled={disabled || uploading}
      />
    </div>
  );
}
