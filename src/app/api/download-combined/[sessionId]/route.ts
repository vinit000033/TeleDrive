// app/api/download-combined/[sessionId]/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import File, { IFile } from '@/models/file'; // Import model to verify file exists


export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;

  try {
    await connectToDatabase();

    // Find all chunks for the session, sorted by index
    const chunks: IFile[] = await File.find({
      uploadSessionId: sessionId,
      isChunked: true,
    }).sort({ chunkIndex: 1 });
 console.log(chunks,"<<<<<<")
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No chunks found for this session' }, { status: 404 });
    }

    // Get original filename from the first chunk
    const originalFilename = chunks[0].originalFilename;

    // Fetch each chunk's data from Telegram and concatenate
    const chunkBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const chunkMessageId = chunk.telegramFileId;
      if (!chunkMessageId) {
        console.error(`Chunk ${chunk.chunkIndex} has no telegramMessageIdForChunk`);
        continue; // Or throw error
      }

      const fileInfoResponse = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${chunkMessageId}`
      );

      if (!fileInfoResponse.ok) {
        console.error(`Telegram GetFile Error for chunk ${chunk.chunkIndex}:`, await fileInfoResponse.text());
        return NextResponse.json({ error: `Failed to get chunk ${chunk.chunkIndex} info from Telegram` }, { status: 500 });
      }

      const fileInfoResult = await fileInfoResponse.json();
      const filePath = fileInfoResult.result.file_path;

      if (!filePath) {
        return NextResponse.json({ error: `File path not found for chunk ${chunk.chunkIndex}` }, { status: 500 });
      }

      const fileDownloadResponse = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`);

      if (!fileDownloadResponse.ok) {
        console.error(`Telegram Download Error for chunk ${chunk.chunkIndex}:`, await fileDownloadResponse.text());
        return NextResponse.json({ error: `Failed to download chunk ${chunk.chunkIndex} from Telegram` }, { status: 500 });
      }

      const arrayBuffer = await fileDownloadResponse.arrayBuffer();
      chunkBuffers.push(Buffer.from(arrayBuffer));
    }

    const combinedBuffer = Buffer.concat(chunkBuffers);

    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${originalFilename}"`);
    headers.set('Content-Length', combinedBuffer.length.toString());

    return new NextResponse(combinedBuffer, {
      headers,
    });

  } catch (error) {
    console.error('Combined Download Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during combined download' }, { status: 500 });
  }
}