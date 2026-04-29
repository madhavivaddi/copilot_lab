const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
const initialItems = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6'];
const insertStmt = db.prepare(
  'INSERT INTO items (name, description, due_date, completed, priority, tags) VALUES (?, ?, ?, ?, ?, ?)'
);

const getItemByIdStmt = db.prepare('SELECT * FROM items WHERE id = ?');
const updateItemStmt = db.prepare(
  `UPDATE items
   SET name = ?, description = ?, due_date = ?, completed = ?, priority = ?, tags = ?
   WHERE id = ?`
);

const listItemsStmt = db.prepare('SELECT * FROM items ORDER BY datetime(created_at) DESC, id DESC');

const normalizeItem = (item) => ({
  ...item,
  completed: item.completed === 1,
  tags: JSON.parse(item.tags || '[]'),
});

const allowedPriorities = new Set(['low', 'medium', 'high']);

const isValidDueDate = (dueDate) => {
  if (dueDate === null || dueDate === undefined) {
    return true;
  }

  if (typeof dueDate !== 'string' || dueDate.trim() === '') {
    return false;
  }

  return !Number.isNaN(Date.parse(dueDate));
};

const isValidPriority = (priority) =>
  typeof priority === 'string' && allowedPriorities.has(priority);

const isValidTags = (tags) =>
  Array.isArray(tags) && tags.every((tag) => typeof tag === 'string' && tag.trim() !== '');

initialItems.forEach(item => {
  insertStmt.run(item, null, null, 0, 'medium', '[]');
});

console.log('In-memory database initialized with sample data');

// API Routes
app.get('/api/items', (req, res) => {
  try {
    const items = listItemsStmt.all().map(normalizeItem);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const {
      name,
      description = null,
      due_date = null,
      completed = false,
      priority = 'medium',
      tags = [],
    } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    if (!isValidDueDate(due_date)) {
      return res.status(400).json({ error: 'Due date must be a valid date string' });
    }

    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Completed must be a boolean' });
    }

    if (!isValidPriority(priority)) {
      return res.status(400).json({ error: 'Priority must be one of: low, medium, high' });
    }

    if (!isValidTags(tags)) {
      return res.status(400).json({ error: 'Tags must be an array of non-empty strings' });
    }
    
    const result = insertStmt.run(
      name.trim(),
      description,
      due_date,
      completed ? 1 : 0,
      priority,
      JSON.stringify(tags.map((tag) => tag.trim()))
    );
    const id = result.lastInsertRowid;
    
    const newItem = getItemByIdStmt.get(id);
    res.status(201).json(normalizeItem(newItem));
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'Valid item id is required' });
    }

    const existingItem = getItemByIdStmt.get(itemId);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const hasName = Object.prototype.hasOwnProperty.call(req.body, 'name');
    const hasDescription = Object.prototype.hasOwnProperty.call(req.body, 'description');
    const hasDueDate = Object.prototype.hasOwnProperty.call(req.body, 'due_date');
    const hasCompleted = Object.prototype.hasOwnProperty.call(req.body, 'completed');
    const hasPriority = Object.prototype.hasOwnProperty.call(req.body, 'priority');
    const hasTags = Object.prototype.hasOwnProperty.call(req.body, 'tags');

    if (!hasName && !hasDescription && !hasDueDate && !hasCompleted && !hasPriority && !hasTags) {
      return res.status(400).json({ error: 'At least one updatable field is required' });
    }

    let nextName = existingItem.name;
    let nextDescription = existingItem.description;
    let nextDueDate = existingItem.due_date;
    let nextCompleted = existingItem.completed;
    let nextPriority = existingItem.priority;
    let nextTags = existingItem.tags;

    if (hasName) {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Item name is required' });
      }
      nextName = name.trim();
    }

    if (hasDescription) {
      const { description } = req.body;
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string' });
      }
      nextDescription = description;
    }

    if (hasDueDate) {
      const { due_date } = req.body;
      if (!isValidDueDate(due_date)) {
        return res.status(400).json({ error: 'Due date must be a valid date string' });
      }
      nextDueDate = due_date;
    }

    if (hasCompleted) {
      const { completed } = req.body;
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'Completed must be a boolean' });
      }
      nextCompleted = completed ? 1 : 0;
    }

    if (hasPriority) {
      const { priority } = req.body;
      if (!isValidPriority(priority)) {
        return res.status(400).json({ error: 'Priority must be one of: low, medium, high' });
      }
      nextPriority = priority;
    }

    if (hasTags) {
      const { tags } = req.body;
      if (!isValidTags(tags)) {
        return res.status(400).json({ error: 'Tags must be an array of non-empty strings' });
      }
      nextTags = JSON.stringify(tags.map((tag) => tag.trim()));
    }

    updateItemStmt.run(nextName, nextDescription, nextDueDate, nextCompleted, nextPriority, nextTags, itemId);

    const updatedItem = getItemByIdStmt.get(itemId);
    res.json(normalizeItem(updatedItem));
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'Valid item id is required' });
    }

    const deleteResult = db.prepare('DELETE FROM items WHERE id = ?').run(itemId);

    if (deleteResult.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = { app, db, insertStmt };