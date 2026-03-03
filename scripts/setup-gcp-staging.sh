#!/usr/bin/env bash
# =============================================================================
# FatedWorld — One-time GCP STAGING bootstrap
# Run this ONCE to set up everything Terraform needs.
# =============================================================================
# Prerequisites:
#   - gcloud CLI installed and authenticated (`gcloud auth login`)
#   - terraform installed (>= 1.6)
#   - jq installed (brew install jq)
#
# Usage:
#   export STAGING_PROJECT_ID=your-staging-project-id
#   export GITHUB_ORG=your-github-username-or-org
#   export GITHUB_REPO=Fated
#   bash scripts/setup-gcp-staging.sh
# =============================================================================

set -euo pipefail

: "${STAGING_PROJECT_ID:?Set STAGING_PROJECT_ID}"
: "${GITHUB_ORG:?Set GITHUB_ORG}"
: "${GITHUB_REPO:?Set GITHUB_REPO}"

REGION="us-central1"
BILLING_ACCOUNT=$(gcloud beta billing projects describe "$STAGING_PROJECT_ID" --format='value(billingAccountName)' | sed 's/billingAccounts\///')

echo "=== FatedWorld GCP STAGING Bootstrap ==="
echo "Project:  $STAGING_PROJECT_ID"
echo "Region:   $REGION"
echo "GitHub:   $GITHUB_ORG/$GITHUB_REPO"
echo ""

gcloud config set project "$STAGING_PROJECT_ID"

# ── 1. Enable required APIs ─────────────────────────────────────────────────
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
  cloudcdn.googleapis.com \
  bigquery.googleapis.com \
  firebase.googleapis.com \
  redis.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project="$STAGING_PROJECT_ID" \
  --quiet

# ── 2. Terraform state bucket ────────────────────────────────────────────────
echo "[2/7] Creating Terraform state bucket..."
TF_BUCKET="fatedworld-tfstate-staging"
if ! gcloud storage buckets describe "gs://$TF_BUCKET" --project="$STAGING_PROJECT_ID" &>/dev/null; then
  gcloud storage buckets create "gs://$TF_BUCKET" \
    --project="$STAGING_PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
  gcloud storage buckets update "gs://$TF_BUCKET" --versioning
  echo "  Created gs://$TF_BUCKET"
else
  echo "  Bucket already exists — skipping"
fi

# ── 3. Workload Identity Federation (keyless CI/CD) ──────────────────────────
echo "[3/7] Setting up Workload Identity Federation..."

WIF_POOL="github-pool"
WIF_PROVIDER="github-provider"
CLOUDBUILD_SA="cloudbuild-sa@${STAGING_PROJECT_ID}.iam.gserviceaccount.com"

# Create SA for Cloud Build / GitHub Actions
if ! gcloud iam service-accounts describe "$CLOUDBUILD_SA" --project="$STAGING_PROJECT_ID" &>/dev/null; then
  gcloud iam service-accounts create cloudbuild-sa \
    --display-name="Cloud Build / GitHub Actions SA" \
    --project="$STAGING_PROJECT_ID"
fi

# Create WIF pool
if ! gcloud iam workload-identity-pools describe "$WIF_POOL" \
     --project="$STAGING_PROJECT_ID" --location="global" &>/dev/null; then
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --project="$STAGING_PROJECT_ID" \
    --location="global" \
    --display-name="GitHub Actions Pool"
fi

# Create WIF OIDC provider
WIF_POOL_ID=$(gcloud iam workload-identity-pools describe "$WIF_POOL" \
  --project="$STAGING_PROJECT_ID" --location="global" \
  --format='value(name)')

if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
     --project="$STAGING_PROJECT_ID" --location="global" \
     --workload-identity-pool="$WIF_POOL" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --project="$STAGING_PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="$WIF_POOL" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository=='${GITHUB_ORG}/${GITHUB_REPO}'"
fi

# Grant SA impersonation to WIF
gcloud iam service-accounts add-iam-policy-binding "$CLOUDBUILD_SA" \
  --project="$STAGING_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
  --quiet

# Grant Cloud Run admin + Artifact Registry writer + Storage admin to Cloud Build SA
for role in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/cloudsql.admin \
  roles/secretmanager.secretAccessor \
  roles/secretmanager.secretVersionManager \
  roles/redis.viewer \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$STAGING_PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="$role" \
    --quiet
done

echo ""
echo "=== Outputs for GitHub Secrets ==="
WIF_PROVIDER_FULL=$(gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
  --project="$STAGING_PROJECT_ID" --location="global" \
  --workload-identity-pool="$WIF_POOL" \
  --format='value(name)')

echo "GCP_STAGING_PROJECT_ID   = $STAGING_PROJECT_ID"
echo "GCP_STAGING_WIF_PROVIDER = $WIF_PROVIDER_FULL"
echo "GCP_STAGING_SA_EMAIL     = $CLOUDBUILD_SA"
echo ""

# ── 4. Generate a random DB password and store in Secret Manager ─────────────
echo "[4/7] Generating DB password secret..."
DB_PASS=$(openssl rand -hex 24)
if ! gcloud secrets describe "db-password-staging" --project="$STAGING_PROJECT_ID" &>/dev/null; then
  echo -n "$DB_PASS" | gcloud secrets create "db-password-staging" \
    --project="$STAGING_PROJECT_ID" \
    --data-file=- \
    --replication-policy=automatic
  echo "  Created secret db-password-staging"
  echo "  DB_PASSWORD (save this): $DB_PASS"
else
  echo "  Secret already exists — fetching value..."
  DB_PASS=$(gcloud secrets versions access latest \
    --secret="db-password-staging" --project="$STAGING_PROJECT_ID")
fi

# JWT secrets
for secret_name in jwt-access-secret-staging jwt-refresh-secret-staging internal-api-secret-staging; do
  if ! gcloud secrets describe "$secret_name" --project="$STAGING_PROJECT_ID" &>/dev/null; then
    openssl rand -hex 48 | gcloud secrets create "$secret_name" \
      --project="$STAGING_PROJECT_ID" \
      --data-file=- \
      --replication-policy=automatic
    echo "  Created $secret_name"
  fi
done

# ── 5. Terraform init + plan ─────────────────────────────────────────────────
echo "[5/7] Initialising Terraform..."
cd "$(dirname "$0")/../terraform/staging"

terraform init \
  -backend-config="bucket=$TF_BUCKET" \
  -reconfigure

echo ""
echo "[6/7] Terraform plan..."
terraform plan \
  -var="project_id=$STAGING_PROJECT_ID" \
  -var="db_password=$DB_PASS"

echo ""
echo "=== Ready to apply ==="
echo "Run: cd terraform/staging && terraform apply -var=\"project_id=$STAGING_PROJECT_ID\" -var=\"db_password=$DB_PASS\""
echo ""
echo "[7/7] GitHub Secrets to configure at:"
echo "  https://github.com/$GITHUB_ORG/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "  GCP_STAGING_PROJECT_ID           = $STAGING_PROJECT_ID"
echo "  GCP_STAGING_WIF_PROVIDER         = $WIF_PROVIDER_FULL"
echo "  GCP_STAGING_SA_EMAIL             = $CLOUDBUILD_SA"
echo "  GCP_STAGING_CLOUD_SQL_CONNECTION = (from terraform output cloud_sql_connection_name)"
echo "  GCP_STAGING_API_SA               = api-sa@${STAGING_PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "After Terraform apply, run the first Cloud Run deployment manually once, then CI/CD takes over."
