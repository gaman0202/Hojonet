/**
 * クラス名を結合するユーティリティ。
 * 文字列・undefined・false を渡すと、有効なものだけスペース区切りで結合する。
 */
export function cn(
  ...args: (string | undefined | null | false)[]
): string {
  return args.filter((x): x is string => typeof x === 'string' && x.length > 0).join(' ');
}
