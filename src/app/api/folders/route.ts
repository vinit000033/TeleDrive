// app/api/folders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Folder, { IFolder } from '../../../models/Folder';
import { connectToDatabase } from '../../../lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parentId'); // Optional: filter by parent folder ID

  try {
    await connectToDatabase();

    const query: any = {};
    if (parentId) {
      query.parentId = parentId === 'root' ? null : parentId;
    } else {
      query.parentId = null; // Default to root folders
    }

    const folders: IFolder[] = await Folder.find(query)
      .select('name parentId createdAt updatedAt _id')
      .sort({ createdAt: 1 });

    return NextResponse.json({ folders });

  } catch (error) {
    console.error('Fetch Folders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, parentId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    await connectToDatabase();

    const newFolder = new Folder({
      name,
      parentId: parentId === 'root' ? null : parentId, // 'root' means no parent
    });

    await newFolder.save();

    return NextResponse.json({ message: 'Folder created successfully', folder: newFolder });

  } catch (error) {
    console.error('Create Folder Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during folder creation' }, { status: 500 });
  }
}