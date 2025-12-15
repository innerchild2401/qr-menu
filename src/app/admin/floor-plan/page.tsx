'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { layout, typography } from '@/lib/design-system';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { cn } from '@/lib/utils';
import { Loader2, Move, Save } from 'lucide-react';

interface TableRow {
  id: string;
  table_number: string;
  table_name?: string | null;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';
  floor_plan_x?: number | null;
  floor_plan_y?: number | null;
  floor_plan_rotation?: number | null;
  area?: { id: string; name: string | null };
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const DEFAULT_STEP = 140;

export default function FloorPlanEditor() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((t, idx) => {
      const x = t.floor_plan_x ?? (idx % 5) * DEFAULT_STEP + 40;
      const y = t.floor_plan_y ?? Math.floor(idx / 5) * DEFAULT_STEP + 40;
      pos[t.id] = { x, y };
    });
    return pos;
  }, [tables]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await authenticatedApiCall('/api/admin/tables');
      const json = await res.json();
      if (res.ok) {
        setTables(json.tables || []);
      }
    } catch (err) {
      console.error('Failed to load tables', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const current = positions[id];
    if (!current) return;
    setDraggingId(id);
    setOffset({
      x: e.clientX - (canvasRect.left + current.x),
      y: e.clientY - (canvasRect.top + current.y),
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(
      Math.max(0, e.clientX - rect.left - offset.x),
      CANVAS_WIDTH - 100
    );
    const y = Math.min(
      Math.max(0, e.clientY - rect.top - offset.y),
      CANVAS_HEIGHT - 100
    );
    setTables((prev) =>
      prev.map((t) => (t.id === draggingId ? { ...t, floor_plan_x: x, floor_plan_y: y } : t))
    );
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = tables.map((t) =>
        authenticatedApiCall(`/api/admin/tables/${t.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            floor_plan_x: t.floor_plan_x ?? positions[t.id]?.x ?? 0,
            floor_plan_y: t.floor_plan_y ?? positions[t.id]?.y ?? 0,
            floor_plan_rotation: t.floor_plan_rotation ?? 0,
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      await Promise.all(updates);
      await loadTables();
    } catch (err) {
      console.error('Failed to save positions', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRotationChange = (id: string, value: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, floor_plan_rotation: value } : t))
    );
  };

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={typography.h2}>Floor Plan Editor</h1>
          <p className="text-muted-foreground text-sm">
            Drag tables to place them on the canvas. Adjust rotation if needed, then save.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save layout
        </Button>
      </div>

      <div
        ref={canvasRef}
        className="relative border rounded-lg bg-slate-50 overflow-hidden"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading tables...
          </div>
        ) : (
          tables.map((table) => {
            const pos = {
              x: table.floor_plan_x ?? positions[table.id]?.x ?? 0,
              y: table.floor_plan_y ?? positions[table.id]?.y ?? 0,
            };
            return (
              <div
                key={table.id}
                className={cn(
                  'absolute w-28 h-24 border rounded-md bg-white shadow-sm p-2 cursor-move select-none',
                  'flex flex-col justify-between'
                )}
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: `rotate(${table.floor_plan_rotation ?? 0}deg)`,
                }}
                onMouseDown={(e) => handleMouseDown(e, table.id)}
              >
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Table {table.table_number}</span>
                  <Move className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {table.table_name || 'No name'} • {table.capacity} seats
                  <br />
                  {table.area?.name || 'Area'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Status: {table.status.replace('_', ' ')}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <Card key={table.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Table {table.table_number}</p>
                <p className="text-xs text-muted-foreground">
                  {table.table_name || 'No name'} • {table.capacity} seats • {table.area?.name || 'Area'}
                </p>
              </div>
              <div className="text-xs text-muted-foreground capitalize">{table.status.replace('_', ' ')}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">X</p>
                <Input
                  type="number"
                  value={Math.round(table.floor_plan_x ?? positions[table.id]?.x ?? 0)}
                  onChange={(e) =>
                    setTables((prev) =>
                      prev.map((t) =>
                        t.id === table.id ? { ...t, floor_plan_x: Number(e.target.value) } : t
                      )
                    )
                  }
                />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Y</p>
                <Input
                  type="number"
                  value={Math.round(table.floor_plan_y ?? positions[table.id]?.y ?? 0)}
                  onChange={(e) =>
                    setTables((prev) =>
                      prev.map((t) =>
                        t.id === table.id ? { ...t, floor_plan_y: Number(e.target.value) } : t
                      )
                    )
                  }
                />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Rotation (deg)</p>
                <Input
                  type="number"
                  value={Math.round(table.floor_plan_rotation ?? 0)}
                  onChange={(e) => handleRotationChange(table.id, Number(e.target.value))}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

