import type { APIRoute } from 'astro';
import { checkRateLimit, verifyOrigin, getClientIp } from '../../lib/security';

interface Env {
  SCAM_CHECKER_KV?: KVNamespace;
  RATE_LIMIT_KV?: KVNamespace;
}

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
  'https://cyberbrosecurity.work',
  'https://www.cyberbrosecurity.work',
  'http://localhost:4321', // For local development
  'http://localhost:3000'
];

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
    // CSRF Protection: Verify origin
    if (!verifyOrigin(request, ALLOWED_ORIGINS)) {
      console.warn('CSRF attempt on scam-stats from:', request.headers.get('origin'));
      return new Response(
        JSON.stringify({ error: 'Invalid request origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const runtime = locals.runtime as { env: Env } | undefined;
    
    // Rate Limiting: Prevent abuse (more lenient than contact form)
    const clientIp = getClientIp(request);
    const rateLimitKey = `scam_stats_rate_limit:${clientIp}`;
    
    const rateLimit = await checkRateLimit(
      runtime?.env?.RATE_LIMIT_KV,
      rateLimitKey,
      20, // Max 20 checks
      3600 // Per hour
    );

    if (rateLimit.limited) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Too many checks. Please try again later.',
          retryAfter: 3600 
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          } 
        }
      );
    }

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

    // Basic validation of input data
    if (!userRole || !communicationMedium || !paymentMethod || !socialEngineering) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
    // Generic error - don't expose internal details
    return new Response(
      JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
