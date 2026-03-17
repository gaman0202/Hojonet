import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createSubsidy } from '@/lib/admin/subsidies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await createSubsidy(supabaseAdmin, {
      title: body.title,
      implementingAgency: body.implementingAgency ?? '',
      region: body.region ?? '',
      amountDescription: body.amountDescription ?? '',
      applicationPeriodEnd: body.applicationPeriodEnd,
      subsidyRate: body.subsidyRate,
      purpose: body.purpose,
      officialPageUrl: body.officialPageUrl,
      overview: body.overview,
      eligibleActivities: body.eligibleActivities ?? [],
      eligibilityConditions: body.eligibilityConditions ?? [],
      requiredDocuments: body.requiredDocuments ?? [],
      steps: body.steps ?? [],
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status = message === 'title and overview are required' ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
