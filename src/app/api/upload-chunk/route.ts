// app/api/upload-chunk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import File, { IFile } from '@/models/file';
import { connectToDatabase } from '../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
  const chunk = formData.get('chunk') as File | null;
    const originalFilename = formData.get('originalFilename') as string;
    const uploadSessionId = formData.get('uploadSessionId') as string;  
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const parentFolderId = formData.get('parentFolderId') as string; // Get parent folder ID
    

    if (!chunk || !originalFilename || !uploadSessionId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: 'Invalid chunk data or metadata' }, { status: 400 });
    }

    const formDataForTelegram = new FormData();
    formDataForTelegram.append('chat_id', process.env.TELEGRAM_CHANNEL_ID!);
    // @ts-ignore
    formDataForTelegram.append('document', chunk, `${originalFilename}_chunk_${chunkIndex}`);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      {
        method: 'POST',
        body: formDataForTelegram,
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error('Telegram API Error (Chunk):', errorData);
      return NextResponse.json({ error: 'Failed to upload chunk to Telegram', details: errorData }, { status: 500 });
    }

    const telegramResult = await telegramResponse.json();
    const telegramMessageIdForChunk = telegramResult.result.message_id;
// --- Extract file_id ---
    let telegramFileIdForChunk: string | undefined;

    if (telegramResult.result.document) {
      telegramFileIdForChunk = telegramResult.result.document.file_id;
    } else if (telegramResult.result.photo) {
      const photos = telegramResult.result.photo;
      telegramFileIdForChunk = photos[photos.length - 1].file_id; // largest size
    }

    if (!telegramFileIdForChunk) {
      return NextResponse.json({ error: 'No file_id found in Telegram response' }, { status: 500 });
    }
    const newChunkFile: IFile = new File({
      originalFilename: originalFilename,
      originalFileSize: chunk.size, // This is the total size for the first chunk
      totalFileSize: chunk.size, // Add this field to store total size explicitly
      telegramMessageId: 0,
      telegramFileId:telegramFileIdForChunk,
      isChunked: true,
      uploadSessionId: uploadSessionId,
      chunkIndex: chunkIndex,
      totalChunks: totalChunks,
      telegramMessageIdForChunk: telegramMessageIdForChunk,
      telegramFileIdForChunk: telegramFileIdForChunk,
      parentFolderId: parentFolderId ? (parentFolderId === 'root' ? null : parentFolderId) : null, // Assign parent folder ID
    });

    await newChunkFile.save();

    return NextResponse.json({ message: 'Chunk uploaded successfully', chunkId: newChunkFile._id, telegramMessageIdForChunk,telegramFileIdForChunk });

  } catch (error) {
    console.error('Chunk Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during chunk upload' }, { status: 500 });
  }
}