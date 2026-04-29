import React, { useState, useEffect } from 'react';
import './App.css';

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

const parseTags = (value) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    tags: '',
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [editingId, setEditingId] = useState(null);
  const [editState, setEditState] = useState({
    name: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    tags: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);

  const uniqueTags = [...new Set(data.flatMap((item) => item.tags || []))].sort();

  const filteredItems = data
    .filter((item) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !item.completed) ||
      (statusFilter === 'completed' && item.completed);

      const matchesTag = tagFilter === 'all' || (item.tags || []).includes(tagFilter);

      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query);

      return matchesStatus && matchesTag && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'due_date_asc') {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }

      if (sortBy === 'priority_desc') {
        return priorityRank[b.priority] - priorityRank[a.priority];
      }

      return b.id - a.id;
    });

  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData(result);
      setSelectedIds([]);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          due_date: formState.dueDate || null,
          priority: formState.priority,
          tags: parseTags(formState.tags),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const result = await response.json();
      setData((prev) => [result, ...prev]);
      setFormState({ name: '', description: '', dueDate: '', priority: 'medium', tags: '' });
      setError(null);
      setFeedback('Item added successfully');
    } catch (err) {
      setError('Error adding item: ' + err.message);
      console.error('Error adding item:', err);
    }
  };

  const handleUpdate = async (itemId, updates, successMessage) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const updatedItem = await response.json();
      setData((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));
      setError(null);
      setFeedback(successMessage);
      return true;
    } catch (err) {
      setError('Error updating item: ' + err.message);
      console.error('Error updating item:', err);
      return false;
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditState({
      name: item.name,
      description: item.description || '',
      dueDate: item.due_date || '',
      priority: item.priority || 'medium',
      tags: (item.tags || []).join(', '),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({ name: '', description: '', dueDate: '', priority: 'medium', tags: '' });
  };

  const saveEdit = async (itemId) => {
    if (!editState.name.trim()) {
      setError('Task title is required');
      return;
    }

    const updated = await handleUpdate(
      itemId,
      {
        name: editState.name.trim(),
        description: editState.description.trim() || null,
        due_date: editState.dueDate || null,
        priority: editState.priority,
        tags: parseTags(editState.tags),
      },
      'Item updated successfully'
    );
    if (updated) {
      cancelEditing();
    }
  };

  const toggleCompleted = async (item) => {
    await handleUpdate(
      item.id,
      {
        completed: !item.completed,
      },
      item.completed ? 'Item marked as active' : 'Item marked as completed'
    );
  };

  const handleDelete = async (itemId) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setData((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      setError(null);
      setFeedback('Item deleted successfully');
    } catch (err) {
      setError('Error deleting item: ' + err.message);
      console.error('Error deleting item:', err);
    }
  };

  const toggleSelected = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredItems.map((item) => item.id);
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const completeSelected = async () => {
    const targetItems = data.filter((item) => selectedIds.includes(item.id) && !item.completed);
    if (targetItems.length === 0) {
      setFeedback('No active selected items to complete');
      return;
    }

    try {
      await Promise.all(
        targetItems.map((item) =>
          fetch(`/api/items/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: true }),
          })
        )
      );

      setData((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) ? { ...item, completed: true } : item
        )
      );
      setFeedback('Selected items marked completed');
      setError(null);
    } catch (err) {
      setError('Error completing selected items: ' + err.message);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      setFeedback('No selected items to delete');
      return;
    }

    if (!window.confirm('Delete selected tasks? This action cannot be undone.')) {
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/items/${id}`, {
            method: 'DELETE',
          })
        )
      );

      setData((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      setFeedback('Selected items deleted');
      setError(null);
    } catch (err) {
      setError('Error deleting selected items: ' + err.message);
    }
  };

  const clearCompleted = async () => {
    const completedIds = data.filter((item) => item.completed).map((item) => item.id);
    if (completedIds.length === 0) {
      setFeedback('No completed items to clear');
      return;
    }

    if (!window.confirm('Clear all completed tasks? This action cannot be undone.')) {
      return;
    }

    try {
      await Promise.all(
        completedIds.map((id) =>
          fetch(`/api/items/${id}`, {
            method: 'DELETE',
          })
        )
      );

      setData((prev) => prev.filter((item) => !item.completed));
      setSelectedIds((prev) => prev.filter((id) => !completedIds.includes(id)));
      setFeedback('Completed items cleared');
      setError(null);
    } catch (err) {
      setError('Error clearing completed items: ' + err.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello World</h1>
        <p>Hello World</p>
        <p>Connected to in-memory database</p>
      </header>
      
      <main>
        <section className="add-item-section">
          <h2>Add New Item</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Task title"
            />
            <input
              type="text"
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            <input
              type="date"
              value={formState.dueDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, dueDate: e.target.value }))}
              aria-label="Due date"
            />
            <select
              aria-label="Priority"
              value={formState.priority}
              onChange={(e) => setFormState((prev) => ({ ...prev, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="text"
              value={formState.tags}
              onChange={(e) => setFormState((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags (comma separated)"
            />
            <button type="submit">Add Item</button>
          </form>
        </section>

        <section className="items-section">
          <h2>Items from Database</h2>
          <div className="list-controls">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>

            <label htmlFor="search-title">Search title</label>
            <input
              id="search-title"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or description"
            />

            <label htmlFor="tag-filter">Tag</label>
            <select id="tag-filter" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">All tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            <label htmlFor="sort-by">Sort</label>
            <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created_desc">Created (newest)</option>
              <option value="due_date_asc">Due date (earliest)</option>
              <option value="priority_desc">Priority (high to low)</option>
            </select>
          </div>

          <div className="bulk-controls">
            <button type="button" className="secondary-button" onClick={toggleSelectAllVisible}>
              {allVisibleSelected ? 'Unselect Visible' : 'Select Visible'}
            </button>
            <button type="button" className="secondary-button" onClick={completeSelected}>
              Complete Selected
            </button>
            <button type="button" className="delete-button" onClick={deleteSelected}>
              Delete Selected
            </button>
            <button type="button" className="delete-button" onClick={clearCompleted}>
              Clear Completed
            </button>
          </div>
          {loading && <p>Loading data...</p>}
          {error && <p className="error">{error}</p>}
          {feedback && <p className="success">{feedback}</p>}
          {!loading && !error && (
            <ul>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <li key={item.id} className="item-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                    <div className="item-details">
                      {editingId === item.id ? (
                        <div className="edit-fields">
                          <input
                            type="text"
                            value={editState.name}
                            onChange={(e) => setEditState((prev) => ({ ...prev, name: e.target.value }))}
                            aria-label={`Edit name for ${item.name}`}
                          />
                          <input
                            type="text"
                            value={editState.description}
                            onChange={(e) => setEditState((prev) => ({ ...prev, description: e.target.value }))}
                            aria-label={`Edit description for ${item.name}`}
                            placeholder="Description"
                          />
                          <input
                            type="date"
                            value={editState.dueDate}
                            onChange={(e) => setEditState((prev) => ({ ...prev, dueDate: e.target.value }))}
                            aria-label={`Edit due date for ${item.name}`}
                          />
                          <select
                            value={editState.priority}
                            onChange={(e) => setEditState((prev) => ({ ...prev, priority: e.target.value }))}
                            aria-label={`Edit priority for ${item.name}`}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <input
                            type="text"
                            value={editState.tags}
                            onChange={(e) => setEditState((prev) => ({ ...prev, tags: e.target.value }))}
                            aria-label={`Edit tags for ${item.name}`}
                            placeholder="tag1, tag2"
                          />
                        </div>
                      ) : (
                        <>
                          <span className={`item-name ${item.completed ? 'completed' : ''}`}>{item.name}</span>
                          <small className="item-priority">Priority: {item.priority}</small>
                        </>
                      )}
                      {item.description && <small className="item-description">{item.description}</small>}
                      {item.due_date && <small className="item-due-date">Due: {item.due_date}</small>}
                      {item.tags && item.tags.length > 0 && (
                        <small className="item-tags">Tags: {item.tags.join(', ')}</small>
                      )}
                    </div>
                    <div className="item-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => toggleCompleted(item)}
                      >
                        {item.completed ? 'Mark Active' : 'Mark Complete'}
                      </button>
                      {editingId === item.id ? (
                        <>
                          <button type="button" className="secondary-button" onClick={() => saveEdit(item.id)}>
                            Save
                          </button>
                          <button type="button" className="secondary-button" onClick={cancelEditing}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditing(item)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <p>{data.length > 0 ? 'No matching items.' : 'No items found. Add some!'}</p>
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;