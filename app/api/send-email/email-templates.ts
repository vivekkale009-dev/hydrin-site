export function customerTemplate(name: string, ticketId: string) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6f9;padding:40px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
        
        <!-- HEADER -->
        <tr>
          <td style="background:#0A6CFF;padding:30px 20px;text-align:center;">
            <img src="https://hydrin-site.vercel.app/EarthyLogo.JPG" alt="Earthy Source" style="width:120px;margin-bottom:10px;">
            <h1 style="color:#fff;font-size:20px;margin:0;font-weight:600;letter-spacing:0.5px;">
              Earthy Source Support
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:30px 25px;">
            <h2 style="font-size:18px;color:#222;margin:0 0 12px 0;font-weight:600;">
              Hi ${name},
            </h2>

            <p style="color:#555;margin:0 0 20px 0;line-height:1.55;">
              Your complaint has been received and a new support ticket has been created.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
              <tr>
                <td style="background:#eef4ff;padding:16px;border-left:5px solid #0A6CFF;">
                  <p style="margin:0;font-size:16px;font-weight:bold;color:#0A6CFF;">
                    Ticket ID: ${ticketId}
                  </p>
                </td>
              </tr>
            </table>

            <p style="color:#555;margin-top:20px;line-height:1.55;">
              Our team will get back to you shortly.<br>
              Thank you for choosing <strong>Earthy Source</strong>.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f1f3f6;text-align:center;padding:20px 10px;color:#777;font-size:12px;">
            © 2025 Earthy Source • All Rights Reserved
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;
}



export function adminTemplate({
  name, phone, email, message, ticketId
}: {
  name: string; phone: string; email: string; message: string; ticketId: string;
}) {

  const dateTime = new Date().toLocaleString("en-IN");


  // prepare mailto link
  const mailtoUrl = `mailto:${email}?subject=Reply%20Regarding%20Ticket%20ID%20${ticketId}&body=Hi%20${encodeURIComponent(
    name
  )},%0A%0A`;

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6f9;padding:40px 0;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
        style="background:#ffffff;border-radius:12px;overflow:hidden;position:relative;font-family:Arial,Helvetica,sans-serif;
               box-shadow:0 4px 14px rgba(0,0,0,0.08);">


        <!-- HEADER -->
        <tr>
          <td style="background:#0A6CFF;padding:30px 20px;text-align:center;">
            <img src="https://hydrin-site.vercel.app/EarthyLogo.JPG" alt="Earthy Source" style="width:120px;margin-bottom:10px;">
            <h1 style="color:#fff;font-size:20px;margin:0;font-weight:600;">
              New Complaint Received
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:30px 25px;">

            <!-- Ticket info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
              <tr>
                <td style="background:#eef4ff;padding:16px;border-left:5px solid #0A6CFF;">
                  <p style="margin:0;font-size:16px;font-weight:bold;color:#0A6CFF;">
                    Ticket ID: ${ticketId}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Customer Details -->
            <h3 style="font-size:17px;color:#222;margin:0 0 12px 0;font-weight:600;">
              Customer Details
            </h3>

            <p style="color:#555;margin:4px 0;"><strong>Name:</strong> ${name}</p>
            <p style="color:#555;margin:4px 0;"><strong>Phone:</strong> ${phone}</p>
            <p style="color:#555;margin:4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="color:#555;margin:4px 0 20px 0;"><strong>Submitted At:</strong> ${dateTime}</p>

            <!-- Message -->
            <h3 style="font-size:17px;color:#222;margin:0 0 12px 0;font-weight:600;">
              Message
            </h3>

            <div style="background:#fafafa;padding:18px;border-radius:6px;border:1px solid #eee;color:#444;line-height:1.55;margin-bottom:25px;">
              ${message}
            </div>

            <!-- REPLY BUTTON -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
              <tr>
                <td>
                  <a href="${mailtoUrl}" 
                     style="background:#0A6CFF;color:#fff;padding:12px 24px;border-radius:6px;font-size:15px;text-decoration:none;font-weight:600;display:inline-block;">
                    Reply to Customer
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f1f3f6;text-align:center;padding:20px 10px;color:#777;font-size:12px;">
            © 2025 Earthy Source • Internal Notification
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>`;
}
