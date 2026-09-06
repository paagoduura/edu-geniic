const required = ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
const integrationGroups = [
  ['LOVABLE_API_KEY'],
  ['OPENAI_API_KEY'],
  ['ELEVENLABS_API_KEY'],
  ['INTERSWITCH_MERCHANT_CODE', 'INTERSWITCH_PAY_ITEM_ID', 'INTERSWITCH_MAC_KEY', 'INTERSWITCH_MODE'],
];

const missing = required.filter((name) => !process.env[name]);
const unavailableIntegrations = integrationGroups.filter((group) => group.every((name) => !process.env[name]));

if (missing.length) {
  console.error(`Missing required deployment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (unavailableIntegrations.length) {
  console.warn(`Optional integrations not configured: ${unavailableIntegrations.map((group) => group[0]).join(', ')}`);
}

console.log('Supabase deployment variables are present; secret values were not printed.');
