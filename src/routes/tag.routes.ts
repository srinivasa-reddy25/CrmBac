import express from 'express'
import { authenticate } from '../middlewares/authenticate.middleware'
import { validateCreateContact } from '../middlewares/validateCreateContact.middleware'

import {
  getAllTags,
  createNewTag,
  getTagById,
  updateTagById,
  deleteTagById,
} from '../controllers/tagController'

const TagRouter = express.Router()

TagRouter.get('/', authenticate, getAllTags)
TagRouter.post('/', authenticate, validateCreateContact, createNewTag)
TagRouter.get('/:id', authenticate, getTagById)
TagRouter.put('/:id', authenticate, updateTagById)
TagRouter.delete('/:id', authenticate, deleteTagById)

export default TagRouter
