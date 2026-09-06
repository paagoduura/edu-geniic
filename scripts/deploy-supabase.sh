#!/usr/bin/env bash
set -Eeuo pipefail

: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to the Supabase project reference}"
: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in the CI/deployment environment}"

export SUPABASE_ACCESS_TOKEN

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required. Install it from https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null
supabase db push --linked

secret_file="$(mktemp)"
cleanup() { rm -f "$secret_file"; }
trap cleanup EXIT

required_secrets=(
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ALLOWED_ORIGINS
)
optional_secrets=(
  LOVABLE_API_KEY
  OPENAI_API_KEY
  ELEVENLABS_API_KEY
  INTERSWITCH_MERCHANT_CODE
  INTERSWITCH_PAY_ITEM_ID
  INTERSWITCH_MAC_KEY
  INTERSWITCH_MODE
)

: > "$secret_file"
for name in "${required_secrets[@]}" "${optional_secrets[@]}"; do
  if [[ -n "${!name:-}" ]]; then
    printf '%s=%s\n' "$name" "${!name}" >> "$secret_file"
  fi
done

if [[ ! -s "$secret_file" ]]; then
  echo "No edge-function secrets were supplied; database migration completed, function deployment skipped." >&2
  exit 0
fi

supabase secrets set --env-file "$secret_file" --project-ref "$SUPABASE_PROJECT_REF" >/dev/null

for function_dir in supabase/functions/*; do
  [[ -d "$function_dir" ]] || continue
  function_name="$(basename "$function_dir")"
  [[ "$function_name" == _shared ]] && continue
  echo "Deploying $function_name"
  supabase functions deploy "$function_name" --project-ref "$SUPABASE_PROJECT_REF"
done

echo "Supabase migration and edge-function deployment completed."
