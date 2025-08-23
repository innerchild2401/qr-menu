import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    restaurantSlug?: string;
    user?: {
      email?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    restaurantSlug?: string;
  }
}
