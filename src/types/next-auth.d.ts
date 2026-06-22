import "next-auth";
import "next-auth/jwt";

// Extend the default NextAuth types with our custom fields (role, username, id).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      username: string;
    };
  }

  interface User {
    role?: string;
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    username?: string;
  }
}
