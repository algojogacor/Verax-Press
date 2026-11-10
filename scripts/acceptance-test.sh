#!/usr/bin/env bash
# Verifikasi acceptance criteria TA §12.1 — dijalankan terhadap dev server localhost:3000.
# CATATAN: skrip ini MEMUTASI data (alur workflow penuh). Jalankan `db:push+seed` ulang setelahnya.
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1 → $3";
  else FAIL=$((FAIL+1)); echo "FAIL  $1 → expected $2, got $3"; fi
}

# ---------- 1) Ingestion API ----------
CRED=$(grep '^VERITY_INGESTION_DEMO_CLIENT_SECRET=' .env.local | cut -d= -f2)
CID=$(grep '^VERITY_INGESTION_DEMO_CLIENT_ID=' .env.local | cut -d= -f2)
AUTH="Authorization: Bearer ${CID}.${CRED}"

INGEST_BODY='{
  "title": "Uji Acceptance: Naskah dari Agent untuk Verifikasi Gerbang",
  "deck": "Naskah uji otomatis untuk acceptance criteria.",
  "desk": "teknologi-kebijakan",
  "format": "EXPLAINER",
  "content": [{"type":"paragraph","text":"Paragraf pembuka naskah uji acceptance."},{"type":"list","style":"bullet","items":["Poin satu","Poin dua"]}],
  "sources": [{"title":"Rujukan Uji","publisher":"Penguji","url":"https://example.org/uji","sourceType":"SECONDARY","supports":"Klaim uji","isKeySource":true}],
  "aiInvolvement": "substantive",
  "aiUsageNote": "Draf uji dari agent.",
  "agentId": "acceptance-test-agent",
  "idempotencyKey": "accept-test-001"
}'

R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "Content-Type: application/json" -d "$INGEST_BODY")
check "ingestion tanpa auth → 401" 401 "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "$AUTH" -H "Content-Type: application/json" -d '{"title":"Tanpa field wajib"}')
check "ingestion tanpa ai_involvement/idempotency → 422" 422 "$R"

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "$AUTH" -H "Content-Type: application/json" -d "$INGEST_BODY")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "ingestion valid → 201" 201 "$CODE"
echo "      receipt: $BODY"
echo "$BODY" | grep -q '"idempotentReplay":false' && check "receipt bukan replay" ok ok || check "receipt bukan replay" ok missing

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "$AUTH" -H "Content-Type: application/json" -d "$INGEST_BODY")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "ingestion replay idempotent → 200" 200 "$CODE"
echo "$BODY" | grep -q '"idempotentReplay":true' && check "replay flag = true" ok ok || check "replay flag = true" ok missing

DIFF_BODY=$(echo "$INGEST_BODY" | sed 's/Paragraf pembuka/Paragraf BERBEDA/')
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "$AUTH" -H "Content-Type: application/json" -d "$DIFF_BODY")
check "idempotency key sama + payload beda → 409" 409 "$R"

NEWS_BODY=$(echo "$INGEST_BODY" | sed 's/"format": "EXPLAINER"/"format": "NEWS"/; s/accept-test-001/accept-test-news/')
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "$AUTH" -H "Content-Type: application/json" -d "$NEWS_BODY")
check "format NEWS dari agent → 422" 422 "$R"

BAD_DESK=$(echo "$INGEST_BODY" | sed 's/teknologi-kebijakan/desk-tidak-ada/; s/accept-test-001/accept-test-desk/')
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions" -H "$AUTH" -H "Content-Type: application/json" -d "$BAD_DESK")
check "desk tidak valid → 422" 422 "$R"

# Tidak ada endpoint publish untuk API client
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/internal/v1/ai-submissions/publish" -H "$AUTH" -H "Content-Type: application/json" -d '{}')
check "tidak ada endpoint publish agent → 404" 404 "$R"

# ---------- 2) Studio auth & RBAC ----------
login() { # email password jar
  local jar="$3"
  rm -f "$jar"
  CSRF=$(curl -s -c "$jar" "$BASE/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
  curl -s -b "$jar" -c "$jar" -o /dev/null -X POST "$BASE/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$CSRF" \
    --data-urlencode "email=$1" \
    --data-urlencode "password=$2" --data-urlencode "json=true"
}

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/studio/articles")
check "studio tanpa sesi → 401" 401 "$R"

login "chief@verity.test" "VerityChief!2026" /tmp/jar_chief.txt
login "editor@verity.test" "VerityEditor!2026" /tmp/jar_editor.txt
login "penulis@verity.test" "VerityAuthor!2026" /tmp/jar_author.txt

R=$(curl -s -b /tmp/jar_chief.txt -o /dev/null -w "%{http_code}" "$BASE/api/studio/dashboard")
check "dashboard chief → 200" 200 "$R"

R=$(curl -s -b /tmp/jar_editor.txt -o /dev/null -w "%{http_code}" "$BASE/api/studio/api-clients")
check "api-clients oleh editor → 403" 403 "$R"

R=$(curl -s -b /tmp/jar_editor.txt -o /dev/null -w "%{http_code}" "$BASE/api/studio/audit")
check "audit global oleh editor → 403" 403 "$R"

R=$(curl -s -b /tmp/jar_author.txt -o /dev/null -w "%{http_code}" "$BASE/api/studio/complaints")
check "complaints oleh internal author → 403" 403 "$R"

# Ownership: author hanya naskah sendiri
N=$(curl -s -b /tmp/jar_author.txt "$BASE/api/studio/articles?scope=all" | grep -o '"isOwn":true' | wc -l | tr -d ' ')
N_ALL=$(curl -s -b /tmp/jar_chief.txt "$BASE/api/studio/articles" | grep -o '"id":' | wc -l | tr -d ' ')
echo "      (author melihat $N naskah miliknya; chief melihat $N_ALL naskah)"
[ "$N" -lt "$N_ALL" ] && check "isolasi ownership author < chief" ok ok || check "isolasi ownership author < chief" ok "sama"

# ---------- 3) Gate verifikasi sumber + publish chief-only ----------
ART_ID=$(curl -s -b /tmp/jar_chief.txt "$BASE/api/studio/articles?status=PENDING_APPROVAL" | python3 -c "import sys,json; print(json.load(sys.stdin)['articles'][0]['id'])")
echo "      artikel PENDING_APPROVAL: $ART_ID"

R=$(curl -s -b /tmp/jar_editor.txt -o /dev/null -w "%{http_code}" -X POST "$BASE/api/studio/articles/$ART_ID/transition" -H "Content-Type: application/json" -d '{"action":"PUBLISH"}')
check "PUBLISH oleh editor → 403" 403 "$R"

R=$(curl -s -b /tmp/jar_chief.txt -w "\n%{http_code}" -X POST "$BASE/api/studio/articles/$ART_ID/transition" -H "Content-Type: application/json" -d '{"action":"PUBLISH"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "PUBLISH chief + sumber kunci unverified → 422" 422 "$CODE"
echo "$BODY" | grep -q "GATE_SOURCE_VERIFICATION" && check "kode gate = GATE_SOURCE_VERIFICATION" ok ok || check "kode gate = GATE_SOURCE_VERIFICATION" ok "missing"

# Editor memverifikasi sumber kunci yang belum diverifikasi
SRC_ID=$(curl -s -b /tmp/jar_editor.txt "$BASE/api/studio/articles/$ART_ID" | python3 -c "
import sys, json
d = json.load(sys.stdin)
src = next(s for s in d['sources'] if s['isKeySource'] and s['verificationStatus'] == 'UNVERIFIED')
print(src['id'])
")
R=$(curl -s -b /tmp/jar_author.txt -o /dev/null -w "%{http_code}" -X PATCH "$BASE/api/studio/articles/$ART_ID/sources/$SRC_ID" -H "Content-Type: application/json" -d '{"verificationStatus":"VERIFIED"}')
check "verifikasi sumber oleh author → 403" 403 "$R"

R=$(curl -s -b /tmp/jar_editor.txt -o /dev/null -w "%{http_code}" -X PATCH "$BASE/api/studio/articles/$ART_ID/sources/$SRC_ID" -H "Content-Type: application/json" -d '{"verificationStatus":"VERIFIED","verificationNote":"Dicek ke tautan resmi BPK."}')
check "verifikasi sumber oleh editor → 200" 200 "$R"

R=$(curl -s -b /tmp/jar_chief.txt -w "\n%{http_code}" -X POST "$BASE/api/studio/articles/$ART_ID/transition" -H "Content-Type: application/json" -d '{"action":"PUBLISH"}')
CODE=$(echo "$R" | tail -1)
check "PUBLISH chief setelah sumber verified → 200" 200 "$CODE"

R=$(curl -s -b /tmp/jar_chief.txt "$BASE/api/studio/articles/$ART_ID/audit" | grep -o "article.publish\|source.verified" | wc -l)
[ "$R" -ge 2 ] && check "audit event publish+verify tercatat" ok ok || check "audit event publish+verify tercatat" ok "hanya $R"

# Transisi tidak valid
R=$(curl -s -b /tmp/jar_chief.txt -o /dev/null -w "%{http_code}" -X POST "$BASE/api/studio/articles/$ART_ID/transition" -H "Content-Type: application/json" -d '{"action":"SUBMIT_REVIEW"}')
check "transisi invalid dari PUBLISHED → 422" 422 "$R"

# ---------- 4) Complaint publik ----------
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/public/complaints" -H "Content-Type: application/json" -d '{"type":"KELUHAN","senderName":"Uji Otomatis","senderEmail":"uji@example.com","message":"Pesan uji otomatis untuk acceptance criteria lebih dari dua puluh karakter."}')
CODE=$(echo "$R" | tail -1)
check "complaint publik valid → 201" 201 "$CODE"

R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/public/complaints" -H "Content-Type: application/json" -d '{"type":"KELUHAN","senderName":"X","senderEmail":"bukan-email","message":"pendek"}')
check "complaint invalid → 422" 422 "$R"

echo ""
echo "======================================"
echo "PASS: $PASS  FAIL: $FAIL"
echo "======================================"
[ "$FAIL" = "0" ]
