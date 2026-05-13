import { db } from "@/lib/db";
import { hash, compare } from "bcrypt";
import { sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const SALT_ROUNDS = 10;

interface RegisterInput {
  email: string;
  password: string;
  isAdmin?: boolean;
}

export async function registerUser({ email, password, isAdmin = false }: RegisterInput) {
  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await hash(password, SALT_ROUNDS);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        isAdmin,
      },
    });

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

interface LoginInput {
  email: string;
  password: string;
}

export async function authenticateUser({ email, password }: LoginInput) {
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const token = sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, {
      expiresIn: "7d",
    });

    (await cookies()).set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  (await cookies()).delete("auth_token");
  return { success: true };
}

export async function getCurrentUser() {
  const tokenCookie = (await cookies()).get("auth_token");
  if (!tokenCookie) {
    return null;
  }

  try {
    const decoded = verify(tokenCookie.value, JWT_SECRET);
    return decoded as { userId: number; isAdmin: boolean };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  const fullUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { id: true, email: true, isAdmin: true },
  });
  
  if (!fullUser) {
    throw new Error("User not found");
  }
  
  return fullUser;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error("Admin access required");
  }
  return user;
}
