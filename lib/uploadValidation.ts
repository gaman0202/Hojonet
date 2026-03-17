/**
 * ファイルアップロード共通バリデーション
 * 書類・タスク添付用: 拡張子ホワイトリスト + サイズ制限
 */

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** アップロード許可拡張子（小文字） */
export const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'zip',
] as const;

/** 拡張子 → 代表 MIME（検証用） */
export const EXTENSION_MIME: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

const ALLOWED_SET = new Set<string>(ALLOWED_EXTENSIONS);

export type ValidateResult = { ok: true } | { ok: false; error: string };

/**
 * ファイルの拡張子を取得（小文字、ドットなし）
 */
export function getExtension(filename: string): string {
  const last = filename.split('.').pop();
  return (last ?? '').toLowerCase();
}

/**
 * サーバー・クライアント共通: ファイルのサイズと拡張子を検証
 */
export function validateUploadFile(file: { name: string; size: number; type?: string }): ValidateResult {
  if (!file || file.size <= 0) {
    return { ok: false, error: 'ファイルを選択してください。' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `ファイルサイズは${MAX_FILE_SIZE_MB}MB以下にしてください。` };
  }
  const ext = getExtension(file.name);
  if (!ext) {
    return { ok: false, error: 'ファイルの拡張子がありません。' };
  }
  if (!ALLOWED_SET.has(ext)) {
    return {
      ok: false,
      error: 'アップロードできる形式は PDF, Word, Excel, PowerPoint, 画像（JPG/PNG/GIF/WebP）, ZIP です。',
    };
  }
  // オプション: MIME と拡張子の一致をチェック（許容する MIME リストに含まれるか）
  if (file.type && typeof file.type === 'string') {
    const allowedMimes = EXTENSION_MIME[ext];
    if (allowedMimes && allowedMimes.length > 0) {
      const normalized = file.type.toLowerCase().split(';')[0].trim();
      if (!allowedMimes.includes(normalized)) {
        // 拡張子は許可されているが MIME が一致しない場合は警告扱いで通す（ブラウザ差があるため）
        // 厳密に拒否する場合は: return { ok: false, error: 'ファイル形式が正しくありません。' };
      }
    }
  }
  return { ok: true };
}

/**
 * <input type="file" accept="..."> 用の文字列
 */
export function getAcceptAttribute(): string {
  const mimes = new Set<string>();
  Object.values(EXTENSION_MIME).forEach((arr) => arr.forEach((m) => mimes.add(m)));
  const extensions = ALLOWED_EXTENSIONS.map((e) => `.${e}`);
  return [...mimes, ...extensions].join(',');
}
