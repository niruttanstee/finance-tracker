'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  defaultBudget?: number;
  noRollover?: boolean;
}

interface CategoryFormData {
  id?: string;
  name: string;
  color: string;
  defaultBudget: number;
  noRollover: boolean;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', color: '#3b82f6', defaultBudget: 0, noRollover: false });
  const [currentYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Budget dialog state
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<Category | null>(null);
  const [budgetValue, setBudgetValue] = useState<number>(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      // Fetch categories with defaultBudget
      const catResponse = await fetch('/api/categories');
      const catData = await catResponse.json();
      
      setCategories(catData.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddDialog() {
    setEditingCategory(null);
    setFormData({ name: '', color: '#3b82f6', defaultBudget: 0, noRollover: false });
    setIsDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      color: category.color,
      defaultBudget: category.defaultBudget || 0,
      noRollover: category.noRollover || false,
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingCategory) {
        // Update category with defaultBudget
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: formData.id,
            name: formData.name,
            color: formData.color,
            defaultBudget: formData.defaultBudget,
            noRollover: formData.noRollover,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update category');
        }
      } else {
        // Create category with defaultBudget
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            color: formData.color,
            defaultBudget: formData.defaultBudget,
            noRollover: formData.noRollover,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create category');
        }
      }
      
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  async function handleDelete(categoryId: string) {
    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }
      
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  function openBudgetDialog(category: Category) {
    setBudgetCategory(category);
    setBudgetValue(category.defaultBudget || 0);
    setIsBudgetDialogOpen(true);
  }

  async function handleBudgetSave() {
    try {
      if (!budgetCategory) return;

      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: budgetCategory.id,
          name: budgetCategory.name,
          color: budgetCategory.color,
          defaultBudget: budgetValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update budget');
      }

      setIsBudgetDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error updating budget:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Default Budget (MYR)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rollover</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: category.color }}
                  />
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  {category.defaultBudget ? (
                    <span className="font-medium">{category.defaultBudget.toLocaleString()} MYR</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">No budget set</span>
                  )}
                </TableCell>
                <TableCell>
                  {category.isDefault ? (
                    <span className="text-xs text-muted-foreground">Default</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Custom</span>
                  )}
                </TableCell>
                <TableCell>
                  {category.noRollover ? (
                    <span className="text-xs text-amber-600 font-medium">No</span>
                  ) : (
                    <span className="text-xs text-green-600">Yes</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openBudgetDialog(category)}
                      title="Set Budget"
                    >
                      <Wallet className="h-4 w-4" />
                    </Button>
                    {!category.isDefault && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded border"
                />
                <Input
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Default Budget (MYR)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.defaultBudget || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, defaultBudget: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to remove budget for this category
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="noRollover"
                checked={formData.noRollover}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, noRollover: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="noRollover" className="text-sm font-normal text-gray-700">
                No Rollover (e.g., for Savings - budget doesn&apos;t accumulate month-to-month)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingCategory ? 'Save Changes' : 'Add Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Set Budget for {budgetCategory?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Default Budget (MYR)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={budgetValue || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setBudgetValue(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to remove budget for this category
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBudgetSave}>
                Save Budget
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
