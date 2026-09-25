// Baseline on first successful snapshot; never replay old orders as new alerts.
export function createOrderTracker<T extends {id: string; status?: string; driver?: string}>() {
  let previous: Map<string, string> | undefined;
  const seen = new Set<string>();
  return (orders: T[]) => {
    const next = new Map(orders.map(order => [order.id, JSON.stringify([order.status, order.driver])]));
    const added = previous ? orders.filter(order => !seen.has(order.id)) : [];
    const changed = previous ? orders.filter(order => previous!.has(order.id) && previous!.get(order.id) !== next.get(order.id)) : [];
    orders.forEach(order => seen.add(order.id));
    previous = next;
    return {added, changed};
  };
}
