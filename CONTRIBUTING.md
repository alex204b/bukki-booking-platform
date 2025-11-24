# Contributing to BUKKi Booking Platform

Thank you for your interest in contributing to BUKKi! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Read the Documentation**: Start with the [Setup Guide](./docs/setup/SETUP.md)
2. **Review the Codebase**: Check the [Project Documentation](./docs/development/DOCUMENTATION.md)
3. **Set Up Development Environment**: Follow the setup instructions

## Development Workflow

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd Bukki

# Install dependencies
npm run install:all

# Set up environment variables
cp backend/env.example backend/.env
# Edit backend/.env with your configuration

# Set up database
# See docs/database/setup-database.sql
```

### Running the Application

**Development Mode:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

## Code Style

- **TypeScript**: Use TypeScript for all new code
- **Linting**: Run `npm run lint` before committing
- **Formatting**: Use Prettier (configured in project)
- **Naming**: Use descriptive names, follow existing conventions

## Project Structure

```
backend/
  src/
    modules/        # Feature modules (auth, bookings, etc.)
    common/         # Shared utilities
    database/       # SQL scripts

frontend/
  src/
    components/     # Reusable React components
    pages/          # Page components
    contexts/       # React contexts
    services/       # API services
    utils/          # Utility functions
```

## Documentation

- All documentation is in the `docs/` folder
- Update relevant docs when adding features
- Follow existing documentation style

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test on both web and mobile platforms

## Submitting Changes

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit a pull request

## Questions?

- Check the [Documentation](./docs/)
- Review [Troubleshooting Guides](./docs/troubleshooting/)
- Open an issue for bugs or questions

