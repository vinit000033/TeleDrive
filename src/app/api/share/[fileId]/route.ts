// app/api/share/[fileId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import File, { IFile } from '@/models/file';
import { connectToDatabase } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(
  request: NextRequest,
  context: any // <-- Use `any` here to satisfy Next.js RouteHandlerConfig
) {
  const { fileId } = context.params as { fileId: string }; // cast to correct type

  try {
    await connectToDatabase();

    const file: IFile | null = await File.findById(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.isPublic) {
      file.isPublic = false;
      file.publicShareToken = undefined;
    } else {
      file.isPublic = true;
      file.publicShareToken = uuidv4();
    }

    await file.save();

    return NextResponse.json({
      message: 'Share status updated',
      file: {
        isPublic: file.isPublic,
        publicShareToken: file.publicShareToken,
      },
    });
  } catch (error) {
    console.error('Share Toggle Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during share toggle' },
      { status: 500 }
    );
  }
}
