import type { APIRoute } from 'astro';
import { 
  escapeHtml, 
  checkRateLimit, 
  verifyOrigin, 
  getClientIp,
  isValidEmail,
  sanitizeTextInput
} from '../../lib/security';

interface Env {
  CONTACT_EMAIL?: string;
  RESEND_API_KEY?: string;
  RATE_LIMIT_KV?: KVNamespace;
}

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
  'https://cyberbrosecurity.work',
  'https://www.cyberbrosecurity.work',
  'http://localhost:4321', // For local development
  'http://localhost:3000'
];

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // CSRF Protection: Verify origin
    if (!verifyOrigin(request, ALLOWED_ORIGINS)) {
      console.warn('CSRF attempt detected from:', request.headers.get('origin'));
      return new Response(
        JSON.stringify({ error: 'Invalid request origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate Limiting: Get client IP and check rate limit
    const runtime = locals.runtime as { env: Env } | undefined;
    const clientIp = getClientIp(request);
    const rateLimitKey = `contact_rate_limit:${clientIp}`;
    
    const rateLimit = await checkRateLimit(
      runtime?.env?.RATE_LIMIT_KV,
      rateLimitKey,
      5, // Max 5 requests
      3600 // Per hour
    );

    if (rateLimit.limited) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
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

    const data = await request.json();
    const { name, email, institution, message, consent } = data;

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate PDPA consent
    if (!consent) {
      return new Response(
        JSON.stringify({ error: 'You must provide consent to process your personal data as required by Malaysian PDPA 2010' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Server-side input validation and sanitization
    const nameValidation = sanitizeTextInput(name, 100, 'Name');
    if (!nameValidation.valid) {
      return new Response(
        JSON.stringify({ error: nameValidation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const messageValidation = sanitizeTextInput(message, 5000, 'Message');
    if (!messageValidation.valid) {
      return new Response(
        JSON.stringify({ error: messageValidation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation with length check
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize institution (optional field)
    const institutionValidation = institution 
      ? sanitizeTextInput(institution, 200, 'Institution')
      : { valid: true, sanitized: '' };
    
    if (institution && !institutionValidation.valid) {
      return new Response(
        JSON.stringify({ error: institutionValidation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables from Cloudflare runtime
    const recipientEmail = runtime?.env?.CONTACT_EMAIL;
    const resendApiKey = runtime?.env?.RESEND_API_KEY;

    if (!recipientEmail || !resendApiKey) {
      console.error('Email service not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please contact the administrator.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use sanitized values and escape HTML to prevent XSS
    const sanitizedName = escapeHtml(nameValidation.sanitized);
    const sanitizedEmail = escapeHtml(email.trim());
    const sanitizedInstitution = institutionValidation.sanitized 
      ? escapeHtml(institutionValidation.sanitized) 
      : 'Not provided';
    const sanitizedMessage = escapeHtml(messageValidation.sanitized).replace(/\n/g, '<br>');

    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CyberBro Contact Form <noreply@cyberbrosecurity.work>',
        to: [recipientEmail],
        reply_to: email.trim(),
        subject: `New Contact Form: ${nameValidation.sanitized}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${sanitizedName}</p>
          <p><strong>Email:</strong> ${sanitizedEmail}</p>
          <p><strong>Institution:</strong> ${sanitizedInstitution}</p>
          <h3>Message:</h3>
          <p>${sanitizedMessage}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
          <p style="font-size: 12px; color: #666;">
            <strong>PDPA Compliance:</strong> User has provided consent for data processing as required by Malaysian PDPA 2010.
            <br>Consent obtained on: ${new Date().toISOString()}
            <br>Client IP: ${clientIp}
          </p>
        `,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      console.error('Resend API error:', response.status);
      // Don't expose internal error details to client
      throw new Error('Email service error');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    // Generic error message - don't expose internal details
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send message. Please try again later.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
