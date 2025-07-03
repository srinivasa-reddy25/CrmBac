import express from 'express'
import { authenticate } from '../middlewares/authenticate.middleware'
import { validateCreateContact } from '../middlewares/validateCreateContact.middleware'

import {
    listAllCompanies,
    createNewCompany,
    getCompanyById,
    updateCompanyById,
    deleteCompanyById,
} from '../controllers/companyController'

const CompanyRouter = express.Router()

CompanyRouter.get('/', authenticate, listAllCompanies)
CompanyRouter.post('/', authenticate, validateCreateContact, createNewCompany)
CompanyRouter.get('/:id', authenticate, getCompanyById)
CompanyRouter.put('/:id', authenticate, updateCompanyById)
CompanyRouter.delete('/:id', authenticate, deleteCompanyById)

export default CompanyRouter
