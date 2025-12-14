import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Create approval request
 * POST /api/table-orders/[tableId]/approval
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    const { customerToken, customerFingerprint } = body;

    if (!customerToken) {
      return NextResponse.json({ error: 'Customer token is required' }, { status: 400 });
    }

    // Get table info
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id, status, session_id')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Check if table is available
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      return NextResponse.json(
        { error: 'This table is currently unavailable.' },
        { status: 403 }
      );
    }

    // Check if user is already a participant (no approval needed)
    const { data: existingParticipant } = await supabaseAdmin
      .from('table_participants')
      .select('id')
      .eq('table_id', tableId)
      .eq('customer_token', customerToken)
      .single();

    if (existingParticipant) {
      // User is already approved, no need for request
      return NextResponse.json({ 
        approved: true,
        message: 'You already have access to this table'
      });
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabaseAdmin
      .from('table_approval_requests')
      .select('id, expires_at')
      .eq('table_id', tableId)
      .eq('requester_token', customerToken)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      // Return existing request info
      const timeLeft = Math.max(0, Math.floor((new Date(existingRequest.expires_at).getTime() - Date.now()) / 1000));
      return NextResponse.json({
        requestId: existingRequest.id,
        status: 'pending',
        timeLeft,
        expiresAt: existingRequest.expires_at,
      });
    }

    // Check if this is the first scanner (no other participants)
    const { data: participants, count: participantCount } = await supabaseAdmin
      .from('table_participants')
      .select('id', { count: 'exact' })
      .eq('table_id', tableId);

    const isFirstScanner = !participants || participantCount === 0;

    if (isFirstScanner) {
      // First scanner - auto-approve and add as participant
      const { data: participant } = await supabaseAdmin
        .from('table_participants')
        .insert({
          table_id: tableId,
          restaurant_id: table.restaurant_id,
          customer_token: customerToken,
          customer_fingerprint: customerFingerprint || null,
          is_first_scanner: true,
          approved_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Log audit
      await supabaseAdmin
        .from('table_approval_audit')
        .insert({
          table_id: tableId,
          restaurant_id: table.restaurant_id,
          requester_token: customerToken,
          action: 'auto_approved_first',
          metadata: { isFirstScanner: true },
        });

      return NextResponse.json({
        approved: true,
        isFirstScanner: true,
        participantId: participant?.id,
      });
    }

    // Not first scanner - create approval request
    const expiresAt = new Date(Date.now() + 20000); // 20 seconds from now

    const { data: approvalRequest, error: requestError } = await supabaseAdmin
      .from('table_approval_requests')
      .insert({
        table_id: tableId,
        restaurant_id: table.restaurant_id,
        requester_token: customerToken,
        requester_fingerprint: customerFingerprint || null,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating approval request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create approval request' },
        { status: 500 }
      );
    }

    // Log audit
    await supabaseAdmin
      .from('table_approval_audit')
      .insert({
        table_id: tableId,
        restaurant_id: table.restaurant_id,
        approval_request_id: approvalRequest.id,
        requester_token: customerToken,
        action: 'requested',
        metadata: {},
      });

    return NextResponse.json({
      requestId: approvalRequest.id,
      status: 'pending',
      timeLeft: 20,
      expiresAt: approvalRequest.expires_at,
    });
  } catch (error) {
    console.error('Error in approval request POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get pending approval requests for a table (for existing participants to see)
 * GET /api/table-orders/[tableId]/approval
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const customerToken = searchParams.get('customerToken');

    // Get pending requests
    const { data: requests, error } = await supabaseAdmin
      .from('table_approval_requests')
      .select('id, requester_token, requester_fingerprint, created_at, expires_at')
      .eq('table_id', tableId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString()) // Only non-expired
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching approval requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    // Calculate time left for each request
    const requestsWithTimeLeft = (requests || []).map(req => ({
      id: req.id,
      requesterToken: req.requester_token,
      requesterFingerprint: req.requester_fingerprint,
      createdAt: req.created_at,
      expiresAt: req.expires_at,
      timeLeft: Math.max(0, Math.floor((new Date(req.expires_at).getTime() - Date.now()) / 1000)),
    }));

    return NextResponse.json({ requests: requestsWithTimeLeft });
  } catch (error) {
    console.error('Error in approval request GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Approve or deny a request
 * PATCH /api/table-orders/[tableId]/approval
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    const { requestId, action, approverToken, reason } = body; // action: 'approve' | 'deny'

    if (!requestId || !action || !approverToken) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, action, approverToken' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    // Verify approver is a participant
    const { data: approver } = await supabaseAdmin
      .from('table_participants')
      .select('id')
      .eq('table_id', tableId)
      .eq('customer_token', approverToken)
      .single();

    if (!approver) {
      return NextResponse.json(
        { error: 'Only table participants can approve requests' },
        { status: 403 }
      );
    }

    // Get the request
    const { data: approvalRequest, error: requestError } = await supabaseAdmin
      .from('table_approval_requests')
      .select('*')
      .eq('id', requestId)
      .eq('table_id', tableId)
      .eq('status', 'pending')
      .single();

    if (requestError || !approvalRequest) {
      return NextResponse.json(
        { error: 'Approval request not found or already resolved' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(approvalRequest.expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from('table_approval_requests')
        .update({
          status: 'expired',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      return NextResponse.json({ error: 'Request has expired' }, { status: 400 });
    }

    // Get table info
    const { data: table } = await supabaseAdmin
      .from('tables')
      .select('restaurant_id')
      .eq('id', tableId)
      .single();

    if (action === 'approve') {
      // Add requester as participant
      await supabaseAdmin
        .from('table_participants')
        .upsert({
          table_id: tableId,
          restaurant_id: table?.restaurant_id,
          customer_token: approvalRequest.requester_token,
          customer_fingerprint: approvalRequest.requester_fingerprint,
          is_first_scanner: false,
          approved_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        }, {
          onConflict: 'table_id,customer_token',
        });

      // Update request status
      await supabaseAdmin
        .from('table_approval_requests')
        .update({
          status: 'approved',
          approved_by_token: approverToken,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Log audit
      await supabaseAdmin
        .from('table_approval_audit')
        .insert({
          table_id: tableId,
          restaurant_id: table?.restaurant_id,
          approval_request_id: requestId,
          requester_token: approvalRequest.requester_token,
          approver_token: approverToken,
          action: 'approved',
          metadata: {},
        });

      return NextResponse.json({ success: true, action: 'approved' });
    } else {
      // Deny request
      await supabaseAdmin
        .from('table_approval_requests')
        .update({
          status: 'denied',
          approved_by_token: approverToken,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Log audit
      await supabaseAdmin
        .from('table_approval_audit')
        .insert({
          table_id: tableId,
          restaurant_id: table?.restaurant_id,
          approval_request_id: requestId,
          requester_token: approvalRequest.requester_token,
          approver_token: approverToken,
          action: 'denied',
          reason: reason || null,
          metadata: {},
        });

      return NextResponse.json({ success: true, action: 'denied' });
    }
  } catch (error) {
    console.error('Error in approval request PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

