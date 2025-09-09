'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'サーバー設定に問題があります。Google OAuth認証情報が正しく設定されていない可能性があります。管理者にお問い合わせください。';
      case 'AccessDenied':
        return 'アクセスが拒否されました。';
      case 'Verification':
        return '認証トークンが無効または期限切れです。';
      case 'OAuthCallback':
        return 'OAuth認証のコールバック処理でエラーが発生しました。';
      case 'OAuthCreateAccount':
        return 'アカウント作成時にエラーが発生しました。';
      case 'OAuthSignin':
        return 'OAuthサインイン処理でエラーが発生しました。';
      case 'OAuthAccountNotLinked':
        return 'このメールアドレスは既に別の認証方法で登録されています。';
      case 'EmailCreateAccount':
        return 'メールアカウント作成時にエラーが発生しました。';
      case 'EmailSignin':
        return 'メールサインイン時にエラーが発生しました。';
      case 'Callback':
        return '認証コールバック処理でエラーが発生しました。';
      case 'Default':
        return '認証中にエラーが発生しました。もう一度お試しください。';
      default:
        return '認証中にエラーが発生しました。もう一度お試しください。';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            認証エラー
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getErrorMessage(error)}
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="text-center">
            <Link
              href="/api/auth/signin"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              再度ログイン
            </Link>
          </div>
          <div className="text-center">
            <Link
              href="https://uchinokiroku.com"
              className="text-indigo-600 hover:text-indigo-500"
            >
              ホームページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
