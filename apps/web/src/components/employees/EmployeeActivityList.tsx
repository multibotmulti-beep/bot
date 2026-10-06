'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSalesHistory, apiClient } from '../../lib/api';
import './EmployeeActivityList.css';

export default function EmployeeActivityList({ userId }: { userId?: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'staff.list', params: {} }),
      });
      const result = await response.json();
      setEmployees(result.data?.usuarios || result.data || []);
    } catch (e) {
      console.error('Error cargando empleados:', e);
    }
  };

  const fetchStock = async () => {
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'stock.list', params: {} }),
      });
      const result = await response.json();
      setProducts(result.data || []);
    } catch (e) {
      console.error('Error cargando productos:', e);
    }
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSalesHistory();
      if (result.success && Array.isArray(result.data)) {
        const sorted = result.data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTickets(sorted);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchEmployees();
    fetchStock();
  }, [fetchHistory]);

  const filteredTickets = userId
    ? tickets.filter((t: any) => String(t.empleado) === String(userId))
    : tickets;

  if (loading)
    return <div style={{ padding: 'var(--space-md)' }}>Cargando...</div>;

  return (
    <div className="ticket-container">
      {filteredTickets.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No hay ventas registradas {userId ? 'para este empleado.' : '.'}
        </div>
      ) : (
        filteredTickets.map((ticket: any) => {
          const items =
            ticket.items || (ticket.ticket ? ticket.ticket.items : []);

          const emp = employees.find(
            (e) => String(e.id) === String(ticket.empleado)
          );
          const empleado =
            ticket.role === 'DUEÑO'
              ? 'Dueño'
              : emp
                ? emp.name || emp.username
                : `Emp. (${ticket.empleado})`;

          return (
            <div key={ticket.id} className="ticket-card">
              <div
                className="ticket-header"
                onClick={() =>
                  setExpandedTicketId(
                    expandedTicketId === ticket.id ? null : ticket.id
                  )
                }
              >
                <div className="ticket-summary">
                  <span>
                    <strong>#{ticket.id.slice(-6)}</strong>
                  </span>
                  <span>{empleado}</span>
                  <span style={{ textAlign: 'right' }}>
                    <strong>${Number(ticket.total).toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {expandedTicketId === ticket.id && (
                <div className="ticket-body">
                  <p
                    style={{
                      fontSize: '0.85rem',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                  <ul className="ticket-items">
                    {items.map((p: any, i: number) => {
                      console.log('DEBUG: item details:', p);
                      // Usamos p.name directamente porque ahora se persiste en el backend
                      const productName = p.name || p.producto || 'Producto';

                      return (
                        <li key={i} className="ticket-item">
                          <span>
                            {productName} x {p.qty || p.cantidad || 0}
                          </span>
                          <span>
                            ${Number(p.price || p.monto || 0).toFixed(2)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
