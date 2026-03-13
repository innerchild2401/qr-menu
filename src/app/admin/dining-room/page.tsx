'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { layout, typography, gaps } from '@/lib/design-system';
import { Loader2, RefreshCcw, Users, Grid3x3, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authenticatedApiCall } from '@/lib/api-helpers';
import TableOrderModal from '@/components/admin/TableOrderModal';
import { supabase } from '@/lib/auth-supabase';

interface TableRow {
  id: string;
  area_id: string;
  table_number: string;
  table_name?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';
  qr_code_url?: string;
  floor_plan_x?: number | null;
  floor_plan_y?: number | null;
  floor_plan_rotation?: number | null;
  area?: { id: string; name: string };
}

const statusStyles: Record<TableRow['status'], string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  occupied: 'bg-amber-50 text-amber-700 border-amber-200',
  reserved: 'bg-blue-50 text-blue-700 border-blue-200',
  cleaning: 'bg-slate-50 text-slate-700 border-slate-200',
  out_of_service: 'bg-rose-50 text-rose-700 border-rose-200',
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const DEFAULT_STEP = 140;

export default function DiningRoomView() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [areas, setAreas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'floorplan'>('floorplan');

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await authenticatedApiCall('/api/admin/tables');
      const json = await res.json();
      if (res.ok) {
        setTables(json.tables || []);
        const areaMap: Record<string, string> = {};
        (json.tables || []).forEach((t: TableRow) => {
          if (t.area?.id) areaMap[t.area.id] = t.area.name || 'Area';
        });
        setAreas(areaMap);
      }
    } catch (error) {
      console.error('Failed to load tables', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
    
    // Realtime subscription for table status changes
    const channel = supabase
      .channel('admin-tables')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          loadTables();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [ADMIN] Realtime subscribed for dining room tables');
        }
      });
    
    // Listen for table detail open event
    const handleOpenTableDetail = (event: CustomEvent<{ tableId: string }>) => {
      setSelectedTableId(event.detail.tableId);
    };
    
    window.addEventListener('openTableDetail', handleOpenTableDetail as EventListener);
    
    // Refetch on visibility (fallback)
    const handleVisibility = () => {
      if (!document.hidden) loadTables();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('openTableDetail', handleOpenTableDetail as EventListener);
    };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, TableRow[]> = {};
    tables.forEach((t) => {
      const key = t.area_id || 'unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tables]);

  // Calculate positions for floor plan view
  const floorPlanPositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((t, idx) => {
      const x = t.floor_plan_x ?? (idx % 5) * DEFAULT_STEP + 40;
      const y = t.floor_plan_y ?? Math.floor(idx / 5) * DEFAULT_STEP + 40;
      pos[t.id] = { x, y };
    });
    return pos;
  }, [tables]);

  // Check if any tables have floor plan coordinates
  const hasFloorPlan = useMemo(() => {
    return tables.some(t => t.floor_plan_x !== null && t.floor_plan_y !== null);
  }, [tables]);

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={typography.h2}>Dining Room</h1>
          <p className="text-sm text-muted-foreground">
            Live view of tables by area. Colors tuned for readability in modals and cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFloorPlan && (
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <Grid3x3 className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'floorplan' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('floorplan')}
                className="h-8"
              >
                <Map className="h-4 w-4 mr-1" />
                Floor Plan
              </Button>
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={loadTables} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading tables...
        </div>
      ) : viewMode === 'floorplan' ? (
        hasFloorPlan ? (
          <div className="relative border rounded-lg bg-slate-50 overflow-auto" style={{ width: '100%', maxWidth: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            {tables.map((table) => {
              const pos = floorPlanPositions[table.id] || { x: 0, y: 0 };
              return (
                <div
                  key={table.id}
                  className={cn(
                    'absolute w-28 h-24 border rounded-md shadow-sm p-2 cursor-pointer select-none',
                    'flex flex-col justify-between transition-all hover:shadow-md',
                    statusStyles[table.status] || 'bg-white'
                  )}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: `rotate(${table.floor_plan_rotation ?? 0}deg)`,
                  }}
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Table {table.table_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {table.table_name || 'No name'} • {table.capacity} seats
                    <br />
                    {table.area?.name || 'Area'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {table.status.replace('_', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Floor Plan Layout</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up your floor plan layout in the Floor Plan Editor to see tables positioned on a visual map.
            </p>
            <Link href="/admin/floor-plan">
              <Button>
                Go to Floor Plan Editor
              </Button>
            </Link>
          </Card>
        )
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([areaId, rows]) => (
            <div key={areaId} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {areas[areaId] || 'Unassigned Area'}
                </h2>
                <Badge variant="outline">{rows.length} tables</Badge>
              </div>
              <div className={cn('grid', gaps.sm, 'md:grid-cols-2 xl:grid-cols-3')}>
                {rows.map((table) => (
                  <Card
                    key={table.id}
                    className={cn(
                      'p-4 border cursor-pointer hover:shadow-md transition-shadow',
                      statusStyles[table.status] || 'bg-card text-card-foreground'
                    )}
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          Table {table.table_number}
                          {table.table_name ? ` · ${table.table_name}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {table.capacity} seats
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {table.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {table.qr_code_url && (
                      <a
                        href={table.qr_code_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View QR
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTableId && (
        <TableOrderModal
          tableId={selectedTableId}
          onClose={() => setSelectedTableId(null)}
          onUpdate={() => {
            loadTables();
          }}
        />
      )}
    </div>
  );
}

