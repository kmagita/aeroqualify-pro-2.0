/* eslint-disable */
import { createClient } from '@supabase/supabase-js';
export const SUPABASE_URL = "https://lsgawxzpilototfsummm.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZ2F3eHpwaWxvdG90ZnN1bW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDU3MTcsImV4cCI6MjA4NzY4MTcxN30.HLCaCqZ-YjywEhNC2e6LtR3haLivuZ13ukit1AeZ0QM";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
export const TABLES = {
  cars: 'cars', caps: 'caps', verifications: 'capa_verifications',
  documents: 'documents', flightDocs: 'flight_school_docs',
  audits: 'audits', contractors: 'contractors',
  changeLog: 'change_log', profiles: 'profiles',
  managers: 'responsible_managers',
  risks: 'risk_register',
  auditSchedule: 'audit_schedule',
};
export async function logChange({ user, action, table, recordId, recordTitle, oldData, newData }) {
  try {
    await supabase.from(TABLES.changeLog).insert({
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email,
      action, table_name: table, record_id: recordId,
      record_title: recordTitle, old_data: oldData || null, new_data: newData || null,
    });
  } catch(e) { console.warn('Log failed:', e.message); }
}
export async function sendNotification({ type, record, recipients }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { type, record, recipients },
    });
    if (error) console.error('[notify] error:', error);
  } catch(e) { console.error('[notify] failed:', e.message); }
}
