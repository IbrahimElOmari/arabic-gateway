import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType = 
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "lesson_reminder"
  | "submission_feedback"
  | "enrollment_confirmation"
  | "payment_confirmation"
  | "payment_failed";

interface EmailRequest {
  type: EmailType;
  to: string;
  data: Record<string, any>;
  language?: "nl" | "en" | "ar";
}

const EMAIL_TEMPLATES: Record<EmailType, Record<string, { subject: string; html: (data: any) => string }>> = {
  welcome: {
    nl: {
      subject: "Welkom bij Huis van het Arabisch!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Welkom ${data.name}!</h2>
            <p>Bedankt voor je registratie bij Huis van het Arabisch. We zijn blij dat je deel uitmaakt van onze leergemeenschap.</p>
            <p>Je kunt nu inloggen en beginnen met het verkennen van onze cursussen.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Ga naar het platform
            </a>
            <p style="color: #666; font-size: 14px;">Met vriendelijke groet,<br>Het Huis van het Arabisch Team</p>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Welcome to House of Arabic!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Welcome ${data.name}!</h2>
            <p>Thank you for registering at House of Arabic. We're excited to have you join our learning community.</p>
            <p>You can now log in and start exploring our courses.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Go to Platform
            </a>
            <p style="color: #666; font-size: 14px;">Best regards,<br>The House of Arabic Team</p>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "مرحباً بك في بيت العربية!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>مرحباً ${data.name}!</h2>
            <p>شكراً لتسجيلك في بيت العربية. نحن سعداء بانضمامك إلى مجتمعنا التعليمي.</p>
            <p>يمكنك الآن تسجيل الدخول والبدء في استكشاف دوراتنا.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              انتقل إلى المنصة
            </a>
            <p style="color: #666; font-size: 14px;">مع أطيب التحيات،<br>فريق بيت العربية</p>
          </div>
        </div>
      `,
    },
  },
  password_reset: {
    nl: {
      subject: "Wachtwoord resetten - Huis van het Arabisch",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Wachtwoord resetten</h2>
            <p>Je hebt verzocht om je wachtwoord te resetten. Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Wachtwoord
            </a>
            <p style="color: #666; font-size: 14px;">Deze link is 1 uur geldig. Als je dit niet hebt aangevraagd, kun je deze email negeren.</p>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Reset Password - House of Arabic",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Reset Password</h2>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">This link is valid for 1 hour. If you didn't request this, you can ignore this email.</p>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "إعادة تعيين كلمة المرور - بيت العربية",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>إعادة تعيين كلمة المرور</h2>
            <p>لقد طلبت إعادة تعيين كلمة المرور. انقر على الزر أدناه لتعيين كلمة مرور جديدة:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              إعادة تعيين كلمة المرور
            </a>
            <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة ساعة واحدة. إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني.</p>
          </div>
        </div>
      `,
    },
  },
  lesson_reminder: {
    nl: {
      subject: "Herinnering: Les begint binnenkort!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📚 Lesherinnering</h2>
            <p>Je les <strong>${data.lessonTitle}</strong> begint over ${data.minutesBefore} minuten!</p>
            <p><strong>Tijd:</strong> ${data.scheduledTime}</p>
            <p><strong>Klas:</strong> ${data.className}</p>
            ${data.meetLink ? `
              <a href="${data.meetLink}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Neem deel aan de les
              </a>
            ` : ''}
          </div>
        </div>
      `,
    },
    en: {
      subject: "Reminder: Lesson starting soon!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📚 Lesson Reminder</h2>
            <p>Your lesson <strong>${data.lessonTitle}</strong> starts in ${data.minutesBefore} minutes!</p>
            <p><strong>Time:</strong> ${data.scheduledTime}</p>
            <p><strong>Class:</strong> ${data.className}</p>
            ${data.meetLink ? `
              <a href="${data.meetLink}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Join Lesson
              </a>
            ` : ''}
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تذكير: الدرس يبدأ قريباً!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📚 تذكير بالدرس</h2>
            <p>درسك <strong>${data.lessonTitle}</strong> يبدأ خلال ${data.minutesBefore} دقيقة!</p>
            <p><strong>الوقت:</strong> ${data.scheduledTime}</p>
            <p><strong>الفصل:</strong> ${data.className}</p>
            ${data.meetLink ? `
              <a href="${data.meetLink}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                انضم للدرس
              </a>
            ` : ''}
          </div>
        </div>
      `,
    },
  },
  submission_feedback: {
    nl: {
      subject: "Je inzending is beoordeeld!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📝 Feedback ontvangen</h2>
            <p>Je inzending voor <strong>${data.exerciseTitle}</strong> is beoordeeld door je docent.</p>
            <p><strong>Score:</strong> ${data.score}%</p>
            ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Bekijk details
            </a>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Your submission has been reviewed!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📝 Feedback Received</h2>
            <p>Your submission for <strong>${data.exerciseTitle}</strong> has been reviewed by your teacher.</p>
            <p><strong>Score:</strong> ${data.score}%</p>
            ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Details
            </a>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تم مراجعة إجابتك!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📝 تم استلام التعليقات</h2>
            <p>تمت مراجعة إجابتك لـ <strong>${data.exerciseTitle}</strong> من قبل معلمك.</p>
            <p><strong>الدرجة:</strong> ${data.score}%</p>
            ${data.feedback ? `<p><strong>التعليقات:</strong> ${data.feedback}</p>` : ''}
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              عرض التفاصيل
            </a>
          </div>
        </div>
      `,
    },
  },
  email_verification: {
    nl: {
      subject: "Bevestig je e-mailadres - Huis van het Arabisch",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Bevestig je e-mailadres</h2>
            <p>Klik op de onderstaande knop om je e-mailadres te bevestigen:</p>
            <a href="${data.verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              E-mail Bevestigen
            </a>
            <p style="color: #666; font-size: 14px;">Deze link is 24 uur geldig.</p>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Verify your email - House of Arabic",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Verify your email address</h2>
            <p>Click the button below to verify your email address:</p>
            <a href="${data.verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Verify Email
            </a>
            <p style="color: #666; font-size: 14px;">This link is valid for 24 hours.</p>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تأكيد بريدك الإلكتروني - بيت العربية",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>تأكيد بريدك الإلكتروني</h2>
            <p>انقر على الزر أدناه لتأكيد بريدك الإلكتروني:</p>
            <a href="${data.verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              تأكيد البريد الإلكتروني
            </a>
            <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة 24 ساعة.</p>
          </div>
        </div>
      `,
    },
  },
  enrollment_confirmation: {
    nl: {
      subject: "Inschrijving bevestigd! - Huis van het Arabisch",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>🎉 Inschrijving bevestigd!</h2>
            <p>Je bent succesvol ingeschreven voor <strong>${data.className}</strong>.</p>
            <p><strong>Niveau:</strong> ${data.levelName}</p>
            <p><strong>Startdatum:</strong> ${data.startDate}</p>
            <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Ga naar je dashboard
            </a>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Enrollment confirmed! - House of Arabic",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>🎉 Enrollment confirmed!</h2>
            <p>You have been successfully enrolled in <strong>${data.className}</strong>.</p>
            <p><strong>Level:</strong> ${data.levelName}</p>
            <p><strong>Start date:</strong> ${data.startDate}</p>
            <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Go to your dashboard
            </a>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تم تأكيد التسجيل! - بيت العربية",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>🎉 تم تأكيد التسجيل!</h2>
            <p>تم تسجيلك بنجاح في <strong>${data.className}</strong>.</p>
            <p><strong>المستوى:</strong> ${data.levelName}</p>
            <p><strong>تاريخ البدء:</strong> ${data.startDate}</p>
            <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              انتقل إلى لوحة التحكم
            </a>
          </div>
        </div>
      `,
    },
  },
  payment_confirmation: {
    nl: {
      subject: "Betaling ontvangen - Huis van het Arabisch",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>✅ Betaling ontvangen</h2>
            <p>We hebben je betaling van <strong>€${data.amount}</strong> ontvangen.</p>
            <p><strong>Klas:</strong> ${data.className}</p>
            <p><strong>Datum:</strong> ${data.paymentDate}</p>
            <p><strong>Referentie:</strong> ${data.paymentId}</p>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Payment received - House of Arabic",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>✅ Payment received</h2>
            <p>We have received your payment of <strong>€${data.amount}</strong>.</p>
            <p><strong>Class:</strong> ${data.className}</p>
            <p><strong>Date:</strong> ${data.paymentDate}</p>
            <p><strong>Reference:</strong> ${data.paymentId}</p>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تم استلام الدفعة - بيت العربية",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>✅ تم استلام الدفعة</h2>
            <p>لقد استلمنا دفعتك بقيمة <strong>€${data.amount}</strong>.</p>
            <p><strong>الفصل:</strong> ${data.className}</p>
            <p><strong>التاريخ:</strong> ${data.paymentDate}</p>
            <p><strong>المرجع:</strong> ${data.paymentId}</p>
          </div>
        </div>
      `,
    },
  },
  payment_failed: {
    nl: {
      subject: "Betaling mislukt - Huis van het Arabisch",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>❌ Betaling mislukt</h2>
            <p>Je betaling van <strong>€${data.amount}</strong> voor <strong>${data.className}</strong> is mislukt.</p>
            <p>Controleer je betaalgegevens en probeer het opnieuw.</p>
            <a href="${data.retryUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Probeer opnieuw
            </a>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Payment failed - House of Arabic",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>❌ Payment failed</h2>
            <p>Your payment of <strong>€${data.amount}</strong> for <strong>${data.className}</strong> has failed.</p>
            <p>Please check your payment details and try again.</p>
            <a href="${data.retryUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Try again
            </a>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "فشل الدفع - بيت العربية",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>❌ فشل الدفع</h2>
            <p>فشلت دفعتك بقيمة <strong>€${data.amount}</strong> لـ <strong>${data.className}</strong>.</p>
            <p>يرجى التحقق من بيانات الدفع والمحاولة مرة أخرى.</p>
            <a href="${data.retryUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              حاول مرة أخرى
            </a>
          </div>
        </div>
      `,
    },
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured",
          email_configured: false 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const body: EmailRequest = await req.json();
    const { type, to, data, language = "nl" } = body;

    // Validate required fields
    if (!type || !to || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, to, data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get template
    const template = EMAIL_TEMPLATES[type]?.[language];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown email type or language: ${type}/${language}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const fromDomain = Deno.env.get("EMAIL_FROM_DOMAIN") || "noreply@huisvanhetarabisch.be";
    
    const emailResponse = await resend.emails.send({
      from: `Huis van het Arabisch <${fromDomain}>`,
      to: [to],
      subject: template.subject,
      html: template.html(data),
    });

    console.log(`Email sent successfully: ${type} to ${to}`, emailResponse);

    // Handle response - Resend returns { data: { id }, error }
    const messageId = 'data' in emailResponse && emailResponse.data ? emailResponse.data.id : 'sent';

    return new Response(
      JSON.stringify({ 
        success: true,
        message_id: messageId 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email sending error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
