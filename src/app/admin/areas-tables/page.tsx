'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { layout, typography, gaps } from '@/lib/design-system';
import { QrCode, Plus, Loader2, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface Area {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  table_count?: number;
  service_type?: string;
}

interface TableRow {
  id: string;
  area_id: string;
  table_number: string;
  table_name?: string;
  capacity: number;
  table_type?: string;
  status: string;
  qr_code_url?: string;
  area?: { id: string; name: string; service_type?: string };
}

export default function AreasTablesPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingArea, setCreatingArea] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);

  const [areaForm, setAreaForm] = useState({
    name: '',
    description: '',
    capacity: '',
    serviceType: 'full_service',
  });

  const [tableForm, setTableForm] = useState({
    areaId: '',
    tableNumber: '',
    tableName: '',
    capacity: '',
    tableType: '4_top',
    notes: '',
  });

  const areaOptions = useMemo(
    () => areas.map(a => ({ value: a.id, label: a.name })),
    [areas]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [areasRes, tablesRes] = await Promise.all([
        authenticatedApiCall('/api/admin/areas'),
        authenticatedApiCall('/api/admin/tables'),
      ]);
      const areasJson = await areasRes.json();
      const tablesJson = await tablesRes.json();
      if (areasRes.ok) setAreas(areasJson.areas || []);
      if (tablesRes.ok) setTables(tablesJson.tables || []);
    } catch (error) {
      console.error('Failed to load areas/tables', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArea = async () => {
    setCreatingArea(true);
    try {
      const res = await authenticatedApiCall('/api/admin/areas', {
        method: 'POST',
        body: JSON.stringify({
          name: areaForm.name,
          description: areaForm.description || undefined,
          capacity: areaForm.capacity ? Number(areaForm.capacity) : undefined,
          serviceType: areaForm.serviceType,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setAreaModalOpen(false);
      setAreaForm({ name: '', description: '', capacity: '', serviceType: 'full_service' });
      loadData();
    } catch (error) {
      console.error('Create area failed', error);
    } finally {
      setCreatingArea(false);
    }
  };

  const handleCreateTable = async () => {
    setCreatingTable(true);
    try {
      const res = await authenticatedApiCall('/api/admin/tables', {
        method: 'POST',
        body: JSON.stringify({
          areaId: tableForm.areaId,
          tableNumber: tableForm.tableNumber,
          tableName: tableForm.tableName || undefined,
          capacity: tableForm.capacity ? Number(tableForm.capacity) : undefined,
          tableType: tableForm.tableType,
          notes: tableForm.notes || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setTableModalOpen(false);
      setTableForm({
        areaId: '',
        tableNumber: '',
        tableName: '',
        capacity: '',
        tableType: '4_top',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Create table failed', error);
    } finally {
      setCreatingTable(false);
    }
  };

  const handleGenerateQR = async (tableId: string) => {
    setGenerating(tableId);
    try {
      const res = await authenticatedApiCall(`/api/admin/tables/${tableId}/generate-qr`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await loadData();
    } catch (error) {
      console.error('QR generation failed', error);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={typography.h2}>Areas & Tables</h1>
          <p className="text-muted-foreground text-sm">
            Manage restaurant areas, tables, and table-specific QR codes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={areaModalOpen} onOpenChange={setAreaModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle>Add Area</DialogTitle>
                <DialogDescription>
                  Define a section of the dining room (e.g., Indoor, Terrace, Bar).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Name (e.g., Indoor)"
                  value={areaForm.name}
                  onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={areaForm.description}
                  onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                />
                <Input
                  placeholder="Capacity (optional)"
                  type="number"
                  value={areaForm.capacity}
                  onChange={(e) => setAreaForm({ ...areaForm, capacity: e.target.value })}
                />
                <Input
                  placeholder="Service type (full_service, bar_service, counter)"
                  value={areaForm.serviceType}
                  onChange={(e) => setAreaForm({ ...areaForm, serviceType: e.target.value })}
                />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setAreaModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateArea} disabled={creatingArea}>
                  {creatingArea && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Area
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={tableModalOpen} onOpenChange={setTableModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Table
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle>Add Table</DialogTitle>
                <DialogDescription>
                  Assign the table to an area and set its capacity.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Area</label>
                <select
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={tableForm.areaId}
                  onChange={(e) => setTableForm({ ...tableForm, areaId: e.target.value })}
                >
                  <option value="">Select area</option>
                  {areaOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Input
                  placeholder="Table number (e.g., 12 or A3)"
                  value={tableForm.tableNumber}
                  onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                />
                <Input
                  placeholder="Friendly name (optional, e.g., Booth 3)"
                  value={tableForm.tableName}
                  onChange={(e) => setTableForm({ ...tableForm, tableName: e.target.value })}
                />
                <Input
                  placeholder="Capacity"
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                />
                <Input
                  placeholder="Table type (2_top, 4_top, booth...)"
                  value={tableForm.tableType}
                  onChange={(e) => setTableForm({ ...tableForm, tableType: e.target.value })}
                />
                <Textarea
                  placeholder="Notes (optional)"
                  value={tableForm.notes}
                  onChange={(e) => setTableForm({ ...tableForm, notes: e.target.value })}
                />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setTableModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTable} disabled={creatingTable || !tableForm.areaId}>
                  {creatingTable && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Table
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading areas and tables...
        </div>
      ) : (
        <div className={cn('grid', gaps.md, 'md:grid-cols-2 xl:grid-cols-3')}>
          {areas.map((area) => {
            const areaTables = tables.filter((t) => t.area_id === area.id);
            return (
              <Card key={area.id} className="p-4 bg-card text-card-foreground shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{area.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {area.description || 'No description'}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {areaTables.length} tables
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {areaTables.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tables yet.</p>
                  )}
                  {areaTables.map((table) => (
                    <div
                      key={table.id}
                      className="rounded-xl border border-border p-3 bg-background/70"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            Table {table.table_number}
                            {table.table_name ? ` · ${table.table_name}` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {table.capacity} seats · {table.table_type || 'table'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {table.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGenerateQR(table.id)}
                            disabled={generating === table.id}
                            className="text-primary"
                          >
                            {generating === table.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <QrCode className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      {table.qr_code_url && (
                        <a
                          href={table.qr_code_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View QR
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
        <RefreshCcw className="h-4 w-4" />
        Changes update live; QR codes use the current menu URL with table/area parameters for better readability.
      </div>
    </div>
  );
}

