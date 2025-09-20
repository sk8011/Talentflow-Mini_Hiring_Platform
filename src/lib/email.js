// EmailJS client-side helper
// Requires env vars:
//   VITE_SERVICE_ID
//   VITE_TEMPLATE_ID
//   VITE_PUBLIC_KEY
// Template should accept variables like: to_email, to_name, temp_password

import emailjs from '@emailjs/browser'

let inited = false

export async function sendInviteEmail({ toEmail, candidateName, tempPassword }) {
  const serviceId = import.meta?.env?.VITE_SERVICE_ID
  const templateId = import.meta?.env?.VITE_TEMPLATE_ID
  const publicKey = import.meta?.env?.VITE_PUBLIC_KEY

  // Debug logging to check env loading
  if (typeof window !== 'undefined') {
    console.log('[EmailJS] Env values:', {
      VITE_SERVICE_ID: import.meta.env.VITE_SERVICE_ID,
      VITE_TEMPLATE_ID: import.meta.env.VITE_TEMPLATE_ID,
      VITE_PUBLIC_KEY: import.meta.env.VITE_PUBLIC_KEY
    })
  }

  if (!serviceId || !templateId || !publicKey) {
    const missing = [
      !serviceId && 'VITE_SERVICE_ID',
      !templateId && 'VITE_TEMPLATE_ID',
      !publicKey && 'VITE_PUBLIC_KEY',
    ].filter(Boolean)
    if (typeof window !== 'undefined') {
      console.warn('[EmailJS] Missing env:', { serviceId, templateId, publicKey, missing })
    }
    return { ok: false, skipped: true, reason: `Missing EmailJS env: ${missing.join(', ')}` }
  }

  try {
    if (!inited) {
      emailjs.init({ publicKey })
      inited = true
    }
    const params = {
      to_email: toEmail,
      to_name: candidateName || toEmail,
      temp_password: String(tempPassword || ''),
      // Also provide common aliases to match different template setups
      user_email: toEmail,
      user_name: candidateName || toEmail,
      reply_to: toEmail,
      from_name: 'TalentFlow HR',
      to: toEmail,
      message: `Your temporary password is: ${String(tempPassword || '')}`,
    }
    const res = await emailjs.send(serviceId, templateId, params, { publicKey })
    return { ok: true, res }
  } catch (err) {
    const msg = err?.text || err?.message || String(err)
    return { ok: false, error: msg }
  }
}
