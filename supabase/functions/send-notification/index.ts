import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FROM_EMAIL     = "noreply@aeroqualify.co.ke";
const FROM_NAME      = "AeroQualify Pro";
const APP_URL        = "https://aeroqualify.co.ke";

// ── Shared design tokens ─────────────────────────────────────
const NAVY   = "#0D2340";
const BLUE   = "#01579B";
const LTBLUE = "#E3F2FD";
const GREEN  = "#2E7D32";
const ORANGE = "#E65100";
const RED    = "#C62828";
const PURPLE = "#4527A0";
const MUTED  = "#607D8B";
const BORDER = "#DDE3EA";
const BG     = "#F0F4F8";
const WHITE  = "#FFFFFF";

// ── Severity color helper ─────────────────────────────────────
const sevColor = (sev: string) =>
  sev === "Critical" ? RED : sev === "Major" ? ORANGE : sev === "Minor" ? GREEN : BLUE;

// ── Base email shell ──────────────────────────────────────────
const base = (content: string, accentColor = BLUE) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>AeroQualify Pro</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

      <!-- Header -->
      <tr><td style="background:${NAVY};padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <div style="font-size:22px;font-weight:800;color:${WHITE};letter-spacing:-0.5px;">
              Aero<span style="color:#0288d1;">Qualify</span> Pro
            </div>
            <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;">
              Aviation Quality Management System
            </div>
          </td>
          <td align="right">
            <div style="background:rgba(255,255,255,0.08);border-radius:6px;padding:6px 12px;display:inline-block;">
              <span style="color:rgba(255,255,255,0.5);font-size:10px;text-transform:uppercase;letter-spacing:1px;">Automated Notification</span>
            </div>
          </td>
        </tr></table>
      </td></tr>

      <!-- Accent bar -->
      <tr><td style="background:${accentColor};height:4px;"></td></tr>

      <!-- Body -->
      <tr><td style="padding:32px;">
        ${content}
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:0 32px 28px;" align="center">
        <a href="${APP_URL}" style="display:inline-block;background:${NAVY};color:${WHITE};text-decoration:none;font-size:13px;font-weight:700;padding:12px 32px;border-radius:7px;letter-spacing:0.3px;">
          Open AeroQualify Pro &rarr;
        </a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#F8FAFC;border-top:1px solid ${BORDER};padding:16px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:${MUTED};">
            &copy; 2026 AeroQualify Pro &nbsp;&middot;&nbsp; Nairobi, Kenya
          </td>
          <td align="right" style="font-size:11px;color:${MUTED};">
            <a href="${APP_URL}" style="color:${BLUE};text-decoration:none;">${APP_URL}</a>
          </td>
        </tr></table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

// ── Detail row for tables ─────────────────────────────────────
const row = (label: string, value: string, color?: string) => `
  <tr>
    <td style="padding:9px 14px;background:#F8FAFC;font-size:10px;font-weight:700;color:${MUTED};
               text-transform:uppercase;letter-spacing:0.5px;width:36%;border:1px solid ${BORDER};
               vertical-align:top;">${label}</td>
    <td style="padding:9px 14px;font-size:13px;color:${color || '#1A2332'};
               border:1px solid ${BORDER};vertical-align:top;line-height:1.5;">${value || '—'}</td>
  </tr>`;

// ── CAR reference chip ────────────────────────────────────────
const carChip = (id: string, color = BLUE) => `
  <div style="background:${color}10;border:1.5px solid ${color}40;border-radius:8px;
              padding:14px 18px;margin-bottom:20px;">
    <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;
                letter-spacing:1px;margin-bottom:4px;">CAR Reference</div>
    <div style="font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:${color};">
      ${id}
    </div>
  </div>`;

// ── Alert banner ──────────────────────────────────────────────
const alert = (text: string, color: string, icon: string) => `
  <div style="background:${color}12;border-left:4px solid ${color};border-radius:0 6px 6px 0;
              padding:12px 16px;margin-top:20px;font-size:12px;color:#1A2332;line-height:1.6;">
    <span style="font-size:16px;margin-right:8px;">${icon}</span>
    ${text}
  </div>`;

// ── Section divider ───────────────────────────────────────────
const divider = () => `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;">`;

// ── Days overdue badge ────────────────────────────────────────
const overdueBadge = (days: number) => {
  const color = days >= 14 ? RED : days >= 7 ? ORANGE : "#F57F17";
  return `<span style="background:${color};color:${WHITE};border-radius:20px;padding:3px 10px;
                        font-size:11px;font-weight:700;">${days} day${days !== 1 ? 's' : ''} overdue</span>`;
};

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════
const templates: Record<string, (r: Record<string, string>) => { subject: string; html: string }> = {

  // ── New organisation welcome email ──────────────────────────
  org_welcome: (r) => ({
    subject: `Welcome to AeroQualify Pro — Your Access Details for ${r.org_name}`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">Welcome to AeroQualify Pro</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        Hi ${r.contact_name}, your organisation has been set up on AeroQualify Pro. Here are your access details.
      </p>

      ${r.account_created === 'true' ? `
      <div style="background:#e8f5e9;border:1.5px solid #a5d6a7;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:${GREEN};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Your Login Credentials</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row('Login URL', `<a href="${r.app_url}" style="color:${BLUE};">${r.app_url}</a>`)}
          ${row('Organisation ID', `<span style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${BLUE};">${r.org_id}</span>`)}
          ${row('Email Address', r.contact_email)}
          ${row('Temporary Password', '<span style="font-family:monospace;font-size:15px;font-weight:700;color:#2E7D32;">' + r.temp_password + '</span>')}
        </table>
        <div style="margin-top:12px;font-size:11px;color:#388E3C;line-height:1.6;">
          ⚠ Please change your password after first login via <strong>Settings → My Profile → Change Password</strong>.
        </div>
      </div>` : `
      <div style="background:${LTBLUE};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Your Access Details</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row('Organisation', r.org_name, NAVY)}
          ${row('Organisation ID', `<span style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${BLUE};">${r.org_id}</span>`)}
          ${row('Login URL', `<a href="${r.app_url}" style="color:${BLUE};">${r.app_url}</a>`)}
        </table>
      </div>`}

      ${r.is_demo === 'true' ? `
      <div style="background:#fff3e0;border:1.5px solid #ffcc80;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-weight:700;font-size:13px;color:#e65100;margin-bottom:4px;">⏱ Demo Access</div>
        <div style="font-size:12px;color:#795548;line-height:1.6;">
          Your organisation has been set up with <strong>${r.demo_days}-day demo access</strong>.
          To upgrade to full access after your evaluation, contact us at
          <a href="mailto:aeroqualify@gmail.com" style="color:${BLUE};">aeroqualify@gmail.com</a>.
        </div>
      </div>` : ''}

      <div style="background:#f8fafc;border-radius:8px;padding:16px 18px;margin-bottom:20px;font-size:12px;color:#1A2332;line-height:1.8;">
        <div style="font-weight:700;margin-bottom:8px;color:${NAVY};">Onboarding Your Team</div>
        <p style="margin:0 0 10px;color:${MUTED};">Share the following instructions with each team member who needs access to your organisation on AeroQualify Pro:</p>
        <div><strong>Step 1:</strong> Go to <a href="${r.app_url}" style="color:${BLUE};">${r.app_url}</a> and click <em>Create Account</em></div>
        <div><strong>Step 2:</strong> Register with their work email address</div>
        <div><strong>Step 3:</strong> Enter your Organisation ID: <span style="font-family:'Courier New',monospace;font-weight:700;color:${BLUE};">${r.org_id}</span></div>
        <div><strong>Step 4:</strong> Once registered, you will receive a notification to approve their access — they will be notified by email once approved</div>
      </div>

      ${alert(`Keep your Organisation ID confidential — it links new accounts directly to your organisation's quality management data.`, BLUE, '🔐')}
    `, BLUE),
  }),

  // ── New user signup request — sent to org admin ─────────────
  user_signup_request: (r) => ({
    subject: `Access Request: ${r.full_name} is waiting for approval`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">New User Access Request</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        A new user has registered and is awaiting your approval to access <strong>${r.org_name}</strong>.
      </p>

      <div style="background:${LTBLUE};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">User Details</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row('Full Name', r.full_name)}
          ${row('Email Address', r.email)}
          ${row('Organisation', r.org_name)}
          ${row('Registered', r.registered_at)}
        </table>
      </div>

      ${alert(`<strong>Action Required:</strong> Log in to AeroQualify Pro and go to <strong>Settings → User Access Management</strong> to approve or reject this request. The user is unable to access the system until you approve them.`, ORANGE, '⏳')}
    `, ORANGE),
  }),

  // ── User approved — sent to the newly approved user ─────────
  user_approved: (r) => ({
    subject: `You're approved — Welcome to ${r.org_name} on AeroQualify Pro`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">Your Access Has Been Approved</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        Hi ${r.full_name}, your account has been reviewed and approved. You can now log in to AeroQualify Pro.
      </p>

      <div style="background:#e8f5e9;border:1.5px solid #a5d6a7;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:${GREEN};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Your Access Details</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row('Organisation', r.org_name, NAVY)}
          ${row('Organisation ID', `<span style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${BLUE};">${r.org_id}</span>`)}
          ${row('Role', r.role)}
          ${row('Login URL', `<a href="${r.app_url}" style="color:${BLUE};">${r.app_url}</a>`)}
        </table>
      </div>

      ${alert('You can now log in using your email address and the password you set during registration.', GREEN, '✅')}
    `, GREEN),
  }),

  // ── New access request from landing page ───────────────────
  access_request: (r) => ({
    subject: `New Access Request: ${r.company} — ${r.name}`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">New Access Request</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        A new organisation has requested access to AeroQualify Pro via the website.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Name', r.name)}
        ${row('Organisation', r.company, BLUE)}
        ${row('Email', r.email)}
        ${row('Phone', r.phone || '—')}
        ${r.message ? row('Message', r.message) : ''}
        ${row('Submitted', new Date().toLocaleString('en-GB', {timeZone:'Africa/Nairobi'}))}
      </table>
      ${alert('Log in to the AeroQualify Pro Super Admin portal to review this request and create the organisation.', BLUE, '🏢')}
    `, BLUE),
  }),

  // ── New CAR raised ──────────────────────────────────────────
  car_raised: (r) => ({
    subject: `Action Required: New CAR ${r.id} — ${r.severity} Severity`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">New Corrective Action Request</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        A Corrective Action Request has been raised and assigned to you. Please review the details below and submit your Corrective Action Plan within the required timeframe.
      </p>

      ${carChip(r.id, sevColor(r.severity))}

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Finding Description', r.finding_description)}
        ${row('Severity', `<span style="color:${sevColor(r.severity)};font-weight:700;">${r.severity}</span>`)}
        ${row('Assigned To', r.responsible_manager)}
        ${row('Department', r.department)}
        ${row('Due Date', `<span style="font-weight:700;color:${RED};">${r.due_date}</span>`)}
        ${row('QMS Clause / Reference', r.qms_clause)}
        ${row('Raised By', r.raised_by_name)}
        ${r.audit_ref ? row('Audit Reference', r.audit_ref) : ''}
      </table>

      ${alert(`<strong>Action Required:</strong> Log in to AeroQualify Pro and submit your Corrective Action Plan before the due date shown above. Failure to submit within the required timeframe may result in escalation.`, ORANGE, '⚠️')}
    `, sevColor(r.severity)),
  }),

  // ── CAP submitted for verification ─────────────────────────
  cap_submitted: (r) => ({
    subject: `Verification Required: CAP Submitted for ${r.id}`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">CAP Submitted — Awaiting Verification</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        A Corrective Action Plan has been submitted and is pending your review and verification.
      </p>

      ${carChip(r.id, PURPLE)}

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Submitted By', r.submitted_by_name)}
        ${row('Immediate Action', r.immediate_action)}
        ${row('Root Cause', r.root_cause)}
        ${row('Corrective Action', r.corrective_action)}
        ${row('Preventive Action', r.preventive_action)}
        ${r.evidence_filename ? row('Evidence Attached', r.evidence_filename) : ''}
      </table>

      ${divider()}
      <p style="font-size:12px;color:${MUTED};margin:0;">
        Please log in to AeroQualify Pro, open this CAR, and complete the verification checklist. 
        You may approve and close the CAR, or return it for resubmission with comments.
      </p>

      ${alert(`<strong>Action Required:</strong> Open the CAR in AeroQualify Pro and complete verification. All six verification criteria must be satisfied before the CAR can be closed.`, PURPLE, '🔍')}
    `, PURPLE),
  }),

  // ── CAR closed / verification complete ─────────────────────
  verification_submitted: (r) => {
    const closed = r.status === 'Closed';
    const color = closed ? GREEN : ORANGE;
    return {
      subject: `CAR ${r.id} — ${r.status}`,
      html: base(`
        <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">
          ${closed ? 'CAR Closed — Verification Complete' : 'CAR Verification Update'}
        </h1>
        <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
          ${closed
            ? 'Your Corrective Action Plan has been verified and the CAR has been closed. No further action is required.'
            : 'The Quality Manager has completed review of your Corrective Action Plan.'}
        </p>

        ${carChip(r.id, color)}

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
          ${row('Final Status', `<span style="color:${color};font-weight:700;">${r.status}</span>`)}
          ${r.effectiveness_rating ? row('Effectiveness Rating', r.effectiveness_rating) : ''}
          ${row('Verified By', r.verified_by_name)}
          ${r.comments ? row('Verifier Comments', r.comments) : ''}
        </table>

        ${closed
          ? alert('This CAR has been closed and locked. All records have been retained in the Change Log.', GREEN, '✅')
          : alert(`<strong>Note:</strong> Please review the verifier's comments and take any necessary further action.`, ORANGE, 'ℹ️')
        }
      `, color),
    };
  },

  // ── CAP returned for resubmission ──────────────────────────
  returned_for_resubmission: (r) => ({
    subject: `Action Required: CAP Returned — ${r.id}`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">CAP Returned for Resubmission</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        Your Corrective Action Plan has been reviewed by the Quality Manager and returned for revision. Please review the comments below and resubmit.
      </p>

      ${carChip(r.id, RED)}

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Verification Result', `<span style="color:${RED};font-weight:700;">Not Satisfactory — Returned</span>`)}
        ${row('Quality Manager Comments', `<span style="color:#1A2332;">${r.comments || '—'}</span>`)}
        ${row('Round', r.round ? `Submission #${r.round}` : '—')}
      </table>

      ${alert(`<strong>Action Required:</strong> Log in to AeroQualify Pro, carefully review the Quality Manager's comments above, revise your CAP accordingly, and resubmit with updated evidence.`, RED, '🔄')}
    `, RED),
  }),

  // ── Audit notification ──────────────────────────────────────
  audit_scheduled: (r) => ({
    subject: `Audit Notification: ${r.area} — ${r.planned_date || 'Date TBC'}`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">Audit Notification</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        The following audit has been scheduled. Please ensure all relevant records, documentation and personnel are prepared and available on the date of audit.
      </p>

      <div style="background:${LTBLUE};border-radius:8px;padding:18px 20px;margin-bottom:24px;">
        <div style="font-size:18px;font-weight:700;color:${BLUE};">${r.area}</div>
        <div style="font-size:12px;color:${MUTED};margin-top:4px;">
          ${r.audit_type || 'Internal'} Audit &nbsp;&middot;&nbsp; ${r.year} Programme &nbsp;&middot;&nbsp; Slot #${r.slot}
        </div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Planned Date', `<span style="font-weight:700;color:${BLUE};">${r.planned_date || 'TBC'}</span>`)}
        ${row('Auditee / Responsible Manager', r.auditee || 'TBC')}
        ${row('Lead Auditor', r.lead_auditor || 'TBC')}
        ${row('Opening Brief', r.opening_brief || 'TBC')}
        ${row('Closing Brief', r.closing_brief || 'TBC')}
        ${row('Audit Criteria', r.audit_criteria || 'Quality Manual')}
        ${row('Scope', r.notes || 'As per Annual Audit Programme')}
      </table>

      ${alert('A formal Audit Notification Form (QMS 002) will be issued separately. Please ensure all documentation is current and accessible on the day of the audit.', BLUE, '📋')}
    `, BLUE),
  }),

  // ── Overdue CAR reminder — Day 1 (just became overdue) ─────
  car_overdue_reminder: (r) => ({
    subject: `Overdue: CAR ${r.id} — Response Required`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">Corrective Action Request Overdue</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        The Corrective Action Plan for the following CAR has not been submitted and is now past its due date.
      </p>

      ${carChip(r.id, RED)}

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Status', `<span style="color:${RED};font-weight:700;">OVERDUE</span>`)}
        ${row('Days Overdue', overdueBadge(parseInt(r.days_overdue || '1')))}
        ${row('Finding', r.finding_description)}
        ${row('Severity', `<span style="color:${sevColor(r.severity)};font-weight:700;">${r.severity}</span>`)}
        ${row('Original Due Date', r.due_date)}
        ${row('Assigned To', r.responsible_manager)}
      </table>

      ${alert(`<strong>Immediate Action Required:</strong> Please log in to AeroQualify Pro and submit your Corrective Action Plan as soon as possible. Continued non-submission will be escalated to the Quality Manager.`, RED, '🚨')}
    `, RED),
  }),

  // ── Overdue CAR reminder — Day 7 escalation ─────────────────
  car_overdue_escalation: (r) => ({
    subject: `ESCALATION: CAR ${r.id} — ${r.days_overdue} Days Overdue`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">CAR Escalation Notice</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        This is an escalation notice. The Corrective Action Plan for the CAR below has not been submitted and is significantly overdue.
      </p>

      <div style="background:${RED}12;border:1.5px solid ${RED}40;border-radius:8px;padding:16px 18px;margin-bottom:20px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:${RED};">${r.days_overdue}</div>
        <div style="font-size:12px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:1px;">Days Overdue</div>
        <div style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${NAVY};margin-top:8px;">${r.id}</div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Finding', r.finding_description)}
        ${row('Severity', `<span style="color:${sevColor(r.severity)};font-weight:700;">${r.severity}</span>`)}
        ${row('Original Due Date', r.due_date)}
        ${row('Assigned To', r.responsible_manager)}
        ${row('Department', r.department)}
      </table>

      ${alert(`<strong>Escalation:</strong> This CAR is ${r.days_overdue} days overdue. The Quality Manager has been notified. Please submit your Corrective Action Plan immediately to avoid further escalation.`, RED, '🔴')}
    `, RED),
  }),

  // ── Overdue CAR — Manager notice at 14 days (escalated to QM) ─
  car_overdue_escalated_manager: (r) => ({
    subject: `Notice: CAR ${r.id} — Escalated to Quality Manager`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">CAR Escalated to Quality Manager</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        This CAR has been outstanding for ${r.days_overdue} days without a submitted Corrective Action Plan. This matter has now been formally escalated to the Quality Manager.
      </p>

      <div style="background:${RED}12;border:1.5px solid ${RED}40;border-radius:8px;padding:16px 18px;margin-bottom:20px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Escalated to Quality Manager</div>
        <div style="font-size:32px;font-weight:800;color:${RED};">${r.days_overdue}</div>
        <div style="font-size:12px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:1px;">days overdue</div>
        <div style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${NAVY};margin-top:8px;">${r.id}</div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Finding', r.finding_description)}
        ${row('Severity', r.severity)}
        ${row('Original Due Date', r.due_date)}
        ${row('Assigned To', r.responsible_manager)}
      </table>

      ${alert('<strong>Please take immediate action.</strong> The Quality Manager (' + (r.qm_name || 'Quality Manager') + ') has been notified of this outstanding CAR and may follow up with you directly. Log in to AeroQualify Pro and submit your Corrective Action Plan immediately.', RED, '🔴')}
    `, RED),
  }),

  // ── Overdue CAR — QM notification at 14 days ────────────────
  car_overdue_qm_alert: (r) => ({
    subject: `QM Alert: CAR ${r.id} — ${r.days_overdue} Days Overdue — No Response`,
    html: base(`
      <h1 style="margin:0 0 4px;font-size:22px;color:${NAVY};">Quality Manager Alert — Overdue CAR</h1>
      <p style="margin:0 0 24px;font-size:13px;color:${MUTED};">
        This CAR has received no response for ${r.days_overdue} days past its due date. No Corrective Action Plan has been submitted. Your intervention is required.
      </p>

      <div style="background:${RED}12;border:1.5px solid ${RED}40;border-radius:8px;padding:16px 18px;margin-bottom:20px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">No Response Received</div>
        <div style="font-size:32px;font-weight:800;color:${RED};">${r.days_overdue} days</div>
        <div style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${NAVY};margin-top:8px;">${r.id}</div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        ${row('Finding', r.finding_description)}
        ${row('Severity', `<span style="color:${sevColor(r.severity)};font-weight:700;">${r.severity}</span>`)}
        ${row('Original Due Date', r.due_date)}
        ${row('Responsible Manager', `<span style="font-weight:700;">${r.responsible_manager}</span>`)}
        ${row('Department', r.department)}
      </table>

      ${alert(`<strong>Quality Manager Action Required:</strong> The responsible manager (${r.responsible_manager}) has not submitted a CAP for ${r.days_overdue} days. Please follow up directly and consider reassigning or escalating this CAR in accordance with your Quality Manual.`, RED, '🔔')}
    `, RED),
  }),

};

// ═══════════════════════════════════════════════════════════════
// SEND EMAIL VIA RESEND
// ═══════════════════════════════════════════════════════════════
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.warn("No RESEND_API_KEY set"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// CREATE ORG USER — called from App on org creation
// Creates a Supabase auth user + profile and sends welcome email
// ═══════════════════════════════════════════════════════════════
async function createOrgUser(orgId: string, orgName: string, orgSlug: string, contactName: string, contactEmail: string, isDemo: boolean, demoDays: number) {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Generate a temporary password
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let tempPassword = "";
  for(let i=0;i<10;i++) tempPassword += chars[Math.floor(Math.random()*chars.length)];

  // Create auth user
  const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
    email: contactEmail,
    password: tempPassword,
    email_confirm: true,  // skip email verification — we handle it
    user_metadata: { full_name: contactName },
  });

  if(authErr) {
    console.error("Failed to create auth user:", authErr);
    return { error: authErr.message };
  }

  const userId = authUser.user.id;

  // Create profile as admin
  const { error: profErr } = await sb.from("profiles").upsert({
    id: userId,
    email: contactEmail,
    full_name: contactName,
    org_id: orgId,
    role: "admin",
    status: "approved",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if(profErr) console.warn("Profile upsert warning:", profErr);

  return { userId, tempPassword };
}

// ═══════════════════════════════════════════════════════════════
// ESCALATING OVERDUE REMINDER LOGIC
// Runs when type = "check_overdue_cars"
// Called by pg_cron daily at 08:00 EAT
// ═══════════════════════════════════════════════════════════════
async function processOverdueCARs() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Supabase credentials not set for overdue check");
    return { processed: 0 };
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const today = new Date().toISOString().split("T")[0];

  // Fetch all open CARs past due date
  const { data: cars, error } = await sb
    .from("cars")
    .select(`
      id, finding_description, severity, due_date, department,
      responsible_manager, org_id, status
    `)
    .in("status", ["Open", "In Progress", "Returned for Resubmission"])
    .lt("due_date", today)
    .not("due_date", "is", null);

  if (error) { console.error("Overdue query failed:", error); return { processed: 0 }; }
  if (!cars || cars.length === 0) return { processed: 0 };

  let sent = 0;

  for (const car of cars) {
    const dueDate  = new Date(car.due_date);
    const now      = new Date();
    const daysOver = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Only send on specific escalation days: day 1, day 7, day 14+
    const shouldSend = daysOver === 1 || daysOver === 7 || daysOver === 14;
    if (!shouldSend) continue;

    // Get responsible manager email from responsible_managers table
    const { data: managers } = await sb
      .from("responsible_managers")
      .select("email")
      .eq("org_id", car.org_id)
      .eq("role_title", car.responsible_manager)
      .single();

    // Get Quality Manager email from profiles
    const { data: qmProfile } = await sb
      .from("profiles")
      .select("email")
      .eq("org_id", car.org_id)
      .eq("role", "quality_manager")
      .eq("status", "approved")
      .limit(1)
      .single();

    const record = {
      id: car.id,
      finding_description: car.finding_description || "",
      severity: car.severity || "Minor",
      due_date: car.due_date,
      department: car.department || "",
      responsible_manager: car.responsible_manager || "",
      days_overdue: String(daysOver),
    };

    const managerEmail = managers?.email;
    const qmEmail      = qmProfile?.email;

    if (daysOver === 1 && managerEmail) {
      // Day 1: gentle reminder to responsible manager only
      const { subject, html } = templates.car_overdue_reminder(record);
      await sendEmail(managerEmail, subject, html);
      sent++;
    }

    if (daysOver === 7 && managerEmail) {
      // Day 7: escalation email to responsible manager
      const { subject, html } = templates.car_overdue_escalation(record);
      await sendEmail(managerEmail, subject, html);
      sent++;
    }

    if (daysOver === 14) {
      // Day 14: manager gets escalation notice, QM gets alert
      if (managerEmail) {
        const managerRecord = { ...record, qm_name: qmProfile?.email || "Quality Manager" };
        const { subject, html } = templates.car_overdue_escalated_manager(managerRecord);
        await sendEmail(managerEmail, subject, html);
        sent++;
      }
      if (qmEmail) {
        const { subject, html } = templates.car_overdue_qm_alert(record);
        await sendEmail(qmEmail, subject, html);
        sent++;
      }
    }
  }

  return { processed: cars.length, sent };
}

// ═══════════════════════════════════════════════════════════════
// SERVE
// ═══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    }
  });

  try {
    const { type, record, recipients } = await req.json();

    // Handle org user creation
    if (type === "create_org_user") {
      const { org_id, org_name, org_slug, contact_name, contact_email, is_demo, demo_days } = record || {};
      if(!contact_email || !org_id) return new Response(JSON.stringify({ error:"Missing required fields" }), { status:400 });
      const result = await createOrgUser(org_id, org_name, org_slug, contact_name, contact_email, is_demo==="true", parseInt(demo_days)||14);
      if(result.error) return new Response(JSON.stringify({ error: result.error }), { status:500 });

      // Send welcome email with temp password
      const { subject, html } = templates.org_welcome({
        org_name, org_id: org_slug, contact_name, contact_email,
        is_demo, demo_days, app_url: "https://aeroqualify.co.ke",
        temp_password: result.tempPassword,
        account_created: "true",
      });
      await sendEmail(contact_email, subject, html);
      return new Response(JSON.stringify({ ok:true, userId: result.userId }), {
        headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
      });
    }

    // Handle overdue check (triggered by pg_cron)
    if (type === "check_overdue_cars") {
      const result = await processOverdueCARs();
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Handle standard notification
    const tmplFn = templates[type];
    if (!tmplFn) return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });

    const { subject, html } = tmplFn(record || {});
    const toList = (recipients || []).filter(Boolean);
    if (toList.length === 0) return new Response(JSON.stringify({ ok: true, message: "No recipients" }), { status: 200 });

    await Promise.all(toList.map((email: string) => sendEmail(email, subject, html)));

    return new Response(JSON.stringify({ ok: true, sent: toList.length }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
