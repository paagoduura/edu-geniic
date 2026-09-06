import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const migrationDir = join(root, 'supabase', 'migrations');
const requiredTables = [
  'platform_curriculum_versions',
  'platform_competency_prerequisites',
  'platform_curriculum_standards',
  'platform_evidence_security_events',
  'platform_evidence_controls',
  'platform_exam_sessions',
  'platform_exam_attempts',
  'platform_guardian_consents',
  'platform_safeguarding_cases',
  'platform_notification_deliveries',
  'platform_payment_transactions',
  'platform_payment_events',
  'platform_audit_events',
  'platform_data_subject_requests',
];
const requiredPolicies = [
  'school members view curriculum versions',
  'staff manage evidence controls',
  'learners manage own attempts',
  'guardians manage own consents',
  'safeguarding staff only',
  'recipients view notifications',
  'recipients view own payments',
  'users manage own data requests',
];

const files = (await readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
const sql = (await Promise.all(files.map((file) => readFile(join(migrationDir, file), 'utf8')))).join('\n');
const failures = [];

for (const table of requiredTables) {
  if (!new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, 'i').test(sql)) {
    failures.push(`Missing required table: ${table}`);
  }
  const hasStaticRls = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i').test(sql);
  const hasDynamicRls = sql.includes(`'${table}'`) && /ENABLE ROW LEVEL SECURITY/i.test(sql);
  if (!hasStaticRls && !hasDynamicRls) {
    failures.push(`Missing RLS enablement: ${table}`);
  }
}
for (const policy of requiredPolicies) {
  if (!sql.toLowerCase().includes(`create policy "${policy.toLowerCase()}"`)) {
    failures.push(`Missing required policy: ${policy}`);
  }
}
if (!sql.includes('UNIQUE (provider, provider_event_id)')) {
  failures.push('Payment webhook idempotency constraint is missing');
}
if (!sql.includes('REVOKE INSERT, UPDATE, DELETE ON public.platform_practical_programmes FROM authenticated')) {
  failures.push('Global practical catalogue must be read-only to clients');
}

if (failures.length) {
  console.error('Production-readiness validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production-readiness validation passed (${files.length} migration files checked).`);
