# Environment Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Development
NODE_ENV=development
```

## Environment Variable Details

### NEXTAUTH_URL
- **Development**: `http://localhost:3000`
- **Production**: Your actual domain (e.g., `https://yourapp.com`)

### NEXTAUTH_SECRET
- Generate a secure random string for production
- You can use: `openssl rand -base64 32`
- For development, any string will work

## Setting Up Environment

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local`:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-generated-secret-here
   ```

3. Restart your development server after making changes

## Demo User Credentials

The system comes with a pre-configured admin user:

- **Email**: `admin@bellavista.com`
- **Password**: `password`
- **Restaurant Slug**: `demo`

## Password Hashing

User passwords are hashed using bcrypt with 10 salt rounds. To generate a new password hash, you can use the utility script:

```bash
node scripts/generatePasswordHash.js
```
