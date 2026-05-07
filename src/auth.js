import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import oauth2 from '@fastify/oauth2'
import axios from 'axios'
import { upsertUser } from './db.js'

const GOOGLE_AUTH = {
  authorizeHost: 'https://accounts.google.com',
  authorizePath: '/o/oauth2/v2/auth',
  tokenHost: 'https://www.googleapis.com',
  tokenPath: '/oauth2/v4/token',
}

export default fp(async function authPlugin(fastify) {
  await fastify.register(cookie)

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
    cookie: { cookieName: 'token', signed: false },
  })

  await fastify.register(oauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET,
      },
      auth: GOOGLE_AUTH,
    },
    scope: ['profile', 'email'],
    startRedirectPath: '/auth/google',
    callbackUri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
  })

  fastify.decorate('authenticate', async function (req, reply) {
    try {
      await req.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Não autenticado.' })
    }
  })

  fastify.get('/auth/google/callback', async (req, reply) => {
    try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)

      const { data: googleUser } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      })

      await upsertUser({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      })

      const jwtToken = fastify.jwt.sign(
        { sub: googleUser.id, email: googleUser.email, name: googleUser.name, picture: googleUser.picture },
        { expiresIn: '7d' },
      )

      reply.setCookie('token', jwtToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })

      return reply.redirect('/')
    } catch (err) {
      fastify.log.error(err, 'Erro no callback OAuth')
      return reply.redirect('/?auth_error=1')
    }
  })

  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (req) => {
    return req.user
  })

  fastify.post('/auth/logout', async (req, reply) => {
    reply.clearCookie('token', { path: '/' })
    return { ok: true }
  })
})
