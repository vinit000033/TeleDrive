// // app/api/files/route.ts
// import { NextResponse } from 'next/server';
import File, { IFile } from '@/models/file'; // Import model to verify file exists

// import { connectToDatabase } from '../../../lib/db';

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const folderId = searchParams.get('folderId'); // Optional: filter by parent folder ID

//   try {
//     await connectToDatabase();

//     const query: any = { isChunked: false }; // Only fetch non-chunked files
//     if (folderId) {
//       query.parentFolderId = folderId === 'root' ? null : folderId; // 'root' means no parent
//     } else {
//       query.parentFolderId = null; // Default to root if no folderId is provided
//     }

//     const files: IFile[] = await File.find(query)
//       .select('originalFilename originalFileSize uploadDate telegramMessageId parentFolderId isPublic publicShareToken _id')
//       .sort({ uploadDate: -1 });

//     return NextResponse.json({ files });

//   } catch (error) {
//     console.error('Fetch Files Error:', error);
//     return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
//   }
// }

// app/api/files/route.ts
import { NextResponse } from 'next/server';
// import File, { IFile } from '../../../models/File';
import { connectToDatabase } from '../../../lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  try {
    await connectToDatabase();

    // --- Query for non-chunked files in the folder ---
    const nonChunkedQuery: any = { isChunked: false };
    if (folderId) {
      nonChunkedQuery.parentFolderId = folderId === 'root' ? null : folderId;
    } else {
      nonChunkedQuery.parentFolderId = null;
    }

    const nonChunkedFiles: IFile[] = await File.find(nonChunkedQuery)
      .select('originalFilename originalFileSize uploadDate telegramMessageId parentFolderId isPublic publicShareToken _id ')
      .sort({ uploadDate: -1 });

    // --- Query for the *first chunk* of each unique chunked session in the folder ---
    // This query finds chunks where chunkIndex is 0 (the first chunk) for the given folder
    const firstChunkQuery: any = {
      isChunked: true,
      chunkIndex: 0 // Only get the first chunk of each session
    };
    if (folderId) {
      firstChunkQuery.parentFolderId = folderId === 'root' ? null : folderId;
    } else {
      firstChunkQuery.parentFolderId = null;
    }

    const firstChunks: IFile[] = await File.find(firstChunkQuery)
      .select('originalFilename originalFileSize uploadDate uploadSessionId parentFolderId isPublic publicShareToken totalFileSize chunkIndex totalChunks _id ') // Include session ID and other relevant fields
      .sort({ uploadDate: -1 });

    // --- Combine results ---
    // The frontend will need to know this is a chunked file represented by its first chunk
    const combinedResults = [...nonChunkedFiles, ...firstChunks.map(chunk => ({
        // Map the first chunk's data to look like a file object, adding the session ID
        originalFilename: chunk.originalFilename,
        // Use totalFileSize if stored in the first chunk, otherwise use originalFileSize (which might be 0)
        originalFileSize:chunk.originalFileSize,
        uploadDate: chunk.uploadDate,
        // These fields are specific to chunked files:
        isChunked: true,
        uploadSessionId: chunk.uploadSessionId, // Needed for download
        // Keep other relevant fields
        parentFolderId: chunk.parentFolderId,
        isPublic: chunk.isPublic,
        publicShareToken: chunk.publicShareToken,
        // Add a flag to identify it as the aggregated representation of a chunked file
        _isAggregatedChunkedFile: true,
        // You might not have telegramMessageId for the combined file, so exclude or handle it carefully
        // telegramMessageId: undefined // Or perhaps store the first chunk's ID if needed for some logic?
        // For download, you'll use uploadSessionId, not telegramMessageId
    }))];

    // Sort the combined results by upload date
    combinedResults.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return NextResponse.json({ files: combinedResults });

  } catch (error) {
    console.error('Fetch Files Error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}