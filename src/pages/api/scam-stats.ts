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
          topScamTypes: [],
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

    // Get top scam scenarios
    const scenarios = [
      'online-purchase',
      'online-selling',
      'investment',
      'employment',
      'phone-sms',
      'social-messaging',
      'romance',
      'other'
    ];
    
    const scenarioCounts: Array<{ type: string; count: number; label: string }> = [];
    
    const scenarioLabels: Record<string, string> = {
      'online-purchase': 'Online Purchase/Shopping',
      'online-selling': 'Online Selling',
      'investment': 'Investment Opportunities',
      'employment': 'Job/Employment Offers',
      'phone-sms': 'Phone/SMS Scams',
      'social-messaging': 'Social Media/Messaging',
      'romance': 'Romance/Relationship',
      'other': 'Other'
    };

    for (const scenario of scenarios) {
      const scenarioCountStr = await kv.get(`scenario_${scenario}`);
      const count = scenarioCountStr ? parseInt(scenarioCountStr, 10) : 0;
      if (count > 0) {
        const label = scenarioLabels[scenario] || scenario;
        scenarioCounts.push({ 
          type: scenario, 
          count, 
          label
        });
      }
    }

    // Sort by count and get top 3
    const topScamTypes = scenarioCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return new Response(
      JSON.stringify({ 
        totalChecks,
        todayChecks,
        topScamTypes,
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
        topScamTypes: [],
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

    // Get form data from request body
    const body = await request.json();
    const { userRole, communicationMedium, paymentMethod, socialEngineering } = body;

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

    // Determine scam scenario based on key indicators
    let scamScenario = 'other';
    
    // Online Purchase/Shopping transactions
    if (userRole === 'buyer') {
      scamScenario = 'online-purchase';
    }
    // Online Selling transactions
    else if (userRole === 'seller') {
      scamScenario = 'online-selling';
    }
    // Investment opportunities
    else if (userRole === 'investor' || socialEngineering === 'too-good') {
      scamScenario = 'investment';
    }
    // Employment/Job opportunities
    else if (userRole === 'partimer' || userRole === 'worker') {
      scamScenario = 'employment';
    }
    // Phone/SMS based scams (including authority impersonation)
    else if (socialEngineering === 'authority' || socialEngineering === 'fear' || communicationMedium === 'sms') {
      scamScenario = 'phone-sms';
    }
    // Social media/messaging scams (WhatsApp, Telegram, Facebook)
    else if (communicationMedium === 'whatsapp' || communicationMedium === 'whatsapp-group' || 
             communicationMedium === 'telegram' || communicationMedium === 'social-media') {
      scamScenario = 'social-messaging';
    }
    // Romance/Relationship scams
    else if (socialEngineering === 'sympathy') {
      scamScenario = 'romance';
    }

    // Track the identified scenario
    if (scamScenario) {
      const scenarioKey = `scenario_${scamScenario}`;
      const scenarioCountStr = await kv.get(scenarioKey);
      const scenarioCount = scenarioCountStr ? parseInt(scenarioCountStr, 10) : 0;
      await kv.put(scenarioKey, (scenarioCount + 1).toString());
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        totalChecks: totalChecks + 1,
        todayChecks: todayChecks + 1,
        detectedScenario: scamScenario
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
