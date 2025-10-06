import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { name, email } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Missing name or email" }, { status: 400 });
  }

  try {
    // Send email via Resend
    const response = await resend.emails.send({
      from: 'Prospect <no-reply@prospect.money>',
      to: email,
      subject: 'Welcome to Prospect! 🎉',
      html: `<p>Hey ${name},</p><p>Thanks for joining our waitlist! We'll notify you on launch.</p>`
    });

    // Log Response for Debugging
    console.log("Resend response:", response);


    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

}
