// // app/api/download/[messageId]/route.ts
// import { NextResponse } from 'next/server';
// import { Readable } from 'stream';
// import { connectToDatabase } from '../../../../lib/db';
// import File, { IFile } from '@/models/file'; // Import model to verify file exists

// // Helper to convert ReadableStream to Buffer
// function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
//   return new Promise((resolve, reject) => {
//     const chunks: Uint8Array[] = [];
//     const reader = stream.getReader();
//     function read() {
//       reader.read().then(({ done, value }) => {
//         if (done) {
//           resolve(Buffer.concat(chunks));
//           return;
//         }
//         chunks.push(value);
//         read();
//       }).catch(reject);
//     }
//     read();
//   });
// }

// export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
// const { messageId } = await context.params; // ✅ must await params

//   try {
//     await connectToDatabase();

//     // Verify the file exists in our DB and get its details
//     const fileRecord: IFile | null = await File.findOne({ telegramMessageId: parseInt(messageId), isChunked: false });
//     if (!fileRecord) {
//       return NextResponse.json({ error: 'File not found in database' }, { status: 404 });
//     }

//     // --- Fetch file info from Telegram API ---
//     const fileInfoResponse = await fetch(
//       `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileRecord?.telegramFileId}`
//     );

//     if (!fileInfoResponse.ok) {
//       console.error('Telegram GetFile Error:', await fileInfoResponse.text());
//       return NextResponse.json({ error: 'Failed to get file info from Telegram' }, { status: 500 });
//     }

//     const fileInfoResult = await fileInfoResponse.json();
//     const filePath = fileInfoResult.result.file_path;

//     if (!filePath) {
//       return NextResponse.json({ error: 'File path not found in Telegram response' }, { status: 500 });
//     }

//     // --- Download file content from Telegram ---
//     const fileDownloadResponse = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`);

//     if (!fileDownloadResponse.ok) {
//       console.error('Telegram Download Error:', await fileDownloadResponse.text());
//       return NextResponse.json({ error: 'Failed to download file from Telegram' }, { status: 500 });
//     }

//     // --- Stream the file content back to the client ---
//     // const fileBuffer = await streamToBuffer(fileDownloadResponse.body); // Convert stream to buffer

//     // Instead of buffering, directly pass the stream body
//     const headers = new Headers();
//     // headers.set('Content-Type', 'application/octet-stream'); // Set based on Telegram's response if possible, or derive from file extension
//     headers.set('Content-Disposition', `attachment; filename="${fileRecord.originalFilename}"`); // Suggest filename
//     // headers.set('Content-Length', fileBuffer.length.toString()); // Length might not be available if streaming

//     // Return the stream directly
//     return new Response(fileDownloadResponse.body, {
//       headers,
//     });

//   } catch (error) {
//     console.error('Download Error:', error);
//     return NextResponse.json({ error: 'Internal Server Error during download' }, { status: 500 });
//   }
// }


// app/api/download/[messageId]/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import File, { IFile } from '@/models/file'; // Import model to verify file exists


// Helper to simulate progress (for demo purposes, actual progress is complex with streaming)
async function simulateProgress(duration: number) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await context.params; // ✅ must await params


  try {
    await connectToDatabase();

    const fileRecord: IFile | null = await File.findOne({ telegramMessageId: parseInt(messageId), isChunked: false });
    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found in database' }, { status: 404 });
    }

   const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileRecord?.telegramFileId}`
    );

    if (!fileInfoResponse.ok) {
      console.error('Telegram GetFile Error:', await fileInfoResponse.text());
      return NextResponse.json({ error: 'Failed to get file info from Telegram' }, { status: 500 });
    }

    const fileInfoResult = await fileInfoResponse.json();
    const filePath = fileInfoResult.result.file_path;

    if (!filePath) {
      return NextResponse.json({ error: 'File path not found in Telegram response' }, { status: 500 });
    }

    const fileDownloadResponse = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`);

    if (!fileDownloadResponse.ok) {
      console.error('Telegram Download Error:', await fileDownloadResponse.text());
      return NextResponse.json({ error: 'Failed to download file from Telegram' }, { status: 500 });
    }

    // Simulate download progress (optional, for UI feedback)
    // await simulateProgress(2000); // Simulate 2 seconds delay

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${fileRecord.originalFilename}"`);
    // Content-Length might not be available if streaming directly

    return new Response(fileDownloadResponse.body, {
      headers,
    });

  } catch (error) {
    console.error('Download Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during download' }, { status: 500 });
  }
}