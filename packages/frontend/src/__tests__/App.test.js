import React, { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

// Mock server to intercept API requests
const server = setupServer(
  // GET /api/items handler
  rest.get('/api/items', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          name: 'Test Item 1',
          description: 'Alpha details',
          due_date: '2026-11-01',
          completed: false,
          priority: 'low',
          tags: ['home'],
          created_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          name: 'Test Item 2',
          description: 'Second item details',
          due_date: '2026-12-31',
          completed: true,
          priority: 'high',
          tags: ['work', 'urgent'],
          created_at: '2023-01-02T00:00:00.000Z',
        },
      ])
    );
  }),
  
  // POST /api/items handler
  rest.post('/api/items', (req, res, ctx) => {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Item name is required' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        name,
        description: req.body.description ?? null,
        due_date: req.body.due_date ?? null,
        completed: false,
        priority: req.body.priority ?? 'medium',
        tags: req.body.tags ?? [],
        created_at: new Date().toISOString(),
      })
    );
  }),

  // PUT /api/items/:id handler
  rest.put('/api/items/:id', (req, res, ctx) => {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId)) {
      return res(ctx.status(400), ctx.json({ error: 'Valid item id is required' }));
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: itemId,
        name: req.body.name ?? `Test Item ${itemId}`,
        description: req.body.description ?? null,
        due_date: req.body.due_date ?? null,
        completed: req.body.completed ?? false,
        priority: req.body.priority ?? 'medium',
        tags: req.body.tags ?? [],
        created_at: '2023-01-01T00:00:00.000Z',
      })
    );
  }),

  // DELETE /api/items/:id handler
  rest.delete('/api/items/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  jest.spyOn(window, 'confirm').mockImplementation(() => true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('App Component', () => {
  test('renders the header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
    expect(screen.getByText('Connected to in-memory database')).toBeInTheDocument();
  });

  test('loads and displays items', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });

  test('adds a new item', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });
    
    // Fill in the form and submit
    const input = screen.getByPlaceholderText('Task title');
    await act(async () => {
      await user.type(input, 'New Test Item');
      await user.type(screen.getByPlaceholderText('Tags (comma separated)'), 'feature, sprint');
    });
    
    const submitButton = screen.getByText('Add Item');
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Check that the new item appears
    await waitFor(() => {
      expect(screen.getByText('New Test Item')).toBeInTheDocument();
    });

    expect(screen.getByText('Tags: feature, sprint')).toBeInTheDocument();

    expect(screen.getByText('Item added successfully')).toBeInTheDocument();
  });

  test('shows validation for empty title submissions', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('Add Item'));
    });

    expect(screen.getByText('Task title is required')).toBeInTheDocument();
  });

  test('edits an item title', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    const item1Row = screen.getByText('Test Item 1').closest('li');

    await act(async () => {
      await user.click(within(item1Row).getByRole('button', { name: 'Edit' }));
    });

    const editInput = screen.getByLabelText('Edit name for Test Item 1');
    await act(async () => {
      await user.clear(editInput);
      await user.type(editInput, 'Updated Frontend Name');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Frontend Name')).toBeInTheDocument();
    });
  });

  test('toggles an item to completed', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: 'Mark Complete' })[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Item marked as completed')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Mark Active' }).length).toBeGreaterThan(0);
    });
  });

  test('filters tasks by status', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Status'), 'completed');
    });

    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  test('searches tasks by title', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search by title or description'), 'Item 1');
    });

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
  });

  test('handles API error', async () => {
    // Override the default handler to simulate an error
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
    });
  });

  test('deletes an item', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    const item1Row = screen.getByText('Test Item 1').closest('li');

    await act(async () => {
      await user.click(within(item1Row).getByRole('button', { name: 'Delete' }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Item deleted successfully')).toBeInTheDocument();
  });

  test('shows empty state when no items', async () => {
    // Override the default handler to return empty array
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
    });
  });

  test('filters tasks by tag', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Tag'), 'work');
    });

    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  test('searches description text', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search by title or description'), 'Alpha');
    });

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
  });

  test('sorts by priority high to low', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Sort'), 'priority_desc');
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Test Item 2');
  });

  test('deletes selected tasks with confirmation', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Select Test Item 1'));
      await user.click(screen.getByRole('button', { name: 'Delete Selected' }));
    });

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    });
  });
});