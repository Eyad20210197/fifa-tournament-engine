import { Router } from 'express'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { loginController } from './auth.controller.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(loginController))

