import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'

const createProfileSchema = z.object({
  height: z.number().optional(),
  education: z.string().optional(),
  occupation: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  smoking: z.enum(['never', 'occasionally', 'regularly']).optional(),
  drinking: z.enum(['never', 'occasionally', 'regularly']).optional(),
  exercise: z.enum(['never', 'sometimes', 'regularly']).optional(),
  diet: z.string().optional(),
  interests: z.array(z.string()).optional(),
  musicGenres: z.array(z.string()).optional(),
  favoriteMovies: z.array(z.string()).optional(),
  favoriteBooks: z.array(z.string()).optional(),
  personalityTraits: z.array(z.string()).optional(),
  loveLanguage: z.string().optional(),
  relationshipGoals: z.enum(['casual', 'serious', 'marriage']).optional(),
  children: z.enum(['want', 'dont_want', 'have']).optional(),
  pets: z.enum(['cats', 'dogs', 'both', 'none']).optional()
})

// GET /api/profiles - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await AuthService.getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/profiles - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await AuthService.getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createProfileSchema.parse(body)

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: validatedData,
      create: {
        userId: user.id,
        ...validatedData
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}