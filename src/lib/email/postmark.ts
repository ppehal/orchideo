import { createLogger } from '@/lib/logging'

const log = createLogger('email')

const POSTMARK_API_URL = 'https://api.postmarkapp.com/email'

interface PostmarkEmailRequest {
  From: string
  To: string
  Subject: string
  HtmlBody?: string
  TextBody: string
  MessageStream?: string
}

interface PostmarkEmailResponse {
  To: string
  SubmittedAt: string
  MessageID: string
  ErrorCode: number
  Message: string
}

/**
 * Send email via Postmark API
 */
async function sendEmail(
  request: PostmarkEmailRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiToken = process.env.POSTMARK_API_TOKEN

  if (!apiToken) {
    log.warn('POSTMARK_API_TOKEN not configured, email not sent')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch(POSTMARK_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiToken,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    const data = (await response.json()) as PostmarkEmailResponse

    if (!response.ok || data.ErrorCode !== 0) {
      log.error({ errorCode: data.ErrorCode, message: data.Message }, 'Postmark API error')
      return { success: false, error: data.Message || 'Failed to send email' }
    }

    log.info({ messageId: data.MessageID, to: data.To }, 'Email sent successfully')
    return { success: true, messageId: data.MessageID }
  } catch (error) {
    log.error({ error }, 'Failed to send email via Postmark')
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Generate report email HTML template
 */
function generateReportEmailHtml(pageName: string, reportUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Váš Facebook audit je připraven</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #7c3aed; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Orchideo
              </h1>
              <p style="margin: 8px 0 0; color: #e9d5ff; font-size: 14px;">
                Facebook Page Audit
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">
                Váš audit je připraven
              </h2>

              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Dokončili jsme analýzu Facebook stránky <strong style="color: #18181b;">${escapeHtml(pageName)}</strong>.
                Klikněte na tlačítko níže pro zobrazení kompletního reportu s doporučeními.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${reportUrl}"
                       style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Zobrazit report
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Odkaz na report je platný 30 dní. Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
              </p>
              <p style="margin: 8px 0 0; word-break: break-all;">
                <a href="${reportUrl}" style="color: #7c3aed; font-size: 14px;">${reportUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                Tento email byl odeslán z aplikace Orchideo.<br>
                Pokud jste o tento email nežádali, můžete ho ignorovat.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Generate report email plain text
 */
function generateReportEmailText(pageName: string, reportUrl: string): string {
  return `
Váš Facebook audit je připraven

Dokončili jsme analýzu Facebook stránky "${pageName}".

Zobrazit report: ${reportUrl}

Odkaz na report je platný 30 dní.

---
Tento email byl odeslán z aplikace Orchideo.
Pokud jste o tento email nežádali, můžete ho ignorovat.
`.trim()
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Send report email to user
 */
export async function sendReportEmail(
  to: string,
  reportUrl: string,
  pageName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'noreply@ppsys.eu'

  const request: PostmarkEmailRequest = {
    From: fromEmail,
    To: to,
    Subject: `Váš Facebook audit: ${pageName}`,
    HtmlBody: generateReportEmailHtml(pageName, reportUrl),
    TextBody: generateReportEmailText(pageName, reportUrl),
    MessageStream: 'outbound',
  }

  log.info({ to, pageName }, 'Sending report email')

  return sendEmail(request)
}
