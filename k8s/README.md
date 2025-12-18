# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the Multi-Business Booking Platform.

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured to access your cluster
- Docker registry access (Docker Hub, GCR, ECR, etc.)
- Ingress controller installed (nginx, traefik, or cloud provider)
- cert-manager (optional, for SSL/TLS)

## Quick Start

### 1. Build and Push Docker Images

```bash
# Backend
cd backend
docker build -t your-registry/booking-backend:latest .
docker push your-registry/booking-backend:latest

# Frontend
cd ../frontend
docker build -t your-registry/booking-frontend:latest .
docker push your-registry/booking-frontend:latest
```

### 2. Update Configuration

Edit the following files with your values:

**k8s/backend-secret.yaml**
- Database credentials
- JWT secret
- SMTP settings
- API keys (Stripe, Firebase, Google Maps, OpenAI)

**k8s/frontend-configmap.yaml**
- API URL
- Firebase configuration
- Stripe publishable key

**k8s/backend-deployment.yaml** and **k8s/frontend-deployment.yaml**
- Update image names with your registry

**k8s/ingress.yaml**
- Update domain names
- Configure ingress annotations for your provider
- Enable TLS if needed

### 3. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or use the provided script
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

### 4. Verify Deployment

```bash
# Check all resources
kubectl get all -n booking-platform

# Check pods
kubectl get pods -n booking-platform

# Check services
kubectl get svc -n booking-platform

# Check ingress
kubectl get ingress -n booking-platform

# View logs
kubectl logs -f deployment/backend -n booking-platform
kubectl logs -f deployment/frontend -n booking-platform
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Internet                       │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   Ingress/ALB      │
         │  (Load Balancer)   │
         └─┬────────────────┬─┘
           │                │
    ┌──────▼──────┐  ┌─────▼──────┐
    │  Frontend   │  │  Backend   │
    │  Service    │  │  Service   │
    │  (Port 80)  │  │ (Port 3000)│
    └──────┬──────┘  └─────┬──────┘
           │                │
    ┌──────▼──────┐  ┌─────▼──────────┐
    │  Frontend   │  │    Backend     │
    │  Pods (2)   │  │   Pods (2)     │
    │   Nginx     │  │   NestJS       │
    └─────────────┘  └─────┬──────────┘
                           │
                    ┌──────▼──────────┐
                    │   PostgreSQL    │
                    │  StatefulSet    │
                    │  (Persistent)   │
                    └─────────────────┘
```

## Configuration Details

### Storage

The deployment requires two persistent volumes:

1. **postgres-pvc** (10Gi): For PostgreSQL data
2. **uploads-pvc** (20Gi): For user-uploaded files (business images, etc.)

Make sure your cluster has a storage class that supports:
- ReadWriteOnce (RWO) for PostgreSQL
- ReadWriteMany (RWX) for uploads (required for multi-pod backend)

Update `storageClassName` in PVC manifests if needed:
- AWS: `gp2` or `gp3`
- GCP: `standard` or `pd-ssd`
- Azure: `managed-premium`

### Secrets Management

**Important**: Never commit actual secrets to git! The provided secret files are templates.

For production, use one of these approaches:

1. **Sealed Secrets**
```bash
kubeseal --format=yaml < backend-secret.yaml > backend-secret-sealed.yaml
```

2. **External Secrets Operator**
```bash
# Sync secrets from AWS Secrets Manager, GCP Secret Manager, etc.
```

3. **Vault**
```bash
# Use HashiCorp Vault for secret management
```

### Ingress Configuration

The provided ingress supports multiple ingress controllers. Uncomment the appropriate annotations:

**NGINX Ingress**
```yaml
kubernetes.io/ingress.class: "nginx"
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**AWS ALB**
```yaml
kubernetes.io/ingress.class: "alb"
alb.ingress.kubernetes.io/scheme: "internet-facing"
alb.ingress.kubernetes.io/target-type: "ip"
```

**GKE Ingress**
```yaml
kubernetes.io/ingress.class: "gce"
```

### SSL/TLS Setup

To enable HTTPS with cert-manager:

1. Install cert-manager:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. Create ClusterIssuer:
```bash
kubectl apply -f k8s/cert-issuer.yaml
```

3. Uncomment TLS section in `ingress.yaml`

## Scaling

### Horizontal Scaling

Scale deployments as needed:

```bash
# Scale backend
kubectl scale deployment backend -n booking-platform --replicas=5

# Scale frontend
kubectl scale deployment frontend -n booking-platform --replicas=3
```

### Horizontal Pod Autoscaler (HPA)

```bash
kubectl autoscale deployment backend -n booking-platform \
  --cpu-percent=70 \
  --min=2 \
  --max=10

kubectl autoscale deployment frontend -n booking-platform \
  --cpu-percent=80 \
  --min=2 \
  --max=5
```

## Database Migrations

Run migrations after deployment:

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pod -n booking-platform -l app=backend -o jsonpath="{.items[0].metadata.name}")

# Run migrations
kubectl exec -it $BACKEND_POD -n booking-platform -- npm run typeorm:run-migrations
```

## Monitoring

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n booking-platform

# Frontend logs
kubectl logs -f deployment/frontend -n booking-platform

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n booking-platform

# All pods
kubectl logs -f -n booking-platform --all-containers=true
```

### Port Forwarding (for debugging)

```bash
# Access backend directly
kubectl port-forward -n booking-platform svc/backend 3000:3000

# Access frontend directly
kubectl port-forward -n booking-platform svc/frontend 8080:80

# Access PostgreSQL
kubectl port-forward -n booking-platform svc/postgres 5432:5432
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n booking-platform

# Check events
kubectl get events -n booking-platform --sort-by='.lastTimestamp'
```

### Database connection issues

```bash
# Verify PostgreSQL is running
kubectl get pod -n booking-platform -l app=postgres

# Check backend can reach database
BACKEND_POD=$(kubectl get pod -n booking-platform -l app=backend -o jsonpath="{.items[0].metadata.name}")
kubectl exec -it $BACKEND_POD -n booking-platform -- nc -zv postgres 5432
```

### Ingress not working

```bash
# Check ingress controller logs
kubectl logs -f -n ingress-nginx deployment/ingress-nginx-controller

# Verify ingress configuration
kubectl describe ingress booking-ingress -n booking-platform
```

### Storage issues

```bash
# Check PVC status
kubectl get pvc -n booking-platform

# Check PV status
kubectl get pv

# Describe PVC for events
kubectl describe pvc postgres-pvc -n booking-platform
kubectl describe pvc uploads-pvc -n booking-platform
```

## Backup and Restore

### Database Backup

```bash
# Create backup
kubectl exec -it postgres-0 -n booking-platform -- \
  pg_dump -U postgres booking_platform > backup.sql

# Or use a CronJob (see k8s/backup-cronjob.yaml)
```

### Database Restore

```bash
# Restore from backup
kubectl exec -i postgres-0 -n booking-platform -- \
  psql -U postgres booking_platform < backup.sql
```

## Cleanup

To remove all resources:

```bash
# Delete all resources in namespace
kubectl delete namespace booking-platform

# Or delete specific resources
kubectl delete -f k8s/
```

## Production Checklist

- [ ] Use strong, random secrets (JWT_SECRET, database password)
- [ ] Configure proper SMTP credentials
- [ ] Set up SSL/TLS with cert-manager
- [ ] Configure proper resource limits
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Loki)
- [ ] Set up regular database backups
- [ ] Configure network policies
- [ ] Enable pod security policies
- [ ] Set up horizontal pod autoscaling
- [ ] Configure proper ingress rate limiting
- [ ] Test disaster recovery procedures
- [ ] Document runbooks for common issues

## Cloud Provider Specific Notes

### AWS EKS
- Use EBS CSI driver for persistent volumes
- Configure ALB Ingress Controller
- Use AWS Secrets Manager with External Secrets Operator
- Consider using RDS instead of in-cluster PostgreSQL

### Google GKE
- Use GCE Persistent Disk for storage
- Configure GKE Ingress or nginx-ingress
- Use Google Secret Manager
- Consider using Cloud SQL instead of in-cluster PostgreSQL

### Azure AKS
- Use Azure Disk for storage
- Configure Azure Application Gateway or nginx-ingress
- Use Azure Key Vault with CSI driver
- Consider using Azure Database for PostgreSQL

## Support

For issues or questions:
- Check the main project README
- Review Kubernetes documentation
- Check cloud provider specific guides
