import { mergeSchemas } from "@graphql-tools/schema";
import { GraphQLError, type GraphQLSchema } from 'graphql';
import redirectToInit from "./redirectToInit";
import { storeLogoTypeDefs, storeLogo } from "./storeLogo";
import { availability, createHold } from './inventory';
import { operator } from './operators';
import { publishSeatingChart } from './charts';
import { requestRefundApproval, decideRefundApproval } from './approvals';
import { issueDoorSale, issueComp, previewDoorSale } from './doorSales';
import { refundDoorSale } from './doorRefunds';
import { editorMutations } from './editors';
import { openCashDrawer, closeCashDrawer } from './cashDrawers';
import updateActiveUser from './updateActiveUser';
import seedConcerts from './seedConcerts';
import { constraintRefusal, constraintGraphQLError } from '../lib/constraint-errors';
import { startTicketCheckout, completeTicketCheckout, lookupTicketOrder, transferTicket, refundTicketOrder } from './checkout';

const graphql = String.raw;
const operatorCommands = ['releaseDateHold', 'advanceEvent', 'placeDateHold', 'challengeHold', 'confirmHold', 'sendOffer', 'acceptOffer', 'declineOffer', 'contractOffer', 'publishEvent', 'setProductionHold', 'releaseProductionHold', 'scanTicket', 'recordMerchSales', 'computeSettlement', 'adjustSettlement', 'signSettlement', 'recordArtistPayment', 'postponeEvent', 'cancelEvent'];

/** Command refusals are plain Errors with operator-facing text; surface them. Prisma and other internal errors stay masked. */
export function surfaceRefusals<T extends (...args: any[]) => any>(resolver: T): T {
  return (async (...args: any[]) => {
    try { return await resolver(...args); }
    catch (e: any) {
      // A database rule refused the write: say which rule in words, with a stable code.
      const refusal = constraintRefusal(e);
      if (refusal) throw e instanceof GraphQLError ? constraintGraphQLError(e, refusal) : new GraphQLError(refusal.message, { extensions: { code: refusal.code } });
      if (e && Object.getPrototypeOf(e) === Error.prototype) throw new GraphQLError(e.message); throw e;
    }
  }) as T;
}
const surfaced = (map: Record<string, any>) => Object.fromEntries(Object.entries(map).map(([k, f]) => [k, surfaceRefusals(f)]));

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      input OperatorCommandInput { idempotencyKey: String! eventId: ID venueId: ID date: String rank: Int artistId: ID agencyId: ID expiresAt: String holdId: ID phaseId: ID expenseId: ID data: JSON offerId: ID settlementId: ID productionHoldId: ID seatingChartId: ID title: String showAt: String doorsAt: String showTime: String doorsTime: String ageRestriction: String levelId: ID quantity: Int seatInventoryIds: [ID!] holdType: String releaseAt: String token: String ticketCode: String gate: String softGrossCents: Int hardGrossCents: Int sellerFeeCents: Int countIn: JSON countOut: JSON amountCents: Int reason: String approvedById: ID kind: String method: String reference: String status: String }
      input UserUpdateProfileInput { email: String name: String password: String onboardingStatus: String }
      input CreateHoldInput { idempotencyKey: String! }
      input StartTicketCheckoutInput { holdId: ID! proof: String! email: String! name: String! ageAttested: Boolean idempotencyKey: String! }
      input CompleteTicketCheckoutInput { orderId: ID! proof: String! }
      input TransferTicketInput { ticketCode: String! orderId: ID! proof: String! toEmail: String! toName: String idempotencyKey: String! }
      input RefundTicketOrderInput { orderId: ID! amountCents: Int reason: String! idempotencyKey: String! approvalId: ID }
      input DoorTenderInput { kind: String! tenderedCents: Int reference: String }
      input DoorPreviewInput { eventId: ID! levelId: ID! qty: Int! comp: Boolean }
      input DoorSaleInput { eventId: ID! levelId: ID! qty: Int! seatInventoryIds: [ID!] name: String! email: String ageAttested: Boolean reason: String tender: DoorTenderInput idempotencyKey: String! }
      input RefundApprovalRequestInput { orderId: ID! amountCents: Int! reason: String! cash: Boolean }
      input OpenCashDrawerInput { label: String! openingFloatCents: Int! idempotencyKey: String! }
      input CloseCashDrawerInput { drawerId: ID! count: JSON! reason: String idempotencyKey: String! }
      input RefundApprovalDecisionInput { approvalId: ID! decision: String! note: String }
      type Query {
        redirectToInit: Boolean
        eventsOnSale: JSON
        eventAvailability(eventId: ID!): JSON
        lookupTicketOrder(email: String!, orderNumber: String!): JSON
      }
      type Mutation {
        createGaHold(eventId: ID!, levelId: ID!, qty: Int!, presaleCode: String, idempotencyKey: String!): JSON
        createSeatHold(eventId: ID!, seatInventoryIds: [ID!]!, presaleCode: String, idempotencyKey: String!): JSON
        startTicketCheckout(input: StartTicketCheckoutInput!): JSON
        completeTicketCheckout(input: CompleteTicketCheckoutInput!): JSON
        transferTicket(input: TransferTicketInput!): JSON
        refundTicketOrder(input: RefundTicketOrderInput!): JSON
        updateActiveUser(data: UserUpdateProfileInput!): User
        seedConcerts(section: String!, data: JSON!): JSON
        publishSeatingChart(input: OperatorCommandInput!): JSON
        requestRefundApproval(input: RefundApprovalRequestInput!): JSON
        issueDoorSale(input: DoorSaleInput!): JSON
        issueComp(input: DoorSaleInput!): JSON
        previewDoorSale(input: DoorPreviewInput!): JSON
        refundDoorSale(input: RefundTicketOrderInput!): JSON
        decideRefundApproval(input: RefundApprovalDecisionInput!): JSON
        openCashDrawer(input: OpenCashDrawerInput!): JSON
        closeCashDrawer(input: CloseCashDrawerInput!): JSON
        ${Object.keys(editorMutations).map(name => `${name}(input: OperatorCommandInput!): JSON`).join('\n        ')}
        ${operatorCommands.map(name => `${name}(input: OperatorCommandInput!): JSON`).join('\n        ')}
      }
    ` + storeLogoTypeDefs,
    resolvers: {
      Query: {
        storeLogo,
        redirectToInit,
        eventsOnSale: async (_: any, __: any, context: any) => context.prisma.event.findMany({ where: { status: { in: ['announced', 'presale', 'on_sale', 'sold_out', 'postponed'] } }, orderBy: { showAt: 'asc' }, take: 100, select: { id: true, title: true, status: true, showAt: true, doorsAt: true, ageRestriction: true, venue: { select: { name: true, city: true, timezone: true } } } }),
        eventAvailability: surfaceRefusals(availability),
        lookupTicketOrder: surfaceRefusals(lookupTicketOrder),
      },
      Mutation: surfaced({
        createGaHold: createHold,
        createSeatHold: createHold,
        seedConcerts,
        publishSeatingChart, requestRefundApproval, decideRefundApproval, issueDoorSale, issueComp, previewDoorSale, refundDoorSale, openCashDrawer, closeCashDrawer,
        updateActiveUser,
        startTicketCheckout, completeTicketCheckout, transferTicket, refundTicketOrder,
        ...editorMutations,
        ...Object.fromEntries(operatorCommands.map(name => [name, operator(name)])),
      }),
    },
  });
}
