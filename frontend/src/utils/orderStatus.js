export const ORDER_STATUS = {
  pending: { label: 'En attente de paiement', color: 'warning' },
  paid: { label: 'Payée', color: 'success' },
  payment_failed: { label: 'Paiement échoué', color: 'error' },
  shipped: { label: 'Expédiée', color: 'info' },
  delivered: { label: 'Livrée', color: 'success' },
  cancelled: { label: 'Annulée', color: 'default' },
};

export function orderStatusInfo(status) {
  return ORDER_STATUS[status] || { label: status, color: 'default' };
}
