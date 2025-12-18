#!/bin/bash

# Deployment script for Kubernetes
set -e

echo "🚀 Deploying Booking Platform to Kubernetes..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ kubectl is not configured. Please configure kubectl first.${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  Please ensure you have updated the following files with your values:${NC}"
echo "   - k8s/backend-secret.yaml (secrets)"
echo "   - k8s/frontend-configmap.yaml (API URLs)"
echo "   - k8s/backend-deployment.yaml (image name)"
echo "   - k8s/frontend-deployment.yaml (image name)"
echo "   - k8s/ingress.yaml (domain names)"
echo ""
read -p "Have you updated these files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled. Please update the files and try again.${NC}"
    exit 1
fi

# Create namespace
echo -e "${GREEN}📦 Creating namespace...${NC}"
kubectl apply -f namespace.yaml

# Create secrets and configmaps
echo -e "${GREEN}🔐 Creating secrets and configmaps...${NC}"
kubectl apply -f postgres-secret.yaml
kubectl apply -f backend-secret.yaml
kubectl apply -f backend-configmap.yaml
kubectl apply -f frontend-configmap.yaml

# Create persistent volumes
echo -e "${GREEN}💾 Creating persistent volumes...${NC}"
kubectl apply -f postgres-pvc.yaml
kubectl apply -f uploads-pvc.yaml

# Wait for PVCs to be bound
echo -e "${YELLOW}⏳ Waiting for PVCs to be bound...${NC}"
kubectl wait --for=condition=Bound pvc/postgres-pvc -n booking-platform --timeout=60s
kubectl wait --for=condition=Bound pvc/uploads-pvc -n booking-platform --timeout=60s

# Deploy PostgreSQL
echo -e "${GREEN}🗄️  Deploying PostgreSQL...${NC}"
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f postgres-service.yaml

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=Ready pod/postgres-0 -n booking-platform --timeout=120s

# Deploy backend
echo -e "${GREEN}🔧 Deploying backend...${NC}"
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# Deploy frontend
echo -e "${GREEN}🎨 Deploying frontend...${NC}"
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# Deploy ingress
echo -e "${GREEN}🌐 Deploying ingress...${NC}"
kubectl apply -f ingress.yaml

# Wait for deployments to be ready
echo -e "${YELLOW}⏳ Waiting for deployments to be ready...${NC}"
kubectl rollout status deployment/backend -n booking-platform --timeout=180s
kubectl rollout status deployment/frontend -n booking-platform --timeout=180s

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Resource Status:"
kubectl get all -n booking-platform
echo ""
echo "🌐 Ingress:"
kubectl get ingress -n booking-platform
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Run database migrations:"
echo "   BACKEND_POD=\$(kubectl get pod -n booking-platform -l app=backend -o jsonpath=\"{.items[0].metadata.name}\")"
echo "   kubectl exec -it \$BACKEND_POD -n booking-platform -- npm run typeorm:run-migrations"
echo ""
echo "2. Configure DNS to point your domains to the ingress IP/hostname"
echo ""
echo "3. Monitor your deployment:"
echo "   kubectl logs -f deployment/backend -n booking-platform"
echo "   kubectl logs -f deployment/frontend -n booking-platform"
echo ""
echo -e "${GREEN}🎉 Happy booking!${NC}"
