// app/api/files/upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileSize, mimeType, shopId, printerId } = body;

    // Validate file size (50MB max)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    // Generate unique file key
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${nanoid()}.${fileExtension}`;
    const fileKey = `uploads/${shopId}/${uniqueFileName}`;

    // ✅ Create presigned URL (correct method)
    const { data, error } = await supabase.storage
      .from('print-jobs')
      .createSignedUploadUrl(fileKey); // ← Use createSignedUploadUrl!

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl, // ← Return the signed URL
      fileKey: fileKey,
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
