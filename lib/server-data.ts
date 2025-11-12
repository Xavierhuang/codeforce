/**
 * Server-side data fetching utilities
 * These functions can be used in Server Components and API routes
 */

import { prisma } from './prisma'
import { calculateBadgeTier } from './badge-tier'
import { getCurrentUser } from './auth-helpers'
import { getAvailabilityScore, hasAvailabilitySet } from './availability'

/**
 * Fetch recommended developers for homepage
 * Used in SSG/SSR
 * Prioritizes developers with availability set up
 */
export async function getRecommendedDevelopers(limit: number = 6) {
  try {
    const developers = await prisma.user.findMany({
      where: {
        role: 'WORKER',
        verificationStatus: 'VERIFIED',
      },
      include: {
        skills: true,
        _count: {
          select: {
            tasksAssigned: {
              where: {
                status: 'COMPLETED',
              },
            },
            reviewsReceived: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
      take: limit * 2, // Fetch more to prioritize by availability
    })

    // Calculate badge tiers and availability scores
    const developersWithMetrics = developers.map((dev) => {
      const completedTasks = dev._count?.tasksAssigned || 0
      const rating = dev.rating || 0
      const reviewCount = dev._count?.reviewsReceived || 0
      const calculatedTier = calculateBadgeTier(completedTasks, rating, reviewCount)
      const availabilityScore = getAvailabilityScore(dev.availability as any)
      const hasAvailability = hasAvailabilitySet(dev.availability as any)

      return {
        id: dev.id,
        name: dev.name,
        slug: dev.slug,
        avatarUrl: dev.avatarUrl,
        rating: rating,
        bio: dev.bio,
        badgeTier: dev.badgeTier || calculatedTier,
        skills: dev.skills,
        workerServices: ((dev as any).workerServices as any) || [],
        _count: dev._count,
        availabilityScore,
        hasAvailability,
      }
    })

    // Sort by availability (prioritize those with availability), then rating
    developersWithMetrics.sort((a, b) => {
      // Prioritize developers with availability set up
      if (a.hasAvailability && !b.hasAvailability) return -1
      if (!a.hasAvailability && b.hasAvailability) return 1
      
      // If both have availability, sort by availability score
      if (a.hasAvailability && b.hasAvailability) {
        if (b.availabilityScore !== a.availabilityScore) {
          return b.availabilityScore - a.availabilityScore
        }
      }
      
      // Then by rating
      if (b.rating !== a.rating) {
        return b.rating - a.rating
      }
      
      return 0
    })

    // Return top developers
    return developersWithMetrics.slice(0, limit)
  } catch (error) {
    console.error('Error fetching recommended developers:', error)
    return []
  }
}

/**
 * Fetch user data server-side
 * Used in SSR for authenticated pages
 */
export async function getServerUser() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        skills: true,
      },
    })

    return userWithRelations
  } catch (error) {
    console.error('Error fetching server user:', error)
    return null
  }
}

/**
 * Fetch worker dashboard stats server-side
 */
export async function getWorkerStats(userId: string) {
  try {
    // Fetch user first to get walletBalance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    })
    
    // Fetch stats in parallel
    const [
      totalEarnings,
      completedTasks,
      inProgressTasks,
      assignedTasks,
      pendingOffers,
      openTasks,
      ratingAggregate,
      thisMonthEarnings,
      thisMonthCompleted,
      recentCompleted,
    ] = await Promise.all([
      // Total earnings
      prisma.task.aggregate({
        where: {
          workerId: userId,
          status: 'COMPLETED',
        },
        _sum: {
          price: true,
        },
      }),
      // Completed tasks count
      prisma.task.count({
        where: {
          workerId: userId,
          status: 'COMPLETED',
        },
      }),
      // In progress tasks
      prisma.task.count({
        where: {
          workerId: userId,
          status: 'IN_PROGRESS',
        },
      }),
      // Assigned tasks
      prisma.task.count({
        where: {
          workerId: userId,
          status: 'ASSIGNED',
        },
      }),
      // Pending offers
      prisma.offer.count({
        where: {
          workerId: userId,
          status: 'PENDING',
        },
      }),
      // Open tasks (for browsing)
      prisma.task.count({
        where: {
          status: 'OPEN',
        },
      }),
      // Average rating
      prisma.review.aggregate({
        where: {
          targetUserId: userId,
        },
        _avg: {
          rating: true,
        },
        _count: true,
      }),
      // This month earnings
      prisma.task.aggregate({
        where: {
          workerId: userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: {
          price: true,
        },
      }),
      // This month completed
      prisma.task.count({
        where: {
          workerId: userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Recent completed tasks
      prisma.task.findMany({
        where: {
          workerId: userId,
          status: 'COMPLETED',
        },
        select: {
          id: true,
          title: true,
          price: true,
          completedAt: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 5,
      }),
    ])

    // Calculate pending payout
    const pendingPayout = await prisma.payoutRequest.aggregate({
      where: {
        workerId: userId,
        status: 'PENDING',
      },
      _sum: {
        amount: true,
      },
    })

    return {
      stats: {
        walletBalance: user?.walletBalance || 0,
        totalEarnings: totalEarnings._sum.price || 0,
        completedTasks: completedTasks,
        inProgressTasks: inProgressTasks,
        assignedTasks: assignedTasks,
        pendingOffers: pendingOffers,
        openTasks: openTasks,
        averageRating: ratingAggregate._avg.rating || 0,
        ratingCount: ratingAggregate._count || 0,
        thisMonthEarnings: thisMonthEarnings._sum.price || 0,
        thisMonthCompleted: thisMonthCompleted,
        pendingPayoutAmount: pendingPayout._sum.amount || 0,
      },
      recentCompleted: recentCompleted,
    }
  } catch (error) {
    console.error('Error fetching worker stats:', error)
    return null
  }
}

/**
 * Fetch developers for client dashboard
 */
export async function getDevelopersForClient() {
  try {
    const developers = await prisma.user.findMany({
      where: {
        role: 'WORKER',
        verificationStatus: 'VERIFIED',
      },
      include: {
        skills: true,
        _count: {
          select: {
            tasksAssigned: {
              where: {
                status: 'COMPLETED',
              },
            },
            reviewsReceived: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
      take: 50,
    })

    return developers.map((dev) => {
      const completedTasks = dev._count?.tasksAssigned || 0
      const rating = dev.rating || 0
      const reviewCount = dev._count?.reviewsReceived || 0
      const calculatedTier = calculateBadgeTier(completedTasks, rating, reviewCount)

      return {
        ...dev,
        badgeTier: dev.badgeTier || calculatedTier,
      }
    })
  } catch (error) {
    console.error('Error fetching developers for client:', error)
    return []
  }
}

/**
 * Fetch notifications for header
 */
export async function getHeaderNotifications(userId: string) {
  try {
    const [allNotifications, unreadNotifications] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      prisma.notification.findMany({
        where: {
          userId,
          readStatus: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      }),
    ])

    return {
      allNotifications,
      unreadNotifications,
      unreadCount: unreadNotifications.length,
    }
  } catch (error) {
    console.error('Error fetching header notifications:', error)
    return {
      allNotifications: [],
      unreadNotifications: [],
      unreadCount: 0,
    }
  }
}

/**
 * Fetch admin badge counts for header
 */
export async function getAdminBadgeCounts() {
  try {
    const [pendingUsers, payoutRequests, supportTickets] = await Promise.all([
      prisma.user.findMany({
        where: {
          verificationStatus: 'PENDING',
        },
        select: {
          id: true,
          verificationStatus: true,
        },
      }),
      prisma.payoutRequest.findMany({
        where: {
          status: 'PENDING',
        },
        select: {
          id: true,
          status: true,
        },
      }),
      prisma.supportTicket.findMany({
        select: {
          id: true,
          status: true,
          category: true,
        },
      }),
    ])

    const pendingVerifications = pendingUsers.filter((u) => u.verificationStatus === 'PENDING').length
    const pendingPayouts = payoutRequests.filter((r) => r.status === 'PENDING').length
    const openTickets = supportTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length
    const reports = supportTickets.filter(
      (t) => t.category === 'REPORT_USER' || t.category === 'REPORT_TASK'
    )

    return {
      pendingVerifications,
      pendingPayouts,
      openTickets,
      reports: reports.filter((r: any) => r.status === 'OPEN').length,
    }
  } catch (error) {
    console.error('Error fetching admin badge counts:', error)
    return {
      pendingVerifications: 0,
      pendingPayouts: 0,
      openTickets: 0,
      reports: 0,
    }
  }
}

