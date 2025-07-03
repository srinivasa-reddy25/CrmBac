import express from 'express'
import upload from '../middlewares/upload'
import { authenticate } from '../middlewares/authenticate.middleware'
import { validateCreateContact } from '../middlewares/validateCreateContact.middleware'

import {
    listallContacts,
    createNewContact,
    getContactById,
    updateContactById,
    deleteContactById,
    bulkDeleteContacts,
} from '../controllers/contactController'

import { bulkImportContacts } from '../controllers/bulkimportcontacts'

const router = express.Router()

router.get('/', authenticate, listallContacts)
router.post('/', authenticate, validateCreateContact, createNewContact)
router.get('/:id', authenticate, getContactById)
router.put('/:id', authenticate, updateContactById)
router.delete('/:id', authenticate, deleteContactById)

router.post('/bulk-import', authenticate, upload.single('file'), bulkImportContacts)
router.post('/bulk-delete', authenticate, bulkDeleteContacts)

export default router
