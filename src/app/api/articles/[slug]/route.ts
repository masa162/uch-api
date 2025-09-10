// src/app/api/articles/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCORS, optionsOK } from '@/lib/cors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 記事詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const article = await prisma.article.findUnique({
      where: { slug },
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

    if (!article) {
      return withCORS(NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      ));
    }

    return withCORS(NextResponse.json(article));
  } catch (error) {
    console.error('Error fetching article:', error);
    return withCORS(NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    ));
  }
}

export async function OPTIONS() {
  return optionsOK()
}

// 記事更新（本人のみ）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return withCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { slug } = params
    const target = await prisma.article.findUnique({ where: { slug } })
    if (!target) {
      return withCORS(NextResponse.json({ error: 'Article not found' }, { status: 404 }))
    }

    // 編集権限チェック（作成者のみ）
    const owner = await prisma.user.findUnique({ where: { id: target.authorId } })
    if (!owner || owner.email !== session.user.email) {
      return withCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const body = await request.json()
    const data: any = {}
    if (typeof body.title === 'string') data.title = body.title
    if (typeof body.description === 'string' || body.description === null) data.description = body.description
    if (typeof body.content === 'string') data.content = body.content
    if (typeof body.heroImageUrl === 'string' || body.heroImageUrl === null) data.heroImageUrl = body.heroImageUrl
    if (Array.isArray(body.tags)) data.tags = body.tags

    const updated = await prisma.article.update({
      where: { slug },
      data,
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    })
    return withCORS(NextResponse.json(updated))
  } catch (error) {
    console.error('Error updating article:', error)
    return withCORS(NextResponse.json({ error: 'Failed to update article' }, { status: 500 }))
  }
}
