import type { APIRoute } from 'astro';

interface Env {
  SCAM_CHECKER_KV?: KVNamespace;
}

// GET endpoint to retrieve stats
export const GET: APIRoute = async ({ locals }) => {
  try {
    const runtime = locals.runtime as { env: Env } | undefined;
    const kv = runtime?.env?.SCAM_CHECKER_KV;

    if (!kv) {
      // Return default stats if KV not configured
      return new Response(
        JSON.stringify({ 
          totalChecks: 0,
          todayChecks: 0,
          message: 'Stats service not configured'
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60' // Cache for 1 minute
          } 
        }
      );
    }

    // Get total checks
    const totalChecksStr = await kv.get('total_checks');
    const totalChecks = totalChecksStr ? parseInt(totalChecksStr, 10) : 0;

    // Get today's date key (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const todayKey = `checks_${today}`;
    const todayChecksStr = await kv.get(todayKey);
    const todayChecks = todayChecksStr ? parseInt(todayChecksStr, 10) : 0;

    return new Response(
      JSON.stringify({ 
        totalChecks,
        todayChecks,
        lastUpdated: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        } 
      }
    );
  } catch (error) {
    console.error('Error fetching scam checker stats:', error);
    return new Response(
      JSON.stringify({ 
        totalChecks: 0,
        todayChecks: 0,
        error: 'Failed to fetch stats'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

// POST endpoint to increment counter
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime as { env: Env } | undefined;
    const kv = runtime?.env?.SCAM_CHECKER_KV;

    if (!kv) {
      // Silently fail if KV not configured
      return new Response(
        JSON.stringify({ success: false, message: 'Stats service not configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Increment total counter
    const totalChecksStr = await kv.get('total_checks');
    const totalChecks = totalChecksStr ? parseInt(totalChecksStr, 10) : 0;
    await kv.put('total_checks', (totalChecks + 1).toString());

    // Increment today's counter
    const today = new Date().toISOString().split('T')[0];
    const todayKey = `checks_${today}`;
    const todayChecksStr = await kv.get(todayKey);
    const todayChecks = todayChecksStr ? parseInt(todayChecksStr, 10) : 0;
    await kv.put(todayKey, (todayChecks + 1).toString(), {
      // Expire after 7 days to keep storage clean
      expirationTtl: 7 * 24 * 60 * 60
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        totalChecks: totalChecks + 1,
        todayChecks: todayChecks + 1
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error incrementing scam checker stats:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update stats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
