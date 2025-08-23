import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { readJson } from './fsStore';

// Define types for user data
interface User {
  id: string;
  restaurantSlug: string;
  email: string;
  passwordHash: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Read users from JSON file
          const users = await readJson<User[]>('data/users.json');
          
          // Find user by email
          const user = users.find(u => u.email === credentials.email);
          if (!user) {
            return null;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValidPassword) {
            return null;
          }

          // Return user object (without password)
          return {
            id: user.id,
            email: user.email,
            restaurantSlug: user.restaurantSlug,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add restaurantSlug to token on sign in
      if (user) {
        token.restaurantSlug = (user as any).restaurantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      // Add restaurantSlug to session
      if (token) {
        (session as any).restaurantSlug = token.restaurantSlug;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
};
