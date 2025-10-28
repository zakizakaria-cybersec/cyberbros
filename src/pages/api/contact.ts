import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
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

    // Try multiple places for the CONTACT_EMAIL so this works across
    // build-time (import.meta.env) and runtime (Cloudflare Worker bindings).
    let recipientEmail = '';
    let emailSource = 'none';

    // 1) Vite / Astro build replacement
    try {
      // use a guarded access to avoid TS errors if import.meta isn't available
      // @ts-ignore
      const v = typeof import !== 'undefined' && typeof import.meta !== 'undefined' ? (import.meta as any).env?.CONTACT_EMAIL : undefined;
      if (v) {
        recipientEmail = String(v);
        emailSource = 'import.meta.env';
      }
    } catch (e) {
      // ignore
    }

    // 2) Node/process (local dev)
    if (!recipientEmail && typeof process !== 'undefined' && process.env?.CONTACT_EMAIL) {
      recipientEmail = String(process.env.CONTACT_EMAIL);
      emailSource = 'process.env';
    }

    // 3) Cloudflare Workers / Pages runtime binding (wrangler "vars") may be exposed
    // on the global scope. Try globalThis as a last-resort lookup.
    if (!recipientEmail && typeof globalThis !== 'undefined' && (globalThis as any).CONTACT_EMAIL) {
      recipientEmail = String((globalThis as any).CONTACT_EMAIL);
      emailSource = 'globalThis';
    }

    // TEMP DEBUG: log presence (boolean) and which source was used. Do NOT log the raw email value.
    console.log('CONTACT_EMAIL present?', Boolean(recipientEmail), 'source:', emailSource);

    if (!recipientEmail || recipientEmail === 'your-email@example.com') {
      console.error('CONTACT_EMAIL environment variable not configured (no value found in import.meta.env, process.env, or globalThis)');
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please contact the administrator.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email using MailChannels (free on Cloudflare Workers/Pages)
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipientEmail }],
          },
        ],
        from: {
          email: `noreply@${new URL(request.url).hostname}`,
          name: 'CyberBro Security Contact Form',
        },
        reply_to: {
          email: email,
          name: name,
        },
        subject: `New Contact Form Submission from ${name}`,
        content: [
          {
            type: 'text/plain',
            value: `
Name: ${name}
Email: ${email}
Institution: ${institution || 'Not provided'}

Message:
${message}
            `.trim(),
          },
          {
            type: 'text/html',
            value: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Institution:</strong> ${institution || 'Not provided'}</p>
              <h3>Message:</h3>
              <p>${message.replace(/\n/g, '<br>')}</p>
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MailChannels error:', response.status, errorText);
      throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
    }

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
        details: errorMessage // This will help debug in production logs
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
