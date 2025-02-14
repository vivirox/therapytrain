import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AuditEventType,
  getAuditEventsByUser,
  getAuditEventsByType,
  getAuditEventsByDateRange,
} from '@/lib/audit/audit-logger';

interface AuditEvent {
  id: string;
  type: AuditEventType;
  userId: string;
  timestamp: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface FilterOptions {
  userId?: string;
  eventType?: AuditEventType;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export function AuditDashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  // Load audit events based on filters
  const loadEvents = async () => {
    setLoading(true);
    try {
      let fetchedEvents: AuditEvent[] = [];

      if (filters.userId) {
        fetchedEvents = await getAuditEventsByUser(
          filters.userId,
          ITEMS_PER_PAGE,
          (page - 1) * ITEMS_PER_PAGE
        );
      } else if (filters.eventType) {
        fetchedEvents = await getAuditEventsByType(
          filters.eventType,
          ITEMS_PER_PAGE,
          (page - 1) * ITEMS_PER_PAGE
        );
      } else if (filters.startDate && filters.endDate) {
        fetchedEvents = await getAuditEventsByDateRange(
          filters.startDate,
          filters.endDate,
          ITEMS_PER_PAGE,
          (page - 1) * ITEMS_PER_PAGE
        );
      }

      // Apply search filter if present
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        fetchedEvents = fetchedEvents.filter(
          (event) =>
            event.userId.toLowerCase().includes(query) ||
            event.type.toLowerCase().includes(query) ||
            JSON.stringify(event.metadata).toLowerCase().includes(query)
        );
      }

      setEvents((prev) => (page === 1 ? fetchedEvents : [...prev, ...fetchedEvents]));
      setHasMore(fetchedEvents.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Failed to load audit events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load events when filters or page changes
  useEffect(() => {
    loadEvents();
  }, [filters, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatMetadata = (metadata: Record<string, any>) => {
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <Card className="w-full max-w-6xl mx-auto p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Audit Log Dashboard</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search..."
            value={filters.searchQuery || ''}
            onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
            className="w-full md:w-64"
          />

          <Select
            value={filters.eventType}
            onValueChange={(value) => handleFilterChange({ eventType: value as AuditEventType })}
            className="w-full md:w-48"
          >
            <option value="">All Event Types</option>
            {Object.values(AuditEventType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>

          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onDateChange={(start, end) =>
              handleFilterChange({ startDate: start, endDate: end })
            }
          />

          <Button
            variant="outline"
            onClick={() => setFilters({})}
            className="ml-auto"
          >
            Clear Filters
          </Button>
        </div>

        {/* Events Table */}
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatTimestamp(event.timestamp)}</TableCell>
                  <TableCell>{event.type}</TableCell>
                  <TableCell>{event.userId}</TableCell>
                  <TableCell>{formatMetadata(event.metadata)}</TableCell>
                  <TableCell>{event.ipAddress || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center">
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
} 