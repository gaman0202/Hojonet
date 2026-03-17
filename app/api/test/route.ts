import { NextRequest, NextResponse } from 'next/server';

// GET function
export async function GET(request: NextRequest) {
  return NextResponse.json(
    // DATA 
    {
      message: 'GET request successful',
      timestamp: new Date().toISOString(),
      method: 'GET'
    }
    // Response init
    , {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Custom-Header': 'My-Custom-Value',
      },
    }
  );
}

// POST function
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    message: 'POST request successful',
    receivedData: body,
    timestamp: new Date().toISOString(),
    method: 'POST'
  });
}
