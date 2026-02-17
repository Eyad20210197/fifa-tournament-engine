import { z } from 'zod'
import { login } from './auth.service.js'
import { HttpError } from '../../utils/httpError.js'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function loginController(req, res) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid login payload', parsed.error.issues)
  }

  const result = await login(parsed.data)
  return res.json({
    success: true,
    ...result,
  })
}

