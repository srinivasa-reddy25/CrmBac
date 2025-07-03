import express from 'express'
import { authenticate } from '../middlewares/authenticate.middleware'
import {
    getSummaryMetrics,
    getContactByCompany,
    activitiesTimeline,
    tagDistribution
} from '../controllers/dashboardController'

const dashboardRouter = express.Router()

dashboardRouter.get('/summary', authenticate, getSummaryMetrics)
dashboardRouter.get('/contacts-by-company', authenticate, getContactByCompany)
dashboardRouter.get('/activities-timeline', authenticate, activitiesTimeline)
dashboardRouter.get('/tag-distribution', authenticate, tagDistribution)

export default dashboardRouter
