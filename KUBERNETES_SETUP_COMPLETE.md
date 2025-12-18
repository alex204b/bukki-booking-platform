# Kubernetes Setup Complete

## Deployment Summary

Your Multi-Business Booking Platform has been successfully deployed to Docker Desktop Kubernetes!

### What Was Deployed

1. **Infrastructure**
   - Namespace: `booking-platform`
   - Nginx Ingress Controller (for routing)
   - PostgreSQL StatefulSet (with persistent storage)
   - Backend (NestJS) - 2 replicas
   - Frontend (React) - 2 replicas

2. **Database**
   - All 11 migrations applied successfully
   - Tables created: users, businesses, services, bookings, reviews, messages, business_members, waitlist, offers, device_tokens
   - Indexes and triggers configured for performance

3. **Configuration**
   - Docker images built locally
   - Services exposed via ClusterIP
   - Ingress configured for localhost access

## Accessing Your Application

### Option 1: Port Forwarding (Currently Active)

The following port forwards are currently running:
```bash
# Backend API - http://localhost:3000
# Frontend - http://localhost:8080
```

To access:
- **Frontend**: Open http://localhost:8080 in your browser
- **Backend API**: http://localhost:3000

To stop port forwarding:
```bash
# List background tasks to find the task IDs
/tasks

# Kill specific port forward
# Use the KillShell tool or Ctrl+C in the terminal
```

### Option 2: Set Up Port Forwarding Manually

If port forwards are not running:
```bash
# Backend
kubectl port-forward -n booking-platform svc/backend 3000:3000

# Frontend (in a new terminal)
kubectl port-forward -n booking-platform svc/frontend 8080:80
```

### Option 3: Using Ingress (Advanced)

The ingress is configured but requires additional setup:
1. Update your hosts file to map `localhost` to your services
2. Or use `kubectl port-forward` to the ingress controller

## Useful Commands

### Check Status
```bash
# View all resources
kubectl get all -n booking-platform

# Check pod logs
kubectl logs -n booking-platform -l app=backend --tail=50
kubectl logs -n booking-platform -l app=frontend --tail=50

# Check ingress
kubectl get ingress -n booking-platform
```

### Database Access
```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n booking-platform -- psql -U postgres -d booking_platform

# View tables
kubectl exec postgres-0 -n booking-platform -- psql -U postgres -d booking_platform -c "\dt"
```

### Restart Services
```bash
# Restart backend
kubectl rollout restart deployment/backend -n booking-platform

# Restart frontend
kubectl rollout restart deployment/frontend -n booking-platform
```

### Scale Services
```bash
# Scale backend
kubectl scale deployment backend -n booking-platform --replicas=3

# Scale frontend
kubectl scale deployment frontend -n booking-platform --replicas=3
```

## Current Configuration

### Backend Environment
- Database: PostgreSQL (postgres:5432)
- Database Name: booking_platform
- JWT Secret: Configured (placeholder)
- SMTP: Not configured (email features disabled)
- API Keys: Placeholder values (need to be updated for production)

### Frontend Configuration
- API URL: Points to backend service
- React build served via nginx

## Known Issues & Notes

1. **Email Service**: SMTP credentials are not configured. You'll see SMTP errors in logs - this is expected for local development and doesn't affect core functionality.

2. **API Keys**: The following need real values for full functionality:
   - Stripe (payments)
   - Google Maps (geocoding)
   - Firebase (push notifications)
   - OpenAI (AI features)

3. **Placeholder Secrets**: Update `k8s/backend-secret.yaml` with real values before production deployment.

## Next Steps

### For Development

1. **Access the Application**
   ```bash
   # Frontend
   http://localhost:8080

   # Backend API
   http://localhost:3000
   ```

2. **Make Changes**
   - Edit code in backend/ or frontend/
   - Rebuild Docker images:
     ```bash
     docker build -t booking-backend:latest ./backend
     docker build -t booking-frontend:latest ./frontend
     ```
   - Restart deployments:
     ```bash
     kubectl rollout restart deployment/backend -n booking-platform
     kubectl rollout restart deployment/frontend -n booking-platform
     ```

### For Production

1. **Update Secrets**
   - Edit `k8s/backend-secret.yaml` with real values
   - Apply: `kubectl apply -f k8s/backend-secret.yaml`

2. **Configure Image Registry**
   - Push images to container registry (GitHub Container Registry, Docker Hub, etc.)
   - Update image names in deployment files
   - See `.github/workflows/build-and-push.yml` for automated builds

3. **Set Up SSL/TLS**
   - Install cert-manager: `kubectl apply -f k8s/cert-issuer.yaml`
   - Update ingress with TLS configuration

4. **Deploy to Cloud**
   - See `KUBERNETES_DEPLOYMENT.md` for AWS EKS, GKE, or AKS deployment guides

## Monitoring

### View Logs in Real-Time
```bash
# Backend logs
kubectl logs -f -n booking-platform -l app=backend

# Frontend logs
kubectl logs -f -n booking-platform -l app=frontend

# All logs
kubectl logs -f -n booking-platform --all-containers=true
```

### Check Resource Usage
```bash
kubectl top pods -n booking-platform
```

## Cleanup

To remove everything:
```bash
# Delete all resources
kubectl delete namespace booking-platform

# Remove ingress controller (optional)
kubectl delete namespace ingress-nginx
```

## Troubleshooting

### Pods Not Starting
```bash
kubectl describe pod <pod-name> -n booking-platform
```

### Database Connection Issues
```bash
# Test database connection
kubectl exec postgres-0 -n booking-platform -- psql -U postgres -d booking_platform -c "SELECT version();"
```

### Ingress Not Working
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress
kubectl describe ingress booking-ingress -n booking-platform
```

## Support

For more details, see:
- [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md) - Full deployment guide
- [README.md](./README.md) - Application documentation

## Status: READY

Your application is deployed and running!

- Backend: http://localhost:3000 ✓
- Frontend: http://localhost:8080 ✓
- Database: PostgreSQL ready ✓
- Migrations: All applied ✓
