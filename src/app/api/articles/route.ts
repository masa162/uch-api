// src/app/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withCORS, optionsOK } from '@/lib/cors';

// 記事一覧取得
export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return withCORS(NextResponse.json(articles));
  } catch (error) {
    console.error('Error fetching articles:', error);
    return withCORS(NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    ));
  }
}

// CORS preflight
export async function OPTIONS() {
  return optionsOK()
}

// 記事作成
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    console.log('POST /api/articles cookie length:', cookieHeader.length)
    const session = await getServerSession(authOptions);
    console.log('POST /api/articles session email:', session?.user?.email || null)
    
    if (!session?.user?.email) {
      console.warn('POST /api/articles unauthorized: no session.email')
      return withCORS(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ));
    }

    const body = await request.json();
    const { title, content, description, heroImageUrl, tags } = body;

    // ユーザー情報を取得または作成
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
    }

    // スラッグを生成（タイトルから）
    const baseSlug = (title || 'post')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    // 一意なスラッグを確保
    let slug = baseSlug || `post-${Date.now()}`
    for (let i = 2; i < 50; i++) {
      const exists = await prisma.article.findUnique({ where: { slug } })
      if (!exists) break
      slug = `${baseSlug}-${i}`
    }

    // 記事を作成
    const article = await prisma.article.create({
      data: {
        title,
        content,
        description,
        slug,
        heroImageUrl,
        tags: tags || [],
        pubDate: new Date(),
        authorId: user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return withCORS(NextResponse.json(article, { status: 201 }));
  } catch (error: any) {
    // Prismaのユニーク制約などは人間向けに返す
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Error creating article (prisma):', error)
      if ((error as any).code === 'P2002') {
        return withCORS(NextResponse.json(
          { error: '同じタイトル（スラッグ）が既に存在します。タイトルを少し変えてお試しください。' },
          { status: 409 }
        ))
      }
    } else {
      console.error('Error creating article:', error)
    }
    return withCORS(NextResponse.json({ error: 'Failed to create article' }, { status: 500 }))
  }
}
