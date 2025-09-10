import { redirect } from 'next/navigation'

// サーバーコンポーネント: API側のエラーページに来た場合は
// 常にフロントの /signin に error クエリ付きでリダイレクトする
export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://uchinokiroku.com'
  const errParam = searchParams?.error
  const error = Array.isArray(errParam) ? errParam[0] : errParam

  const target = `${FRONTEND_URL}/signin${error ? `?error=${encodeURIComponent(error)}` : ''}`
  redirect(target)
}
