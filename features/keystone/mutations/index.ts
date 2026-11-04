import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from 'graphql';
import redirectToInit from "./redirectToInit";
import { availability, createHold } from './inventory';
import { operator } from './operators';
import { publishSeatingChart } from './charts';
import updateActiveUser from './updateActiveUser';
import seedConcerts from './seedConcerts';
import { startTicketCheckout, completeTicketCheckout, lookupTicketOrder, transferTicket, refundTicketOrder } from './checkout';

const graphql = String.raw;
const operatorCommands = ['releaseDateHold', 'advanceEvent', 'placeDateHold', 'challengeHold', 'confirmHold', 'sendOffer', 'acceptOffer', 'publishEvent', 'setProductionHold', 'releaseProductionHold', 'scanTicket', 'recordMerchSales', 'computeSettlement', 'adjustSettlement', 'signSettlement', 'recordArtistPayment', 'postponeEvent', 'cancelEvent'];

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      input OperatorCommandInput { idempotencyKey: String! eventId: ID venueId: ID date: String rank: Int artistId: ID agencyId: ID expiresAt: String holdId: ID offerId: ID settlementId: ID productionHoldId: ID seatingChartId: ID title: String showAt: String doorsAt: String ageRestriction: String levelId: ID quantity: Int seatInventoryIds: [ID!] holdType: String releaseAt: String token: String ticketCode: String gate: String softGrossCents: Int hardGrossCents: Int sellerFeeCents: Int countIn: JSON countOut: JSON amountCents: Int reason: String approvedById: ID kind: String method: String reference: String status: String }
      input UserUpdateProfileInput { email: String name: String password: String onboardingStatus: String }
      input CreateHoldInput { idempotencyKey: String! }
      input StartTicketCheckoutInput { holdId: ID! proof: String! email: String! name: String! ageAttested: Boolean idempotencyKey: String! }
      input CompleteTicketCheckoutInput { orderId: ID! proof: String! }
      input TransferTicketInput { ticketCode: String! orderId: ID! proof: String! toEmail: String! toName: String idempotencyKey: String! }
      input RefundTicketOrderInput { orderId: ID! amountCents: Int reason: String! idempotencyKey: String! approvedById: ID }
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
        ${operatorCommands.map(name => `${name}(input: OperatorCommandInput!): JSON`).join('\n        ')}
      }
    `,
    resolvers: {
      Query: {
        redirectToInit,
        eventsOnSale: async (_: any, __: any, context: any) => context.prisma.event.findMany({ where: { status: { in: ['announced', 'presale', 'on_sale', 'sold_out', 'postponed'] } }, orderBy: { showAt: 'asc' }, take: 100, select: { id: true, title: true, status: true, showAt: true, doorsAt: true, ageRestriction: true, venue: { select: { name: true, city: true, timezone: true } } } }),
        eventAvailability: availability,
        lookupTicketOrder,
      },
      Mutation: {
        createGaHold: createHold,
        createSeatHold: createHold,
        seedConcerts,
        publishSeatingChart,
        updateActiveUser,
        startTicketCheckout, completeTicketCheckout, transferTicket, refundTicketOrder,
        ...Object.fromEntries(operatorCommands.map(name => [name, operator(name)])),
      },
    },
  });
}
