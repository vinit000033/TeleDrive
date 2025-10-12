// app/api/public/[token]/route.ts
import { NextResponse } from 'next/server';
import File, { IFile } from '@/models/file';
import { connectToDatabase } from '../../../../lib/db';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    await connectToDatabase();

    const fileRecord: IFile | null = await File.findOne({ publicShareToken: token, isPublic: true });
    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found or not public' }, { status: 404 });
    }

    if (fileRecord.isChunked) {
      return NextResponse.json({ error: 'Public access for chunked files not implemented' }, { status: 501 });
    }

    // Build absolute URL using request URL
    const { origin } = new URL(request.url);
    const downloadUrl = `${origin}/api/download/${fileRecord.telegramMessageId}`;

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Public Access Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during public access' }, { status: 500 });
  }
}
