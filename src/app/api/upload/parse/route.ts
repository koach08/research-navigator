import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name;
    const ext = filename.split('.').pop()?.toLowerCase();

    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
        { status: 400 }
      );
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    let text = '';
    let pages: number | undefined;

    if (ext === 'txt') {
      text = await file.text();
    } else if (ext === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
      pages = pdfData.numpages;
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    // Trim and limit text length (Claude context window consideration)
    text = text.trim();
    if (text.length > 100000) {
      text = text.slice(0, 100000);
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Could not extract text from the file. The file may be empty or contain only images.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text,
      filename,
      pages,
      char_count: text.length,
    });
  } catch (error) {
    console.error('File parse error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
