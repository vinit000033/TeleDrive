// // app/api/upload/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import File from '@/models/file';
// import { connectToDatabase } from '../../../lib/db';

// export async function POST(request: NextRequest) {
//   try {
//     await connectToDatabase();

//     const formData = await request.formData();
//     const file = formData.get('file');

//     // Validate file
//     if (!file || typeof file === 'string') {
//       return NextResponse.json({ error: 'No file provided or invalid file type' }, { status: 400 });
//     }

//     // @ts-ignore
//     const fileSizeInBytes: number = file.size;
//     const maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB
//     if (fileSizeInBytes > maxFileSize) {
//       return NextResponse.json({ error: `File size exceeds 2GB limit. Got ${fileSizeInBytes} bytes.` }, { status: 400 });
//     }

//     // Prepare form data for Telegram
//     const formDataForTelegram = new FormData();
//     // @ts-ignore
//     formDataForTelegram.append('chat_id', process.env.TELEGRAM_CHANNEL_ID!);
//     // @ts-ignore
//     formDataForTelegram.append('document', file, file.name);

//     // Upload to Telegram
//     const telegramResponse = await fetch(
//       `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
//       {
//         method: 'POST',
//         body: formDataForTelegram,
//       }
//     );

//     if (!telegramResponse.ok) {
//       const errorData = await telegramResponse.json();
//       console.error('Telegram API Error:', errorData);
//       return NextResponse.json({ error: 'Failed to upload to Telegram', details: errorData }, { status: 500 });
//     }

//     const telegramResult = await telegramResponse.json();
//     console.log(telegramResult, '>>> Telegram API response');

//     const telegramMessageId = telegramResult.result.message_id;

//     // --- Extract file_id ---
//     let telegramFileId: string | undefined;

//     if (telegramResult.result.document) {
//       telegramFileId = telegramResult.result.document.file_id;
//     } else if (telegramResult.result.photo) {
//       const photos = telegramResult.result.photo;
//       telegramFileId = photos[photos.length - 1].file_id; // largest size
//     }

//     if (!telegramFileId) {
//       return NextResponse.json({ error: 'No file_id found in Telegram response' }, { status: 500 });
//     }

//     // --- Save to MongoDB ---
//     const newFile = new File({
//       originalFilename: file.name,
//       originalFileSize: fileSizeInBytes,
//       telegramMessageId,
//       telegramFileId,
//       isChunked: false,
//     });

//     await newFile.save();

//     return NextResponse.json({
//       message: 'File uploaded successfully',
//       fileId: newFile._id,
//       telegramMessageId,
//       telegramFileId,
//     });

//   } catch (error) {
//     console.error('Upload Error:', error);
//     return NextResponse.json({ error: 'Internal Server Error during upload' }, { status: 500 });
//   }
// }



// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import File, { IFile } from '@/models/file';
import { connectToDatabase } from '../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get('file');
    const parentFolderIdInput = formData.get('parentFolderId') as string; // Get parentFolderId from form data

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided or invalid file type' }, { status: 400 });
    }

    // --- Validate file size (<= 2GB) ---
    // @ts-ignore - size property exists on File/Blob objects received from formData
    const fileSizeInBytes: number = file.size;
    const maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    if (fileSizeInBytes > maxFileSize) {
       return NextResponse.json({ error: `File size exceeds 2GB limit. Got ${fileSizeInBytes} bytes.` }, { status: 400 });
    }

    // --- Upload file to Telegram Channel ---
    const formDataForTelegram = new FormData();
    // @ts-ignore - append works with File/Blob objects
    formDataForTelegram.append('chat_id', process.env.TELEGRAM_CHANNEL_ID!);
    // @ts-ignore - append works with File/Blob objects
    formDataForTelegram.append('document', file, file.name);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      {
        method: 'POST',
        body: formDataForTelegram,
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error('Telegram API Error:', errorData);
      return NextResponse.json({ error: 'Failed to upload to Telegram', details: errorData }, { status: 500 });
    }

    const telegramResult = await telegramResponse.json();
    const telegramMessageId = telegramResult.result.message_id;
    // --- Extract file_id ---
    let telegramFileId: string | undefined;

    if (telegramResult.result.document) {
      telegramFileId = telegramResult.result.document.file_id;
    } else if (telegramResult.result.photo) {
      const photos = telegramResult.result.photo;
      telegramFileId = photos[photos.length - 1].file_id; // largest size
    }

    if (!telegramFileId) {
      return NextResponse.json({ error: 'No file_id found in Telegram response' }, { status: 500 });
    }

    // --- Save metadata to MongoDB ---
    // Determine parentFolderId: null for 'root', otherwise the provided ID
    const parentFolderId = parentFolderIdInput === 'root' ? null : parentFolderIdInput;

    const newFile: IFile = new File({
      originalFilename: file.name,
      originalFileSize: fileSizeInBytes,
      telegramMessageId: telegramMessageId,
      telegramFileId,
      isChunked: false,
      parentFolderId: parentFolderId, // Assign the parent folder ID
    });

    await newFile.save();

    return NextResponse.json({ message: 'File uploaded successfully', fileId: newFile._id, telegramMessageId });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during upload' }, { status: 500 });
  }
}