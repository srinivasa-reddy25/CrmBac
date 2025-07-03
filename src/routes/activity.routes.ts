import express from 'express'
import { getActivities } from '../controllers/activityController'

import { authenticate } from '../middlewares/authenticate.middleware'

const router = express.Router()

router.get('/', authenticate, getActivities)

export default router
