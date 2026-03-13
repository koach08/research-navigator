import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Send response before shutting down
  const response = NextResponse.json({ message: 'Shutting down...' });

  // Delay shutdown slightly so the response can be sent
  setTimeout(() => {
    process.exit(0);
  }, 500);

  return response;
}
