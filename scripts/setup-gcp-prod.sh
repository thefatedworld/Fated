#!/usr/bin/env bash
# =============================================================================
# FatedWorld — One-time GCP PROD bootstrap
# Run ONCE after staging is confirmed healthy.
# =============================================================================
# Usage:
#   export PROD_PROJECT_ID=your-prod-project-id
#   export GITHUB_ORG=thefatedworld
#   export GITHUB_REPO=Fated
#   bash scripts/setup-gcp-prod.sh

set -euo pipefail

: "${PROD_PROJECT_ID:?Set PROD_PROJECT_ID}"
: "${GITHUB_ORG:?Set GITHUB_ORG}"
: "${GITHUB_REPO:?Set GITHUB_REPO}"

REGION="us-central1"

echo "=== FatedWorld GCP PROD Bootstrap ==="
echo "Project:  $PROD_PROJECT_ID"
echo "Region:   $REGION"
echo ""

gcloud config set project "$PROD_PROJECT_ID"

# ── 1. Enable APIs ────────────────────────────────────────────────────────────
echo "[1/7] Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  pubsub.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  redis.googleapis.com \
  bigquery.googleapis.com \
  firebase.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project="$PROD_PROJECT_ID" \
  --quiet

# ── 2. Terraform state bucket ─────────────────────────────────────────────────
echo "[2/7] Creating Terraform state bucket..."
TF_BUCKET="fatedworld-tfstate-prod"
if ! gcloud storage buckets describe "gs://$TF_BUCKET" --project="$PROD_PROJECT_ID" &>/dev/null; then
  gcloud storage buckets create "gs://$TF_BUCKET" \
    --project="$PROD_PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
  gcloud storage buckets update "gs://$TF_BUCKET" --versioning
fi

# ── 3. Workload Identity Federation ──────────────────────────────────────────
echo "[3/7] Setting up Workload Identity Federation..."
WIF_POOL="github-pool"
WIF_PROVIDER="github-provider"
CLOUDBUILD_SA="fated-cloudbuild-sa@${PROD_PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$CLOUDBUILD_SA" --project="$PROD_PROJECT_ID" &>/dev/null; then
  gcloud iam service-accounts create fated-cloudbuild-sa \
    --display-name="FatedWorld Cloud Build SA (prod)" \
    --project="$PROD_PROJECT_ID"
fi

if ! gcloud iam workload-identity-pools describe "$WIF_POOL" \
     --project="$PROD_PROJECT_ID" --location="global" &>/dev/null; then
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --project="$PROD_PROJECT_ID" \
    --location="global" \
    --display-name="GitHub Actions Pool"
fi

WIF_POOL_ID=$(gcloud iam workload-identity-pools describe "$WIF_POOL" \
  --project="$PROD_PROJECT_ID" --location="global" \
  --format='value(name)')

if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
     --project="$PROD_PROJECT_ID" --location="global" \
     --workload-identity-pool="$WIF_POOL" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --project="$PROD_PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="$WIF_POOL" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository=='${GITHUB_ORG}/${GITHUB_REPO}'"
fi

gcloud iam service-accounts add-iam-policy-binding "$CLOUDBUILD_SA" \
  --project="$PROD_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
  --quiet

for role in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/cloudsql.admin \
  roles/secretmanager.secretAccessor \
  roles/secretmanager.secretVersionManager \
  roles/redis.viewer \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROD_PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="$role" \
    --quiet
done

# ── 4. Secrets ────────────────────────────────────────────────────────────────
echo "[4/7] Creating secrets..."
DB_PASS=$(openssl rand -hex 32)
for secret_name in \
  jwt-access-secret-prod \
  jwt-refresh-secret-prod \
  internal-api-secret-prod \
  anthropic-api-key-prod \
  cdn-signing-key-prod \
  fcm-service-account-prod; do
  if ! gcloud secrets describe "$secret_name" --project="$PROD_PROJECT_ID" &>/dev/null; then
    openssl rand -hex 48 | gcloud secrets create "$secret_name" \
      --project="$PROD_PROJECT_ID" \
      --data-file=- \
      --replication-policy=automatic
    echo "  Created $secret_name"
  fi
done

if ! gcloud secrets describe "db-password-prod" --project="$PROD_PROJECT_ID" &>/dev/null; then
  echo -n "$DB_PASS" | gcloud secrets create "db-password-prod" \
    --project="$PROD_PROJECT_ID" \
    --data-file=- \
    --replication-policy=automatic
  echo "  DB_PASSWORD (save this): $DB_PASS"
else
  DB_PASS=$(gcloud secrets versions access latest --secret="db-password-prod" --project="$PROD_PROJECT_ID")
fi

# ── 5. Terraform ──────────────────────────────────────────────────────────────
echo "[5/7] Initialising Terraform (prod)..."
cd "$(dirname "$0")/../terraform/prod"

cp terraform.tfvars.example terraform.tfvars
sed -i "s/YOUR_PROD_PROJECT_ID/$PROD_PROJECT_ID/" terraform.tfvars
sed -i "s/REPLACE_WITH_STRONG_PASSWORD/$DB_PASS/" terraform.tfvars

terraform init \
  -backend-config="bucket=$TF_BUCKET" \
  -reconfigure

echo ""
echo "[6/7] Terraform plan (prod)..."
terraform plan \
  -var="project_id=$PROD_PROJECT_ID" \
  -var="db_password=$DB_PASS"

# ── 7. Outputs ────────────────────────────────────────────────────────────────
WIF_PROVIDER_FULL=$(gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
  --project="$PROD_PROJECT_ID" --location="global" \
  --workload-identity-pool="$WIF_POOL" \
  --format='value(name)')

echo ""
echo "[7/7] GitHub Secrets to add for PROD:"
echo "  GCP_PROD_PROJECT_ID           = $PROD_PROJECT_ID"
echo "  GCP_PROD_WIF_PROVIDER         = $WIF_PROVIDER_FULL"
echo "  GCP_PROD_SA_EMAIL             = $CLOUDBUILD_SA"
echo "  GCP_PROD_CLOUD_SQL_CONNECTION = (from: terraform output cloud_sql_connection_name)"
echo "  GCP_PROD_API_SA               = fated-api-sa@${PROD_PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "After adding GitHub secrets, run:"
echo "  cd terraform/prod && terraform apply -var=\"project_id=$PROD_PROJECT_ID\" -var=\"db_password=$DB_PASS\""
echo ""
echo "Then push any commit to trigger staging, then manually dispatch the prod workflow."
