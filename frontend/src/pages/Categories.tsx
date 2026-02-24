import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

interface Category {
  id: number;
  name: string;
  type: string;
  color: string;
}

interface Rule {
  id: number;
  pattern: string;
  category_id: number;
  category_name: string;
  category_color: string;
}

interface CategoryForm {
  name: string;
  type: 'expense' | 'income';
  color: string;
}

interface RuleForm {
  pattern: string;
  category_id: string;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#64748b', // slate
  '#06b6d4', // cyan
];

const emptyCategoryForm: CategoryForm = {
  name: '',
  type: 'expense',
  color: PRESET_COLORS[0],
};

const emptyRuleForm: RuleForm = {
  pattern: '',
  category_id: '',
};

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [categorySaving, setCategorySaving] = useState(false);

  // Rule modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm);
  const [ruleSaving, setRuleSaving] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    api
      .getCategories()
      .then((result: Category[]) => {
        setCategories(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const fetchRules = () => {
    setRulesLoading(true);
    api
      .getRules()
      .then((result: Rule[]) => {
        setRules(result);
        setRulesLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setRulesLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
    fetchRules();
  }, []);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  // Category CRUD
  const openCreateCategory = (type: 'expense' | 'income') => {
    setEditingCategory(null);
    setCategoryForm({ ...emptyCategoryForm, type });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      type: cat.type as 'expense' | 'income',
      color: cat.color || PRESET_COLORS[0],
    });
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async () => {
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, categoryForm);
      } else {
        await api.createCategory(categoryForm);
      }
      closeCategoryModal();
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"? Transactions in this category will become uncategorized.`)) {
      return;
    }
    try {
      await api.deleteCategory(cat.id);
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Rule CRUD
  const openCreateRule = () => {
    setRuleForm(emptyRuleForm);
    setRuleModalOpen(true);
  };

  const closeRuleModal = () => {
    setRuleModalOpen(false);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.pattern || !ruleForm.category_id) return;
    setRuleSaving(true);
    try {
      await api.createRule({
        pattern: ruleForm.pattern,
        category_id: parseInt(ruleForm.category_id),
      });
      closeRuleModal();
      fetchRules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRuleSaving(false);
    }
  };

  const handleDeleteRule = async (rule: Rule) => {
    if (!window.confirm(`Delete rule "${rule.pattern}"?`)) return;
    try {
      await api.deleteRule(rule.id);
      fetchRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderCategorySection = (
    title: string,
    items: Category[],
    type: 'expense' | 'income'
  ) => (
    <div className="card">
      <div className="flex-between">
        <h2 style={{ marginBottom: 0 }}>{title}</h2>
        <button className="btn btn-primary btn-sm" onClick={() => openCreateCategory(type)}>
          Add Category
        </button>
      </div>
      {items.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <p>No {type} categories yet</p>
        </div>
      ) : (
        <div style={{ marginTop: '16px' }}>
          {items.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #f1f5f9',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: cat.color || '#94a3b8',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontWeight: 500, color: '#334155' }}>
                {cat.name}
              </span>
              <div className="btn-group">
                <button className="btn btn-secondary btn-sm" onClick={() => openEditCategory(cat)}>
                  Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(cat)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading categories...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Categories</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {renderCategorySection('Expense Categories', expenseCategories, 'expense')}
      {renderCategorySection('Income Categories', incomeCategories, 'income')}

      {/* Auto-Categorization Rules */}
      <div className="card">
        <div className="flex-between">
          <h2 style={{ marginBottom: 0 }}>Auto-Categorization Rules</h2>
          <button className="btn btn-primary btn-sm" onClick={openCreateRule}>
            Add Rule
          </button>
        </div>
        {rulesLoading ? (
          <div className="loading" style={{ padding: '24px' }}>
            <div className="spinner" />
            Loading rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p>No auto-categorization rules yet</p>
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                  gap: '12px',
                }}
              >
                <code
                  style={{
                    padding: '2px 8px',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#334155',
                  }}
                >
                  {rule.pattern}
                </code>
                <span style={{ color: '#94a3b8', fontSize: '16px' }}>&rarr;</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: rule.category_color ? `${rule.category_color}20` : undefined,
                    color: rule.category_color || undefined,
                  }}
                >
                  {rule.category_name}
                </span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRule(rule)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={closeCategoryModal}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            className="form-control"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select
            className="form-control"
            value={categoryForm.type}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, type: e.target.value as 'expense' | 'income' }))
            }
            disabled={!!editingCategory}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="form-group">
          <label>Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setCategoryForm((prev) => ({ ...prev, color }))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: categoryForm.color === color ? '3px solid #0f172a' : '3px solid transparent',
                  cursor: 'pointer',
                  outline: categoryForm.color === color ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '1px',
                  padding: 0,
                  transition: 'border-color 0.15s, outline 0.15s',
                }}
                title={color}
              />
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSaveCategory}
            disabled={categorySaving || !categoryForm.name}
          >
            {categorySaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
          </button>
          <button className="btn btn-secondary" onClick={closeCategoryModal}>
            Cancel
          </button>
        </div>
      </Modal>

      {/* Rule Modal */}
      <Modal isOpen={ruleModalOpen} onClose={closeRuleModal} title="Add Rule">
        <div className="form-group">
          <label>Pattern</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. amazon, netflix, grocery"
            value={ruleForm.pattern}
            onChange={(e) => setRuleForm((prev) => ({ ...prev, pattern: e.target.value }))}
          />
          <div className="form-help">
            Transactions with descriptions matching this text will be automatically categorized
          </div>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select
            className="form-control"
            value={ruleForm.category_id}
            onChange={(e) => setRuleForm((prev) => ({ ...prev, category_id: e.target.value }))}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSaveRule}
            disabled={ruleSaving || !ruleForm.pattern || !ruleForm.category_id}
          >
            {ruleSaving ? 'Saving...' : 'Create Rule'}
          </button>
          <button className="btn btn-secondary" onClick={closeRuleModal}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Categories;
