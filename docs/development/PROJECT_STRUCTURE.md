# Project Structure

This document outlines the organization of the BUKKi Booking Platform project.

## 📁 Directory Structure

```
Bukki/
├── backend/                 # NestJS Backend API
│   ├── src/                # Source code
│   │   ├── modules/       # Feature modules (auth, bookings, etc.)
│   │   ├── common/        # Shared utilities
│   │   └── database/     # SQL scripts
│   ├── dist/              # Compiled JavaScript
│   ├── env.example        # Environment variables template
│   └── package.json       # Backend dependencies
│
├── frontend/              # React Frontend Application
│   ├── src/               # React source code
│   │   ├── components/    # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   └── utils/       # Utility functions
│   ├── android/          # Android native project
│   ├── public/           # Static assets
│   ├── build/           # Production build
│   └── package.json     # Frontend dependencies
│
├── docs/                  # 📚 Documentation
│   ├── setup/           # Setup and installation guides
│   ├── mobile/          # Mobile app development guides
│   ├── deployment/      # Deployment guides and configs
│   ├── database/        # Database documentation and SQL
│   ├── troubleshooting/ # Troubleshooting guides
│   ├── development/     # Development documentation
│   └── README.md        # Documentation index
│
├── scripts/              # 🛠️ Utility Scripts
│   ├── create-admin-script.js
│   ├── setup-firebase.js
│   ├── test-deployment.js
│   └── test-time-slots.js
│
├── README.md            # Main project README
├── CONTRIBUTING.md      # Contribution guidelines
├── LICENSE              # MIT License
├── .gitignore          # Git ignore rules
├── package.json        # Root package.json
├── index.js            # Entry point
├── start.js            # Start script
└── quick-start.*       # Quick start scripts
```

## 📂 Key Directories

### Backend (`backend/`)
- **NestJS** application with TypeScript
- Modular architecture with feature-based modules
- Database entities and migrations
- API endpoints and business logic

### Frontend (`frontend/`)
- **React** application with TypeScript
- Component-based architecture
- Mobile app support via Capacitor
- Responsive design with Tailwind CSS

### Documentation (`docs/`)
All project documentation is organized by category:
- **setup/** - Initial setup and configuration
- **mobile/** - Android/iOS development guides
- **deployment/** - Production deployment
- **database/** - Database schema and scripts
- **troubleshooting/** - Common issues and fixes
- **development/** - Technical documentation

### Scripts (`scripts/`)
Utility scripts for common tasks:
- Admin user creation
- Firebase setup
- Testing utilities

## 📄 Important Files

### Root Level
- `README.md` - Main project documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT License
- `.gitignore` - Git ignore patterns
- `package.json` - Root package configuration

### Configuration Files
- `backend/env.example` - Environment variables template
- `frontend/capacitor.config.ts` - Capacitor configuration
- `frontend/tsconfig.json` - TypeScript configuration
- `backend/tsconfig.json` - Backend TypeScript config

## 🎯 Best Practices

1. **Keep root clean** - Only essential files in root
2. **Organize docs** - All documentation in `docs/`
3. **Use scripts folder** - Utility scripts in `scripts/`
4. **Follow structure** - Maintain consistent organization
5. **Document changes** - Update relevant docs when adding features

## 📝 File Naming Conventions

- **Components**: PascalCase (e.g., `BusinessList.tsx`)
- **Utilities**: camelCase (e.g., `geocode.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Documentation**: UPPER_SNAKE_CASE (e.g., `SETUP_GUIDE.md`)

## 🔍 Finding Files

- **Setup guides**: `docs/setup/`
- **Mobile guides**: `docs/mobile/`
- **Troubleshooting**: `docs/troubleshooting/`
- **Database scripts**: `docs/database/`
- **Deployment configs**: `docs/deployment/`

