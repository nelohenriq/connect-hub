import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface JWTPayload {
  userId: string
  email: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
      return null
    }
  }

  static async getUserFromToken(token: string) {
    const payload = this.verifyToken(token)
    if (!payload) return null

    return prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        profile: true,
        analytics: true
      }
    })
  }
}

// Client-side auth utilities
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('authToken', token)
}

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('authToken')
}

export const getCurrentUserId = (): string | null => {
  const token = getAuthToken()
  if (!token) return null

  try {
    const payload = jwt.decode(token) as JWTPayload
    return payload?.userId || null
  } catch {
    return null
  }
}

export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null && getCurrentUserId() !== null
}