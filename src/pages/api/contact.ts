import type { APIRoute } from 'astro';

interface Env {
  CONTACT_EMAIL?: string;
  RESEND_API_KEY?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { name, email, institution, message } = data;

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables from Cloudflare runtime
    const runtime = locals.runtime as { env: Env } | undefined;
    const recipientEmail = runtime?.env?.CONTACT_EMAIL;
    const resendApiKey = runtime?.env?.RESEND_API_KEY;

    console.log('Environment check:', {
      hasRecipient: !!recipientEmail,
      hasApiKey: !!resendApiKey,
      runtimeExists: !!runtime
    });

    if (!recipientEmail) {
      console.error('CONTACT_EMAIL not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please contact the administrator.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please contact the administrator.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CyberBro Security <onboarding@resend.dev>',
        to: [recipientEmail],
        reply_to: email,
        subject: `New Contact Form: ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Institution:</strong> ${institution || 'Not provided'}</p>
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', response.status, result);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send message. Please try again later.',
        details: errorMessage
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
