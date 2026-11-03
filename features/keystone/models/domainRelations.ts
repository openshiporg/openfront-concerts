import { relationship } from '@keystone-6/core/fields';
export const userDomainRelations = {
 event_promoter: relationship({ ref: 'Event.promoter', many: true }),
 inventoryHold_customer: relationship({ ref: 'InventoryHold.customer', many: true }),
 ticketOrder_customer: relationship({ ref: 'TicketOrder.customer', many: true }),
 scanEvent_scannedBy: relationship({ ref: 'ScanEvent.scannedBy', many: true }),
 settlementLine_approvedBy: relationship({ ref: 'SettlementLine.approvedBy', many: true }),
 auditEvent_actor: relationship({ ref: 'AuditEvent.actor', many: true }),
 storeSettings_manager: relationship({ ref: 'StoreSettings.manager', many: true })
};
export const paymentCollectionDomainRelations = {
 ticketOrder_paymentCollection: relationship({ ref: 'TicketOrder.paymentCollection', many: true })
};