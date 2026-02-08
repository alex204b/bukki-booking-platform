# Kubernetes Deployment Guide

Complete guide for deploying the Multi-Business Booking Platform on Kubernetes.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Configuration](#configuration)
6. [Deployment Options](#deployment-options)
7. [Post-Deployment](#post-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## Overview

This application can be deployed to any Kubernetes cluster including:
- Local clusters (minikube, kind, k3s)
- Managed Kubernetes (EKS, GKE, AKS)
- Self-managed clusters

The deployment includes:
- Backend (NestJS) with horizontal scaling
- Frontend (React) with nginx
- PostgreSQL with persistent storage
- Ingress for external access
- Auto-scaling and backup capabilities

## Prerequisites

### Required Tools

```bash
# kubectl (Kubernetes CLI)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Docker (for building images)
# Follow: https://docs.docker.com/get-docker/

# Optional: kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
```

### Cluster Requirements

- Kubernetes 1.19+
- Available storage class for persistent volumes
- Ingress controller (nginx, traefik, or cloud provider)
- At least 4GB RAM and 2 CPU cores available

### Docker Registry

You need access to a Docker registry:
- Docker Hub (free for public images)
- GitHub Container Registry (GHCR)
- AWS ECR, Google GCR, Azure ACR
- Private registry

## Quick Start

### 1. Build Docker Images

```bash
# Login to your registry
docker login ghcr.io

# Build and push backend
cd backend
docker build -t ghcr.io/YOUR_USERNAME/booking-backend:latest .
docker push ghcr.io/YOUR_USERNAME/booking-backend:latest

# Build and push frontend
cd ../frontend
docker build -t ghcr.io/YOUR_USERNAME/booking-frontend:latest .
docker push ghcr.io/YOUR_USERNAME/booking-frontend:latest
```

**Tip**: Use the provided GitHub Actions workflow (`.github/workflows/build-and-push.yml`) for automatic builds on push.

### 2. Configure Secrets

```bash
cd k8s

# Edit secrets (IMPORTANT: Use real values!)
nano backend-secret.yaml
nano postgres-secret.yaml

# Edit config
nano backend-configmap.yaml
nano frontend-configmap.yaml
nano ingress.yaml
```

### 3. Update Image Names

Edit these files and replace `your-registry` with your actual registry:
- `k8s/backend-deployment.yaml` (line with `image:`)
- `k8s/frontend-deployment.yaml` (line with `image:`)

### 4. Deploy

```bash
# Using kubectl
kubectl apply -f k8s/

# Or using kustomize
kubectl apply -k k8s/

# Or using the deploy script
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

### 5. Verify

```bash
kubectl get all -n booking-platform
kubectl get ingress -n booking-platform
```

## Detailed Setup

### Storage Configuration

The application requires persistent storage for:
1. PostgreSQL data (10Gi)
2. User uploads (20Gi)
3. Backups (50Gi, optional)

#### Check Available Storage Classes

```bash
kubectl get storageclass
```

#### Update Storage Class Names

Edit these files if your cluster uses a different storage class:
- `k8s/postgres-pvc.yaml`
- `k8s/uploads-pvc.yaml`
- `k8s/backup-cronjob.yaml`

Common storage class names:
- AWS: `gp2`, `gp3`
- GCP: `standard`, `pd-ssd`
- Azure: `managed-premium`
- Local: `local-path`, `hostpath`

### Ingress Configuration

The ingress manifest supports multiple controllers. Choose one:

#### NGINX Ingress

```bash
# Install nginx ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# In k8s/ingress.yaml, uncomment:
kubernetes.io/ingress.class: "nginx"
```

#### AWS ALB

```bash
# Install AWS Load Balancer Controller
# Follow: https://kubernetes-sigs.github.io/aws-load-balancer-controller/

# In k8s/ingress.yaml, uncomment:
kubernetes.io/ingress.class: "alb"
alb.ingress.kubernetes.io/scheme: "internet-facing"
```

#### GKE Ingress

```bash
# GKE includes built-in ingress

# In k8s/ingress.yaml, uncomment:
kubernetes.io/ingress.class: "gce"
```

### SSL/TLS Setup

#### Using cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Update email in k8s/cert-issuer.yaml
nano k8s/cert-issuer.yaml

# Apply cert issuer
kubectl apply -f k8s/cert-issuer.yaml

# In k8s/ingress.yaml, uncomment TLS section
```

#### Using Cloud Provider Certificates

Follow your cloud provider's documentation:
- AWS: Use AWS Certificate Manager (ACM)
- GCP: Use Google-managed certificates
- Azure: Use Azure Key Vault certificates

## Configuration

### Environment Variables

#### Backend (k8s/backend-secret.yaml)

**Critical - Must be changed:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Use a strong random string
- `SMTP_*`: Email service credentials
- `STRIPE_SECRET_KEY`: Payment processing
- `FIREBASE_*`: Push notifications
- `GOOGLE_MAPS_API_KEY`: Geocoding
- `GEMINI_API_KEY` or `HUGGINGFACE_API_KEY`: AI features (use Hugging Face for Moldova)

Generate secure secrets:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate random password
openssl rand -base64 24
```

#### Frontend (k8s/frontend-configmap.yaml)

- `REACT_APP_API_URL`: Your backend API URL
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Google Maps key
- `REACT_APP_FIREBASE_*`: Firebase configuration

### Resource Limits

Adjust resources based on your needs in:
- `k8s/backend-deployment.yaml`
- `k8s/frontend-deployment.yaml`
- `k8s/postgres-statefulset.yaml`

## Deployment Options

### Option 1: Using kubectl

```bash
kubectl apply -f k8s/
```

### Option 2: Using kustomize

```bash
kubectl apply -k k8s/
```

### Option 3: Using Helm (Advanced)

Convert manifests to Helm chart:
```bash
# Create Helm chart structure
helm create booking-platform

# Move manifests to templates/
# Add values.yaml for configuration
# Install with Helm
helm install booking-platform ./booking-platform
```

### Option 4: Using GitOps (ArgoCD/Flux)

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Create ArgoCD application
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: booking-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_USERNAME/YOUR_REPO
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: booking-platform
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

## Post-Deployment

### Database Migrations

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pod -n booking-platform -l app=backend -o jsonpath="{.items[0].metadata.name}")

# Run migrations
kubectl exec -it $BACKEND_POD -n booking-platform -- npm run typeorm:run-migrations

# Or run specific migration
kubectl exec -it $BACKEND_POD -n booking-platform -- \
  npx ts-node src/database/scripts/apply-migration-010.ts
```

### DNS Configuration

Get your ingress IP/hostname:
```bash
kubectl get ingress -n booking-platform
```

Create DNS records:
- `yourdomain.com` → Ingress IP
- `api.yourdomain.com` → Ingress IP

### Initial Setup

1. Create admin user (if not auto-created)
2. Test email delivery
3. Configure payment gateway
4. Set up monitoring alerts

## Monitoring & Maintenance

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n booking-platform

# Frontend logs
kubectl logs -f deployment/frontend -n booking-platform

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n booking-platform

# All containers
stern -n booking-platform .
```

### Enable Auto-Scaling

```bash
# Apply HPA configurations
kubectl apply -f k8s/hpa.yaml

# Check HPA status
kubectl get hpa -n booking-platform
```

### Database Backups

```bash
# Enable automatic backups
kubectl apply -f k8s/backup-cronjob.yaml

# Manual backup
kubectl exec -it postgres-0 -n booking-platform -- \
  pg_dump -U postgres booking_platform > backup-$(date +%Y%m%d).sql
```

### Update Application

```bash
# Build new images with version tag
docker build -t ghcr.io/YOUR_USERNAME/booking-backend:v1.1.0 ./backend
docker push ghcr.io/YOUR_USERNAME/booking-backend:v1.1.0

# Update deployment
kubectl set image deployment/backend backend=ghcr.io/YOUR_USERNAME/booking-backend:v1.1.0 -n booking-platform

# Monitor rollout
kubectl rollout status deployment/backend -n booking-platform

# Rollback if needed
kubectl rollout undo deployment/backend -n booking-platform
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n booking-platform

# Check events
kubectl get events -n booking-platform --sort-by='.lastTimestamp'

# Common issues:
# - Image pull errors: Check registry credentials
# - Crash loop: Check logs with kubectl logs
# - Pending: Check PVC status
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it postgres-0 -n booking-platform -- psql -U postgres -d booking_platform -c "SELECT version();"

# Test from backend
BACKEND_POD=$(kubectl get pod -n booking-platform -l app=backend -o jsonpath="{.items[0].metadata.name}")
kubectl exec -it $BACKEND_POD -n booking-platform -- nc -zv postgres 5432
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress booking-ingress -n booking-platform

# Test backend directly
kubectl port-forward -n booking-platform svc/backend 3000:3000
# Then visit http://localhost:3000
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n booking-platform

# Check PV status
kubectl get pv

# Describe PVC for details
kubectl describe pvc postgres-pvc -n booking-platform
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n booking-platform

# Scale up if needed
kubectl scale deployment backend -n booking-platform --replicas=5

# Check HPA
kubectl get hpa -n booking-platform
```

## Production Best Practices

- [ ] Use strong, unique secrets (never commit to git)
- [ ] Enable SSL/TLS with valid certificates
- [ ] Configure proper resource requests and limits
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Loki)
- [ ] Enable automatic backups
- [ ] Configure network policies for security
- [ ] Use namespaces for environment separation
- [ ] Implement GitOps for deployment management
- [ ] Set up disaster recovery procedures
- [ ] Configure alerting for critical issues
- [ ] Regular security updates and patches
- [ ] Load testing before production
- [ ] Document runbooks for common issues

## Cloud-Specific Guides

### AWS EKS

See detailed guide: [AWS_EKS_DEPLOYMENT.md](./docs/AWS_EKS_DEPLOYMENT.md)

### Google GKE

See detailed guide: [GCP_GKE_DEPLOYMENT.md](./docs/GCP_GKE_DEPLOYMENT.md)

### Azure AKS

See detailed guide: [AZURE_AKS_DEPLOYMENT.md](./docs/AZURE_AKS_DEPLOYMENT.md)

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [Kubernetes documentation](https://kubernetes.io/docs/)
- Check cloud provider guides
- Open an issue on GitHub
