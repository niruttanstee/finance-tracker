'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

interface CategoryFormData {
  id?: string;
  name: string;
  color: string;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', color: '#3b82f6' });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddDialog() {
    setEditingCategory(null);
    setFormData({ name: '', color: '#3b82f6' });
    setIsDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormData({ id: category.id, name: category.name, color: category.color });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingCategory) {
        // Update existing
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update category');
        }
      } else {
        // Create new
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
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
              <TableHead>Type</TableHead>
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
                  {category.isDefault ? (
                    <span className="text-xs text-muted-foreground">Default</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Custom</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
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
    </Card>
  );
}