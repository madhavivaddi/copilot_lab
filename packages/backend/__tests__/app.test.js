const request = require('supertest');
const { app, db } = require('../src/app');

// Close the database connection after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('API Endpoints', () => {
  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const response = await request(app).get('/api/items');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.length).toBeGreaterThanOrEqual(6);
      
      // Check if items have the expected structure
      const item = response.body[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('due_date');
      expect(item).toHaveProperty('completed');
      expect(item).toHaveProperty('priority');
      expect(item).toHaveProperty('tags');
      expect(item).toHaveProperty('created_at');
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = { name: 'Test Item' };
      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newItem.name);
      expect(response.body.completed).toBe(false);
      expect(response.body.priority).toBe('medium');
      expect(response.body.tags).toEqual([]);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should create a new item with optional fields', async () => {
      const newItem = {
        name: 'Task With Metadata',
        description: 'Has optional fields',
        due_date: '2026-12-31',
        completed: true,
        priority: 'high',
        tags: ['work', 'urgent'],
      };

      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(newItem.name);
      expect(response.body.description).toBe(newItem.description);
      expect(response.body.due_date).toBe(newItem.due_date);
      expect(response.body.completed).toBe(true);
      expect(response.body.priority).toBe('high');
      expect(response.body.tags).toEqual(['work', 'urgent']);
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({})
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if due date is invalid', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 'Bad due date', due_date: 'not-a-date' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Due date must be a valid date string');
    });

    it('should return 400 if priority is invalid', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 'Bad priority', priority: 'critical' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Priority must be one of: low, medium, high');
    });

    it('should return 400 if tags are invalid', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 'Bad tags', tags: ['ok', ''] })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tags must be an array of non-empty strings');
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should update an existing item', async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .send({ name: 'Update Me' })
        .set('Accept', 'application/json');

      expect(createResponse.status).toBe(201);

      const updatePayload = {
        name: 'Updated Name',
        description: 'Updated Description',
        due_date: '2026-10-10',
        completed: true,
        priority: 'low',
        tags: ['home'],
      };

      const updateResponse = await request(app)
        .put(`/api/items/${createResponse.body.id}`)
        .send(updatePayload)
        .set('Accept', 'application/json');

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updatePayload.name);
      expect(updateResponse.body.description).toBe(updatePayload.description);
      expect(updateResponse.body.due_date).toBe(updatePayload.due_date);
      expect(updateResponse.body.completed).toBe(true);
      expect(updateResponse.body.priority).toBe('low');
      expect(updateResponse.body.tags).toEqual(['home']);
    });

    it('should support partial update', async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .send({ name: 'Partial Update' })
        .set('Accept', 'application/json');

      const updateResponse = await request(app)
        .put(`/api/items/${createResponse.body.id}`)
        .send({ completed: true })
        .set('Accept', 'application/json');

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.completed).toBe(true);
      expect(updateResponse.body.name).toBe('Partial Update');
    });

    it('should return 400 if no fields are provided', async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .send({ name: 'No Field Update' })
        .set('Accept', 'application/json');

      const updateResponse = await request(app)
        .put(`/api/items/${createResponse.body.id}`)
        .send({})
        .set('Accept', 'application/json');

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toBe('At least one updatable field is required');
    });

    it('should return 404 when updating a missing item', async () => {
      const response = await request(app)
        .put('/api/items/999999')
        .send({ name: 'Missing Item' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item not found');
    });

    it('should return 400 when updating with invalid priority', async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .send({ name: 'Invalid Priority Update' })
        .set('Accept', 'application/json');

      const response = await request(app)
        .put(`/api/items/${createResponse.body.id}`)
        .send({ priority: 'critical' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Priority must be one of: low, medium, high');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      const createResponse = await request(app)
        .post('/api/items')
        .send({ name: 'Delete Me' })
        .set('Accept', 'application/json');

      expect(createResponse.status).toBe(201);

      const deleteResponse = await request(app)
        .delete(`/api/items/${createResponse.body.id}`);

      expect(deleteResponse.status).toBe(204);

      const listResponse = await request(app).get('/api/items');
      const deletedItem = listResponse.body.find((item) => item.id === createResponse.body.id);
      expect(deletedItem).toBeUndefined();
    });

    it('should return 404 when deleting a missing item', async () => {
      const response = await request(app).delete('/api/items/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item not found');
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app).delete('/api/items/not-a-number');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Valid item id is required');
    });
  });
});