import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'

const log = createLogger('auth')

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      authorization: {
        url: 'https://www.facebook.com/v21.0/dialog/oauth',
        params: {
          // Facebook Login for Business - uses config_id instead of scope
          // Config includes: email, pages_show_list, pages_read_engagement, pages_read_user_content, read_insights
          config_id: process.env.FACEBOOK_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: 'true',
        },
      },
      // Allow linking new Facebook app account to existing user with same email
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  events: {
    signIn({ user, isNewUser }) {
      log.info({ user_id: user.id, isNewUser }, 'User signed in')
    },
    signOut(message) {
      if ('session' in message && message.session) {
        const tokenPrefix = message.session.sessionToken.slice(0, 8) + '...'
        log.info({ session_token_prefix: tokenPrefix }, 'User signed out')
      }
    },
  },
})

export async function getFacebookAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'facebook',
    },
    select: {
      access_token: true,
    },
  })

  return account?.access_token ?? null
}

export async function hasFacebookAccount(userId: string): Promise<boolean> {
  const count = await prisma.account.count({
    where: {
      userId,
      provider: 'facebook',
    },
  })

  return count > 0
}
