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

    const recipientEmail = import.meta.env.CONTACT_EMAIL;

    // TEMP DEBUG: log presence (boolean) so we can confirm runtime visibility
    // Do NOT log the actual value (may be sensitive) — only log whether it's present.
    console.log('CONTACT_EMAIL present?', Boolean(recipientEmail));

    if (!recipientEmail || recipientEmail === 'your-email@example.com') {
      console.error('CONTACT_EMAIL environment variable not configured');
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
