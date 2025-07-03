import express from 'express'
import { getUserConversations } from '../controllers/conversationController'
import { authenticate } from '../middlewares/authenticate.middleware'

const conversationRouter = express.Router()

conversationRouter.get('/', authenticate, getUserConversations)

export default conversationRouter
