import { prisma } from './prisma'

export interface MatchingFactors {
  compatibility: number // 0-1
  location: number // 0-1
  interests: number // 0-1
  personality: number // 0-1
}

export interface UserWeights {
  compatibilityWeight: number
  locationWeight: number
  interestWeight: number
  personalityWeight: number
}

interface UserProfile {
  smoking: string | null
  drinking: string | null
  exercise: string | null
  diet: string | null
  relationshipGoals: string | null
  children: string | null
  pets: string | null
  interests: string[] | null
  musicGenres: string[] | null
  favoriteMovies: string[] | null
  favoriteBooks: string[] | null
  personalityTraits: string[] | null
}

interface User {
  id: string
  latitude: number | null
  longitude: number | null
  profile: UserProfile | null
}

export class MatchingService {
  // Calculate compatibility score based on lifestyle and preferences
  static calculateCompatibilityScore(user1Profile: UserProfile, user2Profile: UserProfile): number {
    let score = 0
    let factors = 0

    // Lifestyle compatibility
    if (user1Profile.smoking === user2Profile.smoking) score += 0.25
    if (user1Profile.drinking === user2Profile.drinking) score += 0.25
    if (user1Profile.exercise === user2Profile.exercise) score += 0.25
    if (user1Profile.diet === user2Profile.diet) score += 0.25
    factors += 1

    // Relationship goals
    if (user1Profile.relationshipGoals === user2Profile.relationshipGoals) score += 1
    factors += 1

    // Children preferences
    if (user1Profile.children === user2Profile.children) score += 1
    factors += 1

    // Pets
    if (user1Profile.pets === user2Profile.pets) score += 1
    factors += 1

    return factors > 0 ? score / factors : 0
  }

  // Calculate location score based on distance
  static calculateLocationScore(user1: User, user2: User): number {
    if (!user1.latitude || !user1.longitude || !user2.latitude || !user2.longitude) {
      return 0.5 // Neutral score if location data missing
    }

    const distance = this.calculateDistance(
      user1.latitude!, user1.longitude!,
      user2.latitude!, user2.longitude!
    )

    // Score decreases with distance (max 50km = 1.0, min 0km = 0.0)
    return Math.max(0, 1 - (distance / 50))
  }

  // Calculate interests overlap score
  static calculateInterestsScore(user1Profile: UserProfile, user2Profile: UserProfile): number {
    const user1Interests = new Set([
      ...(user1Profile.interests || []),
      ...(user1Profile.musicGenres || []),
      ...(user1Profile.favoriteMovies || []),
      ...(user1Profile.favoriteBooks || [])
    ])

    const user2Interests = new Set([
      ...(user2Profile.interests || []),
      ...(user2Profile.musicGenres || []),
      ...(user2Profile.favoriteMovies || []),
      ...(user2Profile.favoriteBooks || [])
    ])

    const intersection = new Set([...user1Interests].filter(x => user2Interests.has(x)))
    const union = new Set([...user1Interests, ...user2Interests])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  // Calculate personality compatibility score
  static calculatePersonalityScore(user1Profile: UserProfile, user2Profile: UserProfile): number {
    const user1Traits = new Set(user1Profile.personalityTraits || [])
    const user2Traits = new Set(user2Profile.personalityTraits || [])

    // Complementary traits scoring
    const complementaryPairs = [
      ['introverted', 'extroverted'],
      ['creative', 'analytical'],
      ['adventurous', 'homebody']
    ]

    let complementaryScore = 0
    for (const [trait1, trait2] of complementaryPairs) {
      if ((user1Traits.has(trait1) && user2Traits.has(trait2)) ||
          (user1Traits.has(trait2) && user2Traits.has(trait1))) {
        complementaryScore += 0.5
      }
    }

    // Shared traits bonus
    const sharedTraits = new Set([...user1Traits].filter(x => user2Traits.has(x)))
    const sharedScore = sharedTraits.size * 0.2

    return Math.min(1, complementaryScore + sharedScore)
  }

  // Calculate overall match score with custom weights
  static calculateOverallScore(
    factors: MatchingFactors,
    weights: UserWeights
  ): number {
    return (
      factors.compatibility * weights.compatibilityWeight +
      factors.location * weights.locationWeight +
      factors.interests * weights.interestWeight +
      factors.personality * weights.personalityWeight
    )
  }

  // Generate human-readable reasoning for transparency
  static generateTransparencyReasoning(
    factors: MatchingFactors
  ): string {
    const reasons = []

    if (factors.compatibility > 0.7) {
      reasons.push("High lifestyle compatibility")
    }
    if (factors.location > 0.8) {
      reasons.push("Very close geographically")
    }
    if (factors.interests > 0.6) {
      reasons.push("Shared interests and hobbies")
    }
    if (factors.personality > 0.7) {
      reasons.push("Complementary personality traits")
    }

    if (reasons.length === 0) {
      reasons.push("Potential for connection through conversation")
    }

    return reasons.join(", ")
  }

  // Find potential matches for a user
  static async findMatchesForUser(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!user?.profile) return []

    // Get users who haven't been matched/liked before
    const existingInteractions = await prisma.match.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      select: { senderId: true, receiverId: true }
    })

    type Interaction = {
      senderId: string;
      receiverId: string;
    };

    const interactedUserIds = new Set(
      existingInteractions.flatMap((m: Interaction) => [m.senderId, m.receiverId])
    )

    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { not: userId, notIn: Array.from(interactedUserIds) },
        isVerified: true,
        profile: { isNot: null }
      },
      include: { profile: true },
      take: limit * 2 // Get more to filter
    })

    const matches = []

    for (const potentialMatch of potentialMatches) {
      if (!potentialMatch.profile) continue

      const factors: MatchingFactors = {
        compatibility: this.calculateCompatibilityScore(user.profile, potentialMatch.profile),
        location: this.calculateLocationScore(user, potentialMatch),
        interests: this.calculateInterestsScore(user.profile, potentialMatch.profile),
        personality: this.calculatePersonalityScore(user.profile, potentialMatch.profile)
      }

      // Default weights (can be customized per user)
      const weights: UserWeights = {
        compatibilityWeight: 0.3,
        locationWeight: 0.2,
        interestWeight: 0.25,
        personalityWeight: 0.25
      }

      const overallScore = this.calculateOverallScore(factors, weights)

      if (overallScore > 0.4) { // Minimum threshold
        matches.push({
          user: potentialMatch,
          score: overallScore,
          factors,
          weights,
          reasoning: this.generateTransparencyReasoning(factors)
        })
      }
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // Helper function to calculate distance between coordinates
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}