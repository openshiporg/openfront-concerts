"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// features/keystone/utils/paymentState.ts
function stripeRefundReference(id) {
  if (id.startsWith("pi_")) return { payment_intent: id };
  if (id.startsWith("ch_")) return { charge: id };
  throw new Error("Stripe refund requires a payment intent or charge reference");
}
function successfulRefundTotal(rows) {
  return rows.filter((row) => row.status === "succeeded").reduce((sum, row) => sum + row.amount, 0);
}
var init_paymentState = __esm({
  "features/keystone/utils/paymentState.ts"() {
    "use strict";
  }
});

// features/integrations/payment/stripe.ts
var stripe_exports = {};
__export(stripe_exports, {
  cancelPaymentFunction: () => cancelPaymentFunction,
  capturePaymentFunction: () => capturePaymentFunction,
  createPaymentFunction: () => createPaymentFunction,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction,
  getPaymentStatusFunction: () => getPaymentStatusFunction,
  handleWebhookFunction: () => handleWebhookFunction,
  refundPaymentFunction: () => refundPaymentFunction
});
async function createPaymentFunction({ order, amount, currency, idempotencyKey }) {
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order?.id || "",
        orderNumber: order?.orderNumber || ""
      }
    },
    idempotencyKey ? { idempotencyKey } : void 0
  );
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
}
async function capturePaymentFunction({ paymentId, amount, idempotencyKey }) {
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.capture(paymentId, {
    ...amount == null ? {} : { amount_to_capture: amount }
  }, idempotencyKey ? { idempotencyKey } : void 0);
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount_received,
    currencyCode: paymentIntent.currency.toUpperCase(),
    data: paymentIntent
  };
}
async function refundPaymentFunction({ paymentId, amount, idempotencyKey, refundId }) {
  const stripe = getStripeClient();
  const refund = refundId ? await stripe.refunds.retrieve(refundId) : await stripe.refunds.create(
    { ...stripeRefundReference(paymentId), amount, ...idempotencyKey ? { metadata: { restaurantRefundKey: idempotencyKey } } : {} },
    idempotencyKey ? { idempotencyKey } : void 0
  );
  return {
    id: refund.id,
    refundId: refund.id,
    status: refund.status,
    amount: refund.amount,
    data: refund
  };
}
async function getPaymentStatusFunction({ paymentId }) {
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
  const refunds = [];
  let refundsComplete = true;
  for await (const refund of stripe.refunds.list({ payment_intent: paymentId, limit: 100 })) {
    if (refunds.length >= 1e3) {
      refundsComplete = false;
      break;
    }
    refunds.push(refund);
  }
  return {
    status: paymentIntent.status,
    amount: paymentIntent.status === "succeeded" ? paymentIntent.amount_received : paymentIntent.amount,
    currencyCode: paymentIntent.currency.toUpperCase(),
    refunds,
    refundsComplete,
    card: cardOf(paymentIntent),
    data: paymentIntent
  };
}
function cardOf(paymentIntent) {
  const charge = paymentIntent.latest_charge;
  const card = charge && typeof charge === "object" ? charge.payment_method_details?.card : null;
  return card ? { last4: card.last4 || "", brand: card.brand || "" } : null;
}
async function generatePaymentLinkFunction({ paymentId }) {
  return `https://dashboard.stripe.com/payments/${paymentId}`;
}
async function handleWebhookFunction({ event, headers, rawBody }) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured");
  }
  const stripe = getStripeClient();
  try {
    if (!rawBody) throw new Error("Stripe webhook raw body is required");
    const stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      headers["stripe-signature"],
      webhookSecret
    );
    return {
      isValid: true,
      event: stripeEvent,
      type: stripeEvent.type,
      resource: stripeEvent.data.object
    };
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err?.message || "Unknown error"}`);
  }
}
async function cancelPaymentFunction({ paymentId, idempotencyKey }) {
  const stripe = getStripeClient();
  const current = await stripe.paymentIntents.retrieve(paymentId);
  if (current.status === "canceled") return { status: "cancelled" };
  if (current.status === "succeeded") return { status: "succeeded" };
  const cancelled = await stripe.paymentIntents.cancel(paymentId, {}, idempotencyKey ? { idempotencyKey } : void 0);
  return { status: cancelled.status === "canceled" ? "cancelled" : cancelled.status };
}
var import_stripe, getStripeClient;
var init_stripe = __esm({
  "features/integrations/payment/stripe.ts"() {
    "use strict";
    import_stripe = __toESM(require("stripe"));
    init_paymentState();
    getStripeClient = () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        throw new Error("Stripe secret key not configured");
      }
      return new import_stripe.default(stripeKey);
    };
  }
});

// features/lib/currency-units.ts
function currencyMinorUnitDigits(currencyCode2 = "USD") {
  const code = currencyCode2.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error(`Invalid currency code: ${currencyCode2}`);
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    throw new Error(`Unsupported currency code: ${currencyCode2}`);
  }
}
function currencyMinorUnitScale(currencyCode2 = "USD") {
  return 10 ** currencyMinorUnitDigits(currencyCode2);
}
function majorToMinorUnits(value, currencyCode2 = "USD") {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * currencyMinorUnitScale(currencyCode2));
}
function minorToMajorUnits(value, currencyCode2 = "USD") {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return parsed / currencyMinorUnitScale(currencyCode2);
}
var init_currency_units = __esm({
  "features/lib/currency-units.ts"() {
    "use strict";
  }
});

// features/integrations/payment/paypal.ts
var paypal_exports = {};
__export(paypal_exports, {
  cancelPaymentFunction: () => cancelPaymentFunction2,
  capturePaymentFunction: () => capturePaymentFunction2,
  createPaymentFunction: () => createPaymentFunction2,
  formatPayPalAmount: () => formatPayPalAmount,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction2,
  getPaymentStatusFunction: () => getPaymentStatusFunction2,
  handleWebhookFunction: () => handleWebhookFunction2,
  normalizePayPalStatus: () => normalizePayPalStatus,
  parsePayPalAmount: () => parsePayPalAmount,
  refundPaymentFunction: () => refundPaymentFunction2
});
async function handleWebhookFunction2({ event, headers }) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("PayPal webhook ID is not configured");
  }
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: event
      })
    }
  );
  const verification = await response.json();
  const isValid = verification.verification_status === "SUCCESS";
  if (!isValid) {
    throw new Error("Invalid webhook signature");
  }
  return {
    isValid: true,
    event,
    type: event.event_type,
    resource: event.resource
  };
}
async function createPaymentFunction2({ order, amount, currency, idempotencyKey }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: formatPayPalAmount(amount, currency)
          },
          custom_id: order?.id
        }
      ]
    })
  });
  const orderResult = await response.json();
  if (orderResult.error) {
    throw new Error(`PayPal order creation failed: ${orderResult.error.message}`);
  }
  return {
    orderId: orderResult.id,
    status: orderResult.status
  };
}
async function capturePaymentFunction2({ paymentId, idempotencyKey }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${paymentId}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "PayPal-Request-Id": idempotencyKey || `capture:${paymentId}`
      }
    }
  );
  const capture = await response.json();
  if (capture.error) {
    throw new Error(`PayPal capture failed: ${capture.error.message}`);
  }
  const capturedAmount = capture.purchase_units[0].payments.captures[0].amount;
  return {
    status: normalizePayPalStatus(capture.status),
    amount: parsePayPalAmount(capturedAmount.value, capturedAmount.currency_code),
    currencyCode: capturedAmount.currency_code.toUpperCase(),
    data: capture
  };
}
async function refundPaymentFunction2({ paymentId, amount, currency = "USD", idempotencyKey, refundId }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(
    refundId ? `${baseUrl}/v2/payments/refunds/${refundId}` : `${baseUrl}/v2/payments/captures/${paymentId}/refund`,
    {
      method: refundId ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}
      },
      body: refundId ? void 0 : JSON.stringify({
        amount: {
          value: formatPayPalAmount(amount, currency),
          currency_code: currency.toUpperCase()
        }
      })
    }
  );
  const refund = await response.json();
  if (refund.error) {
    throw new Error(`PayPal refund failed: ${refund.error.message}`);
  }
  return {
    id: refund.id,
    refundId: refund.id,
    status: refund.status,
    amount: parsePayPalAmount(refund.amount.value, refund.amount.currency_code),
    data: refund
  };
}
async function getPaymentStatusFunction2({ paymentId }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paymentId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });
  const orderResult = await response.json();
  if (orderResult.error) {
    throw new Error(`PayPal status check failed: ${orderResult.error.message}`);
  }
  const purchaseUnits = orderResult.purchase_units || [];
  const orderAmount = purchaseUnits[0]?.amount;
  if (!orderAmount?.currency_code || orderAmount.value == null) throw new Error("PayPal order is missing its quoted amount or currency");
  const captures = purchaseUnits.flatMap((unit) => unit.payments?.captures || []);
  const currencies = [orderAmount.currency_code, ...captures.map((capture) => capture.amount?.currency_code)].filter(Boolean).map((currency) => currency.toUpperCase());
  if (new Set(currencies).size !== 1) throw new Error("PayPal order and capture currencies do not match");
  const status = normalizePayPalStatus(orderResult.status);
  const capturedAmount = captures.reduce((sum, capture) => {
    if (capture.amount?.value == null) throw new Error("PayPal capture is missing its amount");
    return sum + parsePayPalAmount(capture.amount.value, capture.amount.currency_code);
  }, 0);
  const refundsComplete = status === "requires_capture" ? captures.length === 0 : status === "succeeded" && captures.length > 0 && captures.every((capture) => capture.status === "COMPLETED");
  return {
    status,
    amount: status === "succeeded" ? capturedAmount : parsePayPalAmount(orderAmount.value, orderAmount.currency_code),
    currencyCode: currencies[0],
    refunds: [],
    refundsComplete,
    data: orderResult
  };
}
async function generatePaymentLinkFunction2({ paymentId }) {
  return `https://www.paypal.com/activity/payment/${paymentId}`;
}
async function cancelPaymentFunction2({ paymentId }) {
  const current = await getPaymentStatusFunction2({ paymentId });
  if (["CREATED", "PAYER_ACTION_REQUIRED"].includes(current.data?.status)) return { status: "abandoned" };
  return { status: current.status };
}
var getPayPalBaseUrl, formatPayPalAmount, parsePayPalAmount, normalizePayPalStatus, getPayPalAccessToken;
var init_paypal = __esm({
  "features/integrations/payment/paypal.ts"() {
    "use strict";
    init_currency_units();
    getPayPalBaseUrl = () => {
      const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX !== "false";
      return isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    };
    formatPayPalAmount = (amount, currency) => {
      const digits = currencyMinorUnitDigits(currency);
      return minorToMajorUnits(amount, currency).toFixed(digits);
    };
    parsePayPalAmount = (value, currency) => {
      const normalized = String(value).trim();
      if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error("PayPal returned an invalid decimal amount");
      const digits = currencyMinorUnitDigits(currency);
      const fraction = normalized.split(".")[1] || "";
      if (fraction.length > digits && /[1-9]/.test(fraction.slice(digits))) {
        throw new Error("PayPal amount precision exceeds the currency minor unit");
      }
      const amount = majorToMinorUnits(normalized, currency);
      if (!Number.isSafeInteger(amount)) throw new Error("PayPal amount exceeds the supported safe range");
      return amount;
    };
    normalizePayPalStatus = (status) => {
      switch ((status || "").toUpperCase()) {
        case "COMPLETED":
          return "succeeded";
        case "APPROVED":
          return "requires_capture";
        case "VOIDED":
          return "canceled";
        default:
          return "pending";
      }
    };
    getPayPalAccessToken = async () => {
      const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured");
      }
      const baseUrl = getPayPalBaseUrl();
      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "en_US",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
        },
        body: "grant_type=client_credentials"
      });
      const { access_token } = await response.json();
      if (!access_token) {
        throw new Error("Failed to get PayPal access token");
      }
      return access_token;
    };
  }
});

// features/integrations/payment/manual.ts
var manual_exports = {};
__export(manual_exports, {
  cancelPaymentFunction: () => cancelPaymentFunction3,
  capturePaymentFunction: () => capturePaymentFunction3,
  createPaymentFunction: () => createPaymentFunction3,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction3,
  getPaymentStatusFunction: () => getPaymentStatusFunction3,
  handleWebhookFunction: () => handleWebhookFunction3,
  refundPaymentFunction: () => refundPaymentFunction3
});
async function handleWebhookFunction3({ event, headers }) {
  return {
    isValid: true,
    event,
    type: event.type,
    resource: event.data
  };
}
async function createPaymentFunction3({ order, amount, currency }) {
  return {
    status: "pending",
    data: {
      status: "pending",
      amount,
      currency: currency.toLowerCase(),
      orderId: order?.id
    }
  };
}
async function capturePaymentFunction3({ paymentId, amount }) {
  return {
    status: "captured",
    amount,
    data: {
      status: "captured",
      amount,
      captured_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function refundPaymentFunction3({ paymentId, amount }) {
  return {
    status: "refunded",
    amount,
    data: {
      status: "refunded",
      amount,
      refunded_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function getPaymentStatusFunction3({ paymentId }) {
  return {
    status: "succeeded",
    data: {
      status: "succeeded"
    }
  };
}
async function generatePaymentLinkFunction3({ paymentId }) {
  return null;
}
async function cancelPaymentFunction3() {
  return { status: "cancelled" };
}
var init_manual = __esm({
  "features/integrations/payment/manual.ts"() {
    "use strict";
  }
});

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core47 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/models/User.ts
var import_core = require("@keystone-6/core");
var import_access = require("@keystone-6/core/access");
var import_fields3 = require("@keystone-6/core/fields");

// features/keystone/models/trackingFields.ts
var import_fields = require("@keystone-6/core/fields");
var trackingFields = {
  createdAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/models/domainRelations.ts
var import_fields2 = require("@keystone-6/core/fields");
var userDomainRelations = {
  event_promoter: (0, import_fields2.relationship)({ ref: "Event.promoter", many: true }),
  inventoryHold_customer: (0, import_fields2.relationship)({ ref: "InventoryHold.customer", many: true }),
  ticketOrder_customer: (0, import_fields2.relationship)({ ref: "TicketOrder.customer", many: true }),
  scanEvent_scannedBy: (0, import_fields2.relationship)({ ref: "ScanEvent.scannedBy", many: true }),
  settlementLine_approvedBy: (0, import_fields2.relationship)({ ref: "SettlementLine.approvedBy", many: true }),
  auditEvent_actor: (0, import_fields2.relationship)({ ref: "AuditEvent.actor", many: true }),
  storeSettings_manager: (0, import_fields2.relationship)({ ref: "StoreSettings.manager", many: true })
};
var paymentCollectionDomainRelations = {
  ticketOrder_paymentCollection: (0, import_fields2.relationship)({ ref: "TicketOrder.paymentCollection", many: true })
};

// features/keystone/access.ts
var permissionNames = [
  "canSeeOtherPeople",
  "canEditOtherPeople",
  "canManagePeople",
  "canManageRoles",
  "canAccessDashboard",
  "canManageOnboarding",
  "canManagePayments",
  "canReadPayments",
  "canIssueRefunds",
  "canReadAudit",
  "canManageEvents",
  "canManageDeals",
  "canManageInventory",
  "canManageOrders",
  "canScanTickets",
  "canManageSettlements",
  "canApproveAdjustments",
  "canManageVenues",
  "canManageArtists"
];
var isSignedIn = ({ session }) => Boolean(session);
var permissions = Object.fromEntries(permissionNames.map((name2) => [name2, ({ session }) => session?.data.role?.[name2] === true]));
var commandAccess = { operation: { query: permissions.canAccessDashboard, create: () => false, update: () => false, delete: () => false } };
var catalogAccessFor = (permission) => ({ operation: { query: permissions.canAccessDashboard, create: permissions[permission], update: permissions[permission], delete: () => false } });
var readAccess = (...needed) => ({ operation: { query: ({ session }) => needed.some((p2) => session?.data.role?.[p2] === true), create: () => false, update: () => false, delete: () => false } });
var catalogAccess = catalogAccessFor("canManageEvents");
var rules = {
  canReadPeople: ({ session }) => !session ? false : session.data.role?.canSeeOtherPeople ? true : { id: { equals: session.itemId } },
  canUpdatePeople: ({ session }) => !session ? false : session.data.role?.canEditOtherPeople ? true : { id: { equals: session.itemId } }
};
var grossReaders = ["canManageOrders", "canIssueRefunds", "canManageSettlements", "canManageDeals", "canManageEvents", "canReadPayments"];
var canReadGross = ({ session }) => grossReaders.some((p2) => session?.data.role?.[p2] === true);

// features/keystone/models/User.ts
var User = (0, import_core.list)({
  access: {
    operation: {
      ...(0, import_access.allOperations)(isSignedIn),
      create: (args) => {
        if (process.env.PUBLIC_SIGNUPS_ALLOWED === "true") {
          return true;
        }
        return permissions.canManagePeople(args);
      },
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ["name", "email", "role"]
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return "edit";
        if (session?.itemId === item?.id) return "edit";
        return "read";
      }
    }
  },
  fields: {
    name: (0, import_fields3.text)({
      validation: {
        isRequired: true
      }
    }),
    email: (0, import_fields3.text)({
      isFilterable: false,
      isOrderable: false,
      isIndexed: "unique",
      validation: {
        isRequired: true
      }
    }),
    password: (0, import_fields3.password)({
      access: {
        read: import_access.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      validation: { isRequired: true }
    }),
    role: (0, import_fields3.relationship)({
      ref: "Role.assignedTo",
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople
      },
      ui: {
        itemView: {
          fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read"
        }
      }
    }),
    onboardingStatus: (0, import_fields3.select)({ options: ["not_started", "in_progress", "completed", "dismissed"], defaultValue: "not_started" }),
    ...userDomainRelations,
    ...trackingFields
  }
});

// features/keystone/models/Role.ts
var import_core2 = require("@keystone-6/core");
var import_access3 = require("@keystone-6/core/access");
var import_fields4 = require("@keystone-6/core/fields");
var Role = (0, import_core2.list)({
  access: {
    operation: {
      ...(0, import_access3.allOperations)(permissions.canManageRoles),
      query: isSignedIn
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: {
      initialColumns: ["name", "assignedTo"]
    },
    itemView: {
      defaultFieldMode: (args) => permissions.canManageRoles(args) ? "edit" : "read"
    }
  },
  fields: {
    name: (0, import_fields4.text)({ validation: { isRequired: true } }),
    ...Object.fromEntries(permissionNames.map((name2) => [name2, (0, import_fields4.checkbox)({ defaultValue: false })])),
    ...trackingFields,
    assignedTo: (0, import_fields4.relationship)({
      ref: "User.role",
      many: true,
      ui: {
        itemView: { fieldMode: "read" }
      }
    })
  }
});

// features/keystone/models/OAuthApp.ts
var import_core3 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");

// features/keystone/mcp-oauth/core.ts
var import_node_crypto = __toESM(require("node:crypto"));
var MCP_SCOPES = ["mcp:read", "mcp:write"];
var MCP_ACCESS_PREFIX = "mcp_at_";
var ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
var REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1e3;
var CONSENT_TICKET_TTL_MS = 10 * 60 * 1e3;
var DEVELOPMENT_SECRET = "this secret should only be used in testing";
function secret() {
  return process.env.SESSION_SECRET || DEVELOPMENT_SECRET;
}
function randomToken(prefix, bytes = 32) {
  return `${prefix}${import_node_crypto.default.randomBytes(bytes).toString("base64url")}`;
}
function digestToken(token, purpose = "mcp-oauth-token") {
  return import_node_crypto.default.createHmac("sha256", secret()).update(`${purpose}\0${token}`, "utf8").digest("hex");
}
function bearerToken(header) {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(value);
  return match ? match[1] : null;
}
function isMcpAccessToken(token) {
  return typeof token === "string" && token.startsWith(MCP_ACCESS_PREFIX) && token.length > MCP_ACCESS_PREFIX.length;
}
function storedScopes(value) {
  return Array.isArray(value) ? MCP_SCOPES.filter((scope) => value.includes(scope)) : [];
}

// features/keystone/models/OAuthApp.ts
var OAuthApp = (0, import_core3.list)({
  access: {
    operation: {
      query: permissions.canManagePeople,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    }
  },
  fields: {
    name: (0, import_fields5.text)({
      validation: {
        isRequired: true
      }
    }),
    clientId: (0, import_fields5.text)({
      isIndexed: "unique",
      hooks: {
        resolveInput: ({ operation, resolvedData }) => {
          if (operation === "create" && !resolvedData.clientId) {
            return randomToken("mcp_cl_", 18);
          }
          return resolvedData.clientId;
        }
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Auto-generated unique identifier for your application."
      }
    }),
    clientSecret: (0, import_fields5.text)({
      access: {
        read: () => false
      },
      hooks: {
        resolveInput: ({ resolvedData }) => {
          if (resolvedData.clientSecret) {
            return digestToken(resolvedData.clientSecret, "oauth-client-secret");
          }
          return void 0;
        }
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" },
        description: "Stored only as a digest. Public MCP clients have no secret."
      }
    }),
    tokenEndpointAuthMethod: (0, import_fields5.select)({
      options: [
        { label: "Client secret (POST)", value: "client_secret_post" },
        { label: "Client secret (Basic)", value: "client_secret_basic" },
        { label: "None (public PKCE client)", value: "none" }
      ],
      defaultValue: "client_secret_post",
      ui: {
        description: "How the app authenticates at the token endpoint. MCP clients are public (none)."
      }
    }),
    redirectUris: (0, import_fields5.json)({
      defaultValue: [],
      ui: {
        description: "Array of allowed redirect URIs for OAuth callbacks"
      }
    }),
    scopes: (0, import_fields5.json)({
      defaultValue: [...MCP_SCOPES],
      ui: {
        description: "Array of allowed OAuth scopes. MCP scopes only narrow the signed-in user's own access."
      }
    }),
    webhookUrl: (0, import_fields5.text)({
      ui: {
        description: "URL to receive webhook notifications"
      }
    }),
    status: (0, import_fields5.select)({
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Pending", value: "pending" }
      ],
      defaultValue: "active"
    }),
    installUrl: (0, import_fields5.text)({
      ui: {
        description: "URL where users can install this app"
      }
    }),
    uninstallUrl: (0, import_fields5.text)({
      ui: {
        description: "URL to handle app uninstallation"
      }
    }),
    description: (0, import_fields5.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    metadata: (0, import_fields5.json)({
      defaultValue: {},
      ui: {
        description: "Additional app-specific configuration and settings"
      }
    }),
    developerEmail: (0, import_fields5.text)(),
    privacyPolicyUrl: (0, import_fields5.text)(),
    termsOfServiceUrl: (0, import_fields5.text)(),
    supportUrl: (0, import_fields5.text)(),
    ...trackingFields
  },
  ui: {
    labelField: "name",
    listView: {
      initialColumns: ["name", "clientId", "status", "createdAt"]
    }
  }
});

// features/keystone/models/OAuthToken.ts
var import_core5 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");
var digestTokenInput = {
  resolveInput: ({ resolvedData, fieldKey }) => resolvedData[fieldKey] ? digestToken(resolvedData[fieldKey]) : resolvedData[fieldKey]
};
var OAuthToken = (0, import_core5.list)({
  access: {
    operation: {
      query: permissions.canManagePeople,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    }
  },
  fields: {
    tokenType: (0, import_fields6.select)({
      options: [
        { label: "Authorization Code", value: "authorization_code" },
        { label: "Access Token", value: "access_token" },
        { label: "Refresh Token", value: "refresh_token" }
      ],
      validation: {
        isRequired: true
      }
    }),
    token: (0, import_fields6.text)({
      access: { read: () => false },
      validation: {
        isRequired: true
      },
      isIndexed: "unique",
      hooks: digestTokenInput
    }),
    clientId: (0, import_fields6.text)({
      validation: {
        isRequired: true
      },
      isIndexed: true
    }),
    user: (0, import_fields6.relationship)({
      ref: "User",
      ui: {
        description: "The user who authorized this token"
      }
    }),
    scopes: (0, import_fields6.json)({
      defaultValue: [],
      ui: {
        description: "Array of granted scopes"
      }
    }),
    redirectUri: (0, import_fields6.text)({
      ui: {
        description: "The redirect URI used during authorization"
      }
    }),
    resource: (0, import_fields6.text)({
      ui: {
        description: "The MCP endpoint (RFC 8707 resource) this grant is for"
      }
    }),
    expiresAt: (0, import_fields6.timestamp)({
      ui: {
        description: "When this token expires"
      }
    }),
    isRevoked: (0, import_fields6.select)({
      options: [
        { label: "Active", value: "false" },
        { label: "Revoked", value: "true" }
      ],
      defaultValue: "false"
    }),
    authorizationCode: (0, import_fields6.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "The authorization code that was exchanged for this token (for access tokens)"
      }
    }),
    refreshToken: (0, import_fields6.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "Associated refresh token (for access tokens)"
      }
    }),
    accessToken: (0, import_fields6.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "Associated access token (for refresh tokens)"
      }
    }),
    state: (0, import_fields6.text)({
      ui: {
        description: "OAuth state parameter for CSRF protection"
      }
    }),
    codeChallenge: (0, import_fields6.text)({
      ui: {
        description: "PKCE code challenge"
      }
    }),
    codeChallengeMethod: (0, import_fields6.select)({
      options: [
        { label: "Plain", value: "plain" },
        { label: "SHA256", value: "S256" }
      ],
      ui: {
        description: "PKCE code challenge method"
      }
    }),
    ...trackingFields
  },
  ui: {
    labelField: "clientId",
    listView: {
      initialColumns: ["tokenType", "clientId", "user", "scopes", "expiresAt", "isRevoked"]
    }
  }
});

// features/keystone/models/Venue.ts
var import_core7 = require("@keystone-6/core");
var import_fields7 = require("@keystone-6/core/fields");
var Venue = (0, import_core7.list)({
  access: catalogAccessFor("canManageVenues"),
  fields: {
    name: (0, import_fields7.text)({}),
    city: (0, import_fields7.text)({}),
    timezone: (0, import_fields7.text)({}),
    address: (0, import_fields7.text)({}),
    contact: (0, import_fields7.text)({}),
    capacity: (0, import_fields7.integer)({ defaultValue: 0 }),
    defaultFacilityFeeCents: (0, import_fields7.integer)({ defaultValue: 0 }),
    taxBps: (0, import_fields7.integer)({ defaultValue: 0 }),
    ownedByPromoter: (0, import_fields7.checkbox)({ defaultValue: false }),
    rentTermsDefault: (0, import_fields7.json)(),
    seatingChart_venue: (0, import_fields7.relationship)({ ref: "SeatingChart.venue", many: true }),
    event_venue: (0, import_fields7.relationship)({ ref: "Event.venue", many: true }),
    dateHold_venue: (0, import_fields7.relationship)({ ref: "DateHold.venue", many: true }),
    currencyCode: (0, import_fields7.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/SeatingChart.ts
var import_core8 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");

// features/keystone/lib/chart-validation.ts
async function validateChartMutation({ item, resolvedData, context, addValidationError }, model) {
  const check = async (chart) => {
    if (!chart || chart.status !== "draft") addValidationError("Published seating charts are immutable; create a new version.");
  };
  const parentId = (value) => value?.connect?.id;
  if (model === "chart") {
    if (item) await check(await context.prisma.seatingChart.findUnique({ where: { id: item.id } }));
    if (!item && resolvedData.status && resolvedData.status !== "draft") addValidationError("Create a draft chart, then publish it.");
    return;
  }
  const ids = /* @__PURE__ */ new Set();
  if (model === "section") {
    if (item?.chartId) ids.add(item.chartId);
    const id = parentId(resolvedData.chart);
    if (id) ids.add(id);
  } else {
    const sections = [item?.chartSectionId, parentId(resolvedData.chartSection)].filter(Boolean);
    for (const id of sections) {
      const section = await context.prisma.chartSection.findUnique({ where: { id } });
      if (section?.chartId) ids.add(section.chartId);
    }
  }
  if (!ids.size) addValidationError("A draft chart parent is required.");
  for (const id of ids) await check(await context.prisma.seatingChart.findUnique({ where: { id } }));
}

// features/keystone/models/SeatingChart.ts
var SeatingChart = (0, import_core8.list)({
  access: catalogAccessFor("canManageVenues"),
  hooks: { validate: (args) => validateChartMutation(args, "chart") },
  fields: {
    name: (0, import_fields8.text)({}),
    version: (0, import_fields8.integer)({ defaultValue: 1 }),
    status: (0, import_fields8.select)({ type: "string", options: ["draft", "published", "retired"], defaultValue: "draft", access: { update: () => false } }),
    venue: (0, import_fields8.relationship)({ ref: "Venue.seatingChart_venue", many: false }),
    chartSection_chart: (0, import_fields8.relationship)({ ref: "ChartSection.chart", many: true, access: { create: () => false, update: () => false } }),
    event_seatingChart: (0, import_fields8.relationship)({ ref: "Event.seatingChart", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ChartSection.ts
var import_core9 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");
var ChartSection = (0, import_core9.list)({
  access: catalogAccessFor("canManageVenues"),
  hooks: { validate: (args) => validateChartMutation(args, "section") },
  fields: {
    name: (0, import_fields9.text)({}),
    capacity: (0, import_fields9.integer)({ defaultValue: 0 }),
    sort: (0, import_fields9.integer)({ defaultValue: 0 }),
    kind: (0, import_fields9.select)({ type: "string", options: ["ga", "reserved"], defaultValue: "ga", access: { update: () => false } }),
    chart: (0, import_fields9.relationship)({ ref: "SeatingChart.chartSection_chart", many: false }),
    seat_chartSection: (0, import_fields9.relationship)({ ref: "Seat.chartSection", many: true, access: { create: () => false, update: () => false } }),
    priceLevel_sections: (0, import_fields9.relationship)({ ref: "PriceLevel.sections", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/Seat.ts
var import_core10 = require("@keystone-6/core");
var import_fields10 = require("@keystone-6/core/fields");
var Seat = (0, import_core10.list)({
  access: catalogAccessFor("canManageVenues"),
  hooks: { validate: (args) => validateChartMutation(args, "seat") },
  fields: {
    row: (0, import_fields10.text)({}),
    number: (0, import_fields10.text)({}),
    label: (0, import_fields10.text)({}),
    x: (0, import_fields10.integer)({ defaultValue: 0 }),
    y: (0, import_fields10.integer)({ defaultValue: 0 }),
    accessible: (0, import_fields10.checkbox)({ defaultValue: false }),
    companion: (0, import_fields10.checkbox)({ defaultValue: false }),
    obstructed: (0, import_fields10.checkbox)({ defaultValue: false }),
    status: (0, import_fields10.select)({ type: "string", options: ["sellable", "killed"], defaultValue: "sellable", access: { update: () => false } }),
    chartSection: (0, import_fields10.relationship)({ ref: "ChartSection.seat_chartSection", many: false }),
    seatInventory_seat: (0, import_fields10.relationship)({ ref: "SeatInventory.seat", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/Agency.ts
var import_core11 = require("@keystone-6/core");
var import_fields11 = require("@keystone-6/core/fields");
var Agency = (0, import_core11.list)({
  access: catalogAccessFor("canManageArtists"),
  fields: {
    name: (0, import_fields11.text)({}),
    contacts: (0, import_fields11.json)(),
    artist_agency: (0, import_fields11.relationship)({ ref: "Artist.agency", many: true }),
    dateHold_agency: (0, import_fields11.relationship)({ ref: "DateHold.agency", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/Artist.ts
var import_core12 = require("@keystone-6/core");
var import_fields12 = require("@keystone-6/core/fields");
var Artist = (0, import_core12.list)({
  access: catalogAccessFor("canManageArtists"),
  fields: {
    name: (0, import_fields12.text)({}),
    genreTags: (0, import_fields12.text)({}),
    agentName: (0, import_fields12.text)({}),
    agentEmail: (0, import_fields12.text)({}),
    manager: (0, import_fields12.text)({}),
    bio: (0, import_fields12.text)({}),
    image: (0, import_fields12.text)({}),
    socials: (0, import_fields12.json)(),
    agency: (0, import_fields12.relationship)({ ref: "Agency.artist_agency", many: false }),
    tour_artist: (0, import_fields12.relationship)({ ref: "Tour.artist", many: true }),
    eventArtist_artist: (0, import_fields12.relationship)({ ref: "EventArtist.artist", many: true }),
    dateHold_artist: (0, import_fields12.relationship)({ ref: "DateHold.artist", many: true }),
    offer_artist: (0, import_fields12.relationship)({ ref: "Offer.artist", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/Tour.ts
var import_core13 = require("@keystone-6/core");
var import_fields13 = require("@keystone-6/core/fields");
var Tour = (0, import_core13.list)({
  access: catalogAccessFor("canManageArtists"),
  fields: {
    name: (0, import_fields13.text)({}),
    notes: (0, import_fields13.text)({}),
    startAt: (0, import_fields13.timestamp)(),
    endAt: (0, import_fields13.timestamp)(),
    artist: (0, import_fields13.relationship)({ ref: "Artist.tour_artist", many: false }),
    event_tour: (0, import_fields13.relationship)({ ref: "Event.tour", many: true }),
    promoCodes: (0, import_fields13.relationship)({ ref: "PromoCode.tour", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/Event.ts
var import_core14 = require("@keystone-6/core");
var import_fields14 = require("@keystone-6/core/fields");
var Event = (0, import_core14.list)({
  access: catalogAccess,
  fields: {
    title: (0, import_fields14.text)({}),
    presaleCode: (0, import_fields14.text)({ access: { read: () => false, create: () => false, update: () => false } }),
    image: (0, import_fields14.text)({}),
    description: (0, import_fields14.text)({}),
    isCoPro: (0, import_fields14.checkbox)({ defaultValue: false }),
    allowReentry: (0, import_fields14.checkbox)({ defaultValue: false }),
    doorsAt: (0, import_fields14.timestamp)(),
    showAt: (0, import_fields14.timestamp)(),
    curfewAt: (0, import_fields14.timestamp)(),
    announceAt: (0, import_fields14.timestamp)(),
    onSaleAt: (0, import_fields14.timestamp)(),
    presaleAt: (0, import_fields14.timestamp)(),
    refundWindowEndsAt: (0, import_fields14.timestamp)(),
    status: (0, import_fields14.select)({ type: "string", options: ["hold", "announced", "presale", "on_sale", "sold_out", "doors", "in_progress", "completed", "settling", "settled", "cancelled", "postponed"], defaultValue: "hold", access: { update: () => false } }),
    ageRestriction: (0, import_fields14.select)({ type: "string", options: ["all_ages", "16", "18", "21"], defaultValue: "all_ages", access: { update: () => false } }),
    venue: (0, import_fields14.relationship)({ ref: "Venue.event_venue", many: false }),
    seatingChart: (0, import_fields14.relationship)({ ref: "SeatingChart.event_seatingChart", many: false }),
    tour: (0, import_fields14.relationship)({ ref: "Tour.event_tour", many: false }),
    promoter: (0, import_fields14.relationship)({ ref: "User.event_promoter", many: false }),
    eventArtist_event: (0, import_fields14.relationship)({ ref: "EventArtist.event", many: true }),
    dateHold_event: (0, import_fields14.relationship)({ ref: "DateHold.event", many: true }),
    offer_event: (0, import_fields14.relationship)({ ref: "Offer.event", many: true }),
    eventExpense_event: (0, import_fields14.relationship)({ ref: "EventExpense.event", many: true }),
    priceLevel_event: (0, import_fields14.relationship)({ ref: "PriceLevel.event", many: true }),
    seatInventory_event: (0, import_fields14.relationship)({ ref: "SeatInventory.event", many: true }),
    productionHold_event: (0, import_fields14.relationship)({ ref: "ProductionHold.event", many: true }),
    inventoryHold_event: (0, import_fields14.relationship)({ ref: "InventoryHold.event", many: true }),
    promoCode_event: (0, import_fields14.relationship)({ ref: "PromoCode.event", many: true }),
    ticketOrder_event: (0, import_fields14.relationship)({ ref: "TicketOrder.event", many: true }),
    ticket_event: (0, import_fields14.relationship)({ ref: "Ticket.event", many: true }),
    scanEvent_event: (0, import_fields14.relationship)({ ref: "ScanEvent.event", many: true }),
    merchSales_event: (0, import_fields14.relationship)({ ref: "MerchSales.event", many: true }),
    barSales_event: (0, import_fields14.relationship)({ ref: "BarSales.event", many: true }),
    settlement_event: (0, import_fields14.relationship)({ ref: "Settlement.event", many: true }),
    sold: (0, import_fields14.virtual)({ field: import_core14.graphql.field({ type: import_core14.graphql.Int, async resolve(item, args, context) {
      const r = await context.prisma.priceLevel.aggregate({ where: { eventId: item.id }, _sum: { sold: true } });
      return r._sum.sold ?? 0;
    } }) }),
    held: (0, import_fields14.virtual)({ field: import_core14.graphql.field({ type: import_core14.graphql.Int, async resolve(item, args, context) {
      const r = await context.prisma.priceLevel.aggregate({ where: { eventId: item.id }, _sum: { held: true } });
      return r._sum.held ?? 0;
    } }) }),
    kills: (0, import_fields14.virtual)({ field: import_core14.graphql.field({ type: import_core14.graphql.Int, async resolve(item, args, context) {
      return context.prisma.seatInventory.count({ where: { eventId: item.id, ...{ status: "killed" } } });
    } }) }),
    // Ticket revenue: not for door staff.
    gross: (0, import_fields14.virtual)({ access: { read: canReadGross }, ui: { listView: { fieldMode: (a) => canReadGross(a) ? "read" : "hidden" }, itemView: { fieldMode: (a) => canReadGross(a) ? "read" : "hidden" } }, field: import_core14.graphql.field({ type: import_core14.graphql.Int, async resolve(item, args, context) {
      const result = await context.prisma.ticketOrder.aggregate({ where: { eventId: item.id, status: "paid" }, _sum: { totalCents: true } });
      return result._sum.totalCents ?? 0;
    } }) }),
    open: (0, import_fields14.virtual)({ field: import_core14.graphql.field({ type: import_core14.graphql.Int, async resolve(item, args, context) {
      const levels = await context.prisma.priceLevel.findMany({ where: { eventId: item.id } });
      return levels.reduce((n, l) => n + l.capacity - l.sold - l.held - l.productionHeld, 0);
    } }) }),
    ...trackingFields
  }
});

// features/keystone/models/EventArtist.ts
var import_core15 = require("@keystone-6/core");
var import_fields15 = require("@keystone-6/core/fields");
var EventArtist = (0, import_core15.list)({
  access: catalogAccess,
  fields: {
    position: (0, import_fields15.integer)({ defaultValue: 0 }),
    setMinutes: (0, import_fields15.integer)({ defaultValue: 0 }),
    setTime: (0, import_fields15.timestamp)(),
    billing: (0, import_fields15.select)({ type: "string", options: ["headliner", "co_headliner", "support", "opener"], defaultValue: "headliner", access: { update: () => false } }),
    event: (0, import_fields15.relationship)({ ref: "Event.eventArtist_event", many: false }),
    artist: (0, import_fields15.relationship)({ ref: "Artist.eventArtist_artist", many: false }),
    offer_eventArtist: (0, import_fields15.relationship)({ ref: "Offer.eventArtist", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/DateHold.ts
var import_core16 = require("@keystone-6/core");
var import_fields16 = require("@keystone-6/core/fields");
var DateHold = (0, import_core16.list)({
  access: catalogAccess,
  fields: {
    rankKey: (0, import_fields16.text)({ isIndexed: "unique", db: { isNullable: true } }),
    rank: (0, import_fields16.integer)({ defaultValue: 0 }),
    date: (0, import_fields16.timestamp)(),
    expiresAt: (0, import_fields16.timestamp)(),
    status: (0, import_fields16.select)({ type: "string", options: ["held", "challenged", "confirmed", "released"], defaultValue: "held", access: { update: () => false } }),
    venue: (0, import_fields16.relationship)({ ref: "Venue.dateHold_venue", many: false }),
    artist: (0, import_fields16.relationship)({ ref: "Artist.dateHold_artist", many: false }),
    agency: (0, import_fields16.relationship)({ ref: "Agency.dateHold_agency", many: false }),
    event: (0, import_fields16.relationship)({ ref: "Event.dateHold_event", many: false }),
    ...trackingFields
  }
});

// features/keystone/models/Offer.ts
var import_core17 = require("@keystone-6/core");
var import_fields17 = require("@keystone-6/core/fields");
var Offer = (0, import_core17.list)({
  access: { operation: { ...catalogAccess.operation, query: readAccess("canManageDeals", "canManageSettlements").operation.query } },
  fields: {
    breakevenBasis: (0, import_fields17.text)({}),
    radiusClause: (0, import_fields17.text)({}),
    notes: (0, import_fields17.text)({}),
    acceptedTermsHash: (0, import_fields17.text)({}),
    version: (0, import_fields17.integer)({ defaultValue: 1 }),
    guaranteeCents: (0, import_fields17.integer)({ defaultValue: 0 }),
    percentageBps: (0, import_fields17.integer)({ defaultValue: 0 }),
    promoterProfitBps: (0, import_fields17.integer)({ defaultValue: 0 }),
    expenseCapCents: (0, import_fields17.integer)({ defaultValue: 0 }),
    merchSplitBps: (0, import_fields17.integer)({ defaultValue: 0 }),
    hardMerchSplitBps: (0, import_fields17.integer)({ defaultValue: 0 }),
    hospitalityRiderCents: (0, import_fields17.integer)({ defaultValue: 0 }),
    depositCents: (0, import_fields17.integer)({ defaultValue: 0 }),
    acceptedTerms: (0, import_fields17.json)(),
    depositDueAt: (0, import_fields17.timestamp)(),
    status: (0, import_fields17.select)({ type: "string", options: ["draft", "sent", "accepted", "declined", "contracted", "settled", "superseded"], defaultValue: "draft", access: { update: () => false } }),
    dealType: (0, import_fields17.select)({ type: "string", options: ["flat_guarantee", "versus", "plus", "door_deal"], defaultValue: "flat_guarantee", access: { update: () => false } }),
    event: (0, import_fields17.relationship)({ ref: "Event.offer_event", many: false }),
    artist: (0, import_fields17.relationship)({ ref: "Artist.offer_artist", many: false }),
    eventArtist: (0, import_fields17.relationship)({ ref: "EventArtist.offer_eventArtist", many: false }),
    currencyCode: (0, import_fields17.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/EventExpense.ts
var import_core18 = require("@keystone-6/core");
var import_fields18 = require("@keystone-6/core/fields");
var EventExpense = (0, import_core18.list)({
  access: { operation: { ...catalogAccess.operation, query: readAccess("canManageEvents", "canManageSettlements").operation.query } },
  fields: {
    vendor: (0, import_fields18.text)({}),
    receipt: (0, import_fields18.text)({ access: { read: () => false, create: () => false, update: () => false } }),
    notes: (0, import_fields18.text)({}),
    budgetCents: (0, import_fields18.integer)({ defaultValue: 0 }),
    actualCents: (0, import_fields18.integer)({ defaultValue: 0 }),
    isCapped: (0, import_fields18.checkbox)({ defaultValue: false }),
    category: (0, import_fields18.select)({ type: "string", options: ["venue_rent", "production", "security", "stagehands", "marketing", "catering", "insurance", "ticketing", "other"], defaultValue: "venue_rent", access: { update: () => false } }),
    event: (0, import_fields18.relationship)({ ref: "Event.eventExpense_event", many: false }),
    currencyCode: (0, import_fields18.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/PriceLevel.ts
var import_core19 = require("@keystone-6/core");
var import_fields19 = require("@keystone-6/core/fields");
var PriceLevel = (0, import_core19.list)({
  access: catalogAccess,
  fields: {
    name: (0, import_fields19.text)({}),
    priceCents: (0, import_fields19.integer)({ defaultValue: 0 }),
    feeCents: (0, import_fields19.integer)({ defaultValue: 0 }),
    facilityFeeCents: (0, import_fields19.integer)({ defaultValue: 0 }),
    capacity: (0, import_fields19.integer)({ defaultValue: 0 }),
    sold: (0, import_fields19.integer)({ defaultValue: 0 }),
    held: (0, import_fields19.integer)({ defaultValue: 0 }),
    perOrderLimit: (0, import_fields19.integer)({ defaultValue: 8 }),
    productionHeld: (0, import_fields19.integer)({ defaultValue: 0 }),
    salesStartAt: (0, import_fields19.timestamp)(),
    salesEndAt: (0, import_fields19.timestamp)(),
    status: (0, import_fields19.select)({ type: "string", options: ["active", "paused", "closed"], defaultValue: "active", access: { update: () => false } }),
    event: (0, import_fields19.relationship)({ ref: "Event.priceLevel_event", many: false }),
    sections: (0, import_fields19.relationship)({ ref: "ChartSection.priceLevel_sections", many: true }),
    priceLevelPhase_priceLevel: (0, import_fields19.relationship)({ ref: "PriceLevelPhase.priceLevel", many: true }),
    seatInventory_priceLevel: (0, import_fields19.relationship)({ ref: "SeatInventory.priceLevel", many: true }),
    productionHold_priceLevel: (0, import_fields19.relationship)({ ref: "ProductionHold.priceLevel", many: true }),
    inventoryHold_priceLevel: (0, import_fields19.relationship)({ ref: "InventoryHold.priceLevel", many: true }),
    promoCode_priceLevels: (0, import_fields19.relationship)({ ref: "PromoCode.priceLevels", many: true }),
    ticketOrderLine_priceLevel: (0, import_fields19.relationship)({ ref: "TicketOrderLine.priceLevel", many: true }),
    currencyCode: (0, import_fields19.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/PriceLevelPhase.ts
var import_core20 = require("@keystone-6/core");
var import_fields20 = require("@keystone-6/core/fields");
var PriceLevelPhase = (0, import_core20.list)({
  access: catalogAccess,
  fields: {
    name: (0, import_fields20.text)({}),
    priceCents: (0, import_fields20.integer)({ defaultValue: 0 }),
    quantity: (0, import_fields20.integer)({ defaultValue: 0 }),
    sold: (0, import_fields20.integer)({ defaultValue: 0 }),
    sort: (0, import_fields20.integer)({ defaultValue: 0 }),
    startsAt: (0, import_fields20.timestamp)(),
    priceLevel: (0, import_fields20.relationship)({ ref: "PriceLevel.priceLevelPhase_priceLevel", many: false }),
    inventoryHold_phase: (0, import_fields20.relationship)({ ref: "InventoryHold.phase", many: true }),
    ticketOrderLine_phase: (0, import_fields20.relationship)({ ref: "TicketOrderLine.phase", many: true }),
    currencyCode: (0, import_fields20.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/SeatInventory.ts
var import_core21 = require("@keystone-6/core");
var import_fields21 = require("@keystone-6/core/fields");
var SeatInventory = (0, import_core21.list)({
  access: commandAccess,
  fields: {
    holdKey: (0, import_fields21.text)({ isIndexed: true, db: { isNullable: true } }),
    occupancyKey: (0, import_fields21.text)({ isIndexed: "unique", db: { isNullable: true } }),
    eventSeatKey: (0, import_fields21.text)({ isIndexed: "unique", db: { isNullable: true } }),
    status: (0, import_fields21.select)({ type: "string", options: ["open", "held", "sold", "killed", "comp", "reserved_hold"], defaultValue: "open", access: { update: () => false } }),
    event: (0, import_fields21.relationship)({ ref: "Event.seatInventory_event", many: false }),
    seat: (0, import_fields21.relationship)({ ref: "Seat.seatInventory_seat", many: false }),
    priceLevel: (0, import_fields21.relationship)({ ref: "PriceLevel.seatInventory_priceLevel", many: false }),
    productionHold_seats: (0, import_fields21.relationship)({ ref: "ProductionHold.seats", many: true }),
    inventoryHold_seats: (0, import_fields21.relationship)({ ref: "InventoryHold.seats", many: true }),
    ticket_seatInventory: (0, import_fields21.relationship)({ ref: "Ticket.seatInventory", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ProductionHold.ts
var import_core22 = require("@keystone-6/core");
var import_fields22 = require("@keystone-6/core/fields");
var ProductionHold = (0, import_core22.list)({
  access: commandAccess,
  fields: {
    quantity: (0, import_fields22.integer)({ defaultValue: 0 }),
    releaseAt: (0, import_fields22.timestamp)(),
    holdType: (0, import_fields22.select)({ type: "string", options: ["artist", "promoter", "production", "sponsor", "ada"], defaultValue: "artist", access: { update: () => false } }),
    status: (0, import_fields22.select)({ type: "string", options: ["active", "released"], defaultValue: "active", access: { update: () => false } }),
    event: (0, import_fields22.relationship)({ ref: "Event.productionHold_event", many: false }),
    priceLevel: (0, import_fields22.relationship)({ ref: "PriceLevel.productionHold_priceLevel", many: false }),
    seats: (0, import_fields22.relationship)({ ref: "SeatInventory.productionHold_seats", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/InventoryHold.ts
var import_core23 = require("@keystone-6/core");
var import_fields23 = require("@keystone-6/core/fields");
var InventoryHold = (0, import_core23.list)({
  // A hold carries the buyer's quote; only order staff read it. Holds are written by checkout commands only.
  access: readAccess("canManageOrders", "canIssueRefunds"),
  fields: {
    holdKey: (0, import_fields23.text)({ isIndexed: "unique", db: { isNullable: true } }),
    secretHash: (0, import_fields23.text)({ access: { read: () => false, create: () => false, update: () => false } }),
    presaleCode: (0, import_fields23.text)({ access: { read: () => false, create: () => false, update: () => false } }),
    quantity: (0, import_fields23.integer)({ defaultValue: 0 }),
    quoteSnapshot: (0, import_fields23.json)(),
    expiresAt: (0, import_fields23.timestamp)(),
    status: (0, import_fields23.select)({ type: "string", options: ["active", "converted", "released", "expired"], defaultValue: "active", access: { update: () => false } }),
    event: (0, import_fields23.relationship)({ ref: "Event.inventoryHold_event", many: false }),
    priceLevel: (0, import_fields23.relationship)({ ref: "PriceLevel.inventoryHold_priceLevel", many: false }),
    phase: (0, import_fields23.relationship)({ ref: "PriceLevelPhase.inventoryHold_phase", many: false }),
    customer: (0, import_fields23.relationship)({ ref: "User.inventoryHold_customer", many: false }),
    seats: (0, import_fields23.relationship)({ ref: "SeatInventory.inventoryHold_seats", many: true }),
    order: (0, import_fields23.relationship)({ ref: "TicketOrder.inventoryHold_order", many: false }),
    promoCode: (0, import_fields23.relationship)({ ref: "PromoCode.inventoryHold_promoCode", many: false }),
    promoRedemptions: (0, import_fields23.relationship)({ ref: "PromoRedemption.hold", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PromoCode.ts
var import_core24 = require("@keystone-6/core");
var import_fields24 = require("@keystone-6/core/fields");
var PromoCode = (0, import_core24.list)({
  access: catalogAccess,
  fields: {
    code: (0, import_fields24.text)({ isIndexed: "unique", validation: { isRequired: true, match: { regex: /^[A-Z0-9_-]+$/, explanation: "Uppercase letters, numbers, - and _" } } }),
    discountType: (0, import_fields24.select)({ type: "string", options: ["percent_bps", "amount_cents", "comp"], defaultValue: "percent_bps" }),
    value: (0, import_fields24.integer)({ defaultValue: 0, validation: { min: 0 } }),
    maxUses: (0, import_fields24.integer)({ validation: { min: 1 } }),
    usedCount: (0, import_fields24.integer)({ defaultValue: 0, access: { create: () => false, update: () => false } }),
    perOrderLimit: (0, import_fields24.integer)({ validation: { min: 1 } }),
    startsAt: (0, import_fields24.timestamp)(),
    endsAt: (0, import_fields24.timestamp)(),
    status: (0, import_fields24.select)({ type: "string", options: ["active", "paused", "expired"], defaultValue: "active" }),
    event: (0, import_fields24.relationship)({ ref: "Event.promoCode_event", many: false }),
    priceLevels: (0, import_fields24.relationship)({ ref: "PriceLevel.promoCode_priceLevels", many: true }),
    tour: (0, import_fields24.relationship)({ ref: "Tour.promoCodes", many: false }),
    inventoryHold_promoCode: (0, import_fields24.relationship)({ ref: "InventoryHold.promoCode", many: true }),
    redemptions: (0, import_fields24.relationship)({ ref: "PromoRedemption.promoCode", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PromoRedemption.ts
var import_core25 = require("@keystone-6/core");
var import_fields25 = require("@keystone-6/core/fields");
var PromoRedemption = (0, import_core25.list)({
  access: readAccess("canManageOrders", "canIssueRefunds"),
  graphql: { plural: "PromoRedemptionRecords" },
  fields: {
    promoCode: (0, import_fields25.relationship)({ ref: "PromoCode.redemptions" }),
    hold: (0, import_fields25.relationship)({ ref: "InventoryHold.promoRedemptions" }),
    order: (0, import_fields25.relationship)({ ref: "TicketOrder.promoRedemptions" }),
    amountCents: (0, import_fields25.integer)({ defaultValue: 0 }),
    status: (0, import_fields25.select)({ type: "string", options: ["reserved", "committed", "released"], defaultValue: "reserved", access: { update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/TicketOrder.ts
var import_core26 = require("@keystone-6/core");
var import_fields26 = require("@keystone-6/core/fields");
var TicketOrder = (0, import_core26.list)({
  access: readAccess("canManageOrders", "canIssueRefunds"),
  fields: {
    orderNumber: (0, import_fields26.text)({ isIndexed: "unique", db: { isNullable: true } }),
    guestEmail: (0, import_fields26.text)({}),
    guestName: (0, import_fields26.text)({}),
    secretKey: (0, import_fields26.text)({ access: { read: () => false, create: () => false, update: () => false } }),
    subtotalCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    serviceFeesCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    facilityFeesCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    taxCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    discountCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    totalCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    refundedCents: (0, import_fields26.integer)({ defaultValue: 0 }),
    ageAttested: (0, import_fields26.checkbox)({ defaultValue: false }),
    status: (0, import_fields26.select)({ type: "string", options: ["pending_payment", "paid", "partially_refunded", "refunded", "cancelled", "comp"], defaultValue: "pending_payment", access: { update: () => false } }),
    source: (0, import_fields26.select)({ type: "string", options: ["online", "box_office", "comp", "presale"], defaultValue: "online", access: { update: () => false } }),
    customer: (0, import_fields26.relationship)({ ref: "User.ticketOrder_customer", many: false }),
    event: (0, import_fields26.relationship)({ ref: "Event.ticketOrder_event", many: false }),
    paymentCollection: (0, import_fields26.relationship)({ ref: "PaymentCollection.ticketOrder_paymentCollection", many: false }),
    inventoryHold_order: (0, import_fields26.relationship)({ ref: "InventoryHold.order", many: true }),
    ticketOrderLine_order: (0, import_fields26.relationship)({ ref: "TicketOrderLine.order", many: true }),
    ticket_order: (0, import_fields26.relationship)({ ref: "Ticket.order", many: true }),
    currencyCode: (0, import_fields26.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    payments: (0, import_fields26.relationship)({ ref: "Payment.order", many: true }),
    promoRedemptions: (0, import_fields26.relationship)({ ref: "PromoRedemption.order", many: true }),
    discountSnapshot: (0, import_fields26.json)(),
    ...trackingFields
  }
});

// features/keystone/models/TicketOrderLine.ts
var import_core27 = require("@keystone-6/core");
var import_fields27 = require("@keystone-6/core/fields");
var TicketOrderLine = (0, import_core27.list)({
  access: readAccess("canManageOrders", "canIssueRefunds"),
  fields: {
    title: (0, import_fields27.text)({}),
    levelName: (0, import_fields27.text)({}),
    phaseName: (0, import_fields27.text)({}),
    seatLabel: (0, import_fields27.text)({}),
    unitPriceCents: (0, import_fields27.integer)({ defaultValue: 0 }),
    serviceFeeCents: (0, import_fields27.integer)({ defaultValue: 0 }),
    facilityFeeCents: (0, import_fields27.integer)({ defaultValue: 0 }),
    taxCents: (0, import_fields27.integer)({ defaultValue: 0 }),
    quantity: (0, import_fields27.integer)({ defaultValue: 0 }),
    discountCents: (0, import_fields27.integer)({ defaultValue: 0 }),
    totalCents: (0, import_fields27.integer)({ defaultValue: 0 }),
    order: (0, import_fields27.relationship)({ ref: "TicketOrder.ticketOrderLine_order", many: false }),
    priceLevel: (0, import_fields27.relationship)({ ref: "PriceLevel.ticketOrderLine_priceLevel", many: false }),
    phase: (0, import_fields27.relationship)({ ref: "PriceLevelPhase.ticketOrderLine_phase", many: false }),
    ticket_line: (0, import_fields27.relationship)({ ref: "Ticket.line", many: true }),
    currencyCode: (0, import_fields27.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/Ticket.ts
var import_core28 = require("@keystone-6/core");
var import_fields28 = require("@keystone-6/core/fields");
var Ticket = (0, import_core28.list)({
  access: readAccess("canManageOrders", "canIssueRefunds", "canScanTickets"),
  fields: {
    ticketCode: (0, import_fields28.text)({ isIndexed: "unique", db: { isNullable: true } }),
    tokenHash: (0, import_fields28.text)({ access: { read: () => false, create: () => false, update: () => false } }),
    holderName: (0, import_fields28.text)({}),
    holderEmail: (0, import_fields28.text)({}),
    status: (0, import_fields28.select)({ type: "string", options: ["valid", "checked_in", "void", "refunded", "transferred"], defaultValue: "valid", access: { update: () => false } }),
    order: (0, import_fields28.relationship)({ ref: "TicketOrder.ticket_order", many: false }),
    event: (0, import_fields28.relationship)({ ref: "Event.ticket_event", many: false }),
    line: (0, import_fields28.relationship)({ ref: "TicketOrderLine.ticket_line", many: false }),
    seatInventory: (0, import_fields28.relationship)({ ref: "SeatInventory.ticket_seatInventory", many: false }),
    transferredFrom: (0, import_fields28.relationship)({ ref: "Ticket.ticket_transferredFrom", many: false }),
    ticket_transferredFrom: (0, import_fields28.relationship)({ ref: "Ticket.transferredFrom", many: true }),
    scanEvent_ticket: (0, import_fields28.relationship)({ ref: "ScanEvent.ticket", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ScanEvent.ts
var import_core29 = require("@keystone-6/core");
var import_fields29 = require("@keystone-6/core/fields");
var ScanEvent = (0, import_core29.list)({
  access: readAccess("canScanTickets", "canManageOrders", "canIssueRefunds"),
  fields: {
    gate: (0, import_fields29.text)({}),
    at: (0, import_fields29.timestamp)(),
    result: (0, import_fields29.select)({ type: "string", options: ["admitted", "duplicate", "wrong_event", "void", "reentry"], defaultValue: "admitted", access: { update: () => false } }),
    ticket: (0, import_fields29.relationship)({ ref: "Ticket.scanEvent_ticket", many: false }),
    event: (0, import_fields29.relationship)({ ref: "Event.scanEvent_event", many: false }),
    scannedBy: (0, import_fields29.relationship)({ ref: "User.scanEvent_scannedBy", many: false }),
    ...trackingFields
  }
});

// features/keystone/models/MerchSales.ts
var import_core30 = require("@keystone-6/core");
var import_fields30 = require("@keystone-6/core/fields");
var MerchSales = (0, import_core30.list)({
  graphql: { plural: "MerchSalesRecords" },
  access: readAccess("canManageSettlements"),
  fields: {
    softGrossCents: (0, import_fields30.integer)({ defaultValue: 0 }),
    hardGrossCents: (0, import_fields30.integer)({ defaultValue: 0 }),
    venueSoftSplitBps: (0, import_fields30.integer)({ defaultValue: 0 }),
    venueHardSplitBps: (0, import_fields30.integer)({ defaultValue: 0 }),
    venueShareCents: (0, import_fields30.integer)({ defaultValue: 0 }),
    sellerFeeCents: (0, import_fields30.integer)({ defaultValue: 0 }),
    countIn: (0, import_fields30.json)(),
    countOut: (0, import_fields30.json)(),
    event: (0, import_fields30.relationship)({ ref: "Event.merchSales_event", many: false }),
    currencyCode: (0, import_fields30.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/BarSales.ts
var import_core31 = require("@keystone-6/core");
var import_fields31 = require("@keystone-6/core/fields");
var BarSales = (0, import_core31.list)({
  graphql: { plural: "BarSalesRecords" },
  access: readAccess("canManageSettlements"),
  fields: {
    grossCents: (0, import_fields31.integer)({ defaultValue: 0 }),
    promoterShareBps: (0, import_fields31.integer)({ defaultValue: 0 }),
    event: (0, import_fields31.relationship)({ ref: "Event.barSales_event", many: false }),
    currencyCode: (0, import_fields31.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/Settlement.ts
var import_core32 = require("@keystone-6/core");
var import_fields32 = require("@keystone-6/core/fields");
var Settlement = (0, import_core32.list)({
  access: readAccess("canManageSettlements"),
  fields: {
    hash: (0, import_fields32.text)({}),
    version: (0, import_fields32.integer)({ defaultValue: 1 }),
    ticketGrossCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    ticketFeesCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    taxCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    compCount: (0, import_fields32.integer)({ defaultValue: 0 }),
    paidCount: (0, import_fields32.integer)({ defaultValue: 0 }),
    netBoxOfficeCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    totalExpensesCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    cappedExpensesCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    breakevenCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    splitPointCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    artistGuaranteeCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    artistOverageCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    artistTotalCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    merchVenueShareCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    depositsPaidCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    balanceDueArtistCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    promoterNetCents: (0, import_fields32.integer)({ defaultValue: 0 }),
    computedSnapshot: (0, import_fields32.json)(),
    approvals: (0, import_fields32.json)(),
    status: (0, import_fields32.select)({ type: "string", options: ["draft", "reviewed", "signed_promoter", "signed_artist", "final", "void"], defaultValue: "draft", access: { update: () => false } }),
    event: (0, import_fields32.relationship)({ ref: "Event.settlement_event", many: false }),
    previousVersion: (0, import_fields32.relationship)({ ref: "Settlement.settlement_previousVersion", many: false }),
    settlement_previousVersion: (0, import_fields32.relationship)({ ref: "Settlement.previousVersion", many: true }),
    settlementLine_settlement: (0, import_fields32.relationship)({ ref: "SettlementLine.settlement", many: true }),
    artistPayment_settlement: (0, import_fields32.relationship)({ ref: "ArtistPayment.settlement", many: true }),
    currencyCode: (0, import_fields32.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/SettlementLine.ts
var import_core33 = require("@keystone-6/core");
var import_fields33 = require("@keystone-6/core/fields");
var SettlementLine = (0, import_core33.list)({
  access: readAccess("canManageSettlements"),
  fields: {
    label: (0, import_fields33.text)({}),
    sourceRef: (0, import_fields33.text)({}),
    reason: (0, import_fields33.text)({}),
    amountCents: (0, import_fields33.integer)({ defaultValue: 0 }),
    roundingRemainder: (0, import_fields33.integer)({ defaultValue: 0 }),
    kind: (0, import_fields33.select)({ type: "string", options: ["gross", "fee", "tax", "expense", "guarantee", "overage", "merch", "deposit", "adjustment", "rounding", "payment"], defaultValue: "gross", access: { update: () => false } }),
    settlement: (0, import_fields33.relationship)({ ref: "Settlement.settlementLine_settlement", many: false }),
    approvedBy: (0, import_fields33.relationship)({ ref: "User.settlementLine_approvedBy", many: false }),
    currencyCode: (0, import_fields33.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/ArtistPayment.ts
var import_core34 = require("@keystone-6/core");
var import_fields34 = require("@keystone-6/core/fields");
var ArtistPayment = (0, import_core34.list)({
  access: readAccess("canManageSettlements"),
  fields: {
    method: (0, import_fields34.text)({}),
    reference: (0, import_fields34.text)({}),
    amountCents: (0, import_fields34.integer)({ defaultValue: 0 }),
    kind: (0, import_fields34.select)({ type: "string", options: ["deposit", "balance"], defaultValue: "deposit", access: { update: () => false } }),
    status: (0, import_fields34.select)({ type: "string", options: ["scheduled", "paid", "void"], defaultValue: "scheduled", access: { update: () => false } }),
    settlement: (0, import_fields34.relationship)({ ref: "Settlement.artistPayment_settlement", many: false }),
    currencyCode: (0, import_fields34.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...trackingFields
  }
});

// features/keystone/models/AuditEvent.ts
var import_core35 = require("@keystone-6/core");
var import_fields35 = require("@keystone-6/core/fields");
var AuditEvent = (0, import_core35.list)({
  access: { operation: { query: permissions.canReadAudit, create: () => false, update: () => false, delete: () => false } },
  fields: {
    action: (0, import_fields35.text)({}),
    targetList: (0, import_fields35.text)({}),
    targetId: (0, import_fields35.text)({}),
    reason: (0, import_fields35.text)({}),
    requestId: (0, import_fields35.text)({}),
    before: (0, import_fields35.json)(),
    after: (0, import_fields35.json)(),
    actor: (0, import_fields35.relationship)({ ref: "User.auditEvent_actor", many: false }),
    ...trackingFields
  }
});

// features/keystone/models/StoreSettings.ts
var import_core36 = require("@keystone-6/core");
var import_fields37 = require("@keystone-6/core/fields");

// features/keystone/models/storeLogoFields.ts
var import_fields36 = require("@keystone-6/core/fields");

// features/platform/store-settings/lib/icon-registry.ts
var LOGO_ICONS = [
  {
    id: "3portals",
    name: "3Portals",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m34.5868 8.40061-9.6868-2.59556c-.6687-.17919-1.2108.23679-1.2108.92911v10.02854c0 .6923.5421 1.3988 1.2108 1.578l9.6868 2.5955c.6687.1792 1.2109-.2368 1.2109-.9291v-10.02848c0-.69232-.5422-1.39882-1.2109-1.57801zm-9.6868-6.35625c-2.6749-.71674-4.8434.94718-4.8434 3.71647v10.02847c0 2.7693 2.1685 5.5953 4.8434 6.312l9.6868 2.5956c2.6749.7168 4.8434-.9472 4.8434-3.7165v-10.0284c0-2.76934-2.1685-5.59533-4.8434-6.31207z" fill="#8098f9"/><path d="m26.9812 16.5707-12.1085-3.2444c-.6687-.1792-1.2109.2368-1.2109.9291v12.5356c0 .6923.5422 1.3988 1.2109 1.578l12.1085 3.2445c.6687.1792 1.2108-.2368 1.2108-.9291v-12.5356c0-.6924-.5421-1.3989-1.2108-1.5781zm-12.1085-7.0051c-2.6749-.71674-4.8434.9472-4.8434 3.7165v12.5356c0 2.7693 2.1685 5.5953 4.8434 6.312l12.1085 3.2445c2.6749.7167 4.8433-.9472 4.8433-3.7165v-12.5356c0-2.7693-2.1684-5.5953-4.8433-6.312z" fill="#6172f3"/><path d="m19.3736 24.7409-14.53021-3.8934c-.66873-.1792-1.21085.2368-1.21085.9291v15.0428c0 .6923.54212 1.3988 1.21085 1.578l14.53021 3.8933c.6687.1792 1.2108-.2368 1.2108-.9291v-15.0427c0-.6923-.5421-1.3988-1.2108-1.578zm-14.53021-7.6541c-2.67493-.7167-4.84339.9472-4.84339 3.7165v15.0427c0 2.7693 2.16846 5.5953 4.84339 6.3121l14.53021 3.8933c2.6749.7168 4.8433-.9472 4.8433-3.7164v-15.0428c0-2.7693-2.1684-5.5953-4.8433-6.312z" fill="#444ce7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m34.5868 8.40061-9.6868-2.59556c-.6687-.17919-1.2108.23679-1.2108.92911v10.02854c0 .6923.5421 1.3988 1.2108 1.578l9.6868 2.5955c.6687.1792 1.2109-.2368 1.2109-.9291v-10.02848c0-.69232-.5422-1.39882-1.2109-1.57801zm-9.6868-6.35625c-2.6749-.71674-4.8434.94718-4.8434 3.71647v10.02847c0 2.7693 2.1685 5.5953 4.8434 6.312l9.6868 2.5956c2.6749.7168 4.8434-.9472 4.8434-3.7165v-10.0284c0-2.76934-2.1685-5.59533-4.8434-6.31207z" opacity=".5"/><path d="m26.9812 16.5707-12.1085-3.2444c-.6687-.1792-1.2109.2368-1.2109.9291v12.5356c0 .6923.5422 1.3988 1.2109 1.578l12.1085 3.2445c.6687.1792 1.2108-.2368 1.2108-.9291v-12.5356c0-.6924-.5421-1.3989-1.2108-1.5781zm-12.1085-7.0051c-2.6749-.71674-4.8434.9472-4.8434 3.7165v12.5356c0 2.7693 2.1685 5.5953 4.8434 6.312l12.1085 3.2445c2.6749.7167 4.8433-.9472 4.8433-3.7165v-12.5356c0-2.7693-2.1684-5.5953-4.8433-6.312z" opacity=".7"/><path d="m19.3736 24.7409-14.53021-3.8934c-.66873-.1792-1.21085.2368-1.21085.9291v15.0428c0 .6923.54212 1.3988 1.21085 1.578l14.53021 3.8933c.6687.1792 1.2108-.2368 1.2108-.9291v-15.0427c0-.6923-.5421-1.3988-1.2108-1.578zm-14.53021-7.6541c-2.67493-.7167-4.84339.9472-4.84339 3.7165v15.0427c0 2.7693 2.16846 5.5953 4.84339 6.3121l14.53021 3.8933c2.6749.7168 4.8433-.9472 4.8433-3.7164v-15.0428c0-2.7693-2.1684-5.5953-4.8433-6.312z"/></g></svg>`
  },
  {
    id: "45-degrees",
    name: "45 Degrees",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 24 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 15.8981h17.3455l-17.061314 17.0613 2.756374 2.7564 17.06134-17.0613v17.3455h.1104l3.7877-3.7877v-15.9638l-4.2485-4.2485h-15.96596l-3.78553995 3.7855z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 24 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 15.8981h17.3455l-17.061314 17.0613 2.756374 2.7564 17.06134-17.0613v17.3455h.1104l3.7877-3.7877v-15.9638l-4.2485-4.2485h-15.96596l-3.78553995 3.7855z" fill="#155eef"/></svg>`
  },
  {
    id: "acme-corp",
    name: "Acme Corp",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m0 24c15.2548 0 24-8.7452 24-24 0 15.2548 8.7452 24 24 24-15.2548 0-24 8.7452-24 24 0-15.2548-8.7452-24-24-24z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m0 24c15.2548 0 24-8.7452 24-24 0 15.2548 8.7452 24 24 24-15.2548 0-24 8.7452-24 24 0-15.2548-8.7452-24-24-24z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "alphawave",
    name: "AlphaWave",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 47 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m24.9706 7.03309c-3.1242-3.1242-8.1896-3.1242-11.3137 0l-11.31375 11.31371c-3.124199 3.1242-3.124199 8.1895 0 11.3137l11.31375 11.3137c3.1241 3.1242 8.1895 3.1242 11.3137 0l5.3982-5.3983c-4.4939-1.7337-7.682-6.0944-7.682-11.1997 0-5.3087 3.4472-9.8123 8.2254-11.3943-.0935-.0982-.1884-.1955-.2848-.292z" fill="#155eef"/><path d="m30.3691 35.5798c1.3398.5168 2.7955.8001 4.3174.8001 6.6274 0 12-5.3726 12-12s-5.3726-12-12-12c-1.3185 0-2.5873.2126-3.774.6055 5.9623 6.2681 5.8675 16.1836-.2846 22.3356z" fill="#155eef" opacity=".7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 47 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m24.9706 7.03309c-3.1242-3.1242-8.1896-3.1242-11.3137 0l-11.31375 11.31371c-3.124199 3.1242-3.124199 8.1895 0 11.3137l11.31375 11.3137c3.1241 3.1242 8.1895 3.1242 11.3137 0l5.3982-5.3983c-4.4939-1.7337-7.682-6.0944-7.682-11.1997 0-5.3087 3.4472-9.8123 8.2254-11.3943-.0935-.0982-.1884-.1955-.2848-.292z" fill="#155eef"/><path d="m30.3691 35.5798c1.3398.5168 2.7955.8001 4.3174.8001 6.6274 0 12-5.3726 12-12s-5.3726-12-12-12c-1.3185 0-2.5873.2126-3.774.6055 5.9623 6.2681 5.8675 16.1836-.2846 22.3356z" fill="#155eef" opacity=".7"/></svg>`
  },
  {
    id: "alt-shift",
    name: "Alt+Shift",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m23.4538 34.7189c-3.1818-1.1818-6.4544-1.3636-9.4544-.5455-2.0909.5455-4.09082 1.6364-5.90897 3l-1.27273 1.0909-.36362.3636.81816.7273c.09091 0 .09092.0909.18183.1818.18181.1818.36364.2727.63636.4545l.54542.3636.54545-.4545c.09091-.0909.27273-.2727.45454-.3636 1.63636-1.3636 3.45446-2.2727 5.36356-2.7272 2.4545-.6364 5.0908-.5455 7.7271.4545 2.1818.8182 6.6363 1.8181 11.9998-.4545l.1818-.091.2728-.2727c0-.0909.0909-.0909.1818-.1818.4545-.5454.9091-1.0909 1.2727-1.7272l1.8181-2.8182-2.909 1.6363c-4.2727 2.3636-8.1817 2.8182-12.0907 1.3637z"/><path d="m10.9998 24.9011c2.4545-.6363 5.0908-.5454 7.7272.4546 2.909 1.0909 10.3634 2.6363 18.7269-4.909l1.8182-1.8182-.1819-.4545c-.0909-.3636-.2727-.8182-.4545-1.2727l-.4545-1.2727-.9091.909c-.0909.1819-.2727.2728-.4546.4546-3.9999 4.0908-10.1816 8.2726-17.2724 5.7272-3.1817-1.1818-6.4544-1.3637-9.4544-.5455-2.909.8182-5.45442 2.3636-7.81801 4.5454v-.0909l-1.363614 1.4545c0 .0909-.090891.0909-.181798.1818l-.27274.2727.090913.3637c.090908.4545.272717.909.363625 1.3636l.545454 1.4545.90907-1.1818c.09091-.1818.27272-.2727.36363-.4545 1.90905-1.7273 4.54538-4.1818 8.27257-5.1818z"/><path d="m2.1818 23.2646c2.09088-2.1818 4.45445-3.5454 6.99987-4.2727 2.45453-.6363 5.09083-.5454 7.72713.4546 8.1817 2.9999 15.2725-1.9091 18.3633-4.5454l1.1818-1.1818.4546-.3636-.3637-.5455c-.2727-.2727-.4545-.6363-.7272-1l-.5455-.7272-.6363.6363c-.0909.0909-.2727.2727-.3637.3637-3.8181 3.6363-9.7271 7.3635-16.4542 4.8181-3.1818-1.1818-6.4544-1.3637-9.4544-.5455-1.90906.5455-3.72721 1.4545-5.54536 2.6363l-1.909065 1.5455c-.181815.1818-.272722.2727-.454537.4545l-.181799.1818v.2727c-.090907.6364-.090918 1.2727-.1818259 1.8182l-.0909131 2.2727 1.54544-1.6364c.18181-.1818.36364-.4545.63636-.6363z"/><path d="m26.0908 40.9007c-.2727-.0909-.4545-.1819-.7272-.2728-3.1818-1.1818-6.4545-1.3636-9.4545-.5454-.6363.1818-1.2726.3636-1.909.6364l-2.1818.9999-.5454.2728 1.8181.6363c.5455.1818 1.0909.3637 1.6364.5455l.2727.0909.2727-.0909c.2727-.0909.5455-.2728.8182-.2728.1818 0 .3636-.0909.5454-.1818 2.1818-.5454 4.5454-.5454 7.0908.2727.2727.091.4546.1819.7273.2728l.4545.1818.2727-.0909c.6364-.1818 1.3636-.3636 1.9091-.6364l2.5454-.909-2.6363-.6364c-.2727-.0909-.6364-.1818-.9091-.2727z"/><path d="m40 22.0829-1.3636 1.3636c-.1818.1818-.3636.3636-.5454.5454-3.7272 3.5454-9.7271 7.3635-16.4543 4.8181-3.1818-1.1818-6.4544-1.3636-9.4544-.5454-2.81811.8182-5.36354 2.2727-7.63623 4.4545l-1.18179 1.2727-.36362.4545.36362.5454c.27273.3637.45455.6364.63637 1l.54542.8182.63636-.8182c.09091-.0909.27272-.2727.36363-.3636 2.18178-2.3636 4.54534-3.8181 7.27264-4.5454 2.4545-.6364 5.0908-.5454 7.7271.4545 2.2727.8182 4.6363 1.0909 6.9999.8182 4.1817-.4545 8.3635-2.8181 11.4543-5.4544.1819-.1818.3636-.2727.5455-.4546l.2727-.2727v-.2727c0-.5455.0909-1.1818.0909-1.7273z"/><path d="m5.45373 13.7196c.54545-.2728 1.18182-.4546 1.72726-.6364 2.45451-.6364 5.09081-.5455 7.72711.4545 1.7273.6364 3.4545.9091 5.3636.9091 3.8181 0 7.6362-1.3636 11.1816-3.9999l1.8181-1.45455-.8181-.63636c-.2727-.27273-.6364-.54544-1-.72725l-.5455-.36363-.4545.36363c-.1818.09091-.2727.27272-.4545.36362-4.8181 3.63634-9.6362 4.63634-14.1816 2.90904-3.2727-1.18178-6.54535-1.45451-9.81802-.4545-.27272.0909-.54544.1818-.90907.2727l-.1818.0909-.27274.2727c0 .0909-.09089.0909-.1818.1818-.36363.5455-.81818 1-1.18181 1.5455l-1.72724 2.6363 2.81814-1.4545c.45453 0 .81815-.1818 1.09087-.2727z"/><path d="m12.9089 7.53769.2727.09091c1.1818.45454 3 .90907 5.2726.90907 2.3636 0 4.6363-.54545 6.909-1.45452l2.8181-1.36361-1.909-.63634c-.5454-.18182-1.0909-.36363-1.7273-.45454h-.2727l-.2727.09089c-.2727.0909-.5455.27274-.8182.36365-2.7272.99998-5.4544 1.1818-8.0907.45454-.2728-.09091-.5455-.18183-.8182-.27274l-.2727-.09091-.2728.09091c-.5454.18181-1.0908.36364-1.6363.63636l-2.09087.90908 2.18177.63633c.1818-.0909.4546.00001.7273.09092z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m23.4538 34.7189c-3.1818-1.1818-6.4544-1.3636-9.4544-.5455-2.0909.5455-4.09082 1.6364-5.90897 3l-1.27273 1.0909-.36362.3636.81816.7273c.09091 0 .09092.0909.18183.1818.18181.1818.36364.2727.63636.4545l.54542.3636.54545-.4545c.09091-.0909.27273-.2727.45454-.3636 1.63636-1.3636 3.45446-2.2727 5.36356-2.7272 2.4545-.6364 5.0908-.5455 7.7271.4545 2.1818.8182 6.6363 1.8181 11.9998-.4545l.1818-.091.2728-.2727c0-.0909.0909-.0909.1818-.1818.4545-.5454.9091-1.0909 1.2727-1.7272l1.8181-2.8182-2.909 1.6363c-4.2727 2.3636-8.1817 2.8182-12.0907 1.3637z"/><path d="m10.9998 24.9011c2.4545-.6363 5.0908-.5454 7.7272.4546 2.909 1.0909 10.3634 2.6363 18.7269-4.909l1.8182-1.8182-.1819-.4545c-.0909-.3636-.2727-.8182-.4545-1.2727l-.4545-1.2727-.9091.909c-.0909.1819-.2727.2728-.4546.4546-3.9999 4.0908-10.1816 8.2726-17.2724 5.7272-3.1817-1.1818-6.4544-1.3637-9.4544-.5455-2.909.8182-5.45442 2.3636-7.81801 4.5454v-.0909l-1.363614 1.4545c0 .0909-.090891.0909-.181798.1818l-.27274.2727.090913.3637c.090908.4545.272717.909.363625 1.3636l.545454 1.4545.90907-1.1818c.09091-.1818.27272-.2727.36363-.4545 1.90905-1.7273 4.54538-4.1818 8.27257-5.1818z"/><path d="m2.1818 23.2646c2.09088-2.1818 4.45445-3.5454 6.99987-4.2727 2.45453-.6363 5.09083-.5454 7.72713.4546 8.1817 2.9999 15.2725-1.9091 18.3633-4.5454l1.1818-1.1818.4546-.3636-.3637-.5455c-.2727-.2727-.4545-.6363-.7272-1l-.5455-.7272-.6363.6363c-.0909.0909-.2727.2727-.3637.3637-3.8181 3.6363-9.7271 7.3635-16.4542 4.8181-3.1818-1.1818-6.4544-1.3637-9.4544-.5455-1.90906.5455-3.72721 1.4545-5.54536 2.6363l-1.909065 1.5455c-.181815.1818-.272722.2727-.454537.4545l-.181799.1818v.2727c-.090907.6364-.090918 1.2727-.1818259 1.8182l-.0909131 2.2727 1.54544-1.6364c.18181-.1818.36364-.4545.63636-.6363z"/><path d="m26.0908 40.9007c-.2727-.0909-.4545-.1819-.7272-.2728-3.1818-1.1818-6.4545-1.3636-9.4545-.5454-.6363.1818-1.2726.3636-1.909.6364l-2.1818.9999-.5454.2728 1.8181.6363c.5455.1818 1.0909.3637 1.6364.5455l.2727.0909.2727-.0909c.2727-.0909.5455-.2728.8182-.2728.1818 0 .3636-.0909.5454-.1818 2.1818-.5454 4.5454-.5454 7.0908.2727.2727.091.4546.1819.7273.2728l.4545.1818.2727-.0909c.6364-.1818 1.3636-.3636 1.9091-.6364l2.5454-.909-2.6363-.6364c-.2727-.0909-.6364-.1818-.9091-.2727z"/><path d="m40 22.0829-1.3636 1.3636c-.1818.1818-.3636.3636-.5454.5454-3.7272 3.5454-9.7271 7.3635-16.4543 4.8181-3.1818-1.1818-6.4544-1.3636-9.4544-.5454-2.81811.8182-5.36354 2.2727-7.63623 4.4545l-1.18179 1.2727-.36362.4545.36362.5454c.27273.3637.45455.6364.63637 1l.54542.8182.63636-.8182c.09091-.0909.27272-.2727.36363-.3636 2.18178-2.3636 4.54534-3.8181 7.27264-4.5454 2.4545-.6364 5.0908-.5454 7.7271.4545 2.2727.8182 4.6363 1.0909 6.9999.8182 4.1817-.4545 8.3635-2.8181 11.4543-5.4544.1819-.1818.3636-.2727.5455-.4546l.2727-.2727v-.2727c0-.5455.0909-1.1818.0909-1.7273z"/><path d="m5.45373 13.7196c.54545-.2728 1.18182-.4546 1.72726-.6364 2.45451-.6364 5.09081-.5455 7.72711.4545 1.7273.6364 3.4545.9091 5.3636.9091 3.8181 0 7.6362-1.3636 11.1816-3.9999l1.8181-1.45455-.8181-.63636c-.2728-.27273-.6364-.54544-1-.72725l-.5455-.36363-.4545.36363c-.1818.09091-.2727.27272-.4545.36362-4.8181 3.63634-9.6362 4.63634-14.1816 2.90904-3.2727-1.18178-6.54535-1.45451-9.81802-.4545-.27272.0909-.54544.1818-.90907.2727l-.1818.0909-.27274.2727c0 .0909-.09089.0909-.1818.1818-.36363.5455-.81818 1-1.18181 1.5455l-1.72724 2.6363 2.81814-1.4545c.45453 0 .81815-.1818 1.09087-.2727z"/><path d="m12.9089 7.53769.2727.09091c1.1818.45454 3 .90907 5.2726.90907 2.3636 0 4.6363-.54545 6.909-1.45452l2.8181-1.36361-1.909-.63634c-.5454-.18182-1.0909-.36363-1.7273-.45454h-.2727l-.2727.09089c-.2727.0909-.5455.27274-.8182.36365-2.7272.99998-5.4544 1.1818-8.0907.45454-.2728-.09091-.5455-.18183-.8182-.27274l-.2727-.09091-.2728.09091c-.5454.18181-1.0908.36364-1.6363.63636l-2.09087.90908 2.18177.63633c.1818-.0909.4546.00001.7273.09092z"/></g></svg>`
  },
  {
    id: "biosynthesis",
    name: "Biosynthesis",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m4.29111 28.6025c.90712.9019.9071 2.3641-.00003 3.266l-.04646.0462c-.90713.9019-2.37788.9018-3.284994-.0001-.9071177-.9019-.9071038-2.3641.000031-3.266l.046453-.0462c.90714-.9019 2.37788-.9018 3.285.0001z" fill="#a4bcfd"/><path d="m15.2112 29.298c.9055.9035.9028 2.3658-.006 3.266l-6.43424 6.3741c-.90876.9002-2.3795.8976-3.28499-.0059-.90548-.9035-.90282-2.3658.00594-3.266l6.43429-6.3741c.9088-.9002 2.3795-.8976 3.285.0059z" fill="#6172f3"/><path d="m23.9431 40.2706c.7116-1.0613 2.1538-1.348 3.2212-.6405l.1394.0923c1.0674.7075 1.3558 2.1414.6442 3.2026-.7116 1.0613-2.1538 1.3481-3.2212.6406l-.1394-.0924c-1.0674-.7075-1.3558-2.1414-.6442-3.2026z" fill="#a4bcfd"/><path d="m39.2728 28.4638c.9072.9019.9072 2.3641 0 3.266l-3.159 3.1408c-.9072.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l3.1591-3.1408c.9071-.9019 2.3778-.9019 3.2849 0z" fill="#6172f3"/><g fill="#444ce7"><path d="m39.3197 16.8473c.9071.9019.9071 2.3642 0 3.266l-23.3446 23.2098c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l23.3446-23.2098c.9071-.9019 2.3778-.9019 3.285 0z"/><path d="m34.905 9.71133c.9072.90187.9072 2.36417 0 3.26607l-13.426 13.3485c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3642 0-3.2661l13.4261-13.34847c.9071-.90189 2.3778-.90189 3.2849 0z"/><path d="m27.8187 5.18362c.9077.90128.9087 2.36353.0022 3.26603l-17.2588 17.18215c-.90647.9025-2.37721.9035-3.28495.0022-.90773-.9013-.90872-2.3635-.00221-3.266l17.25876-17.18218c.9065-.9025 2.3772-.90348 3.285-.0022z"/></g><path d="m10.7276 10.6841c.9056.9035.9031 2.3657-.0056 3.266l-6.75949 6.6974c-.90869.9003-2.37943.8978-3.28499-.0056-.905563-.9035-.903032-2.3657.005654-3.2661l6.759476-6.6973c.90868-.90034 2.37942-.89783 3.28495.0056z" fill="#6172f3"/><path d="m14.8678 4.00024c1.2828 0 2.3228 1.03397 2.3228 2.30944v.23094c0 1.27546-1.04 2.30943-2.3228 2.30943-1.2829 0-2.3229-1.03397-2.3229-2.30943v-.23094c0-1.27547 1.04-2.30944 2.3229-2.30944z" fill="#a4bcfd"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m4.29111 28.6025c.90712.9019.9071 2.3641-.00003 3.266l-.04646.0462c-.90713.9019-2.37788.9018-3.284994-.0001-.9071177-.9019-.9071038-2.3641.000031-3.266l.046453-.0462c.90714-.9019 2.37788-.9018 3.285.0001z" opacity=".5"/><path d="m15.2112 29.298c.9055.9035.9028 2.3658-.006 3.266l-6.43424 6.3741c-.90876.9002-2.3795.8976-3.28499-.0059-.90548-.9035-.90282-2.3658.00594-3.266l6.43429-6.3741c.9088-.9002 2.3795-.8976 3.285.0059z" opacity=".7"/><path d="m23.9431 40.2706c.7116-1.0613 2.1538-1.348 3.2212-.6405l.1394.0923c1.0674.7075 1.3558 2.1414.6442 3.2026-.7116 1.0613-2.1538 1.3481-3.2212.6406l-.1394-.0924c-1.0674-.7075-1.3558-2.1414-.6442-3.2026z" opacity=".5"/><path d="m39.2728 28.4638c.9072.9019.9072 2.3641 0 3.266l-3.159 3.1408c-.9072.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l3.1591-3.1408c.9071-.9019 2.3778-.9019 3.2849 0z" opacity=".7"/><path d="m39.3197 16.8473c.9071.9019.9071 2.3642 0 3.266l-23.3446 23.2098c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l23.3446-23.2098c.9071-.9019 2.3778-.9019 3.285 0z"/><path d="m34.905 9.71133c.9072.90187.9072 2.36417 0 3.26607l-13.426 13.3485c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3642 0-3.2661l13.4261-13.34847c.9071-.90189 2.3778-.90189 3.2849 0z"/><path d="m27.8187 5.18362c.9077.90128.9087 2.36353.0022 3.26603l-17.2588 17.18215c-.90647.9025-2.37721.9035-3.28495.0022-.90773-.9013-.90872-2.3635-.00221-3.266l17.25876-17.18218c.9065-.9025 2.3772-.90348 3.285-.0022z"/><path d="m10.7276 10.6841c.9056.9035.9031 2.3657-.0056 3.266l-6.75949 6.6974c-.90869.9003-2.37943.8978-3.28499-.0056-.905563-.9035-.903032-2.3657.005654-3.2661l6.759476-6.6973c.90868-.90034 2.37942-.89783 3.28495.0056z" opacity=".7"/><path d="m14.8678 4.00024c1.2828 0 2.3228 1.03397 2.3228 2.30944v.23094c0 1.27546-1.04 2.30943-2.3228 2.30943-1.2829 0-2.3229-1.03397-2.3229-2.30943v-.23094c0-1.27547 1.04-2.30944 2.3229-2.30944z" opacity=".5"/></g></svg>`
  },
  {
    id: "boltshift",
    name: "Boltshift",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "buildingblocks",
    name: "BuildingBlocks",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 37 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.8841 4.30945-6.8842 3.97574 6.8891 3.97661 6.8862-3.97575zm8.8919 7.44025-6.887 3.9762-.0007 7.9532 6.8877-3.9771zm2 11.4164-6.8879 3.9772 6.8889 3.9765 6.8871-3.9763zm8.8879 7.4416-6.8868 3.9761v7.9522l6.8868-3.9761zm-10.8868 11.9287v-7.9525l-6.8891-3.9766v7.9525zm-10.8888-18.8569-6.8883-3.9775v-7.9526l6.889 3.9765zm-.0003 4.6187-9.38814-5.4209c-.928127-.5359-1.49986-1.5262-1.49986-2.598v-11.99368c0-.71444.381106-1.37463.999789-1.73193l10.383811-5.996798c.9281-.5359626 2.0716-.5361538 2.9998-.000505l10.3922 5.996973c.619.3572 1.0004 1.01758 1.0004 1.73226v11.41638l9.888 5.7096c.6188.3573.9999 1.0175.9999 1.732v11.9937c0 1.0718-.5718 2.0621-1.5 2.598l-10.3868 5.9969c-.6187.3572-1.381.3572-1.9998.0001l-10.3891-5.9969c-.9283-.5358-1.5002-1.5263-1.5002-2.5982z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 37 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.8841 4.30945-6.8842 3.97574 6.8891 3.97661 6.8862-3.97575zm8.8919 7.44025-6.887 3.9762-.0007 7.9532 6.8877-3.9771zm2 11.4164-6.8879 3.9772 6.8889 3.9765 6.8871-3.9763zm8.8879 7.4416-6.8868 3.9761v7.9522l6.8868-3.9761zm-10.8868 11.9287v-7.9525l-6.8891-3.9766v7.9525zm-10.8888-18.8569-6.8883-3.9775v-7.9526l6.889 3.9765zm-.0003 4.6187-9.38814-5.4209c-.928127-.5359-1.49986-1.5262-1.49986-2.598v-11.99368c0-.71444.381106-1.37463.999789-1.73193l10.383811-5.996798c.9281-.5359626 2.0716-.5361538 2.9998-.000505l10.3922 5.996973c.619.3572 1.0004 1.01758 1.0004 1.73226v11.41638l9.888 5.7096c.6188.3573.9999 1.0175.9999 1.732v11.9937c0 1.0718-.5718 2.0621-1.5 2.598l-10.3868 5.9969c-.6187.3572-1.381.3572-1.9998.0001l-10.3891-5.9969c-.9283-.5358-1.5002-1.5263-1.5002-2.5982z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "calescence",
    name: "Calescence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#1570ef" fill-rule="evenodd"><path d="m35.3721 14v8.0492h-9.9698v-2.2927z"/><path d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z" opacity=".9"/><path d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z" opacity=".8"/><path d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z" opacity=".7"/><path d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z" opacity=".6"/><path d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z" opacity=".5"/><path d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z" opacity=".4"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m35.3721 14v8.0492h-9.9698v-2.2927z"/><path d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z" opacity=".9"/><path d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z" opacity=".8"/><path d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z" opacity=".7"/><path d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z" opacity=".6"/><path d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z" opacity=".5"/><path d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z" opacity=".4"/></g></svg>`
  },
  {
    id: "capsule",
    name: "Capsule",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="18" fill="#1570ef" r="14"/><circle cx="26" cy="30" fill="#53b1fd" r="14"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><circle cx="14" cy="18" opacity=".7" r="14"/><circle cx="26" cy="30" opacity=".7" r="14"/></g></svg>`
  },
  {
    id: "constellation",
    name: "Constellation",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m16 8 5.0912 10.9088 10.9088 5.0912-10.9088 5.0912-5.0912 10.9088-5.0912-10.9088-10.9088-5.0912 10.9088-5.0912z"/><path d="m20.0469 31.3286 6.3539-1.0932 3.6 9.7646 3.6-9.7646 10.2565 1.7646-6.6564-8 6.6564-8-10.2565 1.7646-3.6-9.7646-3.6 9.7646-6.3539-1.0932 1.0442 2.2374 10.9088 5.0912-10.9088 5.0912z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m16 8 5.0912 10.9088 10.9088 5.0912-10.9088 5.0912-5.0912 10.9088-5.0912-10.9088-10.9088-5.0912 10.9088-5.0912z"/><path d="m20.0469 31.3286 6.3539-1.0932 3.6 9.7646 3.6-9.7646 10.2565 1.7646-6.6564-8 6.6564-8-10.2565 1.7646-3.6-9.7646-3.6 9.7646-6.3539-1.0932 1.0442 2.2374 10.9088 5.0912-10.9088 5.0912z" opacity=".5"/></g></svg>`
  },
  {
    id: "codecraft",
    name: "Codecraft",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 9c0-2.76142 2.23858-5 5-5h10c2.7614 0 5 2.23858 5 5v9.8192c.0002.06.0003.1203.0003.1808 0 2.7575 2.2322 4.9936 4.9881 5h.0116 10c2.7614 0 5 2.2386 5 5v10c0 2.7614-2.2386 5-5 5h-10c-2.7614 0-5-2.2386-5-5v-10c0-.0139.0001-.0277.0002-.0416-.0224-2.7422-2.2523-4.9584-4.9999-4.9584-.0129 0-.0258 0-.0387 0h-9.9616c-2.76142 0-5-2.2386-5-5z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 9c0-2.76142 2.23858-5 5-5h10c2.7614 0 5 2.23858 5 5v9.8192c.0002.06.0003.1203.0003.1808 0 2.7575 2.2322 4.9936 4.9881 5h.0116 10c2.7614 0 5 2.2386 5 5v10c0 2.7614-2.2386 5-5 5h-10c-2.7614 0-5-2.2386-5-5v-10c0-.0139.0001-.0277.0002-.0416-.0224-2.7422-2.2523-4.9584-4.9999-4.9584-.0129 0-.0258 0-.0387 0h-9.9616c-2.76142 0-5-2.2386-5-5z" fill="#155eef"/></svg>`
  },
  {
    id: "command-r",
    name: "Command+R",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m18.6667 30.6667c7.3638 0 13.3333-5.9696 13.3333-13.3334 0-7.36376-5.9695-13.3333-13.3333-13.3333h-18.6667v26.6667z" fill="#155eef"/><path d="m0 4 32 40h-21.3333l-10.6667-13.3333z" fill="#2e90fa"/><path d="m21.1488 30.436c-.8042.1515-1.6339.2307-2.4821.2307h-18.6667v-26.6667z" fill="#53b1fd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m18.6667 30.6667c7.3638 0 13.3333-5.9696 13.3333-13.3334 0-7.36376-5.9695-13.3333-13.3333-13.3333h-18.6667v26.6667z" opacity=".7"/><path d="m0 4 32 40h-21.3333l-10.6667-13.3333z" opacity=".7"/><path d="m21.1488 30.436c-.8042.1515-1.6339.2307-2.4821.2307h-18.6667v-26.6667z" opacity=".7"/></g></svg>`
  },
  {
    id: "contrast-ai",
    name: "ContrastAI",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 4c11.0457 0 20 8.9543 20 20s-8.9543 20-20 20-20-8.9543-20-20 8.9543-20 20-20zm15 20c0 8.2843-6.7157 15-15 15v-30c8.2843 0 15 6.7157 15 15z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 4c11.0457 0 20 8.9543 20 20s-8.9543 20-20 20-20-8.9543-20-20 8.9543-20 20-20zm15 20c0 8.2843-6.7157 15-15 15v-30c8.2843 0 15 6.7157 15 15z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "convergence",
    name: "Convergence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m22.1017 20.8596 9.8995-9.8994-2.1213-2.12137-7.3389 7.33887v-13.1777h-3v13.1777l-7.3388-7.33887-2.1213 2.12137 9.8995 9.8994 1.0606 1.0607zm2.1207 2.1214 9.8995-9.8995 2.1213 2.1213-7.3388 7.3388h13.0956v3h-13.0956l7.3388 7.3389-2.1213 2.1213-9.8995-9.8995-1.0607-1.0607zm-16.26224 12.0208 9.89944-9.8995 1.0607-1.0607-1.0607-1.0606-9.89944-9.8995-2.12133 2.1213 7.33887 7.3388h-13.17574688v3h13.17574688l-7.33887 7.3389zm12.02024-7.7782-9.8995 9.8995 2.1213 2.1213 7.3388-7.3388v13.0944h3v-13.0944l7.3389 7.3388 2.1213-2.1213-9.8995-9.8995-1.0607-1.0607z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m22.1017 20.8596 9.8995-9.8994-2.1213-2.12137-7.3389 7.33887v-13.1777h-3v13.1777l-7.3388-7.33887-2.1213 2.12137 9.8995 9.8994 1.0606 1.0607zm2.1207 2.1214 9.8995-9.8995 2.1213 2.1213-7.3388 7.3388h13.0956v3h-13.0956l7.3388 7.3389-2.1213 2.1213-9.8995-9.8995-1.0607-1.0607zm-16.26224 12.0208 9.89944-9.8995 1.0607-1.0607-1.0607-1.0606-9.89944-9.8995-2.12133 2.1213 7.33887 7.3388h-13.17574688v3h13.17574688l-7.33887 7.3389zm12.02024-7.7782-9.8995 9.8995 2.1213 2.1213 7.3388-7.3388v13.0944h3v-13.0944l7.3389 7.3388 2.1213-2.1213-9.8995-9.8995-1.0607-1.0607z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "core-os",
    name: "CoreOS",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m15.2286 4.99951c-3.2154 0-6.18655 1.71539-7.79425 4.5l-5.7735 9.99999c-1.6076941 2.7846-1.607697 6.2154 0 9l5.7735 10c1.6077 2.7846 4.57885 4.5 7.79425 4.5h11.547c3.2154 0 6.1865-1.7154 7.7942-4.5l5.7735-10c1.6077-2.7846 1.6077-6.2154 0-9l-5.7735-9.99999c-1.6077-2.78461-4.5788-4.5-7.7942-4.5zm11.547 5.99999h-7.2169c-1.1547 0-1.8762 1.2499-1.298 2.2494 1.784 3.0838 3.5722 6.1653 5.3536 9.2506.5359.9282.5359 2.0718 0 3-1.7814 3.0854-3.5696 6.1668-5.3536 9.2506-.5782.9995.1433 2.2494 1.298 2.2494h7.2169c1.0718 0 2.0622-.5718 2.5981-1.5l5.7735-10c.5359-.9282.5359-2.0718 0-3l-5.7735-10c-.5359-.9282-1.5263-1.5-2.5981-1.5z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m15.2286 4.99951c-3.2154 0-6.18655 1.71539-7.79425 4.5l-5.7735 9.99999c-1.6076941 2.7846-1.607697 6.2154 0 9l5.7735 10c1.6077 2.7846 4.57885 4.5 7.79425 4.5h11.547c3.2154 0 6.1865-1.7154 7.7942-4.5l5.7735-10c1.6077-2.7846 1.6077-6.2154 0-9l-5.7735-9.99999c-1.6077-2.78461-4.5788-4.5-7.7942-4.5zm11.547 5.99999h-7.2169c-1.1547 0-1.8762 1.2499-1.298 2.2494 1.784 3.0838 3.5722 6.1653 5.3536 9.2506.5359.9282.5359 2.0718 0 3-1.7814 3.0854-3.5696 6.1668-5.3536 9.2506-.5782.9995.1433 2.2494 1.298 2.2494h7.2169c1.0718 0 2.0622-.5718 2.5981-1.5l5.7735-10c.5359-.9282.5359-2.0718 0-3l-5.7735-10c-.5359-.9282-1.5263-1.5-2.5981-1.5z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "cubekit",
    name: "Cubekit",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 14.5264v18.9473l17.8947-12.2437v-18.94741z" fill="#155eef" opacity=".5"/><path d="m0 33.4737v-18.9474l17.8947 12.2438v18.9474z" fill="#1570ef" opacity=".5"/><path d="m40 14.5263v18.9474l-17.8947-12.2438v-18.94737z" fill="#155eef" opacity=".5"/><path d="m40 33.4737v-18.9474l-17.8947 12.2438v18.9474z" fill="#1570ef" opacity=".5"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m0 14.5264v18.9473l17.8947-12.2437v-18.94741z" opacity=".5"/><path d="m0 33.4737v-18.9474l17.8947 12.2438v18.9474z" opacity=".5"/><path d="m40 14.5263v18.9474l-17.8947-12.2438v-18.94737z" opacity=".5"/><path d="m40 33.4737v-18.9474l-17.8947 12.2438v18.9474z" opacity=".5"/></g></svg>`
  },
  {
    id: "europa",
    name: "Europa",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m28.6446 39.168c-.6032 1.3404-1.353 2.6531-2.2519 3.7888 7.4581-2.5137 12.9483-9.3054 13.5527-17.4568h-2.6549c-3.2399 0-5.8424 2.5861-6.369 5.7829-.4855 2.9468-1.2621 5.6301-2.2769 7.8851z"/><path d="m22.7724 25.5c3.3921 0 6.167 2.8299 5.5439 6.1643-1.3533 7.2424-4.5667 12.3357-8.3155 12.3357-4.7435 0-8.6299-8.1549-8.975-18.5z"/><path d="m30.9904 17.1502c.4961 3.2267 3.1106 5.8498 6.3752 5.8498h2.6107c-.4123-8.3729-5.9735-15.39183-13.5836-17.95683.8989 1.13575 1.6487 2.44843 2.2519 3.78878 1.0643 2.36505 1.8666 5.20115 2.3458 8.31825z"/><path d="m28.4165 16.8957c.5674 3.3176-2.1954 6.1043-5.5612 6.1043h-11.8434c.2344-10.5811 4.1693-19 8.9889-19 3.8447 0 7.1263 5.35721 8.4157 12.8957z"/><path d="m8.51131 23c.11359-5.4083 1.14536-10.3894 2.84579-14.16805.6031-1.34035 1.3529-2.65303 2.2519-3.78878-7.61011 2.565-13.171316 9.58393-13.5836094 17.95683z"/><path d="m.0562286 25.5c.6043994 8.1514 6.0946514 14.9431 13.5527714 17.4568-.899-1.1357-1.6488-2.4484-2.2519-3.7888-1.6479-3.6619-2.66781-8.4531-2.83264-13.668z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m28.6446 39.168c-.6032 1.3404-1.353 2.6531-2.2519 3.7888 7.4581-2.5137 12.9483-9.3054 13.5527-17.4568h-2.6549c-3.2399 0-5.8424 2.5861-6.369 5.7829-.4855 2.9468-1.2621 5.6301-2.2769 7.8851z"/><path d="m22.7724 25.5c3.3921 0 6.167 2.8299 5.5439 6.1643-1.3533 7.2424-4.5667 12.3357-8.3155 12.3357-4.7435 0-8.6299-8.1549-8.975-18.5z"/><path d="m30.9904 17.1502c.4961 3.2267 3.1106 5.8498 6.3752 5.8498h2.6107c-.4123-8.3729-5.9735-15.39183-13.5836-17.95683.8989 1.13575 1.6487 2.44843 2.2519 3.78878 1.0643 2.36505 1.8666 5.20115 2.3458 8.31825z"/><path d="m28.4165 16.8957c.5674 3.3176-2.1954 6.1043-5.5612 6.1043h-11.8434c.2344-10.5811 4.1693-19 8.9889-19 3.8447 0 7.1263 5.35721 8.4157 12.8957z"/><path d="m8.51131 23c.11359-5.4083 1.14536-10.3894 2.84579-14.16805.6031-1.34035 1.3529-2.65303 2.2519-3.78878-7.61011 2.565-13.171316 9.58393-13.5836094 17.95683z"/><path d="m.0562286 25.5c.6043994 8.1514 6.0946514 14.9431 13.5527714 17.4568-.899-1.1357-1.6488-2.4484-2.2519-3.7888-1.6479-3.6619-2.66781-8.4531-2.83264-13.668z"/></g></svg>`
  },
  {
    id: "feather-dev",
    name: "FeatherDev",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m36.3068 11.4224c-.4322-.4323-.8644-.8645-1.2967-1.2967-1.2966-1.38311-2.6797-2.76621-4.4086-3.63065-1.9882-1.03733-4.1493-.778-6.3104-.778-3.2849 0-11.4971 0-16.33798 0l3.28488 4.40865h19.6228c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.5186.0864.6051 0z" fill="#53b1fd"/><path d="m39.9368 18.511c-.4322-.4322-.8645-.8645-1.2967-1.2967-1.2967-1.3831-2.6797-2.7662-4.4086-3.6306-1.9882-1.0374-4.1494-.778-6.3105-.778-2.8526 0-9.6817 0-14.5226 0l3.2849 4.4086h17.8939c1.8154 0 3.3714.3458 4.8409 1.2967.1729.0864.3458.0864.5187 0z" fill="#2e90fa"/><path d="m44 25.4263c-.4322-.4323-.8645-.8645-1.2967-1.2967-1.2966-1.3831-2.6797-2.7662-4.4086-3.6307-1.9882-1.0373-4.1493-.7779-6.3104-.7779-2.6798 0-8.558 0-13.3124 0l3.2848 4.4086h16.5973c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.4322.1729.6051 0z" fill="#1570ef"/><path d="m7.60742 37.0961c.43222.4322.86444.8644 1.29666 1.2966 1.29662 1.3831 2.67972 2.7662 4.40862 3.6307 1.9882 1.0373 4.1493.778 6.3104.778h16.338l-3.2849-4.4087c-5.9646 0-15.3006 0-19.6228 0-1.8153 0-3.37132-.3457-4.84087-1.2966-.25933-.0865-.43222-.0865-.60511 0z" fill="#53b1fd"/><path d="m3.97656 30.0079c.43222.4323.86444.8645 1.29666 1.2967 1.29667 1.3831 2.67976 2.7662 4.40864 3.6307 1.98824 1.0373 4.14934.778 6.31044.778h14.5226l-3.2849-4.4087c-5.8782 0-13.9175 0-17.89391 0-1.81532 0-3.37132-.3458-4.84087-1.2967-.17289-.0864-.34577-.0864-.51866 0z" fill="#2e90fa"/><path d="m0 23.0058c.43222.4322.864441.8644 1.29666 1.2966 1.29666 1.3831 2.67977 2.7662 4.40866 3.6307 1.98821 1.0373 4.1493.778 6.31038.778h13.3124l-3.2849-4.4087c-5.7053 0-12.96657 0-16.59722 0-1.81533 0-3.37132-.3458-4.840874-1.2966-.259332-.0865-.432218-.0865-.605106 0z" fill="#1570ef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m36.3068 11.4224c-.4322-.4323-.8644-.8645-1.2967-1.2967-1.2966-1.38311-2.6797-2.76621-4.4086-3.63065-1.9882-1.03733-4.1493-.778-6.3104-.778-3.2849 0-11.4971 0-16.33798 0l3.28488 4.40865h19.6228c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.5186.0864.6051 0z" opacity=".5"/><path d="m39.9368 18.511c-.4322-.4322-.8645-.8645-1.2967-1.2967-1.2967-1.3831-2.6797-2.7662-4.4086-3.6306-1.9882-1.0374-4.1494-.778-6.3105-.778-2.8526 0-9.6817 0-14.5226 0l3.2849 4.4086h17.8939c1.8154 0 3.3714.3458 4.8409 1.2967.1729.0864.3458.0864.5187 0z" opacity=".7"/><path d="m44 25.4263c-.4322-.4323-.8645-.8645-1.2967-1.2967-1.2966-1.3831-2.6797-2.7662-4.4086-3.6307-1.9882-1.0373-4.1493-.7779-6.3104-.7779-2.6798 0-8.558 0-13.3124 0l3.2848 4.4086h16.5973c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.4322.1729.6051 0z"/><path d="m7.60742 37.0961c.43222.4322.86444.8644 1.29666 1.2966 1.29662 1.3832 2.67972 2.7662 4.40862 3.6307 1.9882 1.0373 4.1493.778 6.3104.778h16.338l-3.2849-4.4087c-5.9646 0-15.3006 0-19.6228 0-1.8153 0-3.37132-.3457-4.84087-1.2966-.25933-.0865-.43222-.0865-.60511 0z" opacity=".5"/><path d="m3.97656 30.0079c.43222.4323.86444.8645 1.29666 1.2967 1.29667 1.3831 2.67976 2.7662 4.40864 3.6307 1.98824 1.0373 4.14934.778 6.31044.778h14.5226l-3.2849-4.4087c-5.8782 0-13.9175 0-17.89391 0-1.81532 0-3.37132-.3458-4.84087-1.2967-.17289-.0864-.34577-.0864-.51866 0z" opacity=".7"/><path d="m0 23.0058c.43222.4322.864441.8644 1.29666 1.2966 1.29666 1.3831 2.67977 2.7662 4.40866 3.6307 1.98821 1.0373 4.1493.778 6.31038.778h13.3124l-3.2849-4.4087c-5.7053 0-12.96657 0-16.59722 0-1.81533 0-3.37132-.3458-4.840874-1.2966-.259332-.0865-.432218-.0865-.605106 0z"/></g></svg>`
  },
  {
    id: "flora-fauna",
    name: "Flora&Fauna",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m13.7146 4c-2.2564 0-4.4203.89634-6.01579 2.49183l-7.69881 7.69877v3.524c0 2.4897 1.06944 4.7296 2.77401 6.2854-1.70457 1.5558-2.77401 3.7957-2.77401 6.2854v3.524l7.69881 7.6988c1.59549 1.5955 3.75939 2.4918 6.01579 2.4918 2.4897 0 4.7296-1.0694 6.2854-2.774 1.5558 1.7046 3.7957 2.774 6.2854 2.774 2.2564 0 4.4203-.8963 6.0158-2.4918l7.6988-7.6988v-3.524c0-2.4897-1.0694-4.7296-2.774-6.2854 1.7046-1.5558 2.774-3.7957 2.774-6.2854v-3.524l-7.6988-7.69877c-1.5955-1.59549-3.7594-2.49183-6.0158-2.49183-2.4897 0-4.7296 1.06944-6.2854 2.77401-1.5558-1.70457-3.7957-2.77401-6.2854-2.77401zm12.0442 20c-.0959-.0875-.19-.1774-.2822-.2696l-5.4766-5.4766-5.4766 5.4766c-.0922.0922-.1863.1821-.2822.2696.0959.0875.19.1774.2822.2696l5.4766 5.4766 5.4766-5.4766c.0922-.0922.1863-.1821.2822-.2696zm-3.5366 9.8094v1.683c0 2.244 1.8192 4.0632 4.0632 4.0632 1.0776 0 2.1111-.4281 2.8731-1.1901l6.3971-6.3971v-1.683c0-2.244-1.8192-4.0632-4.0632-4.0632-1.0776 0-2.1111.4281-2.8731 1.1901zm-4.4444 0-6.3971-6.3971c-.762-.762-1.79546-1.1901-2.87308-1.1901-2.24403 0-4.06318 1.8192-4.06318 4.0632v1.683l6.39706 6.3971c.762.762 1.7955 1.1901 2.8731 1.1901 2.244 0 4.0632-1.8192 4.0632-4.0632zm0-21.3018v1.683l-6.3971 6.3971c-.762.762-1.79546 1.1901-2.87308 1.1901-2.24403 0-4.06318-1.8192-4.06318-4.0632v-1.683l6.39706-6.39708c.762-.76199 1.7955-1.19007 2.8731-1.19007 2.244 0 4.0632 1.81915 4.0632 4.06315zm10.8415 8.0801-6.3971-6.3971v-1.683c0-2.244 1.8192-4.06315 4.0632-4.06315 1.0776 0 2.1111.42808 2.8731 1.19007l6.3971 6.39708v1.683c0 2.244-1.8192 4.0632-4.0632 4.0632-1.0776 0-2.1111-.4281-2.8731-1.1901z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m13.7146 4c-2.2564 0-4.4203.89634-6.01579 2.49183l-7.69881 7.69877v3.524c0 2.4897 1.06944 4.7296 2.77401 6.2854-1.70457 1.5558-2.77401 3.7957-2.77401 6.2854v3.524l7.69881 7.6988c1.59549 1.5955 3.75939 2.4918 6.01579 2.4918 2.4897 0 4.7296-1.0694 6.2854-2.774 1.5558 1.7046 3.7957 2.774 6.2854 2.774 2.2564 0 4.4203-.8963 6.0158-2.4918l7.6988-7.6988v-3.524c0-2.4897-1.0694-4.7296-2.774-6.2854 1.7046-1.5558 2.774-3.7957 2.774-6.2854v-3.524l-7.6988-7.69877c-1.5955-1.59549-3.7594-2.49183-6.0158-2.49183-2.4897 0-4.7296 1.06944-6.2854 2.77401-1.5558-1.70457-3.7957-2.77401-6.2854-2.77401zm12.0442 20c-.0959-.0875-.19-.1774-.2822-.2696l-5.4766-5.4766-5.4766 5.4766c-.0922.0922-.1863.1821-.2822.2696.0959.0875.19.1774.2822.2696l5.4766 5.4766 5.4766-5.4766c.0922-.0922.1863-.1821.2822-.2696zm-3.5366 9.8094v1.683c0 2.244 1.8192 4.0632 4.0632 4.0632 1.0776 0 2.1111-.4281 2.8731-1.1901l6.3971-6.3971v-1.683c0-2.244-1.8192-4.0632-4.0632-4.0632-1.0776 0-2.1111.4281-2.8731 1.1901zm-4.4444 0-6.3971-6.3971c-.762-.762-1.79546-1.1901-2.87308-1.1901-2.24403 0-4.06318 1.8192-4.06318 4.0632v1.683l6.39706 6.3971c.762.762 1.7955 1.1901 2.8731 1.1901 2.244 0 4.0632-1.8192 4.0632-4.0632zm0-21.3018v1.683l-6.3971 6.3971c-.762.762-1.79546 1.1901-2.87308 1.1901-2.24403 0-4.06318-1.8192-4.06318-4.0632v-1.683l6.39706-6.39708c.762-.76199 1.7955-1.19007 2.8731-1.19007 2.244 0 4.0632 1.81915 4.0632 4.06315zm10.8415 8.0801-6.3971-6.3971v-1.683c0-2.244 1.8192-4.06315 4.0632-4.06315 1.0776 0 2.1111.42808 2.8731 1.19007l6.3971 6.39708v1.683c0 2.244-1.8192 4.0632-4.0632 4.0632-1.0776 0-2.1111-.4281-2.8731-1.1901z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "focal-point",
    name: "FocalPoint",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m10.7788 6.1817 4.6901 17.5036v-19.24382c.3719-.08679.7478-.16322 1.1273-.22897v19.47459l5.2752-19.6871c.3801.03442.7572.07945 1.1309.13479l-5.3176 19.84571 10.5701-18.30794c.3443.15492.6835.31927 1.0172.49274l-10.6095 18.3763 15.1464-15.1465c.2731.25824.5389.52407.7971.7972l-15.1486 15.1487 18.3784-10.6108c.1734.3337.3377.6729.4926 1.0173l-18.3034 10.5675 19.8403-5.3162c.0553.3737.1003.7508.1347 1.1309l-19.6869 5.2751h19.4741c-.0658.3796-.1422.7554-.229 1.1273h-19.2481l17.507 4.691c-.1798.3443-.3693.6827-.5681 1.0149l-17.2257-4.6156 14.3874 8.3066c-.2723.2801-.5528.5522-.8411.8161l-14.1087-8.1457 10.6759 10.6758c-.3377.1973-.6817.385-1.0316.5628l-10.4426-10.4426 6.8421 11.8508c-.3746.1059-.7537.2012-1.1368.2855l-6.6825-11.5744 3.2219 12.0243c-.2872.0122-.5759.0184-.8661.0184-.0991 0-.198-.0007-.2967-.0022l-3.1483-11.7497v11.4569c-.3795-.0657-.7554-.1421-1.1273-.2289v-11.2261l-2.7759 10.36c-.3541-.1396-.7033-.289-1.0471-.4478l2.7337-10.2024-5.13175 8.8884c-.3177-.2034-.62928-.4156-.9344-.6361l5.09135-8.8186-7.1301 7.1302c-.2731-.2583-.53893-.5241-.79717-.7971l7.12787-7.1279-8.81599 5.0899c-.22059-.3051-.4328-.6167-.6363-.9344l8.89259-5.1341-10.20737 2.735c-.15888-.3438-.3083-.693-.44793-1.047l10.3599-2.776h-11.226124c-.086806-.3719-.163256-.7477-.22903-1.1273h11.452154l-11.74511583-3.1471c-.00145443-.0995-.00218417-.1991-.00218417-.2989 0-.2894.00613487-.5774.0182816-.8639l12.0258184 3.2224-11.57621-6.6836c.084291-.3832.179549-.7623.285427-1.1369l11.855683 6.8449-10.44698-10.447c.17774-.3499.36544-.6939.56273-1.0315l10.68025 10.6802-8.14896-14.1144c.26387-.2882.53605-.56863.81617-.84096l8.30809 14.38996-4.61634-17.22828c.33214-.1988.67064-.38826 1.01484-.56802z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m10.7788 6.1817 4.6901 17.5036v-19.24382c.3719-.08679.7478-.16322 1.1273-.22897v19.47459l5.2752-19.6871c.3801.03442.7572.07945 1.1309.13479l-5.3176 19.84571 10.5701-18.30794c.3443.15492.6835.31927 1.0172.49274l-10.6095 18.3763 15.1464-15.1465c.2731.25824.5389.52407.7971.7972l-15.1486 15.1487 18.3784-10.6108c.1734.3337.3377.6729.4926 1.0173l-18.3034 10.5675 19.8403-5.3162c.0553.3737.1003.7508.1347 1.1309l-19.6869 5.2751h19.4741c-.0658.3796-.1422.7554-.229 1.1273h-19.2481l17.507 4.691c-.1798.3443-.3693.6827-.5681 1.0149l-17.2257-4.6156 14.3874 8.3066c-.2723.2801-.5528.5522-.8411.8161l-14.1087-8.1457 10.6759 10.6758c-.3377.1973-.6817.385-1.0316.5628l-10.4426-10.4426 6.8421 11.8508c-.3746.1059-.7537.2012-1.1368.2855l-6.6825-11.5744 3.2219 12.0243c-.2872.0122-.5759.0184-.8661.0184-.0991 0-.198-.0007-.2967-.0022l-3.1483-11.7497v11.4569c-.3795-.0657-.7554-.1421-1.1273-.2289v-11.2261l-2.7759 10.36c-.3541-.1396-.7033-.289-1.0471-.4478l2.7337-10.2024-5.13174 8.8884c-.31771-.2034-.62929-.4156-.93441-.6361l5.09135-8.8186-7.1301 7.1302c-.2731-.2583-.53893-.5241-.79717-.7971l7.12787-7.1279-8.81599 5.0899c-.22059-.3051-.4328-.6167-.6363-.9344l8.89259-5.1341-10.20737 2.735c-.15888-.3438-.3083-.693-.44793-1.047l10.3599-2.776h-11.226124c-.086806-.3719-.163256-.7477-.22903-1.1273h11.452154l-11.74511583-3.1471c-.00145443-.0995-.00218417-.1991-.00218417-.2989 0-.2894.00613486-.5774.0182816-.8639l12.0258184 3.2224-11.57621-6.6836c.084291-.3832.179549-.7623.285427-1.1369l11.855683 6.8449-10.44698-10.447c.17774-.3499.36544-.6939.56273-1.0315l10.68025 10.6802-8.14896-14.1144c.26387-.2882.53605-.56863.81617-.84096l8.30809 14.38996-4.61634-17.22828c.33214-.1988.67064-.38826 1.01484-.56802z" fill="#fff"/></svg>`
  },
  {
    id: "foresight",
    name: "Foresight",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 31 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#444ce7"><path d="m-.00195312 17.8433 30.90545312-17.8433-.8189 12.6994-26.32058 15.1961z"/><path d="m3.76367 27.8951 21.73573-12.5492-.8189 12.6994-17.15086 9.902z" opacity=".5"/><path d="m7.52734 37.9477 12.56596-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 31 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m-.00195312 17.8433 30.90545312-17.8433-.8189 12.6994-26.32058 15.1961z"/><path d="m3.76367 27.8951 21.73573-12.5492-.8189 12.6994-17.15086 9.902z" opacity=".5"/><path d="m7.52734 37.9477 12.56596-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25"/></g></svg>`
  },
  {
    id: "galileo",
    name: "Galileo",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m29.5411 6.41772c2.6913 5.27688 4.209 11.25228 4.209 17.58218s-1.5177 12.3054-4.2091 17.5823c6.2304-3.3881 10.4593-9.9914 10.4593-17.5823s-4.2289-14.19404-10.4592-17.58218z" fill="#6172f3"/><path d="m20.5481 5.99826c-.9047-1.28153-2.4457-1.9717-3.9913-1.70349-9.40496 1.63214-16.5568 9.83343-16.5568 19.70503 0 9.8717 7.1518 18.0729 16.5567 19.7051 1.5456.2682 3.0867-.4219 3.9913-1.7035 3.5923-5.0889 5.7025-11.2988 5.7025-18.0016 0-6.7027-2.1101-12.9126-5.7024-18.00154z" fill="#444ce7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m29.5411 6.41772c2.6913 5.27688 4.209 11.25228 4.209 17.58218s-1.5177 12.3054-4.2091 17.5823c6.2304-3.3881 10.4593-9.9914 10.4593-17.5823s-4.2289-14.19404-10.4592-17.58218z" opacity=".7"/><path d="m20.5481 5.99826c-.9047-1.28153-2.4457-1.9717-3.9913-1.70349-9.40496 1.63214-16.5568 9.83343-16.5568 19.70503 0 9.8717 7.1518 18.0729 16.5567 19.7051 1.5456.2682 3.0867-.4219 3.9913-1.7035 3.5923-5.0889 5.7025-11.2988 5.7025-18.0016 0-6.7027-2.1101-12.9126-5.7024-18.00154z"/></g></svg>`
  },
  {
    id: "global-bank",
    name: "GlobalBank",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m27.6627 4h-15.3253l-12.3374 12.3373v15.3253l12.3374 12.3374h15.3253l12.3373-12.3374v-15.3253zm-13.2049 27.8554-7.90357-7.9036 7.90357-7.9036c2.988-2.988 7.9037-2.988 10.8916 0l7.9036 7.9036-7.9036 7.9036c-2.9879 2.988-7.8072 2.988-10.8916 0z" fill="#444ce7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m27.6627 4h-15.3253l-12.3374 12.3373v15.3253l12.3374 12.3374h15.3253l12.3373-12.3374v-15.3253zm-13.2049 27.8554-7.90357-7.9036 7.90357-7.9036c2.988-2.988 7.9037-2.988 10.8916 0l7.9036 7.9036-7.9036 7.9036c-2.9879 2.988-7.8072 2.988-10.8916 0z" fill="#fff"/></svg>`
  },
  {
    id: "hexsmith",
    name: "Hexsmith",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m9.72461 41.7983h18.49589c1.2717 0 2.4469-.6785 3.0827-1.7798l4.1102-7.1191h-20.5481z" opacity=".7"/><path d="m25.1445 15.1015h-20.55661l4.11021-7.11909c.63585-1.10133 1.811-1.77977 3.0827-1.77977h18.4959z" opacity=".4"/><path d="m39.5272 25.7801c.6358-1.1014.6358-2.4582 0-3.5596l-4.1102-7.1191-5.1378 8.8989h-20.55068l5.13718 8.8989h20.5481l.0016-.0027.0016.0027z" opacity=".4"/><path d="m14.8634 32.8992-5.13775-8.8988-5.13776 8.8988 5.13776 8.8989z"/><path d="m25.1445 15.1014h-20.55593l-4.108166 7.1192c-.635516 1.1013-.635318 2.458.000521 3.5591l4.111125 7.1195 5.13775-8.8989h20.55l.0013-.0021z" opacity=".7"/><path d="m35.4181 15.1015-5.1378-8.89886-5.1377 8.89886 5.1377 8.8989z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m9.72461 41.7983h18.49589c1.2717 0 2.4469-.6785 3.0827-1.7798l4.1102-7.1191h-20.5481z" opacity=".7"/><path d="m25.1445 15.1015h-20.55661l4.11021-7.11909c.63585-1.10133 1.811-1.77977 3.0827-1.77977h18.4959z" opacity=".4"/><path d="m39.5272 25.7801c.6358-1.1013.6358-2.4582 0-3.5596l-4.1102-7.1191-5.1378 8.8989h-20.55068l5.13718 8.8989h20.5481l.0016-.0027.0016.0027z" opacity=".4"/><path d="m14.8634 32.8992-5.13775-8.8988-5.13776 8.8988 5.13776 8.8989z"/><path d="m25.1445 15.1014h-20.55593l-4.108166 7.1192c-.635516 1.1013-.635318 2.458.000521 3.5591l4.111125 7.1195 5.13775-8.8989h20.55l.0013-.0022z" opacity=".7"/><path d="m35.4181 15.1015-5.1378-8.89886-5.1377 8.89886 5.1377 8.8989z"/></g></svg>`
  },
  {
    id: "hourglass",
    name: "Hourglass",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 30 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 41.2222c0 1.5341 1.24365 2.7778 2.77778 2.7778h24.44442c1.5341 0 2.7778-1.2437 2.7778-2.7778v-7.2222c0-8.2843-6.7157-15-15-15-8.28427 0-15 6.7157-15 15z" fill="#1570ef"/><path d="m0 6.77778c0-1.53413 1.24365-2.77778 2.77778-2.77778h24.44442c1.5341 0 2.7778 1.24365 2.7778 2.77778v7.22222c0 8.2843-6.7157 15-15 15-8.28427 0-15-6.7157-15-15z" fill="#53b1fd" opacity=".5"/></svg>`,
    darkSvg: `<svg width="100%" height="100%" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.7" d="M0 41.2222C0 42.7563 1.24365 44 2.77778 44H27.2222C28.7563 44 30 42.7563 30 41.2222V34C30 25.7157 23.2843 19 15 19C6.71573 19 0 25.7157 0 34V41.2222Z" fill="white"/><path opacity="0.7" d="M0 6.77778C0 5.24365 1.24365 4 2.77778 4H27.2222C28.7563 4 30 5.24365 30 6.77778V14C30 22.2843 23.2843 29 15 29C6.71573 29 0 22.2843 0 14V6.77778Z" fill="white"/></svg>`
  },
  {
    id: "kintsugi",
    name: "Kintsugi",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m20 4 4.2861 9.6525 9.856-3.79464-3.7946 9.85604 9.6525 4.2861-9.6525 4.2861 3.7946 9.856-9.856-3.7946-4.2861 9.6525-4.2861-9.6525-9.85604 3.7946 3.79469-9.856-9.65255-4.2861 9.65255-4.2861-3.79469-9.85604 9.85604 3.79464z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m20 4 4.2861 9.6525 9.856-3.79464-3.7946 9.85604 9.6525 4.2861-9.6525 4.2861 3.7946 9.856-9.856-3.7946-4.2861 9.6525-4.2861-9.6525-9.85604 3.7946 3.79469-9.856-9.65255-4.2861 9.65255-4.2861-3.79469-9.85604 9.85604 3.79464z" fill="#155eef"/></svg>`
  },
  {
    id: "layers",
    name: "Layers",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m5.03741 15.4637c.7506-2.8008 3.62961-5.67985 6.43049-6.43044l17.4617-4.67957c2.8009-.7506 4.4629.91146 3.7123 3.71231l-4.6795 17.4617c-.7506 2.8009-3.6297 5.6799-6.4305 6.4305l-17.46175 4.6796c-2.80085.7505-4.462904-.9115-3.712306-3.7124z" opacity=".7"/><path d="m12.0355 22.4642c.7506-2.8008 3.6296-5.6799 6.4304-6.4305l17.4617-4.6795c2.8009-.7506 4.4629.9114 3.7123 3.7123l-4.6795 17.4617c-.7506 2.8009-3.6296 5.6799-6.4305 6.4305l-17.4617 4.6795c-2.80085.7506-4.46291-.9114-3.71231-3.7123z" opacity=".7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m5.03741 15.4637c.7506-2.8008 3.62961-5.67985 6.43049-6.43044l17.4617-4.67957c2.8009-.7506 4.4629.91146 3.7123 3.71231l-4.6795 17.4617c-.7506 2.8009-3.6297 5.6799-6.4305 6.4305l-17.46175 4.6795c-2.80085.7506-4.462904-.9114-3.712306-3.7123z" opacity=".7"/><path d="m12.0355 22.4642c.7506-2.8008 3.6296-5.6799 6.4304-6.4305l17.4617-4.6795c2.8009-.7506 4.4629.9114 3.7123 3.7123l-4.6795 17.4617c-.7506 2.8009-3.6296 5.6799-6.4305 6.4305l-17.4617 4.6795c-2.80085.7506-4.46291-.9114-3.71231-3.7123z" opacity=".7"/></g></svg>`
  },
  {
    id: "lightspeed",
    name: "Lightspeed",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 24c0 6.6274 5.37258 12 12 12v-12c0 6.6274 5.3726 12 12 12v-12c0 6.6274 5.3726 12 12 12s12-5.3726 12-12-5.3726-12-12-12-12 5.3726-12 12v-12c-6.6274 0-12 5.3726-12 12v-12c-6.62742 0-12 5.3726-12 12z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 24c0 6.6274 5.37258 12 12 12v-12c0 6.6274 5.3726 12 12 12v-12c0 6.6274 5.3726 12 12 12s12-5.3726 12-12-5.3726-12-12-12-12 5.3726-12 12v-12c-6.6274 0-12 5.3726-12 12v-12c-6.62742 0-12 5.3726-12 12z" fill="#155eef"/></svg>`
  },
  {
    id: "luminescence",
    name: "Luminescence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m32.3008 36h-.1015c-.0261.0402-.0523.0804-.0787.1204-2.7604 1.8201-6.0668 2.8794-9.6206 2.8794-9.665 0-17.5-7.835-17.5-17.5 0-3.5538 1.05931-6.8602 2.87939-9.6206.04009-.0264.08029-.0527.12061-.0788v-.1017c-.04056.0599-.08077.1201-.12061.1805-4.7469 3.1299-7.87939 8.5094-7.87939 14.6206 0 9.665 7.83502 17.5 17.5 17.5 6.1112 0 11.4907-3.1325 14.6206-7.8794.0603-.0398.1204-.0799.1802-.1204z"/><g opacity=".5"><path d="m40.0003 21.5c0 6.1112-3.1325 11.4907-7.8794 14.6206 1.8201-2.7604 2.8794-6.0668 2.8794-9.6206 0-9.665-7.835-17.5-17.5-17.5-3.5538 0-6.8602 1.0593-9.6206 2.8794 3.1299-4.74691 8.5094-7.8794 14.6206-7.8794 9.665 0 17.5 7.835 17.5 17.5z"/><path d="m32.0003 36.1994c.0403-.0261.0805-.0524.1206-.0788-.0398.0604-.08.1206-.1206.1805z"/><path d="m7.80088 12c.02611-.0403.05238-.0805.07882-.1206-.06043.0398-.12059.08-.18048.1206z"/></g></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m32.3008 36h-.1015c-.0261.0402-.0523.0804-.0787.1204-2.7604 1.8201-6.0668 2.8794-9.6206 2.8794-9.665 0-17.5-7.835-17.5-17.5 0-3.5538 1.05931-6.8602 2.87939-9.6206.04009-.0264.08029-.0527.12061-.0788v-.1017c-.04056.0599-.08077.1201-.12061.1805-4.7469 3.1299-7.87939 8.5094-7.87939 14.6206 0 9.665 7.83502 17.5 17.5 17.5 6.1112 0 11.4907-3.1325 14.6206-7.8794.0603-.0398.1204-.0799.1802-.1204z"/><g opacity=".5"><path d="m40.0003 21.5c0 6.1112-3.1325 11.4907-7.8794 14.6206 1.8201-2.7604 2.8794-6.0668 2.8794-9.6206 0-9.665-7.835-17.5-17.5-17.5-3.5538 0-6.8602 1.0593-9.6206 2.8794 3.1299-4.74691 8.5094-7.8794 14.6206-7.8794 9.665 0 17.5 7.835 17.5 17.5z"/><path d="m32.0003 36.1994c.0403-.0261.0805-.0524.1206-.0788-.0398.0604-.08.1206-.1206.1805z"/><path d="m7.80088 12c.02611-.0403.05238-.0805.07882-.1206-.06043.0398-.12059.08-.18048.1206z"/></g></g></svg>`
  },
  {
    id: "luminous",
    name: "Luminous",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/><path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".6"/><path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".8"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/><path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".5"/><path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".7"/></g></svg>`
  },
  {
    id: "pollinate",
    name: "Pollinate",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m25.0008 24c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m25.0008 10c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6c0-3.31371 2.6863-6 6-6s6 2.68629 6 6z"/><path d="m37.125 31c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m37.127 17.0002c0 3.3137-2.6863 6-6 6-3.3138 0-6-2.6863-6-6s2.6862-6 6-6c3.3137 0 6 2.6863 6 6z"/><path d="m25.0008 38c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m12.877 17c0 3.3137-2.6863 6-6.00005 6-3.31371 0-5.999997-2.6863-5.999997-6s2.686287-6 5.999997-6c3.31375 0 6.00005 2.6863 6.00005 6z"/><path d="m12.875 30.9997c0 3.3137-2.6863 6-6 6-3.31371 0-6-2.6863-6-6s2.68629-6 6-6c3.3137 0 6 2.6863 6 6z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m25.0008 24c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m25.0008 10c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6c0-3.31371 2.6863-6 6-6s6 2.68629 6 6z"/><path d="m37.125 31c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m37.127 17.0002c0 3.3137-2.6863 6-6 6-3.3138 0-6-2.6863-6-6s2.6862-6 6-6c3.3137 0 6 2.6863 6 6z"/><path d="m25.0008 38c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m12.877 17c0 3.3137-2.6863 6-6.00005 6-3.31371 0-5.999997-2.6863-5.999997-6s2.686287-6 5.999997-6c3.31375 0 6.00005 2.6863 6.00005 6z"/><path d="m12.875 30.9997c0 3.3137-2.6863 6-6 6-3.31371 0-6-2.6863-6-6s2.68629-6 6-6c3.3137 0 6 2.6863 6 6z"/></g></svg>`
  },
  {
    id: "polymath",
    name: "Polymath",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="24" r="16" stroke="#155eef" stroke-width="6"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="24" r="16" stroke="#fff" stroke-width="6"/></svg>`
  },
  {
    id: "prometheus",
    name: "Prometheus",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m10.4993 16.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h19c2.2091 0 4-1.7909 4-4v-3h-22.5c-3.0376 0-5.5 2.46243-5.5 5.5 0 3.0376-2.4631 5.5-5.5007 5.5z"/><path d="m10.4993 26.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h13c2.2091 0 4-1.7909 4-4v-3h-16.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".7"/><path d="m10.4993 36.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h7.8c1.7673 0 3.2-1.4327 3.2-3.2v-3.8h-10.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m10.4993 16.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h19c2.2091 0 4-1.7909 4-4v-3h-22.5c-3.0376 0-5.5 2.46243-5.5 5.5 0 3.0376-2.4631 5.5-5.5007 5.5z"/><path d="m10.4993 26.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h13c2.2091 0 4-1.7909 4-4v-3h-16.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".75"/><path d="m10.4993 36.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h7.8c1.7673 0 3.2-1.4327 3.2-3.2v-3.8h-10.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".5"/></g></svg>`
  },
  {
    id: "quantum",
    name: "Quantum",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 39 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m9 23c0-5.5228 4.4772-10 10-10 5.5229 0 10 4.4772 10 10h9c0-10.4934-8.5066-19-19-19-10.49341 0-18.99999908 8.5066-19 19s8.50659 19 19 19v-9c-5.5228 0-10-4.4771-10-10z"/><path d="m29 23c0 5.5228 4.4772 10 10 10v9c-10.4934 0-19-8.5066-19-19z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 39 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m9 23c0-5.5228 4.4772-10 10-10 5.5229 0 10 4.4772 10 10h9c0-10.4934-8.5066-19-19-19-10.49341 0-18.99999908 8.5066-19 19s8.50659 19 19 19v-9c-5.5228 0-10-4.4771-10-10z"/><path d="m29 23c0 5.5228 4.4772 10 10 10v9c-10.4934 0-19-8.5066-19-19z" opacity=".5"/></g></svg>`
  },
  {
    id: "quartz-ai",
    name: "QuartzAI",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m17.6264 6.5h14.8017l11.4661 18.6661-15.7786 15.9489-22.68835-4.0459-5.157719-19.2098zm.5273 4.9692-6.816 15.105 6.4504 5.3411 8.8246-3.7975zm12.3276 15.3 9.2139-2.7073-7.1983-11.7184zm-.6163-17.2692h-9.3468l7.3309 14.4284zm6.9795 18.5263-6.779 1.9919-.5448 5.4109zm-10.5005 9.008.5824-5.7856-6.0573 2.6067zm-6.8394-.5022-10.91261-1.9459 1.64741-5.0264 6.438 5.3308zm-11.69782-9.1824-2.7037-3.0571 1.66868 6.215zm-3.53432-8.5248 4.81433 5.4437 5.50351-12.1963z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m17.6264 6.5h14.8017l11.4661 18.6661-15.7786 15.9489-22.68835-4.0459-5.157719-19.2098zm.5273 4.9692-6.816 15.105 6.4504 5.3411 8.8246-3.7975zm12.3276 15.3 9.2139-2.7073-7.1983-11.7184zm-.6163-17.2692h-9.3468l7.3309 14.4284zm6.9795 18.5263-6.779 1.9919-.5448 5.4109zm-10.5005 9.008.5824-5.7856-6.0573 2.6067zm-6.8394-.5022-10.91261-1.9459 1.64741-5.0264 6.438 5.3308zm-11.69782-9.1824-2.7037-3.0571 1.66868 6.215zm-3.53432-8.5248 4.81433 5.4437 5.50351-12.1963z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "radius",
    name: "Radius",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#155eef" fill-rule="evenodd"><path d="m18.5 19v-15h3v15z"/><path d="m18.5 44v-15h3v15z"/><path d="m22.4754 19.404 10.6066-10.60664 2.1214 2.12134-8.4853 8.4853z"/><path d="m4.79776 37.0816 10.60664-10.6066 2.1213 2.1214-10.60662 10.6066z"/><path d="m26.7178 28.5963 8.4853 8.4852-2.1213 2.1214-10.6066-10.6066z"/><path d="m6.91885 8.79727 10.60665 10.60663-2.1214 2.1213-10.60657-10.6066z"/><path d="m18.5 22.5h21.5v3h-21.5z"/><path d="m.00000026 22.5h14.99999974v3h-15z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#155eef" fill-rule="evenodd"><path d="m18.5 19v-15h3v15z"/><path d="m18.5 44v-15h3v15z"/><path d="m22.4754 19.404 10.6066-10.60664 2.1214 2.12134-8.4853 8.4853z"/><path d="m4.79776 37.0816 10.60664-10.6066 2.1213 2.1214-10.60662 10.6066z"/><path d="m26.7178 28.5963 8.4853 8.4852-2.1213 2.1214-10.6066-10.6066z"/><path d="m6.91885 8.79727 10.60665 10.60663-2.1214 2.1213-10.60657-10.6066z"/><path d="m18.5 22.5h21.5v3h-21.5z"/><path d="m.00000026 22.5h14.99999974v3h-15z"/></g></svg>`
  },
  {
    id: "railspeed",
    name: "Railspeed",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m0 7.5h28.8c2.5202 0 3.7804 0 4.743.49047.8467.43143 1.5351 1.11984 1.9665 1.96657.4905.96256.4905 2.22276.4905 4.74296v1.8h-28.8c-2.52024 0-3.78035 0-4.74296-.4905-.84673-.4314-1.535139-1.1198-1.966569-1.9665-.490471-.9626-.490471-2.2228-.490471-4.743z"/><path d="m0 28.5h28.8c2.5202 0 3.7804 0 4.743-.4905.8467-.4314 1.5351-1.1198 1.9665-1.9665.4905-.9626.4905-2.2228.4905-4.743v-1.8h-28.8c-2.52024 0-3.78035 0-4.74296.4905-.84673.4314-1.535139 1.1198-1.966569 1.9665-.490471.9626-.490471 2.2228-.490471 4.743z"/><path d="m14 31.5h14.8c2.5202 0 3.7804 0 4.743.4905.8467.4314 1.5351 1.1198 1.9665 1.9665.4905.9626.4905 2.2228.4905 4.743v1.8h-14.8c-2.5202 0-3.7804 0-4.743-.4905-.8467-.4314-1.5351-1.1198-1.9665-1.9665-.4905-.9626-.4905-2.2228-.4905-4.743z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m0 7.5h28.8c2.5202 0 3.7804 0 4.743.49047.8467.43143 1.5351 1.11984 1.9665 1.96657.4905.96256.4905 2.22276.4905 4.74296v1.8h-28.8c-2.52024 0-3.78035 0-4.74296-.4905-.84673-.4314-1.535139-1.1198-1.966569-1.9665-.490471-.9626-.490471-2.2228-.490471-4.743z"/><path d="m0 28.5h28.8c2.5202 0 3.7804 0 4.743-.4905.8467-.4314 1.5351-1.1198 1.9665-1.9665.4905-.9626.4905-2.2228.4905-4.743v-1.8h-28.8c-2.52024 0-3.78035 0-4.74296.4905-.84673.4314-1.535139 1.1198-1.966569 1.9665-.490471.9626-.490471 2.2228-.490471 4.743z"/><path d="m14 31.5h14.8c2.5202 0 3.7804 0 4.743.4905.8467.4314 1.5351 1.1198 1.9665 1.9665.4905.9626.4905 2.2228.4905 4.743v1.8h-14.8c-2.5202 0-3.7804 0-4.743-.4905-.8467-.4314-1.5351-1.1198-1.9665-1.9665-.4905-.9626-.4905-2.2228-.4905-4.743z"/></g></svg>`
  },
  {
    id: "refractional",
    name: "Refractional",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m48 11h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#444ce7"/><path d="m46 19h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#155eef"/><path d="m44 27h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#8098f9"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m48 11h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/><path d="m46 19h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/><path d="m44 27h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/></g></svg>`
  },
  {
    id: "renaissance",
    name: "Renaissance",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 35 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.7018 5c1.841 0 3.4172 1.31967 3.7408 3.13199l.4648 2.60271c.3236 1.8123 1.8998 3.132 3.7408 3.132h3.1518c4.8969 0 8.8667 3.9697 8.8667 8.8666 0 2.9333-1.4244 5.5339-3.6191 7.1479.92.3126 1.6466.809 2.1799 1.461.549.7191.9411 1.7411 1.1764 3.028.0392.3406.0883.6718.1373 1.003s.098.6624.1372 1.003c.0408.3538.0709.6566.096.9083.0232.233.042.4223.0609.5679.0784 1.0598.1961 1.9303.3529 2.5738.1655.9048.4994 1.7867.9727 2.5738h-6.6982c-.3137-.6056-.5098-1.3248-.6666-2.1196-.1349-.6836-.2408-1.5352-.3676-2.5548-.0207-.1659-.0418-.3362-.0638-.5111l-.2353-1.7411c-.1961-1.3247-.4314-2.271-.6667-2.8766-.2745-.5677-.7058-.9841-1.2941-1.2112-.6274-.2271-1.5686-.3856-2.9019-.3856h-.3018c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.68517v10.1334h-6.33333v-27.8667zm13.6315 17.7333c0 1.3992-1.1342 2.5334-2.5333 2.5334h-3.1518c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.36847v-5.0667h5.68517c1.841 0 3.4172 1.3197 3.7408 3.132l.4647 2.6027c.3237 1.8123 1.8999 3.132 3.7409 3.132h2.8351c1.3991 0 2.5333 1.1342 2.5333 2.5333z" fill="#1849a9" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 35 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.7018 5c1.841 0 3.4172 1.31967 3.7408 3.13199l.4648 2.60271c.3236 1.8123 1.8998 3.132 3.7408 3.132h3.1518c4.8969 0 8.8667 3.9697 8.8667 8.8666 0 2.9333-1.4244 5.5339-3.6191 7.1479.92.3126 1.6466.809 2.1799 1.461.549.7191.9411 1.7411 1.1764 3.028.0392.3406.0883.6718.1373 1.003s.098.6624.1372 1.003c.0408.3538.0709.6566.096.9083.0232.233.042.4223.0609.5679.0784 1.0598.1961 1.9303.3529 2.5738.1655.9048.4994 1.7867.9727 2.5738h-6.6982c-.3137-.6056-.5098-1.3247-.6666-2.1196-.1349-.6836-.2408-1.5352-.3676-2.5548-.0207-.1659-.0418-.3362-.0638-.5111l-.2353-1.7411c-.1961-1.3247-.4314-2.271-.6667-2.8766-.2745-.5677-.7058-.9841-1.2941-1.2112-.6274-.2271-1.5686-.3856-2.9019-.3856h-.3018c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.68517v10.1334h-6.33333v-27.8667zm13.6315 17.7333c0 1.3992-1.1342 2.5334-2.5333 2.5334h-3.1518c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.36847v-5.0667h5.68517c1.841 0 3.4172 1.3197 3.7408 3.132l.4647 2.6027c.3237 1.8123 1.8999 3.132 3.7409 3.132h2.8351c1.3991 0 2.5333 1.1342 2.5333 2.5333z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "sisyphus",
    name: "Sisyphus",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m.599609 19.2002h9.59998v9.59999h-9.59998z"/><path d="m31.4004 28.7998h9.6v9.59999h-9.6z" transform="matrix(-1 0 -0 -1 62.8008 57.5996)"/><path d="m10.1992 19.2001 11.6-9.6v9.6l-11.6 9.6z" opacity=".2"/><path d="m21.7988 28.7999-11.6 9.6v-9.6l11.6-9.6z" opacity=".5"/><path d="m.599609 19.2 21.199991-19.2v9.59999l-11.6 9.60001z" opacity=".6"/><path d="m31.4004 28.8-21.2 19.2v-9.6l11.6-9.6z" opacity=".7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m.599609 19.2002h9.59998v9.59999h-9.59998z"/><path d="m31.4004 28.7998h9.6v9.59999h-9.6z" transform="matrix(-1 0 -0 -1 62.8008 57.5996)"/><path d="m10.1992 19.2001 11.6-9.6v9.6l-11.6 9.6z" opacity=".2"/><path d="m21.7988 28.7999-11.6 9.6v-9.6l11.6-9.6z" opacity=".5"/><path d="m.599609 19.2 21.199991-19.2v9.59999l-11.6 9.60001z" opacity=".6"/><path d="m31.4004 28.8-21.2 19.2v-9.6l11.6-9.6z" opacity=".7"/></g></svg>`
  },
  {
    id: "solaris-energy",
    name: "Solaris Energy",
    lightSvg: `<svg width="100%" height="100%" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4V16.3604C20 19.087 16.6569 20.3998 14.8016 18.4017L7 10M40 24H27.6396C24.913 24 23.6002 20.6569 25.5983 18.8016L34 11M20 44V31.6396C20 28.913 23.3431 27.6002 25.1984 29.5983L33 38M0 24L12.3604 24C15.087 24 16.3998 27.3431 14.4017 29.1984L6 37" stroke="#175CD3" stroke-width="4"/></svg>`,
    darkSvg: `<svg width="100%" height="100%" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4V16.3604C20 19.087 16.6569 20.3998 14.8016 18.4017L7 10M40 24H27.6396C24.913 24 23.6002 20.6569 25.5983 18.8016L34 11M20 44V31.6396C20 28.913 23.3431 27.6002 25.1984 29.5983L33 38M0 24L12.3604 24C15.087 24 16.3998 27.3431 14.4017 29.1984L6 37" stroke="white" stroke-width="4"/></svg>`
  }
];

// features/platform/store-settings/lib/store-logo.ts
var DEFAULT_STORE_LOGO_ICON = LOGO_ICONS.find((icon) => icon.id === "luminescence").lightSvg;
var DEFAULT_STORE_LOGO_COLOR = "270";
function normalizeStoreLogoColor(value) {
  const numeric = Number.parseFloat(String(value ?? DEFAULT_STORE_LOGO_COLOR));
  if (!Number.isFinite(numeric)) return DEFAULT_STORE_LOGO_COLOR;
  return String((numeric % 360 + 360) % 360);
}

// features/keystone/utils/storeLogo.ts
var ALLOWED_ELEMENTS = /* @__PURE__ */ new Set([
  "svg",
  "g",
  "path",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "title",
  "desc"
]);
var ALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set([
  "xmlns",
  "fill",
  "fill-rule",
  "clip-rule",
  "height",
  "width",
  "viewbox",
  "d",
  "clip-path",
  "id",
  "x1",
  "x2",
  "y1",
  "y2",
  "gradientunits",
  "gradienttransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "opacity",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "transform",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "points",
  "role",
  "aria-hidden",
  "aria-label",
  "preserveaspectratio"
]);
var ATTRIBUTE_PATTERN = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
var TAG_PATTERN = /<\/?\s*([A-Za-z][\w:-]*)([^<>]*)>/g;
function sanitizeStoreLogoSvg(svg) {
  const source = svg.trim();
  if (!source.startsWith("<svg") || !source.endsWith("</svg>") || source.length > 1e5) {
    return "";
  }
  if (/<!|<\?|\b(?:javascript|data|vbscript):|\bon[a-z]+\s*=|\b(?:href|src|style)\s*=/i.test(source)) {
    return "";
  }
  let tagCount = 0;
  let match;
  TAG_PATTERN.lastIndex = 0;
  while (match = TAG_PATTERN.exec(source)) {
    tagCount += 1;
    const element = match[1].toLowerCase();
    if (!ALLOWED_ELEMENTS.has(element)) return "";
    if (match[0].startsWith("</")) continue;
    const attributes = match[2];
    let consumed = "";
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let attributeMatch;
    while (attributeMatch = ATTRIBUTE_PATTERN.exec(attributes)) {
      consumed += attributeMatch[0];
      const attribute = attributeMatch[1].toLowerCase();
      const value = attributeMatch[2].slice(1, -1);
      if (!ALLOWED_ATTRIBUTES.has(attribute)) return "";
      if (attribute === "id" && !/^[A-Za-z_][\w:.-]*$/.test(value)) return "";
      if (/url\(/i.test(value) && !/^url\(#[A-Za-z_][\w:.-]*\)$/.test(value)) return "";
    }
    const remainder = attributes.replace(consumed, "").replace(/\//g, "").trim();
    if (remainder) return "";
  }
  TAG_PATTERN.lastIndex = 0;
  if (tagCount === 0 || source.replace(TAG_PATTERN, "").trim()) return "";
  return source;
}

// features/keystone/models/storeLogoFields.ts
var storeLogoFields = {
  logoIcon: (0, import_fields36.text)({
    defaultValue: DEFAULT_STORE_LOGO_ICON,
    hooks: {
      resolveInput: ({ resolvedData, fieldKey }) => {
        const value = resolvedData[fieldKey];
        if (value === void 0 || value === null || value === "") return value;
        return typeof value === "string" ? sanitizeStoreLogoSvg(value) : "";
      },
      validate: ({ inputData, resolvedData, fieldKey, addValidationError }) => {
        const submitted = inputData?.[fieldKey];
        if (typeof submitted === "string" && submitted.trim() && !resolvedData?.[fieldKey]) {
          addValidationError("Logo must be a valid, safe SVG document");
        }
      }
    }
  }),
  logoColor: (0, import_fields36.text)({
    defaultValue: DEFAULT_STORE_LOGO_COLOR,
    hooks: {
      resolveInput: ({ resolvedData, fieldKey }) => {
        const value = resolvedData[fieldKey];
        return value === void 0 ? value : normalizeStoreLogoColor(value);
      }
    }
  })
};

// features/keystone/models/StoreSettings.ts
var StoreSettings = (0, import_core36.list)({
  graphql: { plural: "StoreSettingsRecords" },
  access: catalogAccess,
  fields: {
    name: (0, import_fields37.text)({}),
    refundApprovalThresholdCents: (0, import_fields37.integer)({ defaultValue: 0 }),
    manager: (0, import_fields37.relationship)({ ref: "User.storeSettings_manager", many: false }),
    currencyCode: (0, import_fields37.text)({ defaultValue: "USD", validation: { match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency code" } } }),
    ...storeLogoFields,
    ...trackingFields
  }
});

// features/keystone/models/PaymentProvider.ts
var import_core37 = require("@keystone-6/core");
var import_fields38 = require("@keystone-6/core/fields");
var canConfigureProvider = (args) => isSignedIn(args) && permissions.canManagePayments(args);
var PaymentProvider = (0, import_core37.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: canConfigureProvider,
      update: canConfigureProvider,
      delete: canConfigureProvider
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "code", "isInstalled"]
    }
  },
  fields: {
    name: (0, import_fields38.text)({
      validation: { isRequired: true }
    }),
    code: (0, import_fields38.text)({
      isIndexed: "unique",
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-zA-Z0-9-_]+$/,
          explanation: 'Payment provider code must start with "pp_" followed by alphanumeric characters, hyphens or underscores'
        }
      }
    }),
    isInstalled: (0, import_fields38.checkbox)({
      defaultValue: true
    }),
    credentials: (0, import_fields38.json)({
      access: { read: () => false, create: canConfigureProvider, update: canConfigureProvider },
      defaultValue: {}
    }),
    metadata: (0, import_fields38.json)({
      defaultValue: {}
    }),
    createPaymentFunction: (0, import_fields38.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to create payments"
      }
    }),
    capturePaymentFunction: (0, import_fields38.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to capture payments"
      }
    }),
    refundPaymentFunction: (0, import_fields38.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to refund payments"
      }
    }),
    getPaymentStatusFunction: (0, import_fields38.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to check payment status"
      }
    }),
    generatePaymentLinkFunction: (0, import_fields38.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to generate payment dashboard links"
      }
    }),
    handleWebhookFunction: (0, import_fields38.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to handle provider webhooks"
      }
    }),
    sessions: (0, import_fields38.relationship)({
      ref: "PaymentSession.paymentProvider",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentCollection.ts
var import_core38 = require("@keystone-6/core");
var import_fields39 = require("@keystone-6/core/fields");
var PaymentCollection = (0, import_core38.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageOrders({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    description: (0, import_fields39.select)({
      type: "enum",
      options: [
        { label: "Default", value: "default" },
        { label: "Refund", value: "refund" }
      ],
      defaultValue: "default"
    }),
    amount: (0, import_fields39.integer)({
      validation: { isRequired: true }
    }),
    authorizedAmount: (0, import_fields39.integer)({
      defaultValue: 0
    }),
    refundedAmount: (0, import_fields39.integer)({
      defaultValue: 0
    }),
    metadata: (0, import_fields39.json)(),
    paymentSessions: (0, import_fields39.relationship)({
      ref: "PaymentSession.paymentCollection",
      many: true
    }),
    payments: (0, import_fields39.relationship)({
      ref: "Payment.paymentCollection",
      many: true
    }),
    ...paymentCollectionDomainRelations,
    ...trackingFields
  }
});

// features/keystone/models/PaymentSession.ts
var import_core39 = require("@keystone-6/core");
var import_fields40 = require("@keystone-6/core/fields");
var PaymentSession = (0, import_core39.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageOrders({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    isSelected: (0, import_fields40.checkbox)({
      defaultValue: false
    }),
    isInitiated: (0, import_fields40.checkbox)({
      defaultValue: false
    }),
    amount: (0, import_fields40.integer)({
      validation: { isRequired: true }
    }),
    // Holds the provider's clientSecret while a payment is pending: only payment managers read it.
    data: (0, import_fields40.json)({
      defaultValue: {},
      access: { read: permissions.canManagePayments, create: () => false, update: () => false },
      ui: { listView: { fieldMode: (a) => permissions.canManagePayments(a) ? "read" : "hidden" }, itemView: { fieldMode: (a) => permissions.canManagePayments(a) ? "read" : "hidden" } }
    }),
    idempotencyKey: (0, import_fields40.text)({
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    paymentCollection: (0, import_fields40.relationship)({
      ref: "PaymentCollection.paymentSessions"
    }),
    paymentProvider: (0, import_fields40.relationship)({
      ref: "PaymentProvider.sessions",
      many: false
    }),
    paymentAuthorizedAt: (0, import_fields40.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/Payment.ts
var import_core40 = require("@keystone-6/core");
var import_fields41 = require("@keystone-6/core/fields");
var Payment = (0, import_core40.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  ui: {
    listView: {
      initialColumns: ["amount", "status", "paymentMethod", "order", "createdAt"]
    }
  },
  fields: {
    idempotencyKey: (0, import_fields41.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    reservedAt: (0, import_fields41.timestamp)(),
    refundedAmount: (0, import_fields41.integer)({ defaultValue: 0, validation: { min: 0 } }),
    amount: (0, import_fields41.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Payment amount in cents"
      }
    }),
    data: (0, import_fields41.json)({
      ui: {
        description: "Payment provider data (clientSecret, paymentIntentId, orderId, etc.)"
      }
    }),
    currencyCode: (0, import_fields41.text)({
      defaultValue: "USD",
      ui: { description: "ISO 4217 currency code for this payment" },
      hooks: {
        resolveInput: async ({ operation, inputData, context }) => {
          if (operation === "create" && !inputData.currencyCode) {
            const settings = await context.sudo().query.StoreSettings.findOne({
              where: { id: "1" },
              query: "currencyCode"
            });
            return settings?.currencyCode || "USD";
          }
          return inputData.currencyCode;
        }
      }
    }),
    status: (0, import_fields41.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Authorized", value: "authorized" },
        { label: "Unknown", value: "unknown" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" },
        { label: "Partially Refunded", value: "partially_refunded" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    paymentMethod: (0, import_fields41.select)({
      type: "string",
      options: [
        { label: "Credit Card", value: "credit_card" },
        { label: "Debit Card", value: "debit_card" },
        { label: "Cash", value: "cash" },
        { label: "Gift Card", value: "gift_card" },
        { label: "PayPal", value: "paypal" },
        { label: "Apple Pay", value: "apple_pay" },
        { label: "Google Pay", value: "google_pay" }
      ],
      defaultValue: "credit_card"
    }),
    paymentProvider: (0, import_fields41.relationship)({
      ref: "PaymentProvider",
      ui: {
        displayMode: "select",
        description: "Optional provider backing this payment"
      }
    }),
    providerPaymentId: (0, import_fields41.text)({
      ui: {
        description: "Provider payment identifier (Stripe/PayPal/etc.)"
      }
    }),
    // Card details (last 4 digits for reference)
    cardLast4: (0, import_fields41.text)({
      ui: {
        description: "Last 4 digits of card"
      }
    }),
    cardBrand: (0, import_fields41.text)({
      ui: {
        description: "Card brand (visa, mastercard, etc.)"
      }
    }),
    // Tip handling
    tipAmount: (0, import_fields41.integer)({
      defaultValue: 0,
      ui: {
        description: "Tip amount included in payment in cents"
      }
    }),
    // Split payment support
    isSplitPayment: (0, import_fields41.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this payment is part of a split bill"
      }
    }),
    splitPaymentIndex: (0, import_fields41.integer)({
      ui: {
        description: "Index of this payment in split (1, 2, 3, etc.)"
      }
    }),
    splitTotal: (0, import_fields41.integer)({
      ui: {
        description: "Total number of split payments for this order"
      }
    }),
    processedAt: (0, import_fields41.timestamp)({
      ui: {
        description: "When payment was successfully processed"
      }
    }),
    // Metadata for errors or additional info
    errorMessage: (0, import_fields41.text)({
      ui: {
        description: "Error message if payment failed"
      }
    }),
    notes: (0, import_fields41.text)({
      ui: {
        displayMode: "textarea",
        description: "Internal notes about this payment"
      }
    }),
    // Relationships
    order: (0, import_fields41.relationship)({
      ref: "TicketOrder.payments",
      ui: {
        displayMode: "select"
      }
    }),
    paymentCollection: (0, import_fields41.relationship)({
      ref: "PaymentCollection.payments",
      ui: {
        displayMode: "select",
        description: "Payment collection this payment belongs to"
      }
    }),
    processedBy: (0, import_fields41.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed payment"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Refund.ts
var import_core41 = require("@keystone-6/core");
var import_fields42 = require("@keystone-6/core/fields");
var Refund = (0, import_core41.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    idempotencyKey: (0, import_fields42.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    amount: (0, import_fields42.integer)({ validation: { isRequired: true, min: 1 } }),
    currencyCode: (0, import_fields42.text)({ validation: { isRequired: true } }),
    status: (0, import_fields42.select)({
      type: "string",
      options: [
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Unknown", value: "unknown" }
      ],
      defaultValue: "processing",
      validation: { isRequired: true }
    }),
    reason: (0, import_fields42.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    providerRefundId: (0, import_fields42.text)(),
    providerData: (0, import_fields42.json)(),
    processedAt: (0, import_fields42.timestamp)(),
    payment: (0, import_fields42.relationship)({ ref: "Payment" }),
    order: (0, import_fields42.relationship)({ ref: "TicketOrder" }),
    requestedBy: (0, import_fields42.relationship)({ ref: "User" }),
    approvedBy: (0, import_fields42.relationship)({ ref: "User" }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentWebhookEvent.ts
var import_core42 = require("@keystone-6/core");
var import_fields43 = require("@keystone-6/core/fields");
var PaymentWebhookEvent = (0, import_core42.list)({
  access: {
    operation: {
      query: permissions.canManagePayments,
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    eventKey: (0, import_fields43.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    providerCode: (0, import_fields43.text)({ validation: { isRequired: true }, isIndexed: true }),
    providerEventId: (0, import_fields43.text)({ isIndexed: true }),
    eventType: (0, import_fields43.text)({ isIndexed: true }),
    status: (0, import_fields43.select)({
      type: "string",
      options: [
        { label: "Received", value: "received" },
        { label: "Processed", value: "processed" },
        { label: "Ignored", value: "ignored" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "received"
    }),
    payload: (0, import_fields43.json)(),
    rawBody: (0, import_fields43.text)({ ui: { displayMode: "textarea" } }),
    error: (0, import_fields43.text)({ ui: { displayMode: "textarea" } }),
    attempts: (0, import_fields43.integer)({ defaultValue: 0 }),
    receivedAt: (0, import_fields43.timestamp)({ defaultValue: { kind: "now" }, isIndexed: true }),
    processedAt: (0, import_fields43.timestamp)(),
    payment: (0, import_fields43.relationship)({ ref: "Payment" }),
    ...trackingFields
  }
});

// features/keystone/models/IdempotencyKey.ts
var import_core43 = require("@keystone-6/core");
var import_fields44 = require("@keystone-6/core/fields");
var IdempotencyKey = (0, import_core43.list)({
  access: {
    operation: {
      query: () => false,
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  ui: { isHidden: true },
  fields: {
    idempotencyKey: (0, import_fields44.text)({
      isIndexed: "unique",
      validation: { isRequired: true }
    }),
    requestMethod: (0, import_fields44.text)({ validation: { isRequired: true } }),
    requestParams: (0, import_fields44.json)(),
    requestPath: (0, import_fields44.text)({ validation: { isRequired: true } }),
    responseCode: (0, import_fields44.integer)(),
    responseBody: (0, import_fields44.json)(),
    recoveryPoint: (0, import_fields44.text)({
      defaultValue: "started",
      validation: { isRequired: true }
    }),
    lockedAt: (0, import_fields44.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/ManagerApproval.ts
var import_core44 = require("@keystone-6/core");
var import_fields45 = require("@keystone-6/core/fields");
var ManagerApproval = (0, import_core44.list)({
  access: { operation: { query: ({ session }) => permissions.canIssueRefunds({ session }) || permissions.canApproveAdjustments({ session }), create: () => false, update: () => false, delete: () => false } },
  fields: {
    actionType: (0, import_fields45.select)({ type: "string", options: ["refund_payment", "cash_refund"], validation: { isRequired: true }, isIndexed: true }),
    targetId: (0, import_fields45.text)({ validation: { isRequired: true }, isIndexed: true }),
    reason: (0, import_fields45.text)({ validation: { isRequired: true } }),
    amount: (0, import_fields45.integer)(),
    requestFingerprint: (0, import_fields45.text)({ validation: { isRequired: true } }),
    requestPayload: (0, import_fields45.json)(),
    status: (0, import_fields45.select)({ type: "string", options: ["pending", "approved", "rejected", "consumed", "expired"], defaultValue: "pending", validation: { isRequired: true }, isIndexed: true }),
    approvedAt: (0, import_fields45.timestamp)(),
    consumedAt: (0, import_fields45.timestamp)(),
    expiresAt: (0, import_fields45.timestamp)({ validation: { isRequired: true }, isIndexed: true }),
    consumedEntityType: (0, import_fields45.text)(),
    consumedEntityId: (0, import_fields45.text)(),
    requestedBy: (0, import_fields45.relationship)({ ref: "User" }),
    approvedBy: (0, import_fields45.relationship)({ ref: "User" }),
    ...trackingFields
  },
  ui: { isHidden: true }
});

// features/keystone/models/CashDrawer.ts
var import_core45 = require("@keystone-6/core");
var import_fields46 = require("@keystone-6/core/fields");
var CashDrawer = (0, import_core45.list)({
  access: { operation: { query: ({ session }) => permissions.canManageOrders({ session }) || permissions.canReadPayments({ session }), create: () => false, update: () => false, delete: () => false } },
  fields: {
    label: (0, import_fields46.text)({ validation: { isRequired: true } }),
    status: (0, import_fields46.select)({ type: "string", options: ["open", "closed"], defaultValue: "open", validation: { isRequired: true }, isIndexed: true }),
    openKey: (0, import_fields46.text)({ isIndexed: "unique", db: { isNullable: true } }),
    openingFloatCents: (0, import_fields46.integer)({ validation: { isRequired: true } }),
    cashSalesCents: (0, import_fields46.integer)({ defaultValue: 0 }),
    cashRefundsCents: (0, import_fields46.integer)({ defaultValue: 0 }),
    expectedCents: (0, import_fields46.integer)(),
    countedCents: (0, import_fields46.integer)(),
    varianceCents: (0, import_fields46.integer)(),
    varianceReason: (0, import_fields46.text)(),
    count: (0, import_fields46.json)(),
    openedAt: (0, import_fields46.timestamp)({ validation: { isRequired: true } }),
    closedAt: (0, import_fields46.timestamp)(),
    openedBy: (0, import_fields46.relationship)({ ref: "User" }),
    closedBy: (0, import_fields46.relationship)({ ref: "User" }),
    currencyCode: (0, import_fields46.text)({ defaultValue: "USD" }),
    ...trackingFields
  },
  ui: { isHidden: true }
});

// features/keystone/filter-access.ts
var operationGate = (access) => typeof access === "function" ? access : access?.operation && typeof access.operation === "function" ? access.operation : access?.operation?.query;
var fieldReadGate = (access) => typeof access === "function" ? access : access?.read;
async function passes(gate, args, extra = {}) {
  if (typeof gate !== "function") return true;
  try {
    return await gate({ ...args, operation: "query", ...extra }) === true;
  } catch {
    return false;
  }
}
async function canReadWholeList(list44, args) {
  if (!list44) return false;
  if (!await passes(operationGate(list44.access), args)) return false;
  const rowFilter = list44.access?.filter?.query;
  if (typeof rowFilter !== "function") return true;
  try {
    return await rowFilter({ ...args, operation: "query" }) === true;
  } catch {
    return false;
  }
}
function filterFollowsRead(lists) {
  return Object.fromEntries(Object.entries(lists).map(([listKey, list44]) => [listKey, {
    ...list44,
    fields: Object.fromEntries(Object.entries(list44.fields).map(([fieldKey, field]) => {
      if (typeof field !== "function" || fieldKey.startsWith("__group")) return [fieldKey, field];
      return [fieldKey, (data) => {
        const f = field(data);
        const target = f?.dbField?.kind === "relation" ? f.dbField.list : null;
        const own = f.isFilterable;
        const ownOrder = f.isOrderable;
        const allowed = async (args) => {
          if (!await passes(operationGate(list44.access), args)) return false;
          if (!await passes(fieldReadGate(f.access), args, { listKey, fieldKey, item: void 0 })) return false;
          if (target && !await canReadWholeList(lists[target], args)) return false;
          return true;
        };
        const combine = (base) => base === false ? false : async (args) => {
          if (typeof base === "function" && await base(args) !== true) return false;
          return allowed(args);
        };
        return { ...f, isFilterable: combine(own), isOrderable: combine(ownOrder) };
      }];
    }))
  }]));
}

// features/keystone/models/index.ts
var baseModels = { User, Role, OAuthApp, OAuthToken, Venue, SeatingChart, ChartSection, Seat, Agency, Artist, Tour, Event, EventArtist, DateHold, Offer, EventExpense, PriceLevel, PriceLevelPhase, SeatInventory, ProductionHold, InventoryHold, PromoCode, PromoRedemption, TicketOrder, TicketOrderLine, Ticket, ScanEvent, MerchSales, BarSales, Settlement, SettlementLine, ArtistPayment, AuditEvent, StoreSettings, PaymentProvider, PaymentCollection, PaymentSession, Payment, Refund, PaymentWebhookEvent, IdempotencyKey, ManagerApproval, CashDrawer };
var allModels = filterFollowsRead(baseModels);
var narrowed = (config2) => {
  const operation = config2.access?.operation ?? {};
  const ui = config2.ui ?? {};
  const allowed = (gate, args) => typeof gate !== "function" || Boolean(gate(args));
  return {
    ...config2,
    ui: {
      ...ui,
      isHidden: ui.isHidden ?? ((args) => !allowed(operation.query, args)),
      hideCreate: ui.hideCreate ?? ((args) => !allowed(operation.create, args))
    }
  };
};
var models = Object.fromEntries(Object.entries(allModels).map(([key, config2]) => [key, narrowed(config2)]));

// features/keystone/index.ts
var import_session = require("@keystone-6/core/session");

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");
var import_graphql2 = require("graphql");

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/mutations/storeLogo.ts
var storeLogoTypeDefs = `
  type StoreLogo { logoIcon: String! logoColor: String! name: String! }
  extend type Query { storeLogo: StoreLogo! }
`;
async function storeLogo(_root, _args, context) {
  const row = await context.prisma.storeSettings.findFirst({ select: { logoIcon: true, logoColor: true, name: true } });
  return { logoIcon: row?.logoIcon || DEFAULT_STORE_LOGO_ICON, logoColor: row?.logoColor || DEFAULT_STORE_LOGO_COLOR, name: row?.name || "Concerts" };
}

// features/keystone/lib/audit.ts
var import_node_crypto2 = __toESM(require("node:crypto"));
async function appendAuditEvent(tx, actorId, input) {
  const result = await tx.auditEvent.create({ data: {
    ...input,
    actorId: actorId || null,
    requestId: input.requestId || import_node_crypto2.default.randomUUID(),
    before: input.before ?? void 0,
    after: input.after ?? void 0
  } });
  if (result instanceof Error) throw result;
  return result;
}

// features/keystone/utils/idempotency.ts
var import_node_crypto3 = __toESM(require("node:crypto"));
function normalize(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Idempotency request contains a non-finite number");
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, normalize(entry)])
    );
  }
  throw new Error(`Unsupported idempotency request value: ${typeof value}`);
}
function canonicalIdempotencyParams(params) {
  return normalize(params);
}
function idempotencyFingerprint(params) {
  return import_node_crypto3.default.createHash("sha256").update(JSON.stringify(canonicalIdempotencyParams(params))).digest("hex");
}
function storedFingerprint(requestParams) {
  const params = requestParams && typeof requestParams === "object" ? { ...requestParams } : {};
  const recorded = typeof params._fingerprint === "string" ? params._fingerprint : null;
  delete params._fingerprint;
  const calculated = idempotencyFingerprint(params);
  if (recorded && recorded !== calculated) {
    throw new Error("Stored idempotency request fingerprint is invalid");
  }
  return calculated;
}
function assertIdempotencyRequest(attempt, request) {
  const method = request.requestMethod || "POST";
  const expectedFingerprint = idempotencyFingerprint(request.requestParams);
  if (attempt.requestMethod !== method || attempt.requestPath !== request.requestPath || storedFingerprint(attempt.requestParams) !== expectedFingerprint) {
    throw new Error("Idempotency key was already used with a different request");
  }
}
async function findIdempotencyAttempt(prisma, request) {
  const key = request.key.trim();
  if (!key) throw new Error("Idempotency key is required");
  const existing = await prisma.idempotencyKey.findUnique({ where: { idempotencyKey: key } });
  if (existing) assertIdempotencyRequest(existing, { ...request, key });
  return existing;
}
async function getOrCreateIdempotencyAttempt(prisma, request) {
  const key = request.key.trim();
  if (!key) throw new Error("Idempotency key is required");
  const normalizedParams = canonicalIdempotencyParams(request.requestParams);
  const data = {
    idempotencyKey: key,
    requestMethod: request.requestMethod || "POST",
    requestPath: request.requestPath,
    requestParams: {
      ...normalizedParams,
      _fingerprint: idempotencyFingerprint(request.requestParams)
    },
    recoveryPoint: "started",
    lockedAt: /* @__PURE__ */ new Date()
  };
  const existing = await findIdempotencyAttempt(prisma, { ...request, key });
  if (existing) return { attempt: existing, replay: true };
  try {
    const attempt = await prisma.idempotencyKey.create({ data });
    return { attempt, replay: false };
  } catch (error) {
    if (error?.code !== "P2002") throw error;
    const raced = await prisma.idempotencyKey.findUnique({ where: { idempotencyKey: key } });
    if (!raced) throw error;
    assertIdempotencyRequest(raced, { ...request, key });
    return { attempt: raced, replay: true };
  }
}
async function updateIdempotencyAttempt(prisma, attemptId, recoveryPoint, responseBody, responseCode) {
  await prisma.idempotencyKey.update({
    where: { id: attemptId },
    data: {
      recoveryPoint,
      responseBody,
      responseCode,
      lockedAt: ["completed", "failed"].includes(recoveryPoint) ? null : /* @__PURE__ */ new Date()
    }
  });
}

// features/keystone/lib/transaction.ts
async function lockTransactionKey(tx, key) {
  const result = await tx.$queryRaw`SELECT true AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))) AS acquired`;
  if (result instanceof Error) throw result;
}
function checkedClient(prisma) {
  return new Proxy(prisma, { get(target, key) {
    const value = target[key];
    if (typeof value === "function") return async (...args) => {
      const result = await value.apply(target, args);
      if (result instanceof Error) throw result;
      return result;
    };
    if (value && typeof value === "object") return checkedClient(value);
    return value;
  } });
}
async function command(context, input, run) {
  return context.prisma.$transaction(async (raw) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, input.lock);
    const actor = context.session?.itemId || null;
    const { attempt, replay } = await getOrCreateIdempotencyAttempt(tx, { key: input.idempotencyKey, requestPath: input.operation, requestParams: { ...input.params, actor } });
    if (replay && attempt.recoveryPoint === "completed") return attempt.responseBody;
    const result = await run(tx);
    await updateIdempotencyAttempt(tx, attempt.id, "completed", result, 200);
    return result;
  }, { timeout: 3e4 });
}
async function transition(tx, model, id, expected, next, actor, reason = "", extra = {}) {
  const count2 = await tx[model].updateMany({ where: { id, status: expected }, data: { status: next, ...extra } });
  if (count2.count !== 1) throw new Error(`Invalid ${model} transition from ${expected}`);
  await appendAuditEvent(tx, actor, { action: `${expected}:${next}`, targetList: model, targetId: id, before: { status: expected }, after: { status: next, ...extra }, reason });
  return tx[model].findUnique({ where: { id } });
}

// features/keystone/lib/guest-proof.ts
var import_node_crypto4 = require("node:crypto");
var opaqueToken = () => (0, import_node_crypto4.randomBytes)(24).toString("base64url");
var digest = (value) => (0, import_node_crypto4.createHash)("sha256").update(value).digest("hex");
var humanCode = (prefix) => `${prefix}-${(0, import_node_crypto4.randomBytes)(8).toString("hex").toUpperCase()}`;
function secret2() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET required");
  return value;
}
function createProof(id, expires = Math.floor(Date.now() / 1e3) + 604800) {
  const payload = `v1.${id}.${expires}`;
  return `${payload}.${(0, import_node_crypto4.createHmac)("sha256", secret2()).update(`concerts\0${payload}`).digest("hex")}`;
}
function verifyProof(proof, id) {
  const [v, resource, expiry, signature, ...extra] = (proof || "").split(".");
  if (extra.length || v !== "v1" || resource !== id || !/^\d+$/.test(expiry || "") || Number(expiry) <= Date.now() / 1e3 || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  return (0, import_node_crypto4.timingSafeEqual)(Buffer.from(signature, "hex"), Buffer.from(createProof(id, Number(expiry)).split(".")[3], "hex"));
}
async function ownedHold(context, id, proof) {
  if (!verifyProof(proof, id)) throw new Error("Hold not found");
  const hold = await context.prisma.inventoryHold.findUnique({ where: { id } });
  if (!hold || hold.customerId && hold.customerId !== context.session?.itemId) throw new Error("Hold not found");
  return hold;
}
async function ownedOrder(context, id, proof) {
  if (!verifyProof(proof, id)) throw new Error("Order not found");
  const order = await context.prisma.ticketOrder.findUnique({ where: { id } });
  if (!order || order.customerId && order.customerId !== context.session?.itemId) throw new Error("Order not found");
  return order;
}
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
var canonicalDigest = (value) => digest(canonicalJson(value));

// features/keystone/lib/settlement.ts
function integer39(value, label, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`${label} must be a non-negative safe integer`);
  return value;
}
function percentage(amount, bps2) {
  integer39(bps2, "Basis points", 1e4);
  if (!Number.isSafeInteger(amount)) throw new Error("Amount must be safe integer cents");
  const product = BigInt(amount) * BigInt(bps2);
  const zero = BigInt(0), d = BigInt(1e4);
  const cents2 = product >= zero ? product / d : (product - BigInt(9999)) / d;
  return { cents: Number(cents2), remainder: Number(product - cents2 * d) };
}
function computeSettlement(input) {
  for (const [key, value] of Object.entries(input)) if (key !== "dealType" && value !== void 0) integer39(value, key, key.endsWith("Bps") ? 1e4 : Number.MAX_SAFE_INTEGER);
  const netBoxOfficeCents = input.grossCents - input.taxCents - input.passthroughFeesCents;
  const cappedExpensesCents = Math.min(input.cappedExpensesCents, input.expenseCapCents);
  const totalExpensesCents = cappedExpensesCents + input.uncappedExpensesCents;
  const profit = percentage(Math.max(0, netBoxOfficeCents), input.promoterProfitBps);
  const breakevenCents = totalExpensesCents + input.guaranteeCents + profit.cents;
  const splitBase = input.dealType === "door_deal" ? netBoxOfficeCents : input.dealType === "plus" ? Math.max(0, netBoxOfficeCents - breakevenCents) : netBoxOfficeCents - totalExpensesCents;
  const share = percentage(splitBase, input.percentageBps);
  const artistTotalCents = input.dealType === "flat_guarantee" ? input.guaranteeCents : input.dealType === "versus" ? Math.max(input.guaranteeCents, share.cents) : input.dealType === "plus" ? input.guaranteeCents + share.cents : share.cents;
  const soft = percentage(input.merchSoftCents || 0, input.merchSplitBps || 0);
  const hard = percentage(input.merchHardCents || 0, input.hardMerchSplitBps || 0);
  const merchVenueShareCents = soft.cents + hard.cents;
  const result = { netBoxOfficeCents, cappedExpensesCents, totalExpensesCents, breakevenCents, splitPointCents: splitBase, artistGuaranteeCents: input.guaranteeCents, artistOverageCents: Math.max(0, artistTotalCents - input.guaranteeCents), artistTotalCents, merchVenueShareCents, depositsPaidCents: input.depositsPaidCents, balanceDueArtistCents: artistTotalCents - input.depositsPaidCents, promoterNetCents: netBoxOfficeCents - totalExpensesCents - artistTotalCents + merchVenueShareCents };
  if (Object.values(result).some((value) => !Number.isSafeInteger(value))) throw new Error("Settlement exceeds safe integer cents");
  return { ...result, rounding: [{ label: "Promoter profit", numerator: profit.remainder }, { label: "Artist split", numerator: share.remainder }, { label: "Soft merchandise", numerator: soft.remainder }, { label: "Hard merchandise", numerator: hard.remainder }] };
}
function ticketQuote(input) {
  for (const [k, v] of Object.entries(input)) integer39(v, k, k.endsWith("Bps") ? 1e4 : Number.MAX_SAFE_INTEGER);
  if (input.quantity < 1 || input.quantity > 100) throw new Error("Invalid quantity");
  const subtotalCents = input.priceCents * input.quantity;
  const serviceFeesCents = input.feeCents * input.quantity;
  const facilityFeesCents = input.facilityFeeCents * input.quantity;
  const discountCents = Math.min(subtotalCents, percentage(subtotalCents, input.discountBps || 0).cents + (input.discountFixedCents || 0));
  const taxCents = percentage(subtotalCents - discountCents, input.taxBps).cents;
  return { subtotalCents, serviceFeesCents, facilityFeesCents, discountCents, taxCents, totalCents: subtotalCents + serviceFeesCents + facilityFeesCents - discountCents + taxCents };
}
function refundableCents(totalCents, refundedCents) {
  integer39(totalCents, "Total");
  integer39(refundedCents, "Refunded");
  if (refundedCents > totalCents) throw new Error("Refund exceeds order");
  return totalCents - refundedCents;
}

// features/keystone/mutations/inventory.ts
async function expireHolds(tx, eventId, opts = {}) {
  const holds = await tx.inventoryHold.findMany({ where: { eventId, status: "active", ...opts.all ? {} : { expiresAt: { lte: /* @__PURE__ */ new Date() } } }, include: { seats: true } });
  for (const hold of holds) {
    const flipped = await tx.inventoryHold.updateMany({ where: { id: hold.id, status: "active" }, data: { status: "expired" } });
    if (flipped.count !== 1) continue;
    await tx.inventoryHold.update({ where: { id: hold.id }, data: { seats: { set: [] } } });
    if (hold.orderId) await tx.ticketOrder.updateMany({ where: { id: hold.orderId, status: "pending_payment" }, data: { status: "cancelled" } });
    await tx.priceLevel.update({ where: { id: hold.priceLevelId }, data: { held: { decrement: hold.quantity } } });
    for (const seat of hold.seats) await tx.seatInventory.updateMany({ where: { id: seat.id, status: "held", holdKey: hold.holdKey }, data: { status: "open", occupancyKey: null, holdKey: "" } });
    await tx.promoRedemption.updateMany({ where: { holdId: hold.id, status: "reserved" }, data: { status: "released" } });
  }
  const blocks = await tx.productionHold.findMany({ where: { eventId, status: "active", ...opts.all ? {} : { releaseAt: { lte: /* @__PURE__ */ new Date() } } }, include: { seats: true } });
  for (const block of blocks) await releaseBlock(tx, block);
}
async function releaseBlock(tx, block) {
  const updated = await tx.productionHold.updateMany({ where: { id: block.id, status: "active" }, data: { status: "released" } });
  if (updated.count !== 1) return;
  if (block.priceLevelId) await tx.priceLevel.update({ where: { id: block.priceLevelId }, data: { productionHeld: { decrement: block.quantity } } });
  for (const seat of block.seats || []) await tx.seatInventory.updateMany({ where: { id: seat.id, status: "reserved_hold" }, data: { status: "open", occupancyKey: null } });
}
async function availability(_, { eventId }, context) {
  return context.prisma.$transaction(async (raw) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, `event:${eventId}`);
    await expireHolds(tx, eventId);
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true, showAt: true, doorsAt: true, ageRestriction: true, description: true, venue: { select: { name: true, city: true, timezone: true } } } });
    if (!event || !["announced", "presale", "on_sale", "sold_out", "postponed"].includes(event.status)) throw new Error("Event unavailable");
    const levels = await tx.priceLevel.findMany({ where: { eventId, status: "active" }, select: { id: true, name: true, priceCents: true, feeCents: true, facilityFeeCents: true, capacity: true, sold: true, held: true, productionHeld: true, perOrderLimit: true, currencyCode: true, sections: { select: { id: true, name: true, kind: true, capacity: true } }, priceLevelPhase_priceLevel: { select: { id: true, name: true, priceCents: true, quantity: true, sold: true, startsAt: true, sort: true } } } });
    const seats = await tx.seatInventory.findMany({ where: { eventId }, select: { id: true, status: true, priceLevelId: true, seat: { select: { label: true, row: true, number: true, x: true, y: true, accessible: true, obstructed: true, chartSectionId: true } } }, take: 1e4 });
    return { event, levels, seats };
  });
}
async function createHold(_, args, context) {
  if (!args.idempotencyKey) throw new Error("Idempotency key required");
  return command(context, { operation: args.seatInventoryIds ? "createSeatHold" : "createGaHold", lock: `event:${args.eventId}`, idempotencyKey: args.idempotencyKey, params: args }, async (tx) => {
    await expireHolds(tx, args.eventId);
    const event = await tx.event.findUnique({ where: { id: args.eventId }, include: { venue: true } });
    if (!event || !["presale", "on_sale"].includes(event.status)) throw new Error("Event is not on sale");
    const ids = args.seatInventoryIds;
    if (ids && (!ids.length || ids.length > 8 || new Set(ids).size !== ids.length)) throw new Error("Select 1\u20138 distinct seats");
    const seats = ids ? await tx.seatInventory.findMany({ where: { id: { in: ids }, eventId: event.id }, include: { seat: true } }) : [];
    if (ids && (seats.length !== ids.length || seats.some((s) => s.status !== "open") || new Set(seats.map((s) => s.priceLevelId)).size !== 1)) throw new Error("Select open seats in one price level");
    const levelId = seats[0]?.priceLevelId || args.levelId;
    const level = await tx.priceLevel.findUnique({ where: { id: levelId }, include: { sections: true } });
    const qty = ids ? ids.length : args.qty;
    if (!level || level.eventId !== event.id || level.status !== "active" || !Number.isInteger(qty) || qty < 1 || qty > level.perOrderLimit) throw new Error("Invalid level or quantity");
    if (!ids && level.sections.some((s) => s.kind !== "ga")) throw new Error("Select reserved seats");
    if (level.salesStartAt && level.salesStartAt > /* @__PURE__ */ new Date() || level.salesEndAt && level.salesEndAt <= /* @__PURE__ */ new Date()) throw new Error("Sales window closed");
    const presale = event.status === "presale" || event.onSaleAt && event.onSaleAt > /* @__PURE__ */ new Date();
    let promo = null;
    if (args.presaleCode) {
      promo = await tx.promoCode.findUnique({ where: { code: String(args.presaleCode).toUpperCase() }, include: { priceLevels: true } });
      const live = promo ? await tx.promoRedemption.count({ where: { promoCodeId: promo.id, status: { in: ["reserved", "committed"] } } }) : 0;
      if (!promo || promo.status !== "active" || promo.discountType === "comp" || promo.eventId && promo.eventId !== event.id || promo.priceLevels.length && !promo.priceLevels.some((x) => x.id === level.id) || promo.startsAt && promo.startsAt > /* @__PURE__ */ new Date() || promo.endsAt && promo.endsAt <= /* @__PURE__ */ new Date() || promo.maxUses && live >= promo.maxUses || promo.perOrderLimit && qty > promo.perOrderLimit) throw new Error("Invalid or exhausted code");
    }
    if (presale && !promo && (!event.presaleCode || event.presaleCode !== args.presaleCode)) throw new Error("Presale code required");
    if (level.sold + level.held + level.productionHeld + qty > level.capacity) throw new Error("Capacity exhausted");
    for (const section of level.sections) {
      const siblings = await tx.priceLevel.findMany({ where: { eventId: event.id, sections: { some: { id: section.id } } } });
      if (section.kind === "ga" && siblings.reduce((n, l) => n + l.sold + l.held + l.productionHeld, 0) + qty > section.capacity) throw new Error("Section capacity exhausted");
    }
    const phases = await tx.priceLevelPhase.findMany({ where: { priceLevelId: level.id, startsAt: { lte: /* @__PURE__ */ new Date() } }, orderBy: { sort: "asc" } });
    let phase = null;
    for (const p2 of phases) {
      const reserved = await tx.inventoryHold.aggregate({ where: { phaseId: p2.id, status: "active" }, _sum: { quantity: true } });
      if (p2.sold + (reserved._sum.quantity || 0) < p2.quantity) {
        phase = p2;
        if (p2.sold + (reserved._sum.quantity || 0) + qty > p2.quantity) throw new Error("Quantity exceeds remaining phase tickets");
        break;
      }
    }
    if (phases.length && !phase) throw new Error("Pricing phase exhausted");
    const price = phase?.priceCents ?? level.priceCents;
    const quote = { ...ticketQuote({ priceCents: price, feeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, quantity: qty, taxBps: event.venue.taxBps, discountBps: promo?.discountType === "percent_bps" ? promo.value : 0, discountFixedCents: promo?.discountType === "amount_cents" ? promo.value : 0 }), eventTitle: event.title, levelName: level.name, phaseName: phase?.name || "", unitPriceCents: price, feeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, currencyCode: level.currencyCode, seats: seats.map((s) => ({ id: s.id, label: s.seat.label })), perOrderLimit: level.perOrderLimit };
    const key = opaqueToken();
    const hold = await tx.inventoryHold.create({ data: { eventId: event.id, priceLevelId: level.id, phaseId: phase?.id, customerId: context.session?.itemId || null, holdKey: key, secretHash: digest(key), quantity: qty, expiresAt: new Date(Date.now() + 6e5), status: "active", quoteSnapshot: quote, presaleCode: args.presaleCode || "", seats: { connect: seats.map((s) => ({ id: s.id })) } } });
    await tx.priceLevel.update({ where: { id: level.id }, data: { held: { increment: qty } } });
    for (const seat of seats) await tx.seatInventory.update({ where: { id: seat.id }, data: { status: "held", holdKey: key, occupancyKey: `${event.id}:${seat.seatId}` } });
    if (promo) await tx.promoRedemption.create({ data: { promoCodeId: promo.id, holdId: hold.id, amountCents: quote.discountCents, status: "reserved" } });
    await appendAuditEvent(tx, context.session?.itemId, { action: "hold.created", targetList: "InventoryHold", targetId: hold.id, after: { quantity: qty, eventId: event.id } });
    return { id: hold.id, proof: createProof(hold.id), expiresAt: hold.expiresAt.toISOString(), quantity: hold.quantity, quote };
  });
}

// features/keystone/lib/event-lifecycle.ts
var eventTransitions = {
  announced: ["presale", "on_sale"],
  presale: ["on_sale"],
  on_sale: ["sold_out", "doors"],
  sold_out: ["on_sale", "doors"],
  doors: ["in_progress"],
  in_progress: ["completed"],
  postponed: ["announced"]
};
function assertEventTransition(current, next, reason) {
  if (!eventTransitions[current]?.includes(next)) throw new Error(`Cannot move event from ${current} to ${next}`);
  if (current === "postponed" && !reason?.trim()) throw new Error("Resumption reason required");
}

// features/keystone/lib/venue-time.ts
function holdDay(value) {
  const raw = value instanceof Date ? value.toISOString() : String(value || "");
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) throw new Error("Valid date required");
  const date = /* @__PURE__ */ new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  if (Number.isNaN(+date) || date.toISOString().slice(0, 10) !== match[0]) throw new Error("Valid date required");
  return date.toISOString();
}
function zonedDateTime(day, time, timeZone) {
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ""));
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Time must be HH:MM");
  const wall = Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), +t[1], +t[2]);
  let guess = wall - offsetMs(wall, timeZone);
  guess = wall - offsetMs(guess, timeZone);
  return new Date(guess);
}
function offsetMs(instant, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(instant)).map((p2) => [p2.type, p2.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1e3) * 1e3;
}

// features/keystone/lib/editors.ts
var MAX_CENTS = 1e10;
function cents(value, label, { min = 0, max = MAX_CENTS } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} must be whole cents from ${min} to ${max}`);
  return value;
}
function count(value, label, { min = 0, max = 1e6 } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} must be a whole number from ${min} to ${max}`);
  return value;
}
function bps(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1e4) throw new Error(`${label} must be 0\u2013100%`);
  return value;
}
function name(value, label, max = 120) {
  const text43 = String(value ?? "").trim();
  if (!text43) throw new Error(`${label} required`);
  if (text43.length > max) throw new Error(`${label} is too long`);
  return text43;
}
function optionalDate(value, label) {
  if (value === void 0 || value === null || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(+d)) throw new Error(`${label} is not a valid date`);
  return d;
}
var PRICING_OPEN = ["hold", "announced", "presale", "on_sale", "sold_out", "postponed", "doors"];
var LEVEL_STATUSES = ["active", "paused", "closed"];
function validateLevel(input, used = { sold: 0, held: 0, productionHeld: 0 }) {
  const level = {
    name: name(input.name, "Level name"),
    priceCents: cents(input.priceCents, "Price"),
    feeCents: cents(input.feeCents ?? 0, "Service fee"),
    facilityFeeCents: cents(input.facilityFeeCents ?? 0, "Facility fee"),
    capacity: count(input.capacity, "Capacity", { min: 1 }),
    perOrderLimit: count(input.perOrderLimit ?? 8, "Per-order limit", { min: 1, max: 50 })
  };
  const committed = used.sold + used.held + used.productionHeld;
  if (level.capacity < committed) throw new Error(`Capacity cannot go below ${committed} (sold, held and blocked)`);
  return level;
}
function validatePhase(input, used = { sold: 0, reserved: 0 }) {
  const phase = {
    name: name(input.name, "Phase name"),
    priceCents: cents(input.priceCents, "Phase price"),
    quantity: count(input.quantity, "Phase quantity", { min: 1 }),
    sort: count(input.sort ?? 0, "Order", { max: 1e3 }),
    startsAt: optionalDate(input.startsAt, "Phase start")
  };
  if (phase.quantity < used.sold + used.reserved) throw new Error(`Phase quantity cannot go below ${used.sold + used.reserved} (sold and held)`);
  return phase;
}
var EXPENSE_CATEGORIES = ["venue_rent", "production", "security", "stagehands", "marketing", "catering", "insurance", "ticketing", "other"];
function validateExpense(input) {
  if (!EXPENSE_CATEGORIES.includes(input.category)) throw new Error("Unknown expense category");
  const vendor = String(input.vendor ?? "").trim();
  if (vendor.length > 120) throw new Error("Vendor is too long");
  const notes = String(input.notes ?? "").trim();
  if (notes.length > 1e3) throw new Error("Notes are too long");
  return { category: input.category, vendor, notes, budgetCents: cents(input.budgetCents ?? 0, "Budget"), actualCents: cents(input.actualCents ?? 0, "Actual"), isCapped: input.isCapped === true };
}
var FROZEN_SETTLEMENT = ["signed_promoter", "signed_artist", "final"];
var DEAL_TYPES = ["flat_guarantee", "versus", "plus", "door_deal"];
function validateTerms(input) {
  if (!DEAL_TYPES.includes(input.dealType)) throw new Error("Unknown deal type");
  const terms = {
    dealType: input.dealType,
    guaranteeCents: cents(input.guaranteeCents ?? 0, "Guarantee"),
    percentageBps: bps(input.percentageBps ?? 0, "Artist percentage"),
    promoterProfitBps: bps(input.promoterProfitBps ?? 0, "Promoter profit"),
    expenseCapCents: cents(input.expenseCapCents ?? 0, "Expense cap"),
    merchSplitBps: bps(input.merchSplitBps ?? 0, "Soft merch split"),
    hardMerchSplitBps: bps(input.hardMerchSplitBps ?? 0, "Hard merch split"),
    hospitalityRiderCents: cents(input.hospitalityRiderCents ?? 0, "Hospitality rider"),
    depositCents: cents(input.depositCents ?? 0, "Deposit"),
    depositDueAt: optionalDate(input.depositDueAt, "Deposit due date"),
    breakevenBasis: String(input.breakevenBasis ?? "").trim().slice(0, 500),
    radiusClause: String(input.radiusClause ?? "").trim().slice(0, 500),
    notes: String(input.notes ?? "").trim().slice(0, 2e3)
  };
  if (terms.dealType !== "door_deal" && terms.guaranteeCents < 1) throw new Error("Guarantee required for this deal type");
  if (terms.dealType !== "flat_guarantee" && terms.percentageBps < 1) throw new Error("Artist percentage required for this deal type");
  if (terms.dealType === "flat_guarantee" && terms.percentageBps) throw new Error("A flat guarantee has no percentage");
  if (terms.dealType === "door_deal" && terms.guaranteeCents) throw new Error("A door deal has no guarantee");
  if (terms.dealType !== "door_deal" && terms.depositCents > terms.guaranteeCents) throw new Error("Deposit cannot exceed the guarantee");
  if (terms.depositCents && !terms.depositDueAt) throw new Error("Deposit due date required");
  return terms;
}
var LIVE_OFFER = ["draft", "sent", "accepted", "contracted"];
var REVISABLE = ["sent", "accepted", "declined"];
function validateCountMaps(countIn, countOut) {
  if ((countIn === void 0 || countIn === null) && (countOut === void 0 || countOut === null)) return null;
  const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (!isMap(countIn) || !isMap(countOut)) throw new Error("Count in and count out must be item counts");
  const lines = Object.keys(countIn).map((item) => ({ item, countIn: countIn[item], countOut: countOut[item] }));
  if (Object.keys(countOut).some((k) => !(k in countIn))) throw new Error("Count out lists an item that was not counted in");
  return validateCounts(lines);
}
function validateCounts(lines) {
  if (lines === void 0 || lines === null) return [];
  if (!Array.isArray(lines) || lines.length > 100) throw new Error("Count sheet must be a list of up to 100 items");
  const seen = /* @__PURE__ */ new Set();
  return lines.map((l) => {
    const item = name(l?.item, "Item", 80);
    if (seen.has(item.toLowerCase())) throw new Error(`Item ${item} listed twice`);
    seen.add(item.toLowerCase());
    const countIn = count(l.countIn, `${item} count in`);
    const countOut = count(l.countOut, `${item} count out`);
    if (countOut > countIn) throw new Error(`${item}: count out exceeds count in`);
    return { item, countIn, countOut, sold: countIn - countOut };
  });
}

// features/keystone/mutations/operators.ts
function authorize(context, permission) {
  if (!permissions[permission]({ session: context.session })) throw new Error(`Permission required: ${permission}`);
}
var required = { releaseDateHold: "canManageEvents", advanceEvent: "canManageEvents", placeDateHold: "canManageEvents", challengeHold: "canManageEvents", confirmHold: "canManageEvents", sendOffer: "canManageDeals", acceptOffer: "canManageDeals", declineOffer: "canManageDeals", contractOffer: "canManageDeals", publishEvent: "canManageEvents", setProductionHold: "canManageInventory", releaseProductionHold: "canManageInventory", scanTicket: "canScanTickets", recordMerchSales: "canManageSettlements", computeSettlement: "canManageSettlements", adjustSettlement: "canManageSettlements", signSettlement: "canManageSettlements", recordArtistPayment: "canManageSettlements", postponeEvent: "canManageEvents", cancelEvent: "canManageEvents" };
function operator(operation) {
  return async (_, { input }, context) => {
    authorize(context, required[operation]);
    if (!input || !input.idempotencyKey) throw new Error("Idempotency key required");
    const actor = context.session.itemId;
    let eventId = input.eventId;
    if (input.holdId && ["challengeHold", "confirmHold", "releaseDateHold"].includes(operation)) {
      const hold = await context.prisma.dateHold.findUnique({ where: { id: input.holdId } });
      if (!hold) throw new Error("Date hold not found");
      eventId = hold.eventId;
      input = { ...input, venueId: hold.venueId, date: hold.date.toISOString() };
    }
    if (input.offerId) {
      const row = await context.prisma.offer.findUnique({ where: { id: input.offerId } });
      if (!row) throw new Error("Offer not found");
      eventId = row.eventId;
    }
    if (input.settlementId) {
      const row = await context.prisma.settlement.findUnique({ where: { id: input.settlementId } });
      if (!row) throw new Error("Settlement not found");
      eventId = row.eventId;
    }
    if (input.productionHoldId) {
      const row = await context.prisma.productionHold.findUnique({ where: { id: input.productionHoldId } });
      if (!row) throw new Error("Production hold not found");
      eventId = row.eventId;
    }
    if (operation === "placeDateHold") input = { ...input, date: holdDay(input.date) };
    const lock = operation.includes("Hold") && ["placeDateHold", "challengeHold", "confirmHold", "releaseDateHold"].includes(operation) ? `date:${input.venueId}:${String(input.date).slice(0, 10)}` : `event:${eventId}`;
    return command(context, { operation, idempotencyKey: input.idempotencyKey, lock, params: input }, async (tx) => {
      const audit = async (list44, id, after, reason = "") => appendAuditEvent(tx, actor, { action: operation, targetList: list44, targetId: id, after, reason });
      if (operation === "placeDateHold") {
        const date = new Date(input.date);
        if (Number.isNaN(+date) || !Number.isInteger(input.rank) || input.rank < 1) throw new Error("Valid date and positive rank required");
        if (!input.venueId || !await tx.venue.findUnique({ where: { id: input.venueId } })) throw new Error("Venue required");
        if (date < new Date(holdDay((/* @__PURE__ */ new Date()).toISOString()))) throw new Error("Date is in the past");
        if (input.artistId && !await tx.artist.findUnique({ where: { id: input.artistId } })) throw new Error("Artist not found");
        if (input.expiresAt && !(new Date(input.expiresAt) > /* @__PURE__ */ new Date())) throw new Error("Expiry must be in the future");
        if (await tx.dateHold.count({ where: { venueId: input.venueId, date, status: "confirmed" } })) throw new Error("Date is already confirmed");
        const lapsed = await tx.dateHold.findMany({ where: { venueId: input.venueId, date, status: { in: ["held", "challenged"] }, expiresAt: { lte: /* @__PURE__ */ new Date() } } });
        for (const l of lapsed) await transition(tx, "dateHold", l.id, l.status, "released", actor, "Hold expired", { rankKey: null });
        const rankKey = `${input.venueId}:${date.toISOString().slice(0, 10)}:${input.rank}`;
        if (await tx.dateHold.findUnique({ where: { rankKey } })) throw new Error(`Rank ${input.rank} is already held for this date`);
        const row = await tx.dateHold.create({ data: { venueId: input.venueId, date, artistId: input.artistId, agencyId: input.agencyId, rank: input.rank, rankKey, status: "held", expiresAt: input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 6048e5) } });
        await audit("DateHold", row.id, { rank: row.rank });
        return { id: row.id, status: row.status };
      }
      if (operation === "releaseDateHold") {
        const row = await tx.dateHold.findUnique({ where: { id: input.holdId } });
        if (!row || !["held", "challenged"].includes(row.status)) throw new Error("Only an unconfirmed hold can be released");
        await transition(tx, "dateHold", row.id, row.status, "released", actor, input.reason || "Released by promoter", { rankKey: null });
        return { id: row.id, status: "released" };
      }
      if (operation === "challengeHold") {
        const row = await tx.dateHold.findUnique({ where: { id: input.holdId } });
        if (!row || row.expiresAt <= /* @__PURE__ */ new Date()) throw new Error("Hold expired");
        await transition(tx, "dateHold", row.id, "held", "challenged", actor);
        return { id: row.id, status: "challenged" };
      }
      if (operation === "confirmHold") {
        const row = await tx.dateHold.findUnique({ where: { id: input.holdId } });
        if (!row || !["held", "challenged"].includes(row.status) || row.expiresAt <= /* @__PURE__ */ new Date()) throw new Error("Hold cannot be confirmed");
        const prior = await tx.dateHold.count({ where: { venueId: row.venueId, date: row.date, OR: [{ status: "confirmed" }, { status: { in: ["held", "challenged"] }, expiresAt: { gt: /* @__PURE__ */ new Date() }, rank: { lt: row.rank } }] } });
        if (prior) throw new Error("Earlier ranked hold must be released");
        const title = String(input.title || "").trim();
        if (!title) throw new Error("Event title required");
        const chart = await tx.seatingChart.findUnique({ where: { id: input.seatingChartId } });
        if (!chart || chart.venueId !== row.venueId || chart.status !== "published") throw new Error("Published venue chart required");
        if (input.ageRestriction && !["all_ages", "18_plus", "21_plus"].includes(input.ageRestriction)) throw new Error("Unknown age restriction");
        const venue = await tx.venue.findUnique({ where: { id: row.venueId } });
        const day = row.date.toISOString().slice(0, 10);
        const showAt = input.showTime ? zonedDateTime(day, input.showTime, venue?.timezone || "UTC") : new Date(input.showAt || row.date);
        const doorsAt = input.doorsTime ? zonedDateTime(day, input.doorsTime, venue?.timezone || "UTC") : new Date(input.doorsAt || row.date);
        if (Number.isNaN(+showAt) || Number.isNaN(+doorsAt) || doorsAt > showAt) throw new Error("Doors must open before the show");
        const event = await tx.event.create({ data: { title, venueId: row.venueId, seatingChartId: chart.id, showAt, doorsAt, status: "hold", promoterId: actor, ageRestriction: input.ageRestriction || "all_ages" } });
        await transition(tx, "dateHold", row.id, row.status, "confirmed", actor, "", { eventId: event.id });
        if (row.artistId) await tx.eventArtist.create({ data: { eventId: event.id, artistId: row.artistId, billing: "headliner", position: 1 } });
        await audit("Event", event.id, { status: "hold" });
        return { id: row.id, eventId: event.id, status: "confirmed" };
      }
      if (operation === "declineOffer") {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (!offer) throw new Error("Offer not found");
        if (!String(input.reason || "").trim()) throw new Error("Decline reason required");
        await transition(tx, "offer", offer.id, "sent", "declined", actor, String(input.reason).trim());
        return { id: offer.id, status: "declined" };
      }
      if (operation === "contractOffer") {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (!offer) throw new Error("Offer not found");
        if (!offer.acceptedTerms || canonicalDigest(offer.acceptedTerms) !== offer.acceptedTermsHash) throw new Error("Accepted terms hash mismatch");
        if (canonicalDigest(termsOf(offer)) !== offer.acceptedTermsHash) throw new Error("Offer changed after acceptance; send a new offer version");
        if (!String(input.reference || "").trim()) throw new Error("Contract reference required");
        await transition(tx, "offer", offer.id, "accepted", "contracted", actor, "", { notes: [offer.notes, `Contract ${String(input.reference).trim()}`].filter(Boolean).join("\n") });
        return { id: offer.id, status: "contracted" };
      }
      if (operation === "sendOffer" || operation === "acceptOffer") {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (!offer) throw new Error("Offer not found");
        const terms = termsOf(offer);
        const status = operation === "sendOffer" ? "sent" : "accepted";
        await transition(tx, "offer", offer.id, operation === "sendOffer" ? "draft" : "sent", status, actor, "", status === "accepted" ? { acceptedTerms: terms, acceptedTermsHash: canonicalDigest(terms) } : {});
        return { id: offer.id, status };
      }
      if (operation === "advanceEvent") {
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error("Event not found");
        assertEventTransition(event.status, input.status, input.reason);
        if (["presale", "on_sale"].includes(input.status)) {
          const levels = await tx.priceLevel.findMany({ where: { eventId, status: "active" } });
          if (!levels.length) throw new Error("Active pricing required before opening sales");
        }
        await transition(tx, "event", eventId, event.status, input.status, actor, input.reason || "");
        return { id: eventId, status: input.status };
      }
      if (operation === "publishEvent") {
        const event = await tx.event.findUnique({ where: { id: eventId }, include: { seatingChart: true } });
        if (!event || event.status !== "hold" || event.seatingChart?.status !== "published") throw new Error("Confirmed event and published chart required");
        const sections = await tx.chartSection.findMany({ where: { chartId: event.seatingChartId }, include: { seat_chartSection: true } });
        const rows = [];
        for (const section of sections) {
          const levels = await tx.priceLevel.findMany({ where: { eventId, sections: { some: { id: section.id } } } });
          if (!levels.length) throw new Error("Every section requires pricing");
          if (section.kind === "reserved") for (const seat of section.seat_chartSection) rows.push({ eventId, seatId: seat.id, priceLevelId: levels[0].id, eventSeatKey: `${eventId}:${seat.id}`, status: seat.status === "killed" ? "killed" : "open" });
        }
        if (rows.length) await tx.seatInventory.createMany({ data: rows });
        await transition(tx, "event", eventId, "hold", "announced", actor);
        return { id: eventId, status: "announced" };
      }
      if (operation === "setProductionHold") {
        await expireHolds(tx, eventId);
        const level = await tx.priceLevel.findUnique({ where: { id: input.levelId }, include: { sections: true } });
        const ids = input.seatInventoryIds || [];
        const qty = ids.length || input.quantity;
        if (!level || level.eventId !== eventId || !Number.isInteger(qty) || qty < 1 || level.sold + level.held + level.productionHeld + qty > level.capacity) throw new Error("Insufficient capacity");
        const seats = await tx.seatInventory.findMany({ where: { id: { in: ids }, eventId, priceLevelId: level.id, status: "open" } });
        if (seats.length !== ids.length || new Set(ids).size !== ids.length) throw new Error("Seats are unavailable");
        for (const section of level.sections) if (section.kind === "ga") {
          const siblings = await tx.priceLevel.findMany({ where: { eventId, sections: { some: { id: section.id } } } });
          if (siblings.reduce((n, l) => n + l.sold + l.held + l.productionHeld, 0) + qty > section.capacity) throw new Error("Section capacity exhausted");
        }
        const row = await tx.productionHold.create({ data: { eventId, priceLevelId: level.id, quantity: qty, holdType: input.holdType || "production", releaseAt: input.releaseAt ? new Date(input.releaseAt) : null, status: "active", seats: { connect: ids.map((id) => ({ id })) } } });
        await tx.priceLevel.update({ where: { id: level.id }, data: { productionHeld: { increment: qty } } });
        for (const seat of seats) await tx.seatInventory.update({ where: { id: seat.id }, data: { status: "reserved_hold", occupancyKey: `${eventId}:${seat.seatId}` } });
        await audit("ProductionHold", row.id, { quantity: qty });
        return { id: row.id, status: "active" };
      }
      if (operation === "releaseProductionHold") {
        const row = await tx.productionHold.findUnique({ where: { id: input.productionHoldId }, include: { seats: true } });
        if (!row || row.status !== "active") throw new Error("Active production hold required");
        await releaseBlock(tx, row);
        await audit("ProductionHold", row.id, { status: "released" });
        return { id: row.id, status: "released" };
      }
      if (operation === "scanTicket") {
        const ticket = input.token ? await tx.ticket.findFirst({ where: { tokenHash: digest(input.token) } }) : await tx.ticket.findUnique({ where: { ticketCode: input.ticketCode || "" } });
        if (!ticket) throw new Error("Ticket not found");
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error("Event not found");
        let result = ticket.eventId !== eventId ? "wrong_event" : ["void", "refunded", "transferred"].includes(ticket.status) ? "void" : ticket.status === "checked_in" ? event.allowReentry ? "reentry" : "duplicate" : "admitted";
        if (result === "admitted" && !["doors", "in_progress"].includes(event.status)) throw new Error("Doors are not open");
        if (result === "admitted") await transition(tx, "ticket", ticket.id, "valid", "checked_in", actor);
        const scan = await tx.scanEvent.create({ data: { ticketId: ticket.id, eventId, gate: input.gate || "Main", scannedById: actor, at: /* @__PURE__ */ new Date(), result } });
        return { id: scan.id, result, admitted: await tx.ticket.count({ where: { eventId, status: "checked_in" } }) };
      }
      if (operation === "recordMerchSales") {
        const deal = await tx.offer.findFirst({ where: { eventId, status: { in: ["accepted", "contracted", "settled"] } } });
        if (!deal) throw new Error("Accepted deal required");
        const terms = deal.acceptedTerms;
        if (!terms || canonicalDigest(terms) !== deal.acceptedTermsHash) throw new Error("Accepted terms hash mismatch");
        for (const k of ["softGrossCents", "hardGrossCents", "sellerFeeCents"]) if (!Number.isSafeInteger(input[k] || 0) || (input[k] || 0) < 0) throw new Error("Invalid merch amount");
        if (await tx.settlement.count({ where: { eventId, status: { in: ["signed_promoter", "signed_artist", "final"] } } })) throw new Error("Settlement is frozen");
        const sheet = validateCountMaps(input.countIn, input.countOut);
        const existing = await tx.merchSales.findFirst({ where: { eventId } });
        const data = { eventId, softGrossCents: input.softGrossCents, hardGrossCents: input.hardGrossCents, sellerFeeCents: input.sellerFeeCents || 0, venueSoftSplitBps: terms.merchSplitBps, venueHardSplitBps: terms.hardMerchSplitBps, venueShareCents: percentage(input.softGrossCents, terms.merchSplitBps).cents + percentage(input.hardGrossCents, terms.hardMerchSplitBps).cents, countIn: sheet ? input.countIn : void 0, countOut: sheet ? input.countOut : void 0 };
        const row = existing ? await tx.merchSales.update({ where: { id: existing.id }, data }) : await tx.merchSales.create({ data });
        await audit("MerchSales", row.id, data);
        return { id: row.id, venueShareCents: row.venueShareCents };
      }
      if (operation === "computeSettlement") return buildSettlement(tx, eventId, actor);
      if (operation === "adjustSettlement") {
        if (!input.reason || !Number.isSafeInteger(input.amountCents)) throw new Error("Adjustment cents and reason required");
        await validateApprover(tx, input.approvedById, actor);
        const old = await tx.settlement.findUnique({ where: { id: input.settlementId }, include: { settlementLine_settlement: true } });
        if (!old) throw new Error("Settlement not found");
        const { id, createdAt, updatedAt, settlementLine_settlement: lines, ...data } = old;
        const snapshot = { ...old.computedSnapshot, correction: { previousHash: old.hash, reason: input.reason, amountCents: input.amountCents, approvedById: input.approvedById } };
        const row = await tx.settlement.create({ data: { ...data, version: old.version + 1, previousVersionId: old.id, status: "draft", approvals: {}, computedSnapshot: snapshot, hash: canonicalDigest(snapshot), artistTotalCents: old.artistTotalCents + input.amountCents, balanceDueArtistCents: old.balanceDueArtistCents + input.amountCents, promoterNetCents: old.promoterNetCents - input.amountCents } });
        for (const line of lines) {
          const { id: id2, createdAt: createdAt2, updatedAt: updatedAt2, settlementId, ...copy } = line;
          await tx.settlementLine.create({ data: { ...copy, settlementId: row.id } });
        }
        await tx.settlementLine.create({ data: { settlementId: row.id, kind: "adjustment", label: input.reason, amountCents: input.amountCents, reason: input.reason, approvedById: input.approvedById, sourceRef: old.id } });
        await audit("Settlement", row.id, { hash: row.hash }, input.reason);
        return { id: row.id, status: "draft", hash: row.hash };
      }
      if (operation === "signSettlement") {
        const row = await tx.settlement.findUnique({ where: { id: input.settlementId } });
        if (!row || canonicalDigest(row.computedSnapshot) !== row.hash) throw new Error("Settlement snapshot hash mismatch");
        const transitions = { draft: "reviewed", reviewed: "signed_promoter", signed_promoter: "signed_artist", signed_artist: "final" };
        const next = transitions[row.status];
        if (!next) throw new Error("Settlement cannot be signed");
        if (next === "signed_artist" && row.approvals?.signed_promoter?.actorId === actor) throw new Error("Artist signature requires a different user");
        await transition(tx, "settlement", row.id, row.status, next, actor, "", { approvals: { ...row.approvals, [next]: { actorId: actor, at: (/* @__PURE__ */ new Date()).toISOString(), hash: row.hash } } });
        return { id: row.id, status: next, hash: row.hash };
      }
      if (operation === "recordArtistPayment") {
        const settlement = await tx.settlement.findUnique({ where: { id: input.settlementId } });
        if (!settlement) throw new Error("Settlement not found");
        const row = await applyArtistPayment(tx, settlement, { kind: input.kind, amountCents: input.amountCents, status: input.status === "scheduled" ? "scheduled" : "paid", method: input.method || "recorded", reference: input.reference }, actor);
        return { id: row.id, status: row.status };
      }
      if (operation === "postponeEvent" || operation === "cancelEvent") {
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event || ["cancelled", "settled"].includes(event.status)) throw new Error("Event cannot transition");
        const next = operation === "postponeEvent" ? "postponed" : "cancelled";
        if (next === "cancelled" && await tx.ticketOrder.count({ where: { eventId, status: { in: ["paid", "partially_refunded"] } } })) throw new Error("Refund all paid orders before cancelling");
        if (next === "cancelled") await expireHolds(tx, eventId, { all: true });
        await transition(tx, "event", eventId, event.status, next, actor, input.reason || "", next === "postponed" ? { refundWindowEndsAt: new Date(Date.now() + 30 * 864e5) } : {});
        return { id: eventId, status: next };
      }
      throw new Error("Unknown operator command");
    });
  };
}
async function applyArtistPayment(tx, settlement, p2, actor) {
  if (!Number.isSafeInteger(p2.amountCents) || p2.amountCents < 1 || !["deposit", "balance"].includes(p2.kind) || !p2.reference) throw new Error("Valid payment kind, amount and reference required");
  const row = await tx.artistPayment.create({ data: { settlementId: settlement.id, kind: p2.kind, amountCents: p2.amountCents, status: p2.status, method: p2.method, reference: p2.reference } });
  if (p2.kind === "balance" && p2.status === "paid") {
    if (settlement.status !== "final") throw new Error("Final settlement required");
    if (p2.amountCents > settlement.balanceDueArtistCents) throw new Error("Payment exceeds the balance due");
    const remaining = settlement.balanceDueArtistCents - p2.amountCents;
    await tx.settlement.update({ where: { id: settlement.id }, data: { balanceDueArtistCents: remaining } });
    await tx.settlementLine.create({ data: { settlementId: settlement.id, kind: "payment", label: `Balance payment ${p2.reference}`, amountCents: -p2.amountCents, sourceRef: row.id } });
    if (remaining === 0) {
      const event = await tx.event.findUnique({ where: { id: settlement.eventId } });
      if (event.status !== "settled") await transition(tx, "event", event.id, event.status, "settled", actor, "Balance paid in full");
      await tx.offer.updateMany({ where: { eventId: event.id, status: { in: ["accepted", "contracted"] } }, data: { status: "settled" } });
    }
  }
  await appendAuditEvent(tx, actor, { action: "artistPayment.recorded", targetList: "ArtistPayment", targetId: row.id, after: { kind: p2.kind, amountCents: p2.amountCents, reference: p2.reference } });
  return row;
}
function termsOf(offer) {
  return Object.fromEntries(["dealType", "guaranteeCents", "percentageBps", "breakevenBasis", "promoterProfitBps", "expenseCapCents", "merchSplitBps", "hardMerchSplitBps", "radiusClause", "hospitalityRiderCents", "depositCents", "depositDueAt", "version"].map((k) => [k, offer[k] instanceof Date ? offer[k].toISOString() : offer[k]]));
}
async function validateApprover(tx, id, actor) {
  if (!id || id === actor) throw new Error("A different manager must approve");
  const user = await tx.user.findUnique({ where: { id }, include: { role: true } });
  if (!user?.role?.canApproveAdjustments) throw new Error("Approver lacks manager permission");
}
async function buildSettlement(tx, eventId, actor) {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event || !["completed", "settling"].includes(event.status)) throw new Error("Completed event required");
  const old = await tx.settlement.findFirst({ where: { eventId }, orderBy: { version: "desc" } });
  if (old && ["signed_promoter", "signed_artist", "final"].includes(old.status)) throw new Error("Signed settlement is frozen; create an approved adjustment");
  const offers = await tx.offer.findMany({ where: { eventId, status: { in: ["accepted", "contracted", "settled"] } }, orderBy: { id: "asc" } });
  if (!offers.length) throw new Error("Accepted artist deal required");
  const orders = await tx.ticketOrder.findMany({ where: { eventId, status: { in: ["paid", "partially_refunded", "comp"] } }, include: { ticketOrderLine_order: true } });
  const expenses = await tx.eventExpense.findMany({ where: { eventId } });
  const merch = await tx.merchSales.findFirst({ where: { eventId } });
  const payments = await tx.artistPayment.findMany({ where: { status: "paid", settlement: { eventId } } });
  const gross = orders.reduce((n, o) => n + o.totalCents - o.refundedCents, 0);
  const tax = orders.reduce((n, o) => n + o.taxCents, 0);
  const fees = orders.reduce((n, o) => n + o.serviceFeesCents + o.facilityFeesCents, 0);
  const capped = expenses.filter((e) => e.isCapped).reduce((n, e) => n + e.actualCents, 0);
  const uncapped = expenses.filter((e) => !e.isCapped).reduce((n, e) => n + e.actualCents, 0);
  const depositsPaidCents = payments.filter((p2) => p2.kind === "deposit").reduce((n, p2) => n + p2.amountCents, 0);
  const figures = offers.map((offer, index) => {
    const terms = offer.acceptedTerms;
    if (!terms || canonicalDigest(terms) !== offer.acceptedTermsHash) throw new Error("Accepted deal terms hash mismatch");
    const input = { grossCents: gross, taxCents: tax, passthroughFeesCents: fees, cappedExpensesCents: capped, uncappedExpensesCents: uncapped, expenseCapCents: terms.expenseCapCents, guaranteeCents: terms.guaranteeCents, percentageBps: terms.percentageBps, promoterProfitBps: terms.promoterProfitBps, depositsPaidCents: index === 0 ? depositsPaidCents : 0, dealType: terms.dealType, merchSoftCents: index === 0 ? merch?.softGrossCents || 0 : 0, merchHardCents: index === 0 ? merch?.hardGrossCents || 0 : 0, merchSplitBps: terms.merchSplitBps, hardMerchSplitBps: terms.hardMerchSplitBps };
    return { offerId: offer.id, artistId: offer.artistId, acceptedTermsHash: offer.acceptedTermsHash, input, result: computeSettlement(input) };
  });
  const sum = (key) => figures.reduce((n, x) => n + x.result[key], 0);
  const { rounding, ...first } = figures[0].result;
  const totals = { ...first, artistGuaranteeCents: sum("artistGuaranteeCents"), artistOverageCents: sum("artistOverageCents"), artistTotalCents: sum("artistTotalCents"), balanceDueArtistCents: sum("balanceDueArtistCents"), promoterNetCents: first.netBoxOfficeCents - first.totalExpensesCents - sum("artistTotalCents") + sum("merchVenueShareCents") };
  const snapshot = { version: 1, eventId, figures, orderIds: orders.map((o) => o.id), expenses: expenses.map((e) => ({ id: e.id, actualCents: e.actualCents, isCapped: e.isCapped })), totals };
  const hash = canonicalDigest(snapshot);
  const data = { eventId, status: "draft", version: old ? old.version + 1 : 1, previousVersionId: old?.id, ticketGrossCents: gross, ticketFeesCents: fees, taxCents: tax, paidCount: orders.filter((o) => o.status !== "comp").reduce((n, o) => n + o.ticketOrderLine_order.reduce((a, l) => a + l.quantity, 0), 0), compCount: orders.filter((o) => o.status === "comp").length, ...totals, computedSnapshot: snapshot, hash };
  const settlement = await tx.settlement.create({ data });
  if (old && ["draft", "reviewed"].includes(old.status)) await transition(tx, "settlement", old.id, old.status, "void", actor, "Superseded by recomputation");
  const lines = [["Ticket gross", gross, "gross"], ["Pass-through fees", -fees, "fee"], ["Tax", -tax, "tax"], ["Counted expenses", -totals.totalExpensesCents, "expense"], ["Artist guarantee", totals.artistGuaranteeCents, "guarantee"], ["Artist overage", totals.artistOverageCents, "overage"], ["Deposits paid", -depositsPaidCents, "deposit"]];
  for (const [label, amountCents, kind] of lines) await tx.settlementLine.create({ data: { settlementId: settlement.id, label, amountCents, kind, sourceRef: eventId } });
  if (totals.artistGuaranteeCents + totals.artistOverageCents - depositsPaidCents !== totals.balanceDueArtistCents) throw new Error("Settlement lines do not reconcile to the balance due");
  for (const figure of figures) for (const rem of figure.result.rounding) await tx.settlementLine.create({ data: { settlementId: settlement.id, kind: "rounding", label: rem.label, amountCents: 0, roundingRemainder: rem.numerator, sourceRef: figure.offerId } });
  if (event.status === "completed") await transition(tx, "event", eventId, "completed", "settling", actor, "Settlement computed");
  await appendAuditEvent(tx, actor, { action: "settlement.computed", targetList: "Settlement", targetId: settlement.id, after: { hash } });
  return { id: settlement.id, status: "draft", hash, ...totals };
}
var operatorNames = Object.keys(required);

// features/keystone/mutations/charts.ts
async function publishSeatingChart(_, { input }, context) {
  authorize(context, "canManageVenues");
  if (!input.idempotencyKey || !input.seatingChartId) throw new Error("Chart and idempotency key required");
  return command(context, { operation: "publishSeatingChart", idempotencyKey: input.idempotencyKey, lock: `chart:${input.seatingChartId}`, params: input }, async (tx) => {
    const chart = await tx.seatingChart.findUnique({ where: { id: input.seatingChartId }, include: { venue: true, chartSection_chart: { include: { seat_chartSection: true } } } });
    if (!chart || chart.status !== "draft") throw new Error("Draft chart required");
    if (!chart.venue || !chart.chartSection_chart.length) throw new Error("Venue and sections required");
    let capacity = 0;
    for (const section of chart.chartSection_chart) {
      if (!section.name?.trim()) throw new Error("Section name required");
      if (section.kind === "ga") {
        if (!Number.isSafeInteger(section.capacity) || section.capacity < 1 || section.seat_chartSection.length) throw new Error("GA section needs positive capacity and no reserved seats");
        capacity += section.capacity;
      } else {
        const seats = section.seat_chartSection;
        if (!seats.length || !seats.some((s) => s.status === "sellable")) throw new Error("Reserved section needs sellable seats");
        const labels = seats.map((s) => s.label?.trim());
        if (labels.some((s) => !s) || new Set(labels).size !== labels.length) throw new Error("Seat labels must be non-empty and unique within a section");
        const sellable = seats.filter((s) => s.status === "sellable").length;
        await tx.chartSection.update({ where: { id: section.id }, data: { capacity: sellable } });
        capacity += sellable;
      }
    }
    if (capacity > chart.venue.capacity) throw new Error("Chart capacity exceeds venue capacity");
    await transition(tx, "seatingChart", chart.id, "draft", "published", context.session.itemId);
    return { id: chart.id, status: "published", capacity };
  });
}

// features/keystone/lib/refund-approval.ts
var import_node_crypto5 = require("node:crypto");
function refundApprovalPayload(orderId, amountCents, reason, actionType = "refund_payment") {
  if (!orderId) throw new Error("Order required");
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw new Error("Refund amount must be a positive whole number of cents");
  return { actionType, targetId: orderId, amount: amountCents, reason: String(reason || "").trim() };
}
function refundApprovalFingerprint(payload) {
  return (0, import_node_crypto5.createHash)("sha256").update(JSON.stringify([payload.actionType, payload.targetId, payload.amount, payload.reason])).digest("hex");
}
function assertApprovalUsable(approval, input) {
  const now = input.now ?? /* @__PURE__ */ new Date();
  if (!approval) throw new Error("Manager approval not found");
  if (approval.requestFingerprint !== input.fingerprint) throw new Error("Approval does not match this order and amount");
  if (approval.requestedById !== input.actorId) throw new Error("Approval was requested by someone else");
  if (!approval.approvedById || approval.approvedById === input.actorId) throw new Error("Approval needs a different manager");
  if (approval.status !== "approved") throw new Error(`Approval is ${approval.status}`);
  if (new Date(approval.expiresAt) <= now) throw new Error("Approval has expired");
}

// features/keystone/mutations/approvals.ts
var TTL_MS = 15 * 60 * 1e3;
async function requestRefundApproval(_, { input }, context) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error("Permission required: canIssueRefunds");
  const actor = context.session.itemId;
  const reason = String(input.reason || "").trim();
  if (!reason) throw new Error("Reason required");
  const payload = refundApprovalPayload(input.orderId, input.amountCents, reason, input.cash ? "cash_refund" : "refund_payment");
  return context.prisma.$transaction(async (tx) => {
    const order = await tx.ticketOrder.findUnique({ where: { id: input.orderId } });
    if (!order || !["paid", "partially_refunded"].includes(order.status)) throw new Error("Order is not refundable");
    if (payload.amount > order.totalCents - order.refundedCents) throw new Error("Refund exceeds unrefunded balance");
    const door = await tx.payment.findFirst({ where: { orderId: order.id, status: { in: ["succeeded", "partially_refunded"] } } });
    if (!door) throw new Error("No captured payment");
    if (Boolean(input.cash) !== !door.providerPaymentId) throw new Error(input.cash ? "Only door cash and terminal sales use a cash refund" : "Door sales are refunded as a cash refund");
    const fingerprint = refundApprovalFingerprint(payload);
    const existing = await tx.managerApproval.findFirst({ where: { requestFingerprint: fingerprint, requestedById: actor, status: { in: ["pending", "approved"] }, expiresAt: { gt: /* @__PURE__ */ new Date() } } });
    if (existing) return { id: existing.id, status: existing.status, expiresAt: existing.expiresAt };
    const row = await tx.managerApproval.create({ data: { ...payload, requestFingerprint: fingerprint, requestPayload: payload, status: "pending", requestedById: actor, expiresAt: new Date(Date.now() + TTL_MS) } });
    await appendAuditEvent(tx, actor, { action: "approval.requested", targetList: "ManagerApproval", targetId: row.id, after: payload, reason });
    return { id: row.id, status: row.status, expiresAt: row.expiresAt };
  });
}
async function decideRefundApproval(_, { input }, context) {
  if (!permissions.canApproveAdjustments({ session: context.session })) throw new Error("Permission required: canApproveAdjustments");
  const actor = context.session.itemId;
  const approve = input.decision === "approve";
  if (!approve && input.decision !== "reject") throw new Error("Decision must be approve or reject");
  return context.prisma.$transaction(async (tx) => {
    const row = await tx.managerApproval.findUnique({ where: { id: input.approvalId } });
    if (!row) throw new Error("Approval not found");
    if (row.requestedById === actor) throw new Error("You cannot decide your own request");
    if (new Date(row.expiresAt) <= /* @__PURE__ */ new Date()) {
      await tx.managerApproval.updateMany({ where: { id: row.id, status: "pending" }, data: { status: "expired" } });
      throw new Error("Approval request has expired");
    }
    const next = approve ? "approved" : "rejected";
    const done = await tx.managerApproval.updateMany({ where: { id: row.id, status: "pending", requestedById: { not: actor } }, data: { status: next, approvedById: actor, approvedAt: /* @__PURE__ */ new Date() } });
    if (done.count !== 1) throw new Error("Approval is no longer pending");
    await appendAuditEvent(tx, actor, { action: `approval.${next}`, targetList: "ManagerApproval", targetId: row.id, before: { status: "pending" }, after: { status: next }, reason: input.note || "" });
    return { id: row.id, status: next };
  });
}

// features/keystone/lib/door-sale.ts
var DOOR_STATUSES = ["presale", "on_sale", "doors", "in_progress"];
var MAX_DOOR_QTY = 8;
var MAX_COMP_QTY = 10;
function assertDoorQuantity(qty, max = MAX_DOOR_QTY) {
  if (!Number.isInteger(qty) || qty < 1 || qty > max) throw new Error(`Quantity must be 1\u2013${max}`);
  return qty;
}
function settleTender(totalCents, tender) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 1) throw new Error("Nothing to charge");
  if (tender?.kind === "cash") {
    if (!Number.isSafeInteger(tender.tenderedCents) || tender.tenderedCents < totalCents) throw new Error("Cash tendered is less than the total");
    return { method: "cash", changeCents: tender.tenderedCents - totalCents, reference: "" };
  }
  if (tender?.kind === "card_external") {
    const reference = String(tender.reference || "").trim();
    if (reference.length < 4) throw new Error("Card terminal reference required");
    return { method: "credit_card", changeCents: 0, reference };
  }
  throw new Error("Choose cash or card terminal");
}
function pickPhase(phases, reservedByPhase, qty) {
  if (!phases.length) return null;
  const hit = phases.find((p2) => p2.sold + (reservedByPhase[p2.id] || 0) + qty <= p2.quantity);
  if (!hit) throw new Error("Pricing phase exhausted");
  return hit;
}
function priceDoorSale(kind, level, phase, qty, taxBps) {
  const unitPriceCents = kind === "comp" ? 0 : phase?.priceCents ?? level.priceCents;
  const quote = kind === "comp" ? { subtotalCents: 0, serviceFeesCents: 0, facilityFeesCents: 0, discountCents: 0, taxCents: 0, totalCents: 0 } : ticketQuote({ priceCents: unitPriceCents, feeCents: 0, facilityFeeCents: level.facilityFeeCents, quantity: qty, taxBps });
  return { unitPriceCents, quote };
}
function levelRoom(level) {
  return level.capacity - level.sold - level.held - level.productionHeld;
}
function assertRoom(level, qty) {
  if (levelRoom(level) < qty) throw new Error("Capacity exhausted");
}

// features/keystone/lib/cash-drawer.ts
var DENOMINATIONS = [["100", 1e4], ["50", 5e3], ["20", 2e3], ["10", 1e3], ["5", 500], ["1", 100], ["coins", 1]];
var MAX_FLOAT_CENTS = 1e6;
function drawerOpenKey(userId) {
  return `user:${userId}`;
}
function assertFloat(cents2) {
  if (!Number.isSafeInteger(cents2) || cents2 < 0 || cents2 > MAX_FLOAT_CENTS) throw new Error("Opening float must be whole cents up to $10,000");
  return cents2;
}
function countedFromSheet(sheet) {
  if (!sheet || typeof sheet !== "object" || Array.isArray(sheet)) throw new Error("Count every denomination");
  let total = 0;
  for (const [k, v] of Object.entries(sheet)) {
    const d = DENOMINATIONS.find(([name2]) => name2 === k);
    if (!d) throw new Error(`Unknown denomination ${k}`);
    if (!Number.isSafeInteger(v) || v < 0) throw new Error(`Count for ${k} must be a whole number`);
    total += d[1] * v;
  }
  return total;
}
function expectedCash(d) {
  return d.openingFloatCents + d.cashSalesCents - d.cashRefundsCents;
}
function closeOut(d, countedCents, reason) {
  const expectedCents = expectedCash(d);
  const varianceCents = countedCents - expectedCents;
  if (varianceCents !== 0 && !reason.trim()) throw new Error(`Drawer is ${varianceCents > 0 ? "over" : "short"} by $${(Math.abs(varianceCents) / 100).toFixed(2)}; give a reason`);
  return { expectedCents, varianceCents };
}
function overrideReason(reason) {
  const r = String(reason || "").trim();
  if (!r) throw new Error("Say why you are closing this drawer for the cashier");
  if (r.length > 300) throw new Error("Reason is too long");
  return r;
}

// features/keystone/mutations/cashDrawers.ts
function guard(context, input) {
  if (!permissions.canManageOrders({ session: context.session })) throw new Error("Permission required: canManageOrders");
  if (!input?.idempotencyKey) throw new Error("Idempotency key required");
  return context.session.itemId;
}
async function openCashDrawer(_, { input }, context) {
  const actor = guard(context, input);
  const label = String(input.label || "").trim();
  if (!label || label.length > 60) throw new Error("Drawer name required");
  const float = assertFloat(input.openingFloatCents);
  return command(context, { operation: "openCashDrawer", idempotencyKey: input.idempotencyKey, lock: `drawer:${actor}`, params: { label, float } }, async (tx) => {
    if (await tx.cashDrawer.findUnique({ where: { openKey: drawerOpenKey(actor) } })) throw new Error("You already have an open drawer; close it first");
    const row = await tx.cashDrawer.create({ data: { label, status: "open", openKey: drawerOpenKey(actor), openingFloatCents: float, openedAt: /* @__PURE__ */ new Date(), openedById: actor } });
    await appendAuditEvent(tx, actor, { action: "drawer.opened", targetList: "CashDrawer", targetId: row.id, after: { label, openingFloatCents: float } });
    return { id: row.id, status: "open" };
  });
}
async function closeCashDrawer(_, { input }, context) {
  const actor = guard(context, input);
  const counted = countedFromSheet(input.count);
  const reason = String(input.reason || "").trim();
  return command(context, { operation: "closeCashDrawer", idempotencyKey: input.idempotencyKey, lock: `drawer:${actor}`, params: { drawerId: input.drawerId, count: input.count, reason } }, async (tx) => {
    const closed = await tx.cashDrawer.updateMany({ where: { id: input.drawerId, status: "open", openedById: actor }, data: { status: "closed", openKey: null, closedAt: /* @__PURE__ */ new Date(), closedById: actor } });
    if (closed.count !== 1) throw new Error("Only your own open drawer can be closed");
    const d = await tx.cashDrawer.findUnique({ where: { id: input.drawerId } });
    const { expectedCents, varianceCents } = closeOut(d, counted, reason);
    await tx.cashDrawer.update({ where: { id: d.id }, data: { countedCents: counted, expectedCents, varianceCents, varianceReason: reason, count: input.count } });
    await appendAuditEvent(tx, actor, { action: "drawer.closed", targetList: "CashDrawer", targetId: d.id, after: { countedCents: counted, expectedCents, varianceCents }, reason });
    return { id: d.id, status: "closed", countedCents: counted, expectedCents, varianceCents };
  });
}
async function forceCloseCashDrawer(_, { input }, context) {
  if (!permissions.canApproveAdjustments({ session: context.session })) throw new Error("Permission required: canApproveAdjustments");
  if (!input?.idempotencyKey) throw new Error("Idempotency key required");
  const actor = context.session.itemId;
  const counted = countedFromSheet(input.count);
  const reason = overrideReason(input.reason);
  const found = await context.prisma.cashDrawer.findUnique({ where: { id: String(input.drawerId) }, select: { openedById: true } });
  if (!found?.openedById) throw new Error("Drawer not found");
  if (found.openedById === actor) throw new Error("Close your own drawer from the Cash drawer panel");
  return command(context, { operation: "forceCloseCashDrawer", idempotencyKey: input.idempotencyKey, lock: `drawer:${found.openedById}`, params: { drawerId: input.drawerId, count: input.count, reason } }, async (tx) => {
    const closed = await tx.cashDrawer.updateMany({ where: { id: input.drawerId, status: "open", openedById: found.openedById }, data: { status: "closed", openKey: null, closedAt: /* @__PURE__ */ new Date(), closedById: actor } });
    if (closed.count !== 1) throw new Error("That drawer is no longer open");
    const d = await tx.cashDrawer.findUnique({ where: { id: input.drawerId } });
    const { expectedCents, varianceCents } = closeOut(d, counted, reason);
    await tx.cashDrawer.update({ where: { id: d.id }, data: { countedCents: counted, expectedCents, varianceCents, varianceReason: reason, count: input.count } });
    await appendAuditEvent(tx, actor, { action: "drawer.closed_by_manager", targetList: "CashDrawer", targetId: d.id, before: { openedById: found.openedById }, after: { countedCents: counted, expectedCents, varianceCents }, reason });
    return { id: d.id, status: "closed", countedCents: counted, expectedCents, varianceCents };
  });
}
async function bookDrawer(tx, actor, field, cents2) {
  const drawer = await tx.cashDrawer.findUnique({ where: { openKey: drawerOpenKey(actor) } });
  if (!drawer) throw new Error("Open a cash drawer first");
  const r = await tx.cashDrawer.updateMany({ where: { id: drawer.id, status: "open" }, data: { [field]: { increment: cents2 } } });
  if (r.count !== 1) throw new Error("Cash drawer was closed; open a drawer");
  return drawer.id;
}

// features/keystone/mutations/doorSales.ts
async function activePhase(tx, levelId, qty) {
  const phases = await tx.priceLevelPhase.findMany({ where: { priceLevelId: levelId, startsAt: { lte: /* @__PURE__ */ new Date() } }, orderBy: { sort: "asc" } });
  const reserved = {};
  for (const p2 of phases) reserved[p2.id] = (await tx.inventoryHold.aggregate({ where: { phaseId: p2.id, status: "active" }, _sum: { quantity: true } }))._sum.quantity || 0;
  return pickPhase(phases, reserved, qty);
}
async function previewDoorSale(_, { input }, context) {
  if (!permissions.canManageOrders({ session: context.session })) throw new Error("Permission required: canManageOrders");
  const kind = input.comp ? "comp" : "door";
  const qty = assertDoorQuantity(input.qty, kind === "comp" ? MAX_COMP_QTY : void 0);
  const level = await context.prisma.priceLevel.findUnique({ where: { id: input.levelId }, include: { event: { include: { venue: true } } } });
  if (!level || level.eventId !== input.eventId) throw new Error("Invalid price level");
  const phase = kind === "door" ? await activePhase(context.prisma, level.id, qty) : null;
  const { unitPriceCents, quote } = priceDoorSale(kind, level, phase, qty, level.event.venue.taxBps);
  return { unitPriceCents, phaseName: phase?.name || "", ...quote };
}
async function issue(kind, input, context) {
  if (!permissions.canManageOrders({ session: context.session })) throw new Error("Permission required: canManageOrders");
  if (!input?.idempotencyKey) throw new Error("Idempotency key required");
  const actor = context.session.itemId;
  const name2 = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const reason = String(input.reason || "").trim();
  if (!name2) throw new Error("Name required");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Valid email required");
  if (kind === "comp" && !reason) throw new Error("Reason required for a comp");
  const seatIds = input.seatInventoryIds?.length ? input.seatInventoryIds : null;
  if (seatIds && (new Set(seatIds).size !== seatIds.length || seatIds.length !== input.qty)) throw new Error("Pick one distinct seat per ticket");
  const qty = assertDoorQuantity(input.qty, kind === "comp" ? MAX_COMP_QTY : void 0);
  return command(context, { operation: kind === "comp" ? "issueComp" : "issueDoorSale", idempotencyKey: input.idempotencyKey, lock: `event:${input.eventId}`, params: { eventId: input.eventId, levelId: input.levelId, qty, seatIds, name: name2, email, reason, tender: input.tender } }, async (tx) => {
    await expireHolds(tx, input.eventId);
    const event = await tx.event.findUnique({ where: { id: input.eventId }, include: { venue: true } });
    if (!event || !DOOR_STATUSES.includes(event.status)) throw new Error("Event is not selling");
    const level = await tx.priceLevel.findUnique({ where: { id: input.levelId }, include: { sections: true } });
    if (!level || level.eventId !== event.id || level.status !== "active") throw new Error("Invalid price level");
    const reserved = level.sections.some((s) => s.kind !== "ga");
    if (reserved && !seatIds) throw new Error("Pick seats for a reserved level");
    if (!reserved && seatIds) throw new Error("General admission has no seats to pick");
    const seats = seatIds ? await tx.seatInventory.findMany({ where: { id: { in: seatIds }, eventId: event.id }, include: { seat: true } }) : [];
    if (seatIds && (seats.length !== seatIds.length || seats.some((s) => s.status !== "open" || s.priceLevelId !== level.id))) throw new Error("A picked seat is no longer open in this level");
    if (event.ageRestriction !== "all_ages" && kind === "door" && !input.ageAttested) throw new Error("Age confirmation required");
    assertRoom(level, qty);
    for (const section of level.sections) {
      const siblings = await tx.priceLevel.findMany({ where: { eventId: event.id, sections: { some: { id: section.id } } } });
      if (section.kind === "ga" && siblings.reduce((n, l) => n + l.sold + l.held + l.productionHeld, 0) + qty > section.capacity) throw new Error("Section capacity exhausted");
    }
    const phase = kind === "door" ? await activePhase(tx, level.id, qty) : null;
    const { unitPriceCents: unit, quote } = priceDoorSale(kind, level, phase, qty, event.venue.taxBps);
    const tender = kind === "door" ? settleTender(quote.totalCents, input.tender) : null;
    const order = await tx.ticketOrder.create({ data: { orderNumber: humanCode("CN"), guestEmail: email, guestName: name2, secretKey: digest(opaqueToken()), ...quote, currencyCode: level.currencyCode, ageAttested: kind === "door" ? !!input.ageAttested : false, status: kind === "comp" ? "comp" : "paid", source: kind === "comp" ? "comp" : "box_office", eventId: event.id, customerId: null, discountSnapshot: kind === "comp" ? { comp: true, reason } : void 0 } });
    const line = await tx.ticketOrderLine.create({ data: { orderId: order.id, title: event.title, levelName: level.name, phaseName: phase?.name || "", seatLabel: seats.map((s) => s.seat.label).join(", "), unitPriceCents: unit, serviceFeeCents: 0, facilityFeeCents: level.facilityFeeCents, taxCents: quote.taxCents, quantity: qty, discountCents: 0, totalCents: quote.totalCents, currencyCode: level.currencyCode, priceLevelId: level.id, phaseId: phase?.id } });
    const tickets = [];
    for (let i = 0; i < qty; i++) {
      const token = opaqueToken();
      const ticketCode = humanCode("TK");
      const seat = seats[i];
      if (seat) {
        const taken = await tx.seatInventory.updateMany({ where: { id: seat.id, status: "open" }, data: { status: "sold", holdKey: "", occupancyKey: `${event.id}:${seat.seatId}` } });
        if (taken.count !== 1) throw new Error("A picked seat is no longer open in this level");
      }
      await tx.ticket.create({ data: { orderId: order.id, eventId: event.id, lineId: line.id, seatInventoryId: seat?.id, ticketCode, tokenHash: digest(token), holderName: name2, holderEmail: email, status: "valid" } });
      tickets.push({ ticketCode, token, seat: seat?.seat.label || "" });
    }
    const lvl = await tx.priceLevel.updateMany({ where: { id: level.id, sold: level.sold }, data: { sold: { increment: qty } } });
    if (lvl.count !== 1) throw new Error("Level counters changed; retry");
    if (phase) await tx.priceLevelPhase.update({ where: { id: phase.id }, data: { sold: { increment: qty } } });
    const drawerId = tender?.method === "cash" ? await bookDrawer(tx, actor, "cashSalesCents", quote.totalCents) : null;
    if (tender) await tx.payment.create({ data: { idempotencyKey: `door:${input.idempotencyKey}`, amount: quote.totalCents, currencyCode: level.currencyCode, status: "succeeded", paymentMethod: tender.method, orderId: order.id, processedAt: /* @__PURE__ */ new Date(), notes: tender.method === "cash" ? "Door cash" : "Door card terminal", data: { channel: "door", drawerId, changeCents: tender.changeCents, tenderedCents: input.tender?.tenderedCents ?? null, terminalReference: tender.reference } } });
    await appendAuditEvent(tx, actor, { action: kind === "comp" ? "order.comp_issued" : "order.door_sale", targetList: "TicketOrder", targetId: order.id, after: { qty, seats: seats.map((s) => s.seat.label), totalCents: quote.totalCents, tender: tender?.method ?? "comp" }, reason });
    return { orderId: order.id, orderNumber: order.orderNumber, status: order.status, totalCents: quote.totalCents, changeCents: tender?.changeCents ?? 0, tickets };
  });
}
var issueDoorSale = (_, { input }, context) => issue("door", input, context);
var issueComp = (_, { input }, context) => issue("comp", input, context);

// features/keystone/mutations/doorRefunds.ts
init_paymentState();
async function refundDoorSale(_, { input }, context) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error("Permission required: canIssueRefunds");
  const { orderId, idempotencyKey, approvalId } = input;
  const reason = String(input.reason || "").trim();
  if (!idempotencyKey || !reason) throw new Error("Reason and idempotency key required");
  if (!approvalId) throw new Error("A different manager must approve this cash refund");
  const actor = context.session.itemId;
  const order0 = await context.prisma.ticketOrder.findUnique({ where: { id: orderId } });
  if (!order0) throw new Error("Order not found");
  return command(context, { operation: "refundDoorSale", idempotencyKey, lock: `event:${order0.eventId}`, params: { orderId, amountCents: input.amountCents, reason, approvalId } }, async (tx) => {
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    if (!order || order.source !== "box_office" || !["paid", "partially_refunded"].includes(order.status)) throw new Error("Order is not a refundable door sale");
    const payment = await tx.payment.findFirst({ where: { orderId, status: { in: ["succeeded", "partially_refunded"] } } });
    if (!payment || payment.providerPaymentId) throw new Error("Not a door cash or terminal payment");
    const rows = await tx.refund.findMany({ where: { paymentId: payment.id, status: { in: ["processing", "unknown", "succeeded"] } } });
    const available = payment.amount - rows.reduce((n, r) => n + r.amount, 0);
    const amount = input.amountCents ?? available;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > available) throw new Error("Refund exceeds unrefunded balance");
    const approval = await tx.managerApproval.findUnique({ where: { id: approvalId } });
    assertApprovalUsable(approval, { actorId: actor, fingerprint: refundApprovalFingerprint(refundApprovalPayload(orderId, amount, reason, "cash_refund")) });
    const consumed = await tx.managerApproval.updateMany({ where: { id: approvalId, status: "approved", expiresAt: { gt: /* @__PURE__ */ new Date() } }, data: { status: "consumed", consumedAt: /* @__PURE__ */ new Date(), consumedEntityType: "TicketOrder", consumedEntityId: orderId } });
    if (consumed.count !== 1) throw new Error("Approval was already used or expired");
    const drawerId = payment.paymentMethod === "cash" ? await bookDrawer(tx, actor, "cashRefundsCents", amount) : null;
    const refund = await tx.refund.create({ data: { idempotencyKey: `door-refund:${idempotencyKey}`, amount, currencyCode: payment.currencyCode, status: "succeeded", reason, paymentId: payment.id, orderId, requestedById: actor, approvedById: approval.approvedById, processedAt: /* @__PURE__ */ new Date(), providerData: { channel: "door", method: payment.paymentMethod, drawerId } } });
    const total = successfulRefundTotal([...rows.filter((r) => r.status === "succeeded"), refund]);
    const full = total >= order.totalCents;
    await tx.payment.update({ where: { id: payment.id }, data: { refundedAmount: total, status: full ? "refunded" : "partially_refunded" } });
    await tx.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: total, status: full ? "refunded" : "partially_refunded" } });
    if (full) {
      const tickets = await tx.ticket.findMany({ where: { orderId, status: { in: ["valid", "checked_in"] } } });
      for (const t of tickets) {
        await tx.ticket.update({ where: { id: t.id }, data: { status: "refunded", tokenHash: "" } });
        if (t.seatInventoryId) await tx.seatInventory.updateMany({ where: { id: t.seatInventoryId, status: "sold" }, data: { status: "open", occupancyKey: null } });
      }
      const lines = await tx.ticketOrderLine.findMany({ where: { orderId } });
      for (const l of lines) {
        await tx.priceLevel.update({ where: { id: l.priceLevelId }, data: { sold: { decrement: l.quantity } } });
        if (l.phaseId) await tx.priceLevelPhase.update({ where: { id: l.phaseId }, data: { sold: { decrement: l.quantity } } });
      }
    }
    await appendAuditEvent(tx, actor, { action: "refund.door_cash", targetList: "Refund", targetId: refund.id, after: { amount, total, full, approvalId, method: payment.paymentMethod }, reason });
    return { refundId: refund.id, status: "succeeded", amountCents: amount, full };
  });
}

// features/keystone/mutations/editors.ts
async function eventOf(prisma, input) {
  if (input.levelId) {
    const r = await prisma.priceLevel.findUnique({ where: { id: input.levelId } });
    if (!r?.eventId) throw new Error("Price level not found");
    return r.eventId;
  }
  if (input.phaseId) {
    const r = await prisma.priceLevelPhase.findUnique({ where: { id: input.phaseId }, include: { priceLevel: true } });
    if (!r?.priceLevel?.eventId) throw new Error("Phase not found");
    return r.priceLevel.eventId;
  }
  if (input.expenseId) {
    const r = await prisma.eventExpense.findUnique({ where: { id: input.expenseId } });
    if (!r?.eventId) throw new Error("Expense not found");
    return r.eventId;
  }
  if (input.offerId) {
    const r = await prisma.offer.findUnique({ where: { id: input.offerId } });
    if (!r?.eventId) throw new Error("Offer not found");
    return r.eventId;
  }
  if (!input.eventId) throw new Error("Event required");
  return input.eventId;
}
function editor(operation, permission, run) {
  return async (_, { input }, context) => {
    authorize(context, permission);
    if (!input?.idempotencyKey) throw new Error("Idempotency key required");
    const actor = context.session.itemId;
    const eventId = await eventOf(context.prisma, input);
    const data = input.data || {};
    return command(context, { operation, idempotencyKey: input.idempotencyKey, lock: `event:${eventId}`, params: { ...input, eventId } }, async (tx) => {
      const audit = (list44, id, before, after, reason = "") => appendAuditEvent(tx, actor, { action: operation, targetList: list44, targetId: id, before, after, reason });
      return run(tx, { input, data, eventId, actor, audit });
    });
  };
}
async function openEvent(tx, eventId) {
  const event = await tx.event.findUnique({ where: { id: eventId }, include: { seatingChart: { include: { chartSection_chart: true } } } });
  if (!event) throw new Error("Event not found");
  if (!PRICING_OPEN.includes(event.status)) throw new Error(`Pricing is closed once the event is ${event.status.replace(/_/g, " ")}`);
  return event;
}
var savePriceLevel = editor("savePriceLevel", "canManageEvents", async (tx, { input, data, eventId, audit }) => {
  const event = await openEvent(tx, eventId);
  await expireHolds(tx, eventId);
  const existing = input.levelId ? await tx.priceLevel.findUnique({ where: { id: input.levelId }, include: { sections: true } }) : null;
  if (existing?.status === "closed") throw new Error("A closed level cannot be edited");
  const level = validateLevel(data, existing || void 0);
  const chartSections = event.seatingChart?.chartSection_chart || [];
  const wanted = Array.isArray(data.sectionIds) ? [...new Set(data.sectionIds)] : existing ? existing.sections.map((s) => s.id) : [];
  if (!wanted.length) throw new Error("Choose at least one section");
  const sections = wanted.map((id) => chartSections.find((s) => s.id === id));
  if (sections.some((s) => !s)) throw new Error("Sections must belong to the event chart");
  const before = existing ? [...existing.sections.map((s) => s.id)].sort().join(",") : "";
  const sectionsChanged = before !== [...wanted].sort().join(",");
  if (event.status !== "hold" && sectionsChanged && (existing?.sections.some((s) => s.kind === "reserved") || sections.some((s) => s.kind === "reserved"))) throw new Error("Reserved seat assignments are fixed after publishing; add a general admission level instead");
  if (existing && existing.sold + existing.held > 0 && sectionsChanged) throw new Error("Sections cannot change once tickets are sold or held");
  if (sections.some((s) => s.kind === "reserved") && sections.some((s) => s.kind === "ga")) throw new Error("A level is either general admission or reserved, not both");
  const room = sections.reduce((n, s) => n + (s.capacity || 0), 0);
  if (level.capacity > room) throw new Error(`Capacity exceeds the chosen sections (${room})`);
  const payload = { ...level, sections: { set: wanted.map((id) => ({ id })) } };
  const row = existing ? await tx.priceLevel.update({ where: { id: existing.id }, data: payload }) : await tx.priceLevel.create({ data: { ...level, eventId, status: "active", currencyCode: "USD", sections: { connect: wanted.map((id) => ({ id })) } } });
  await audit("PriceLevel", row.id, existing ? { name: existing.name, priceCents: existing.priceCents, feeCents: existing.feeCents, facilityFeeCents: existing.facilityFeeCents, capacity: existing.capacity, perOrderLimit: existing.perOrderLimit, sections: before } : null, { ...level, sections: wanted.join(",") });
  return { id: row.id };
});
var setPriceLevelStatus = editor("setPriceLevelStatus", "canManageEvents", async (tx, { input, data, eventId, actor }) => {
  await openEvent(tx, eventId);
  const level = await tx.priceLevel.findUnique({ where: { id: input.levelId } });
  if (!LEVEL_STATUSES.includes(data.status)) throw new Error("Unknown level status");
  if (level.status === data.status) throw new Error(`Level is already ${data.status}`);
  if (level.status === "closed") throw new Error("A closed level stays closed; add a new level");
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (data.status !== "active" && ["presale", "on_sale"].includes(event.status) && await tx.priceLevel.count({ where: { eventId, status: "active", id: { not: level.id } } }) === 0) throw new Error("Keep one active level while sales are open, or mark the event sold out");
  await transition(tx, "priceLevel", level.id, level.status, data.status, actor, String(data.reason || ""));
  return { id: level.id, status: data.status };
});
var savePricePhase = editor("savePricePhase", "canManageEvents", async (tx, { input, data, eventId, audit }) => {
  await openEvent(tx, eventId);
  await expireHolds(tx, eventId);
  const existing = input.phaseId ? await tx.priceLevelPhase.findUnique({ where: { id: input.phaseId } }) : null;
  const levelId = existing?.priceLevelId || input.levelId;
  const level = await tx.priceLevel.findUnique({ where: { id: levelId } });
  if (!level || level.eventId !== eventId) throw new Error("Price level not found");
  const reserved = existing ? (await tx.inventoryHold.aggregate({ where: { phaseId: existing.id, status: "active" }, _sum: { quantity: true } }))._sum.quantity || 0 : 0;
  const phase = validatePhase(data, { sold: existing?.sold || 0, reserved });
  if (existing && existing.sold > 0 && phase.priceCents !== existing.priceCents) throw new Error("Price is fixed once a phase has sales; add a new phase");
  const siblings = await tx.priceLevelPhase.findMany({ where: { priceLevelId: level.id, id: existing ? { not: existing.id } : void 0 } });
  if (siblings.some((p2) => p2.name.toLowerCase() === phase.name.toLowerCase())) throw new Error(`Phase ${phase.name} already exists`);
  if (siblings.reduce((n, p2) => n + p2.quantity, 0) + phase.quantity > level.capacity) throw new Error(`Phase quantities exceed level capacity (${level.capacity})`);
  const row = existing ? await tx.priceLevelPhase.update({ where: { id: existing.id }, data: phase }) : await tx.priceLevelPhase.create({ data: { ...phase, startsAt: phase.startsAt || /* @__PURE__ */ new Date(), priceLevelId: level.id, currencyCode: level.currencyCode } });
  await audit("PriceLevelPhase", row.id, existing ? { name: existing.name, priceCents: existing.priceCents, quantity: existing.quantity, sort: existing.sort } : null, { ...phase, levelId: level.id });
  return { id: row.id };
});
async function settlementOpen(tx, eventId) {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  if (["cancelled", "settled"].includes(event.status)) throw new Error(`Event is ${event.status}`);
  if (await tx.settlement.count({ where: { eventId, status: { in: FROZEN_SETTLEMENT } } })) throw new Error("Settlement is signed; correct it with an approved adjustment");
  return event;
}
var saveExpense = editor("saveExpense", "canManageSettlements", async (tx, { input, data, eventId, audit }) => {
  await settlementOpen(tx, eventId);
  const existing = input.expenseId ? await tx.eventExpense.findUnique({ where: { id: input.expenseId } }) : null;
  const expense = validateExpense(data);
  const row = existing ? await tx.eventExpense.update({ where: { id: existing.id }, data: expense }) : await tx.eventExpense.create({ data: { ...expense, eventId } });
  await audit("EventExpense", row.id, existing ? { category: existing.category, vendor: existing.vendor, budgetCents: existing.budgetCents, actualCents: existing.actualCents, isCapped: existing.isCapped } : null, expense);
  return { id: row.id };
});
async function ensureBilling(tx, eventId, artistId, billing) {
  const found = await tx.eventArtist.findFirst({ where: { eventId, artistId } });
  if (found) return found;
  if (!["headliner", "co_headliner", "support", "opener"].includes(billing)) throw new Error("Unknown billing");
  const last = await tx.eventArtist.findFirst({ where: { eventId }, orderBy: { position: "desc" } });
  return tx.eventArtist.create({ data: { eventId, artistId, billing, position: (last?.position || 0) + 1 } });
}
var draftOffer = editor("draftOffer", "canManageDeals", async (tx, { input, data, eventId, audit }) => {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event || ["completed", "settling", "settled", "cancelled"].includes(event.status)) throw new Error("Offers can be drafted until the show is over");
  const artist = input.artistId ? await tx.artist.findUnique({ where: { id: input.artistId } }) : null;
  if (!artist) throw new Error("Artist required");
  if (await tx.offer.count({ where: { eventId, artistId: artist.id, status: { in: LIVE_OFFER } } })) throw new Error(`${artist.name} already has a live offer for this event; revise it instead`);
  const terms = validateTerms(data);
  const billing = await ensureBilling(tx, eventId, artist.id, data.billing || "support");
  const latest = await tx.offer.findFirst({ where: { eventId, artistId: artist.id }, orderBy: { version: "desc" } });
  const version = (latest?.version || 0) + 1;
  const row = await tx.offer.create({ data: { ...terms, eventId, artistId: artist.id, eventArtistId: billing.id, version, status: "draft", currencyCode: "USD" } });
  await audit("Offer", row.id, null, { ...terms, version });
  return { id: row.id, status: "draft", version };
});
var updateDraftOffer = editor("updateDraftOffer", "canManageDeals", async (tx, { input, data, audit }) => {
  const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
  if (offer.status !== "draft") throw new Error("Only a draft can be edited; revise a sent or accepted offer");
  const terms = validateTerms(data);
  const updated = await tx.offer.updateMany({ where: { id: offer.id, status: "draft" }, data: terms });
  if (updated.count !== 1) throw new Error("Offer changed; reload");
  await audit("Offer", offer.id, termsOf(offer), terms);
  return { id: offer.id, status: "draft", version: offer.version };
});
var reviseOffer = editor("reviseOffer", "canManageDeals", async (tx, { input, data, eventId, actor, audit }) => {
  const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
  if (!REVISABLE.includes(offer.status)) throw new Error(offer.status === "draft" ? "Edit the draft instead" : "Contracted and settled terms are binding; correct them through a settlement adjustment");
  const reason = String(data.reason || "").trim();
  if (!reason) throw new Error("Revision reason required");
  if (await tx.offer.count({ where: { eventId, artistId: offer.artistId, status: "draft" } })) throw new Error("A draft version already exists");
  if (await tx.settlement.count({ where: { eventId, status: { in: FROZEN_SETTLEMENT } } })) throw new Error("Settlement is signed; correct it with an approved adjustment");
  const terms = validateTerms(data);
  const latest = await tx.offer.findFirst({ where: { eventId, artistId: offer.artistId }, orderBy: { version: "desc" } });
  const version = (latest?.version || offer.version) + 1;
  const row = await tx.offer.create({ data: { ...terms, eventId, artistId: offer.artistId, eventArtistId: offer.eventArtistId, version, status: "draft", currencyCode: offer.currencyCode } });
  if (offer.status !== "declined") await transition(tx, "offer", offer.id, offer.status, "superseded", actor, reason, { notes: [offer.notes, `Superseded by version ${version}`].filter(Boolean).join("\n") });
  await audit("Offer", row.id, { previousOfferId: offer.id, version: offer.version }, { ...terms, version }, reason);
  return { id: row.id, status: "draft", version, previousOfferId: offer.id };
});
var recordArtistDeposit = editor("recordArtistDeposit", "canManageSettlements", async (tx, { data, eventId, actor }) => {
  await settlementOpen(tx, eventId);
  const amountCents = cents(data.amountCents, "Deposit", { min: 1 });
  const reference = String(data.reference || "").trim();
  if (reference.length < 3) throw new Error("Payment reference required");
  const method = ["wire", "ach", "check", "cash"].includes(data.method) ? data.method : null;
  if (!method) throw new Error("Choose wire, ACH, check or cash");
  const offers = await tx.offer.findMany({ where: { eventId, status: { in: ["accepted", "contracted"] } } });
  if (!offers.length) throw new Error("Accepted or contracted deal required");
  const agreed = offers.reduce((n, o) => n + (o.acceptedTerms?.depositCents || 0), 0);
  const paid = (await tx.artistPayment.aggregate({ where: { kind: "deposit", status: "paid", settlement: { eventId } }, _sum: { amountCents: true } }))._sum.amountCents || 0;
  if (paid + amountCents > agreed) throw new Error(`Deposit exceeds the agreed deposit ($${((agreed - paid) / 100).toFixed(2)} left)`);
  if (await tx.artistPayment.count({ where: { reference, settlement: { eventId } } })) throw new Error("Reference already recorded");
  let holder = await tx.settlement.findFirst({ where: { eventId, version: 0, hash: "deposit-holder" } });
  if (!holder) holder = await tx.settlement.create({ data: { eventId, status: "void", version: 0, hash: "deposit-holder", computedSnapshot: {} } });
  const row = await tx.artistPayment.create({ data: { settlementId: holder.id, kind: "deposit", amountCents, status: "paid", method, reference } });
  await appendAuditEvent(tx, actor, { action: "artistPayment.deposit", targetList: "ArtistPayment", targetId: row.id, after: { amountCents, method, reference } });
  return { id: row.id, status: "paid", depositsPaidCents: paid + amountCents, agreedCents: agreed };
});
var editorMutations = { savePriceLevel, setPriceLevelStatus, savePricePhase, saveExpense, draftOffer, updateDraftOffer, reviseOffer, recordArtistDeposit };

// features/keystone/mutations/updateActiveUser.ts
async function updateActiveUser(root, { data }, context) {
  const profileContext = context;
  const session = context.session;
  if (!isSignedIn({ session })) {
    throw new Error("Not authenticated");
  }
  const existingUser = await profileContext.query.User.findOne({
    where: { id: session.itemId }
  });
  if (!existingUser) {
    throw new Error("User not found");
  }
  const allowed = /* @__PURE__ */ new Set(["email", "name", "phone", "password", "onboardingStatus"]);
  if (Object.keys(data || {}).some((key) => !allowed.has(key))) throw new Error("Unsupported profile field");
  return await profileContext.db.User.updateOne({
    where: { id: session.itemId },
    data
  });
}
var updateActiveUser_default = updateActiveUser;

// features/keystone/mutations/seedConcerts.ts
var import_node_crypto6 = require("node:crypto");
var DAY = 864e5;
function zoned(days, hour, timeZone) {
  const parts = (d) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(d).map((p2) => [p2.type, Number(p2.value)]));
  const offset = (instant2) => {
    const p2 = parts(new Date(instant2));
    return Date.UTC(p2.year, p2.month - 1, p2.day, p2.hour, p2.minute, p2.second) - instant2;
  };
  const day = parts(new Date(Date.now() + days * DAY));
  const wall = Date.UTC(day.year, day.month - 1, day.day, hour);
  let instant = wall - offset(wall);
  instant = wall - offset(instant);
  return new Date(instant);
}
var at = (days, hour = 20) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};
async function seedConcerts(_, { section, data }, context) {
  if (!permissions.canManageOnboarding({ session: context.session })) throw new Error("Permission required: canManageOnboarding");
  const actor = context.session.itemId;
  return context.prisma.$transaction(async (raw) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, "onboarding:concerts");
    const one = async (model, where, create) => await tx[model].findFirst({ where }) || tx[model].create({ data: create });
    if (section === "settings") {
      const row = await one("storeSettings", {}, { name: data.name, currencyCode: data.currencyCode, refundApprovalThresholdCents: data.refundApprovalThresholdCents, logoIcon: data.logoIcon || DEFAULT_STORE_LOGO_ICON, logoColor: data.logoColor || DEFAULT_STORE_LOGO_COLOR });
      return { id: row.id };
    }
    if (section === "role") {
      const flags = Object.fromEntries(permissionNames.map((n) => [n, data.all ? true : (data.permissions || []).includes(n)]));
      const row = await one("role", { name: data.name }, { name: data.name, ...flags });
      return { id: row.id };
    }
    if (section === "venue") {
      const venue = await one("venue", { name: data.name }, { name: data.name, city: data.city, timezone: data.timezone, address: data.address, contact: data.contact, capacity: data.capacity, ownedByPromoter: data.ownedByPromoter, taxBps: data.taxBps, defaultFacilityFeeCents: data.defaultFacilityFeeCents, rentTermsDefault: { rentBasis: "flat" } });
      if (await tx.seatingChart.findFirst({ where: { venueId: venue.id, name: data.chart.name } })) return { id: venue.id };
      const chart = await tx.seatingChart.create({ data: { venueId: venue.id, name: data.chart.name, version: 1, status: "draft" } });
      let sort = 0;
      for (const s of data.chart.sections) {
        const reserved = s.kind === "reserved";
        const section2 = await tx.chartSection.create({ data: { chartId: chart.id, name: s.name, kind: s.kind, sort: sort++, capacity: reserved ? s.rows * s.seatsPerRow : s.capacity } });
        if (!reserved) continue;
        const seats = [];
        for (let r = 0; r < s.rows; r++) for (let n = 1; n <= s.seatsPerRow; n++) {
          const row = String.fromCharCode(65 + r % 26) + (r >= 26 ? String(Math.floor(r / 26)) : "");
          const killed = r === 0 && n === 1 && s.name === "Orchestra";
          seats.push({ chartSectionId: section2.id, row, number: String(n), label: `${s.name.slice(0, 4).toUpperCase()} ${row}-${n}`, x: n, y: r, accessible: n <= 2 && r === s.rows - 1, companion: n === 3 && r === s.rows - 1, obstructed: false, status: killed ? "killed" : "sellable" });
        }
        await tx.seat.createMany({ data: seats });
      }
      await tx.seatingChart.update({ where: { id: chart.id }, data: { status: "published" } });
      return { id: venue.id };
    }
    if (section === "agency") {
      const row = await one("agency", { name: data.name }, { name: data.name, contacts: data.contacts });
      return { id: row.id };
    }
    if (section === "artist") {
      const agency = await tx.agency.findFirst({ where: { name: data.agency } });
      const row = await one("artist", { name: data.name }, { name: data.name, genreTags: data.genreTags, agentName: data.agentName, agentEmail: data.agentEmail, agencyId: agency?.id });
      return { id: row.id };
    }
    if (section === "tour") {
      const artist = await tx.artist.findFirst({ where: { name: data.artist } });
      const row = await one("tour", { name: data.name }, { name: data.name, artistId: artist.id, startAt: at(data.startDays), endAt: at(data.endDays) });
      return { id: row.id };
    }
    if (section === "promo") {
      const event = data.eventTitle ? await tx.event.findFirst({ where: { title: data.eventTitle } }) : null;
      const row = await one("promoCode", { code: data.code }, { code: data.code, discountType: data.discountType, value: data.value, maxUses: data.maxUses, status: "active", eventId: event?.id });
      return { id: row.id };
    }
    if (section === "provider") {
      const row = await one("paymentProvider", { code: data.code }, { name: data.name, code: data.code, isInstalled: true, createPaymentFunction: "stripe", capturePaymentFunction: "stripe", refundPaymentFunction: "stripe", getPaymentStatusFunction: "stripe", generatePaymentLinkFunction: "stripe", handleWebhookFunction: "stripe" });
      return { id: row.id };
    }
    if (section === "event") return seedEvent(tx, data, actor);
    if (section === "dateHold") {
      const venue = await tx.venue.findFirst({ where: { name: data.venue } });
      const artist = await tx.artist.findFirst({ where: { name: data.artist } });
      const date = at(data.days, 0);
      const rankKey = `${venue.id}:${date.toISOString().slice(0, 10)}:${data.rank}`;
      const existing = await tx.dateHold.findUnique({ where: { rankKey } });
      if (existing) return { id: existing.id };
      const event = data.confirmedTitle ? await tx.event.findFirst({ where: { title: data.confirmedTitle } }) : null;
      const row = await tx.dateHold.create({ data: { venueId: venue.id, artistId: artist?.id, date, rank: data.rank, rankKey, status: event ? "confirmed" : data.rank > 1 ? "challenged" : "held", expiresAt: at(14), eventId: event?.id } });
      return { id: row.id };
    }
    throw new Error("Unknown setup section");
  }, { timeout: 12e4 });
}
async function seedEvent(tx, e, actor) {
  const existing = await tx.event.findFirst({ where: { title: e.title } });
  if (existing) return { id: existing.id };
  const venue = await tx.venue.findFirst({ where: { name: e.venue } });
  const chart = await tx.seatingChart.findFirst({ where: { venueId: venue.id, name: e.chart }, include: { chartSection_chart: true } });
  const tour = e.tour ? await tx.tour.findFirst({ where: { name: e.tour } }) : null;
  const past = e.showDays < 0;
  const tz = venue.timezone || "America/Los_Angeles";
  const showAt = zoned(e.showDays, 20, tz);
  const event = await tx.event.create({ data: { title: e.title, venueId: venue.id, seatingChartId: chart.id, tourId: tour?.id, promoterId: actor, doorsAt: zoned(e.showDays, 19, tz), showAt, curfewAt: zoned(e.showDays, 23, tz), ageRestriction: e.ageRestriction || "all_ages", status: "hold", announceAt: at(e.showDays - 60), onSaleAt: e.status === "presale" ? at(7) : at(e.showDays - 55), presaleAt: e.presaleCode ? at(-3) : null, presaleCode: e.presaleCode || "", allowReentry: false, description: e.origin || "" } });
  const sectionByName = new Map(chart.chartSection_chart.map((s) => [s.name, s]));
  const levels = [];
  for (const l of e.levels) {
    const level = await tx.priceLevel.create({ data: { eventId: event.id, name: l.name, priceCents: l.priceCents, feeCents: l.feeCents, facilityFeeCents: venue.defaultFacilityFeeCents, capacity: l.capacity, status: "active", perOrderLimit: 8, sections: { connect: l.sections.map((n) => ({ id: sectionByName.get(n).id })) } } });
    let sort = 0;
    for (const p2 of l.phases || []) await tx.priceLevelPhase.create({ data: { priceLevelId: level.id, name: p2.name, priceCents: p2.priceCents, quantity: p2.quantity, sort: sort++, startsAt: at(-30) } });
    levels.push({ ...level, sectionNames: l.sections, phases: await tx.priceLevelPhase.findMany({ where: { priceLevelId: level.id }, orderBy: { sort: "asc" } }) });
  }
  if (e.status !== "hold") {
    const rows = [];
    for (const level of levels) for (const name2 of level.sectionNames) {
      const section = sectionByName.get(name2);
      if (section.kind !== "reserved") continue;
      for (const seat of await tx.seat.findMany({ where: { chartSectionId: section.id }, orderBy: [{ y: "asc" }, { x: "asc" }] })) rows.push({ id: (0, import_node_crypto6.randomUUID)(), eventId: event.id, seatId: seat.id, priceLevelId: level.id, eventSeatKey: `${event.id}:${seat.id}`, status: seat.status === "killed" ? "killed" : "open" });
    }
    if (rows.length) await tx.seatInventory.createMany({ data: rows });
  }
  const headliner = await tx.artist.findFirst({ where: { name: e.artist } });
  const ea = await tx.eventArtist.create({ data: { eventId: event.id, artistId: headliner.id, billing: "headliner", position: 1, setMinutes: 90, setTime: /* @__PURE__ */ new Date(+showAt + 18e5) } });
  let position = 2;
  for (const name2 of e.support || []) {
    const a = await tx.artist.findFirst({ where: { name: name2 } });
    await tx.eventArtist.create({ data: { eventId: event.id, artistId: a.id, billing: "support", position: position++, setMinutes: 45, setTime: new Date(+showAt - 18e5) } });
  }
  const stages = ["contracted", "accepted", "sent", "draft"];
  const index = ["p1", "p2", "p3"].includes(e.key) ? -1 : ["p4"].includes(e.key) ? -2 : Number(e.key.slice(1)) % stages.length;
  const offerStatus = index === -1 ? "settled" : index === -2 ? "contracted" : e.status === "hold" ? "draft" : stages[index];
  const base = { eventId: event.id, artistId: headliner.id, eventArtistId: ea.id, ...e.deal, version: 1, depositDueAt: at(e.showDays - 30), status: offerStatus };
  const offer = await tx.offer.create({ data: base });
  if (["accepted", "contracted", "settled"].includes(offerStatus)) {
    const terms = termsOf(offer);
    await tx.offer.update({ where: { id: offer.id }, data: { acceptedTerms: terms, acceptedTermsHash: canonicalDigest(terms) } });
  }
  for (const x of e.expenses || []) await tx.eventExpense.create({ data: { eventId: event.id, category: x.category, budgetCents: x.budgetCents, actualCents: past || e.past ? x.actualCents : 0, isCapped: x.isCapped, vendor: x.vendor } });
  for (const h of e.productionHolds || []) {
    const level = levels.find((l) => l.name === h.level);
    const hold = await tx.productionHold.create({ data: { eventId: event.id, priceLevelId: level.id, quantity: h.quantity, holdType: h.holdType, status: "active", releaseAt: at(e.showDays - 7) } });
    const open = await tx.seatInventory.findMany({ where: { eventId: event.id, priceLevelId: level.id, status: "open" }, orderBy: { id: "asc" }, take: h.quantity });
    for (const s of open) await tx.seatInventory.update({ where: { id: s.id }, data: { status: "reserved_hold", occupancyKey: `${event.id}:${s.seatId}` } });
    if (open.length) await tx.productionHold.update({ where: { id: hold.id }, data: { seats: { connect: open.map((s) => ({ id: s.id })) } } });
    await tx.priceLevel.update({ where: { id: level.id }, data: { productionHeld: { increment: h.quantity } } });
  }
  const target = past ? e.status === "postponed" ? "postponed" : "completed" : e.status;
  const orderPlan = past ? e.past : ["on_sale", "presale"].includes(e.status) ? { orders: 6, qty: 2 } : null;
  if (orderPlan && e.status !== "postponed" || e.status === "postponed") await sell(tx, event, venue, levels, e.status === "postponed" ? { orders: 5, qty: 2 } : orderPlan, past);
  if (past && e.past) {
    if (e.past.scanned) {
      const tickets = await tx.ticket.findMany({ where: { eventId: event.id } });
      await tx.ticket.updateMany({ where: { eventId: event.id }, data: { status: "checked_in" } });
      await tx.scanEvent.createMany({ data: tickets.map((t, i) => ({ ticketId: t.id, eventId: event.id, gate: i % 2 ? "Gate B" : "Gate A", scannedById: actor, at: new Date(+showAt - 18e5 + i * 1e3), result: "admitted" })) });
    }
    const terms = offer.acceptedTerms || termsOf(offer);
    await tx.merchSales.create({ data: { eventId: event.id, softGrossCents: e.past.merchSoft, hardGrossCents: e.past.merchHard, sellerFeeCents: 0, venueSoftSplitBps: terms.merchSplitBps, venueHardSplitBps: terms.hardMerchSplitBps, venueShareCents: percentage(e.past.merchSoft, terms.merchSplitBps).cents + percentage(e.past.merchHard, terms.hardMerchSplitBps).cents } });
    if (e.deal.depositCents) {
      const settlementless = await tx.settlement.create({ data: { eventId: event.id, status: "void", version: 0, hash: "deposit-holder", computedSnapshot: {} } });
      await tx.artistPayment.create({ data: { settlementId: settlementless.id, kind: "deposit", amountCents: e.deal.depositCents, status: "paid", method: "wire", reference: `DEP-${event.id.slice(-6).toUpperCase()}` } });
    }
    await tx.event.update({ where: { id: event.id }, data: { status: "completed" } });
    const settlement = await buildSettlement(tx, event.id, actor);
    if (e.past.settlement === "final") {
      const row = await tx.settlement.findUnique({ where: { id: settlement.id } });
      const sign = (who) => ({ actorId: actor, at: (/* @__PURE__ */ new Date()).toISOString(), hash: row.hash, who });
      const finalRow = await tx.settlement.update({ where: { id: row.id }, data: { status: "final", approvals: { signed_promoter: sign("promoter"), signed_artist: sign("artist"), final: sign("final") } } });
      if (finalRow.balanceDueArtistCents > 0) await applyArtistPayment(tx, finalRow, { kind: "balance", amountCents: finalRow.balanceDueArtistCents, status: "paid", method: "wire", reference: `BAL-${event.id.slice(-6).toUpperCase()}` }, actor);
      else await tx.event.update({ where: { id: event.id }, data: { status: "settled" } });
      await tx.offer.updateMany({ where: { eventId: event.id }, data: { status: "settled" } });
    }
  }
  await tx.event.update({ where: { id: event.id }, data: { status: e.past ? e.past.settlement === "final" ? "settled" : e.past.settlement ? "settling" : target : target, refundWindowEndsAt: e.status === "postponed" ? at(30) : null } });
  await appendAuditEvent(tx, actor, { action: "onboarding.event", targetList: "Event", targetId: event.id, after: { status: e.status } });
  return { id: event.id };
}
async function sell(tx, event, venue, levels, plan, past) {
  const level = levels[0];
  const phase = level.phases?.[0];
  const unit = phase?.priceCents ?? level.priceCents;
  const seatRows = await tx.seatInventory.findMany({ where: { eventId: event.id, priceLevelId: level.id, status: "open" }, orderBy: { id: "asc" }, take: plan.orders * plan.qty });
  const reserved = seatRows.length > 0;
  const orders = [], lines = [], tickets = [];
  let sold = 0, cursor = 0;
  for (let i = 0; i < plan.orders; i++) {
    const quote = ticketQuote({ priceCents: unit, feeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, quantity: plan.qty, taxBps: venue.taxBps });
    const id = (0, import_node_crypto6.randomUUID)(), lineId = (0, import_node_crypto6.randomUUID)();
    orders.push({ id, orderNumber: humanCode("CN"), guestEmail: `guest${i + 1}@mail.example`, guestName: `Guest ${i + 1}`, secretKey: digest(opaqueToken()), subtotalCents: quote.subtotalCents, serviceFeesCents: quote.serviceFeesCents, facilityFeesCents: quote.facilityFeesCents, taxCents: quote.taxCents, discountCents: 0, totalCents: quote.totalCents, status: "paid", source: "box_office", eventId: event.id, currencyCode: "USD" });
    lines.push({ id: lineId, orderId: id, title: event.title, levelName: level.name, phaseName: phase?.name || "", seatLabel: "", unitPriceCents: unit, serviceFeeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, taxCents: quote.taxCents, quantity: plan.qty, discountCents: 0, totalCents: quote.totalCents, priceLevelId: level.id, phaseId: phase?.id, currencyCode: "USD" });
    for (let q = 0; q < plan.qty; q++) {
      const seat = reserved ? seatRows[cursor++] : null;
      tickets.push({ orderId: id, eventId: event.id, lineId, seatInventoryId: seat?.id, ticketCode: humanCode("TK"), tokenHash: digest(opaqueToken()), holderName: `Guest ${i + 1}`, holderEmail: `guest${i + 1}@mail.example`, status: "valid" });
      sold++;
    }
  }
  if (sold > level.capacity - level.productionHeld) throw new Error("Setup sales exceed level capacity");
  await tx.ticketOrder.createMany({ data: orders });
  await tx.ticketOrderLine.createMany({ data: lines });
  await tx.ticket.createMany({ data: tickets });
  for (const s of seatRows.slice(0, cursor)) await tx.seatInventory.update({ where: { id: s.id }, data: { status: "sold", occupancyKey: `${event.id}:${s.seatId}` } });
  if (phase && sold > phase.quantity) throw new Error("Setup sales exceed the first pricing phase");
  await tx.priceLevel.update({ where: { id: level.id }, data: { sold: { increment: sold } } });
  if (phase) await tx.priceLevelPhase.update({ where: { id: phase.id }, data: { sold: { increment: sold } } });
}

// features/keystone/lib/constraint-errors.ts
var import_graphql = require("graphql");
var AMOUNT = "CONCERTS_INVALID_AMOUNT";
var CURRENCY = { code: "CONCERTS_INVALID_CURRENCY", message: "Currency must be a three-letter code, such as USD." };
var TIME = "CONCERTS_INVALID_TIME_RANGE";
var CONSTRAINT_MESSAGES = {
  PriceLevel_counts_valid: { code: "CONCERTS_CAPACITY_EXCEEDED", message: "Sold, held and blocked tickets can\u2019t exceed a price level\u2019s capacity." },
  PriceLevel_amounts_valid: { code: AMOUNT, message: "Ticket price and fees can\u2019t be negative, and an order must allow at least one ticket." },
  PriceLevel_sale_window: { code: TIME, message: "Ticket sales must end after they start." },
  PriceLevel_currency_code: CURRENCY,
  PriceLevelPhase_counts_valid: { code: "CONCERTS_CAPACITY_EXCEEDED", message: "A phase can\u2019t sell more than its quantity, and quantities and prices can\u2019t be negative." },
  PriceLevelPhase_currency_code: CURRENCY,
  ProductionHold_quantity_positive: { code: "CONCERTS_INVALID_QUANTITY", message: "A production hold must cover at least one ticket." },
  InventoryHold_quantity_positive: { code: "CONCERTS_INVALID_QUANTITY", message: "A hold must cover at least one ticket." },
  ChartSection_capacity_non_negative: { code: "CONCERTS_INVALID_CAPACITY", message: "Capacity can\u2019t be negative." },
  Event_time_order: { code: TIME, message: "Doors must open before the show, curfew must fall after it, and announce, presale and on-sale must be in that order." },
  Tour_time_order: { code: TIME, message: "A tour must end on or after its start date." },
  PromoCode_window: { code: TIME, message: "A promo must end after it starts." },
  Venue_amounts_valid: { code: AMOUNT, message: "Capacity and facility fees can\u2019t be negative, and tax must be between 0% and 100%." },
  Venue_currency_code: CURRENCY,
  Venue_timezone_valid: { code: "CONCERTS_INVALID_TIMEZONE", message: "That isn\u2019t a recognised time zone (leave it blank to use UTC). Use a name such as America/Chicago." },
  StoreSettings_amounts_valid: { code: AMOUNT, message: "The refund approval threshold can\u2019t be negative." },
  StoreSettings_currency_code: CURRENCY,
  TicketOrder_amounts_balance: { code: AMOUNT, message: "An order total must equal subtotal + fees + tax \u2212 discount, and a refund can\u2019t exceed it." },
  TicketOrder_currency_code: CURRENCY,
  TicketOrderLine_amounts_valid: { code: AMOUNT, message: "Ticket quantities must be at least one and amounts can\u2019t be negative." },
  TicketOrderLine_currency_code: CURRENCY,
  Payment_amounts_valid: { code: AMOUNT, message: "A payment must be positive, and refunds can\u2019t exceed it." },
  Payment_currency_code: CURRENCY,
  Refund_amount_positive: { code: AMOUNT, message: "A refund must be a positive amount." },
  Refund_currency_code: CURRENCY,
  Refund_within_payment: { code: "CONCERTS_REFUND_EXCEEDS_PAYMENT", message: "Refunds can\u2019t exceed what was paid, and must be in the payment\u2019s currency." },
  PromoCode_value_valid: { code: AMOUNT, message: "A promo value can\u2019t be negative, and a percentage can\u2019t pass 100%." },
  PromoCode_uses_valid: { code: "CONCERTS_PROMO_LIMIT", message: "A promo can\u2019t be used more times than its limit allows." },
  PromoRedemption_amount_non_negative: { code: AMOUNT, message: "A promo discount can\u2019t be negative." },
  CashDrawer_amounts_valid: { code: AMOUNT, message: "Drawer amounts can\u2019t be negative." },
  CashDrawer_currency_code: CURRENCY,
  Offer_terms_valid: { code: "CONCERTS_INVALID_TERMS", message: "Deal amounts can\u2019t be negative, and percentages and splits must be between 0% and 100%." },
  Offer_currency_code: CURRENCY,
  EventExpense_amounts_valid: { code: AMOUNT, message: "Expense amounts can\u2019t be negative." },
  EventExpense_currency_code: CURRENCY,
  MerchSales_amounts_valid: { code: AMOUNT, message: "Merch amounts can\u2019t be negative, and splits must be between 0% and 100%." },
  MerchSales_currency_code: CURRENCY,
  BarSales_amounts_valid: { code: AMOUNT, message: "Bar sales can\u2019t be negative, and the promoter share must be between 0% and 100%." },
  BarSales_currency_code: CURRENCY,
  Settlement_amounts_valid: { code: AMOUNT, message: "Settlement amounts and the balance due can\u2019t be negative." },
  Settlement_currency_code: CURRENCY,
  SettlementLine_currency_code: CURRENCY,
  ArtistPayment_amount_positive: { code: AMOUNT, message: "An artist payment must be a positive amount." },
  ArtistPayment_currency_code: CURRENCY,
  Settlement_event_version_key: { code: "CONCERTS_DUPLICATE_SETTLEMENT_VERSION", message: "That settlement version already exists. Reload and try again.", fields: ["event", "version"] },
  Offer_event_artist_version_key: { code: "CONCERTS_DUPLICATE_OFFER_VERSION", message: "That offer version already exists. Reload and try again.", fields: ["artist", "event", "version"] },
  Offer_one_draft_per_event_artist: { code: "CONCERTS_DUPLICATE_DRAFT", message: "This artist already has a draft offer for this event.", fields: ["artist", "event"] },
  EventArtist_event_artist_key: { code: "CONCERTS_DUPLICATE_BILLING", message: "That artist is already on this bill.", fields: ["artist", "event"] },
  EventArtist_event_position_key: { code: "CONCERTS_DUPLICATE_BILLING", message: "Another act already holds that place on the bill. Reload and try again.", fields: ["event", "position"] },
  MerchSales_event_key: { code: "CONCERTS_DUPLICATE_SALES_SHEET", message: "Merch sales are already recorded for this event.", fields: ["event"] },
  BarSales_event_key: { code: "CONCERTS_DUPLICATE_SALES_SHEET", message: "Bar sales are already recorded for this event.", fields: ["event"] },
  ScanEvent_one_admission_per_ticket: { code: "CONCERTS_DUPLICATE_ADMISSION", message: "That ticket has already been admitted.", fields: ["ticket"] },
  Seat_chartSection_row_number_key: { code: "CONCERTS_DUPLICATE_SEAT", message: "That seat already exists in this section.", fields: ["chartSection", "row", "number"] },
  Agency_name_key: { code: "CONCERTS_DUPLICATE_NAME", message: "An agency with that name already exists.", fields: ["name"] },
  Venue_name_city_key: { code: "CONCERTS_DUPLICATE_NAME", message: "A venue with that name already exists in that city.", fields: ["city", "name"] }
};
function chain(error) {
  const out = [];
  let current = error;
  for (let depth = 0; current && depth < 6; depth++) {
    out.push(current);
    current = current.originalError ?? current.cause;
  }
  return out;
}
function constraintRefusal(error) {
  for (const link of chain(error)) {
    const text43 = [
      link?.message,
      typeof link?.meta === "object" ? JSON.stringify(link.meta) : "",
      link?.extensions?.debug?.message ?? "",
      link?.extensions?.prisma?.meta ? JSON.stringify(link.extensions.prisma.meta) : ""
    ].join(" ");
    for (const [name2, rule] of Object.entries(CONSTRAINT_MESSAGES)) if (text43.includes(name2)) return rule;
    const listed = /Unique constraint failed on the fields: \((.*?)\)(?:\s|$)/.exec(String(link?.message || ""))?.[1]?.match(/`([^`]+)`/g)?.map((field) => field.slice(1, -1));
    const keyed = /Key \((.*?)\)=\(.*\) already exists/.exec(text43)?.[1]?.split(",").map((field) => field.trim().replace(/^"|"$/g, ""));
    const unwrap = (field) => String(field).replace(/^lower\((.*)\)$/, "$1");
    const fields = (link?.code === "P2002" && Array.isArray(link?.meta?.target) ? link.meta.target : listed ?? keyed)?.map(unwrap);
    if (fields?.length) {
      const target = [...fields].map(String).sort().join(",");
      const matches = Object.values(CONSTRAINT_MESSAGES).filter((rule) => rule.fields && [...rule.fields].sort().join(",") === target);
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) return { code: "CONCERTS_DUPLICATE_RECORD", message: "That record already exists. Reload and check before adding it again." };
    }
  }
  return null;
}
function constraintGraphQLError(error, refusal) {
  return new import_graphql.GraphQLError(refusal.message, { nodes: error.nodes, source: error.source, positions: error.positions, path: error.path, extensions: { code: refusal.code } });
}

// features/keystone/mutations/checkout.ts
var import_node_crypto7 = __toESM(require("node:crypto"));

// features/integrations/payment/index.ts
var paymentProviderAdapters = {
  stripe: () => Promise.resolve().then(() => (init_stripe(), stripe_exports)),
  paypal: () => Promise.resolve().then(() => (init_paypal(), paypal_exports)),
  manual: () => Promise.resolve().then(() => (init_manual(), manual_exports))
};

// features/keystone/utils/paymentProviderAdapter.ts
var ADAPTERS = new Set(Object.keys(paymentProviderAdapters));
var ADAPTER_OPERATIONS = /* @__PURE__ */ new Set(["createPaymentFunction", "capturePaymentFunction", "refundPaymentFunction", "getPaymentStatusFunction", "generatePaymentLinkFunction", "handleWebhookFunction", "cancelPaymentFunction"]);
function paymentAdapterPayload(provider, args) {
  const projectedProvider = { id: provider.id, code: provider.code, credentials: provider.credentials || {} };
  const input = {};
  for (const key of ["cart", "order", "amount", "currency", "idempotencyKey", "paymentId", "refundId", "event", "headers", "rawBody"]) {
    if (args?.[key] !== void 0) input[key] = args[key];
  }
  for (const key of ["cart", "order"]) {
    const record = input[key];
    if (record && typeof record === "object") {
      input[key] = Object.fromEntries(["id", "orderNumber", "orderType", "currencyCode", "subtotal", "tax", "tip", "discount", "total", "customerName", "customerEmail", "email"].filter((field) => record[field] !== void 0).map((field) => [field, record[field]]));
    }
  }
  if (input.headers && typeof input.headers === "object") {
    input.headers = Object.fromEntries(Object.entries(input.headers).filter(([key]) => key.toLowerCase() === "stripe-signature" || key.toLowerCase().startsWith("paypal-")));
  }
  return { ...input, provider: projectedProvider };
}
async function executeAdapterFunction({ provider, functionName, args }) {
  if (!ADAPTER_OPERATIONS.has(functionName)) throw new Error("Unknown payment adapter operation");
  const functionPath = provider?.[functionName];
  if (typeof functionPath !== "string") throw new Error("Payment adapter is not configured");
  const payload = paymentAdapterPayload(provider, args);
  if (/^https?:/i.test(functionPath)) {
    const endpoint2 = functionPath;
    try {
      const response = await fetch(endpoint2, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(3e4),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Payment adapter rejected request");
      return await response.json();
    } catch {
      throw new Error("External payment adapter request failed; reconcile the original attempt before retrying");
    }
  }
  if (!ADAPTERS.has(functionPath)) throw new Error("Unknown registered payment adapter");
  const adapter = await paymentProviderAdapters[functionPath]();
  const fn = adapter[functionName];
  if (typeof fn !== "function") throw new Error("Payment adapter operation is unavailable");
  try {
    return await fn(payload);
  } catch {
    throw new Error(`Payment adapter ${functionName} failed; reconcile the original attempt before retrying`);
  }
}
async function createPayment({ provider, cart, order, amount, currency, idempotencyKey }) {
  return executeAdapterFunction({
    provider,
    functionName: "createPaymentFunction",
    args: { cart, order, amount, currency, idempotencyKey }
  });
}
async function refundPayment({ provider, paymentId, amount, currency, idempotencyKey, refundId }) {
  return executeAdapterFunction({
    provider,
    functionName: "refundPaymentFunction",
    args: { paymentId, amount, currency, idempotencyKey, refundId }
  });
}
async function getPaymentStatus({ provider, paymentId }) {
  return executeAdapterFunction({
    provider,
    functionName: "getPaymentStatusFunction",
    args: { paymentId }
  });
}

// features/keystone/utils/checkoutProviderObservation.ts
function currencyCode(value) {
  return String(value || "").toUpperCase();
}
function assertAmount(value, expected, label) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount !== expected) {
    throw new Error(`${label} amount does not match the reserved checkout quote`);
  }
  return amount;
}
function assertCheckoutProviderObservation(observation, expectedAmount, expectedCurrencyCode) {
  if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
    throw new Error("Reserved checkout amount is invalid");
  }
  const observedCurrency = currencyCode(observation?.currencyCode ?? observation?.currency);
  if (!/^[A-Z]{3}$/.test(observedCurrency) || observedCurrency !== currencyCode(expectedCurrencyCode)) {
    throw new Error("Provider currency does not match the reserved checkout quote");
  }
  const amount = assertAmount(observation?.amount, expectedAmount, "Provider");
  if (observation.status === "requires_capture") {
    if (Array.isArray(observation.refunds) && observation.refunds.length > 0) {
      throw new Error("Uncaptured checkout unexpectedly contains refund evidence");
    }
    return;
  }
  if (observation.status !== "succeeded") {
    throw new Error(`Payment not successful. Status: ${String(observation.status || "unknown")}`);
  }
  if (observation.refundsComplete !== true || !Array.isArray(observation.refunds)) {
    throw new Error("Provider refund history is incomplete; operator reconciliation required");
  }
  let refundedAmount = 0;
  for (const refund of observation.refunds) {
    if (refund.status === "failed") continue;
    if (refund.status !== "succeeded") {
      throw new Error("Provider has an unresolved refund; operator reconciliation required");
    }
    const refundCurrency = currencyCode(refund.currencyCode ?? refund.currency);
    const refundAmount = Number(refund.amount);
    if (!/^[A-Z]{3}$/.test(refundCurrency) || refundCurrency !== observedCurrency || !Number.isSafeInteger(refundAmount) || refundAmount <= 0) {
      throw new Error("Provider refund evidence has invalid amount or currency");
    }
    refundedAmount += refundAmount;
    if (!Number.isSafeInteger(refundedAmount)) {
      throw new Error("Provider refund total exceeds the supported amount range");
    }
  }
  if (amount - refundedAmount !== expectedAmount) {
    throw new Error("Provider net captured amount does not match the reserved checkout quote");
  }
}

// features/keystone/utils/paymentProviderConfig.ts
function isPaymentProviderConfigured(code) {
  if (code.startsWith("pp_stripe")) {
    return Boolean(
      (process.env.NEXT_PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY) && process.env.STRIPE_SECRET_KEY
    );
  }
  if (code.startsWith("pp_paypal")) {
    return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  }
  return code === "pp_system_default" || code.startsWith("pp_manual");
}
function getPublicPaymentProviderConfig(code) {
  if (!isPaymentProviderConfigured(code)) return null;
  if (code.startsWith("pp_stripe")) {
    return {
      provider: "stripe",
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || ""
    };
  }
  if (code.startsWith("pp_paypal")) {
    return {
      provider: "paypal",
      publishableKey: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ""
    };
  }
  return null;
}

// features/keystone/mutations/checkout.ts
init_paymentState();
var PROVIDER_FIELDS = "id code isInstalled credentials createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction";
async function stripeProvider(context) {
  const sudo = context.sudo();
  let [provider] = await sudo.query.PaymentProvider.findMany({ where: { code: { equals: "pp_stripe_stripe" } }, query: PROVIDER_FIELDS, take: 1 });
  if (!provider && getPublicPaymentProviderConfig("pp_stripe_stripe")) {
    provider = await sudo.query.PaymentProvider.createOne({ data: { name: "Stripe", code: "pp_stripe_stripe", isInstalled: true, createPaymentFunction: "stripe", capturePaymentFunction: "stripe", refundPaymentFunction: "stripe", getPaymentStatusFunction: "stripe", generatePaymentLinkFunction: "stripe", handleWebhookFunction: "stripe" }, query: PROVIDER_FIELDS });
  }
  if (!provider?.isInstalled) throw new Error("Card payments are not configured");
  const [full] = await context.prisma.paymentProvider.findMany({ where: { id: provider.id }, take: 1 });
  return { ...provider, credentials: full?.credentials || {} };
}
async function startTicketCheckout(_, { input }, context) {
  const { holdId, proof, email, name: name2, ageAttested, idempotencyKey } = input;
  if (!idempotencyKey) throw new Error("Idempotency key required");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "") || !String(name2 || "").trim()) throw new Error("Name and valid email required");
  const hold0 = await ownedHold(context, holdId, proof);
  const provider = await stripeProvider(context);
  const local = await command(context, { operation: "startTicketCheckout", idempotencyKey, lock: `event:${hold0.eventId}`, params: { holdId, email, name: name2, ageAttested: !!ageAttested } }, async (tx) => {
    await expireHolds(tx, hold0.eventId);
    const hold = await tx.inventoryHold.findUnique({ where: { id: holdId }, include: { event: true } });
    if (!hold || hold.status !== "active" || hold.expiresAt <= /* @__PURE__ */ new Date()) throw new Error("Hold expired");
    if (hold.orderId) throw new Error("Checkout already started for this hold");
    const q = hold.quoteSnapshot;
    if (q.perOrderLimit && hold.quantity > q.perOrderLimit) throw new Error("Per-order limit exceeded");
    if (hold.event.ageRestriction !== "all_ages" && !ageAttested) throw new Error("Age confirmation required");
    const secret3 = opaqueToken();
    const order = await tx.ticketOrder.create({ data: { orderNumber: humanCode("CN"), guestEmail: email.trim().toLowerCase(), guestName: name2.trim(), secretKey: digest(secret3), subtotalCents: q.subtotalCents, serviceFeesCents: q.serviceFeesCents, facilityFeesCents: q.facilityFeesCents, taxCents: q.taxCents, discountCents: q.discountCents, totalCents: q.totalCents, currencyCode: q.currencyCode, ageAttested: !!ageAttested, status: "pending_payment", source: hold.presaleCode ? "presale" : "online", eventId: hold.eventId, customerId: context.session?.itemId || null, discountSnapshot: { code: hold.presaleCode || null, discountCents: q.discountCents } } });
    await tx.inventoryHold.update({ where: { id: hold.id }, data: { orderId: order.id, expiresAt: new Date(Date.now() + 20 * 6e4) } });
    await tx.promoRedemption.updateMany({ where: { holdId: hold.id, status: "reserved" }, data: { orderId: order.id } });
    const collection = await tx.paymentCollection.create({ data: { amount: q.totalCents } });
    await tx.ticketOrder.update({ where: { id: order.id }, data: { paymentCollectionId: collection.id } });
    const session2 = await tx.paymentSession.create({ data: { paymentCollectionId: collection.id, paymentProviderId: provider.id, amount: q.totalCents, idempotencyKey: import_node_crypto7.default.createHash("sha256").update(`${idempotencyKey}:${order.id}`).digest("hex"), isSelected: true, data: { state: "initializing", checkoutQuote: q, holdId: hold.id } } });
    await appendAuditEvent(tx, context.session?.itemId, { action: "checkout.started", targetList: "TicketOrder", targetId: order.id, after: { totalCents: q.totalCents } });
    return { orderId: order.id, sessionId: session2.id, sessionKey: session2.idempotencyKey, total: q.totalCents, currency: q.currencyCode, orderNumber: order.orderNumber, replay: false };
  });
  const prisma = context.prisma;
  const session = await prisma.paymentSession.findUnique({ where: { id: local.sessionId } });
  if (session.isInitiated && session.data?.clientSecret) return { orderId: local.orderId, orderNumber: local.orderNumber, proof: createProof(local.orderId), clientSecret: session.data.clientSecret, publishableKey: getPublicPaymentProviderConfig("pp_stripe_stripe")?.publishableKey, totalCents: local.total };
  let created;
  try {
    created = await createPayment({ provider, order: { id: local.orderId, orderNumber: local.orderNumber }, amount: local.total, currency: local.currency, idempotencyKey: session.idempotencyKey });
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { data: { ...session.data, state: "unknown" } } });
    throw error;
  }
  await prisma.paymentSession.update({ where: { id: session.id }, data: { isInitiated: true, data: { ...session.data, state: "ready", paymentIntentId: created.paymentIntentId, clientSecret: created.clientSecret } } });
  return { orderId: local.orderId, orderNumber: local.orderNumber, proof: createProof(local.orderId), clientSecret: created.clientSecret, publishableKey: getPublicPaymentProviderConfig("pp_stripe_stripe")?.publishableKey, totalCents: local.total };
}
async function finalizePaidOrder(context, orderId, provider, observed) {
  const prisma = context.prisma;
  const order0 = await prisma.ticketOrder.findUnique({ where: { id: orderId } });
  if (!order0) throw new Error("Order not found");
  const session = await prisma.paymentSession.findFirst({ where: { paymentCollectionId: order0.paymentCollectionId, isSelected: true } });
  const intentId = session?.data?.paymentIntentId;
  if (!intentId) throw new Error("Payment has not been initiated");
  const status = observed || await getPaymentStatus({ provider, paymentId: intentId });
  assertCheckoutProviderObservation(status, order0.totalCents, order0.currencyCode);
  const finalized = await prisma.$transaction(async (raw) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, `event:${order0.eventId}`);
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    const lateAfterExpiry = order.status === "cancelled" && !await tx.payment.findUnique({ where: { idempotencyKey: `pi:${intentId}` } });
    if (order.status !== "pending_payment" && !lateAfterExpiry) return tx.ticketOrder.findUnique({ where: { id: orderId } }).then(() => ({ orderId, status: order.status, tickets: [], replay: true }));
    const hold = await tx.inventoryHold.findFirst({ where: { orderId }, include: { seats: { include: { seat: true } }, priceLevel: true } });
    if (!hold || hold.status !== "active") {
      await appendAuditEvent(tx, null, { action: "checkout.paid_without_hold", targetList: "TicketOrder", targetId: orderId, reason: "Provider payment succeeded after the hold was released; refund required" });
      await tx.ticketOrder.update({ where: { id: orderId }, data: { status: "cancelled" } });
      const latePayment = await tx.payment.create({ data: { idempotencyKey: `pi:${intentId}`, amount: order.totalCents, currencyCode: order.currencyCode, status: "succeeded", paymentProviderId: provider.id, providerPaymentId: intentId, orderId, paymentCollectionId: order.paymentCollectionId, processedAt: /* @__PURE__ */ new Date(), cardLast4: status.card?.last4 || null, cardBrand: status.card?.brand || null, notes: "Paid after hold release; refunded automatically" } });
      if (order.paymentCollectionId) await tx.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { authorizedAmount: Number(status.amount), metadata: { capturedAmount: Number(status.amount), providerStatus: status.status } } });
      return { orderId, status: "cancelled", tickets: [], replay: false, late: { paymentId: latePayment.id, amount: order.totalCents, currency: order.currencyCode } };
    }
    const q = hold.quoteSnapshot;
    const line = await tx.ticketOrderLine.create({ data: { orderId, title: q.eventTitle, levelName: q.levelName, phaseName: q.phaseName, seatLabel: (q.seats || []).map((s) => s.label).join(", "), unitPriceCents: q.unitPriceCents, serviceFeeCents: q.feeCents, facilityFeeCents: q.facilityFeeCents, taxCents: q.taxCents, quantity: hold.quantity, discountCents: q.discountCents, totalCents: q.totalCents, currencyCode: q.currencyCode, priceLevelId: hold.priceLevelId, phaseId: hold.phaseId } });
    const tokens = [];
    for (let i = 0; i < hold.quantity; i++) {
      const token = opaqueToken();
      const ticketCode = humanCode("TK");
      const seat = hold.seats[i];
      await tx.ticket.create({ data: { orderId, eventId: hold.eventId, lineId: line.id, seatInventoryId: seat?.id, ticketCode, tokenHash: digest(token), holderName: order.guestName, holderEmail: order.guestEmail, status: "valid" } });
      tokens.push({ ticketCode, token, seat: seat?.seat?.label || "" });
    }
    for (const seat of hold.seats) {
      const r = await tx.seatInventory.updateMany({ where: { id: seat.id, status: "held", holdKey: hold.holdKey }, data: { status: "sold", holdKey: "" } });
      if (r.count !== 1) throw new Error("Seat is no longer held");
    }
    const lvl = await tx.priceLevel.updateMany({ where: { id: hold.priceLevelId, held: { gte: hold.quantity } }, data: { held: { decrement: hold.quantity }, sold: { increment: hold.quantity } } });
    if (lvl.count !== 1) throw new Error("Level counters are inconsistent");
    if (hold.phaseId) await tx.priceLevelPhase.update({ where: { id: hold.phaseId }, data: { sold: { increment: hold.quantity } } });
    await tx.inventoryHold.update({ where: { id: hold.id }, data: { status: "converted" } });
    await tx.promoRedemption.updateMany({ where: { holdId: hold.id, status: "reserved" }, data: { status: "committed" } });
    const redeemed = await tx.promoRedemption.findMany({ where: { holdId: hold.id, status: "committed" } });
    for (const r of redeemed) await tx.promoCode.update({ where: { id: r.promoCodeId }, data: { usedCount: { increment: 1 } } });
    await tx.payment.create({ data: { idempotencyKey: `pi:${intentId}`, amount: order.totalCents, currencyCode: order.currencyCode, status: "succeeded", paymentProviderId: provider.id, providerPaymentId: intentId, orderId, paymentCollectionId: order.paymentCollectionId, processedAt: /* @__PURE__ */ new Date(), cardLast4: status.card?.last4 || null, cardBrand: status.card?.brand || null, data: { paymentIntentId: intentId } } });
    if (order.paymentCollectionId) await tx.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { authorizedAmount: Number(status.amount), metadata: { capturedAmount: Number(status.amount), providerStatus: status.status } } });
    await tx.paymentSession.update({ where: { id: session.id }, data: { paymentAuthorizedAt: /* @__PURE__ */ new Date(), data: { ...session.data, state: "completed", clientSecret: null } } });
    await tx.ticketOrder.update({ where: { id: orderId }, data: { status: "paid" } });
    await appendAuditEvent(tx, null, { action: "order.paid", targetList: "TicketOrder", targetId: orderId, after: { totalCents: order.totalCents } });
    return { orderId, status: "paid", orderNumber: order.orderNumber, tickets: tokens, replay: false };
  }, { timeout: 3e4, isolationLevel: "Serializable" });
  if (finalized.late) await refundLatePayment(context, provider, orderId, intentId, finalized.late);
  return finalized;
}
async function refundLatePayment(context, provider, orderId, intentId, late) {
  const prisma = context.prisma;
  const key = `late:${intentId}`;
  const refund = await prisma.refund.upsert({ where: { idempotencyKey: key }, update: {}, create: { idempotencyKey: key, amount: late.amount, currencyCode: late.currency, status: "processing", reason: "Payment arrived after the hold expired", paymentId: late.paymentId, orderId } });
  if (refund.status === "succeeded") return;
  let result;
  try {
    result = await refundPayment({ provider, paymentId: intentId, amount: late.amount, currency: late.currency, idempotencyKey: key });
  } catch {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "unknown" } });
    return;
  }
  const ok = result.status === "succeeded";
  await prisma.refund.update({ where: { id: refund.id }, data: { status: ok ? "succeeded" : result.status === "failed" ? "failed" : "unknown", providerRefundId: result.id || "", processedAt: ok ? /* @__PURE__ */ new Date() : null } });
  if (ok) {
    await prisma.payment.update({ where: { id: late.paymentId }, data: { refundedAmount: late.amount, status: "refunded" } });
    const order = await prisma.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: late.amount } });
    if (order.paymentCollectionId) await prisma.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { refundedAmount: late.amount } });
  }
}
async function completeTicketCheckout(_, { input }, context) {
  const order = await ownedOrder(context, input.orderId, input.proof);
  const provider = await stripeProvider(context);
  const result = await finalizePaidOrder(context, order.id, provider);
  return { orderId: order.id, orderNumber: order.orderNumber, status: result.status, tickets: result.tickets };
}
async function lookupTicketOrder(_, { email, orderNumber }, context) {
  const o = await context.prisma.ticketOrder.findUnique({ where: { orderNumber: String(orderNumber || "").trim().toUpperCase() }, include: { event: { select: { title: true, showAt: true, doorsAt: true, venue: { select: { timezone: true } } } }, ticket_order: { select: { ticketCode: true, status: true, holderName: true } }, ticketOrderLine_order: true } });
  if (!o || o.guestEmail !== String(email || "").trim().toLowerCase()) throw new Error("Order not found");
  return { orderId: o.id, orderNumber: o.orderNumber, status: o.status, totalCents: o.totalCents, refundedCents: o.refundedCents, currencyCode: o.currencyCode, event: o.event, tickets: o.ticket_order, lines: o.ticketOrderLine_order, proof: createProof(o.id, Math.floor(Date.now() / 1e3) + 900) };
}
async function transferTicket(_, { input }, context) {
  const { ticketCode, orderId, proof, toEmail, toName, idempotencyKey } = input;
  if (!idempotencyKey) throw new Error("Idempotency key required");
  const order = await ownedOrder(context, orderId, proof);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail || "")) throw new Error("Valid recipient email required");
  return command(context, { operation: "transferTicket", idempotencyKey, lock: `event:${order.eventId}`, params: { ticketCode, orderId, toEmail, toName } }, async (tx) => {
    const old = await tx.ticket.findUnique({ where: { ticketCode } });
    if (!old || old.orderId !== order.id || old.status !== "valid") throw new Error("Ticket cannot be transferred");
    const moved = await tx.ticket.updateMany({ where: { id: old.id, status: "valid" }, data: { status: "transferred", tokenHash: "" } });
    if (moved.count !== 1) throw new Error("Ticket cannot be transferred");
    const token = opaqueToken();
    const code = humanCode("TK");
    const fresh = await tx.ticket.create({ data: { orderId: old.orderId, eventId: old.eventId, lineId: old.lineId, seatInventoryId: old.seatInventoryId, ticketCode: code, tokenHash: digest(token), holderName: toName || "", holderEmail: toEmail.toLowerCase(), status: "valid", transferredFromId: old.id } });
    await appendAuditEvent(tx, context.session?.itemId, { action: "ticket.transferred", targetList: "Ticket", targetId: fresh.id, before: { ticketCode }, after: { ticketCode: code } });
    return { ticketCode: code, token, status: "valid" };
  });
}
async function refundTicketOrder(_, { input }, context) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error("Permission required: canIssueRefunds");
  const { orderId, reason, idempotencyKey, approvalId } = input;
  if (!idempotencyKey || !String(reason || "").trim()) throw new Error("Reason and idempotency key required");
  const actor = context.session.itemId;
  const prisma = context.prisma;
  const provider = await stripeProvider(context);
  const reserve = await command(context, { operation: "refundTicketOrder", idempotencyKey, lock: `event:${(await prisma.ticketOrder.findUnique({ where: { id: orderId } }))?.eventId}`, params: { orderId, amountCents: input.amountCents ?? null, reason, approvalId: approvalId ?? null } }, async (tx) => {
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    if (!order || !["paid", "partially_refunded"].includes(order.status)) throw new Error("Order is not refundable");
    const payment = await tx.payment.findFirst({ where: { orderId, status: { in: ["succeeded", "partially_refunded"] } } });
    if (!payment) throw new Error("No captured payment");
    if (!payment.providerPaymentId) throw new Error("Cash and terminal sales are refunded at the box office, not through Stripe");
    const outstanding = await tx.refund.findMany({ where: { paymentId: payment.id, status: { in: ["processing", "unknown", "succeeded"] } } });
    const available = payment.amount - outstanding.reduce((n, r) => n + r.amount, 0);
    refundableCents(order.totalCents, order.totalCents - available);
    const amount = input.amountCents ?? available;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > available) throw new Error("Refund exceeds unrefunded balance");
    const settings = await tx.storeSettings.findFirst();
    const threshold = settings?.refundApprovalThresholdCents ?? 0;
    let approvedById = null;
    if (amount > threshold) {
      if (!approvalId) throw new Error("A different manager must approve this refund");
      const approval = await tx.managerApproval.findUnique({ where: { id: approvalId } });
      assertApprovalUsable(approval, { actorId: actor, fingerprint: refundApprovalFingerprint(refundApprovalPayload(orderId, amount, reason)) });
      const consumed = await tx.managerApproval.updateMany({ where: { id: approvalId, status: "approved", expiresAt: { gt: /* @__PURE__ */ new Date() } }, data: { status: "consumed", consumedAt: /* @__PURE__ */ new Date(), consumedEntityType: "TicketOrder", consumedEntityId: orderId } });
      if (consumed.count !== 1) throw new Error("Approval was already used or expired");
      approvedById = approval.approvedById;
    }
    const refund = await tx.refund.create({ data: { idempotencyKey: `refund:${idempotencyKey}`, amount, currencyCode: payment.currencyCode, status: "processing", reason, paymentId: payment.id, orderId, requestedById: actor, approvedById } });
    await appendAuditEvent(tx, actor, { action: "refund.reserved", targetList: "Refund", targetId: refund.id, after: { amount }, reason });
    return { refundId: refund.id, amount, paymentId: payment.id, providerPaymentId: payment.providerPaymentId, currency: payment.currencyCode, full: amount === order.totalCents - order.refundedCents, key: refund.idempotencyKey };
  });
  let result;
  try {
    result = await refundPayment({ provider, paymentId: reserve.providerPaymentId, amount: reserve.amount, currency: reserve.currency, idempotencyKey: reserve.key });
  } catch (error) {
    await prisma.refund.update({ where: { id: reserve.refundId }, data: { status: "unknown" } });
    throw error;
  }
  const ok = result.status === "succeeded";
  return prisma.$transaction(async (raw) => {
    const tx = checkedClient(raw);
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    await lockTransactionKey(tx, `event:${order.eventId}`);
    const refund = await tx.refund.findUnique({ where: { id: reserve.refundId } });
    if (refund.status === "succeeded") return { refundId: refund.id, status: "succeeded" };
    await tx.refund.update({ where: { id: refund.id }, data: { status: ok ? "succeeded" : result.status === "failed" ? "failed" : "unknown", providerRefundId: result.id || "", providerData: result.data ? JSON.parse(JSON.stringify(result.data)) : void 0, processedAt: ok ? /* @__PURE__ */ new Date() : null } });
    if (!ok) return { refundId: refund.id, status: result.status === "failed" ? "failed" : "unknown" };
    const rows = await tx.refund.findMany({ where: { paymentId: reserve.paymentId } });
    const total = successfulRefundTotal(rows);
    await tx.payment.update({ where: { id: reserve.paymentId }, data: { refundedAmount: total, status: total >= order.totalCents ? "refunded" : "partially_refunded" } });
    const full = total >= order.totalCents;
    await tx.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: total, status: full ? "refunded" : "partially_refunded" } });
    if (order.paymentCollectionId) await tx.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { refundedAmount: total } });
    if (full) {
      const tickets = await tx.ticket.findMany({ where: { orderId, status: { in: ["valid", "checked_in"] } } });
      for (const t of tickets) {
        await tx.ticket.update({ where: { id: t.id }, data: { status: "refunded", tokenHash: "" } });
        if (t.seatInventoryId) await tx.seatInventory.updateMany({ where: { id: t.seatInventoryId, status: "sold" }, data: { status: "open", occupancyKey: null } });
      }
      const lines = await tx.ticketOrderLine.findMany({ where: { orderId } });
      for (const l of lines) {
        await tx.priceLevel.update({ where: { id: l.priceLevelId }, data: { sold: { decrement: l.quantity } } });
        if (l.phaseId) await tx.priceLevelPhase.update({ where: { id: l.phaseId }, data: { sold: { decrement: l.quantity } } });
      }
    }
    await appendAuditEvent(tx, actor, { action: "refund.succeeded", targetList: "Refund", targetId: refund.id, after: { total }, reason });
    return { refundId: refund.id, status: "succeeded" };
  }, { timeout: 3e4, isolationLevel: "Serializable" });
}

// features/keystone/mutations/index.ts
var graphql29 = String.raw;
var operatorCommands = ["releaseDateHold", "advanceEvent", "placeDateHold", "challengeHold", "confirmHold", "sendOffer", "acceptOffer", "declineOffer", "contractOffer", "publishEvent", "setProductionHold", "releaseProductionHold", "scanTicket", "recordMerchSales", "computeSettlement", "adjustSettlement", "signSettlement", "recordArtistPayment", "postponeEvent", "cancelEvent"];
function surfaceRefusals(resolver) {
  return async (...args) => {
    try {
      return await resolver(...args);
    } catch (e) {
      const refusal = constraintRefusal(e);
      if (refusal) throw e instanceof import_graphql2.GraphQLError ? constraintGraphQLError(e, refusal) : new import_graphql2.GraphQLError(refusal.message, { extensions: { code: refusal.code } });
      if (e && Object.getPrototypeOf(e) === Error.prototype) throw new import_graphql2.GraphQLError(e.message);
      throw e;
    }
  };
}
var surfaced = (map) => Object.fromEntries(Object.entries(map).map(([k, f]) => [k, surfaceRefusals(f)]));
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql29`
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
      input ForceCloseCashDrawerInput { drawerId: ID! count: JSON! reason: String! idempotencyKey: String! }
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
        forceCloseCashDrawer(input: ForceCloseCashDrawerInput!): JSON
        ${Object.keys(editorMutations).map((name2) => `${name2}(input: OperatorCommandInput!): JSON`).join("\n        ")}
        ${operatorCommands.map((name2) => `${name2}(input: OperatorCommandInput!): JSON`).join("\n        ")}
      }
    ` + storeLogoTypeDefs,
    resolvers: {
      Query: {
        storeLogo,
        redirectToInit: redirectToInit_default,
        eventsOnSale: async (_, __, context) => context.prisma.event.findMany({ where: { status: { in: ["announced", "presale", "on_sale", "sold_out", "postponed"] } }, orderBy: { showAt: "asc" }, take: 100, select: { id: true, title: true, status: true, showAt: true, doorsAt: true, ageRestriction: true, venue: { select: { name: true, city: true, timezone: true } } } }),
        eventAvailability: surfaceRefusals(availability),
        lookupTicketOrder: surfaceRefusals(lookupTicketOrder)
      },
      Mutation: surfaced({
        createGaHold: createHold,
        createSeatHold: createHold,
        seedConcerts,
        publishSeatingChart,
        requestRefundApproval,
        decideRefundApproval,
        issueDoorSale,
        issueComp,
        previewDoorSale,
        refundDoorSale,
        openCashDrawer,
        closeCashDrawer,
        forceCloseCashDrawer,
        updateActiveUser: updateActiveUser_default,
        startTicketCheckout,
        completeTicketCheckout,
        transferTicket,
        refundTicketOrder,
        ...editorMutations,
        ...Object.fromEntries(operatorCommands.map((name2) => [name2, operator(name2)]))
      })
    }
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");

// features/keystone/lib/email-layout.ts
var SUPPORT_EMAIL = "hello@concerts.openship.org";
var FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
var C = {
  canvas: "#f4f4f5",
  card: "#ffffff",
  text: "#18181b",
  muted: "#52525b",
  subtle: "#71717a",
  line: "#e4e4e7",
  panel: "#fafafa",
  button: "#18181b",
  buttonText: "#ffffff",
  link: "#18181b"
};
var escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function storeNameFromEnv(fallback = "Concerts") {
  const match = /^\s*"?([^"<]+?)"?\s*</.exec(process.env.SMTP_FROM || "");
  return match?.[1]?.trim() || fallback;
}
var p = (html, style = "") => `<p class="em-text" style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.text};${style}">${html}</p>`;
var emailParagraph = p;
var emailMuted = (html) => `<p class="em-muted" style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${C.muted};">${html}</p>`;
function emailButton(label, href) {
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;">
<tr><td class="em-btn" align="center" bgcolor="${C.button}" style="border-radius:8px;background:${C.button};">
<a class="em-btn-a" href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:${C.buttonText};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}
function emailLayout(input) {
  const store = escapeHtml(input.storeName || storeNameFromEnv());
  const support = escapeHtml(input.supportEmail || SUPPORT_EMAIL);
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(input.title)}</title>
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
a { color:${C.link}; }
@media (max-width: 620px) { .em-pad { padding-left:20px !important; padding-right:20px !important; } }
@media (prefers-color-scheme: dark) {
  .em-canvas { background:#09090b !important; }
  .em-card { background:#18181b !important; border-color:#27272a !important; }
  .em-text { color:#fafafa !important; }
  .em-muted { color:#a1a1aa !important; }
  .em-line { border-color:#3f3f46 !important; }
  .em-panel { background:#27272a !important; border-color:#3f3f46 !important; color:#fafafa !important; }
  .em-btn { background:#fafafa !important; }
  .em-btn-a { color:#18181b !important; }
  .em-link { color:#fafafa !important; }
}
[data-ogsc] .em-text { color:#fafafa !important; }
[data-ogsc] .em-muted { color:#a1a1aa !important; }
[data-ogsb] .em-canvas { background:#09090b !important; }
[data-ogsb] .em-card { background:#18181b !important; }
</style>
</head>
<body class="em-canvas" style="margin:0;padding:0;background:${C.canvas};">
${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(input.preheader)}</div>` : ""}
<table role="presentation" class="em-canvas" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${C.canvas}" style="background:${C.canvas};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;">
<tr><td class="em-pad" style="padding:8px 32px 20px;font-family:${FONT};font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.01em;"><span class="em-text" style="color:${C.text};">${store}</span></td></tr>
<tr><td class="em-card" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:12px;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td class="em-pad" style="padding:32px 32px 16px;">
<h1 class="em-text" style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.02em;color:${C.text};">${escapeHtml(input.title)}</h1>
${input.body}
</td></tr>
</table>
</td></tr>
<tr><td class="em-pad" style="padding:20px 32px 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.subtle};">
<span class="em-muted" style="color:${C.subtle};">${input.footerNote ? `${input.footerNote}<br>` : ""}Questions? Email <a class="em-link" href="mailto:${support}" style="color:${C.muted};text-decoration:underline;">${support}</a>.<br>${store}</span>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// features/keystone/lib/mail.ts
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  return emailLayout({
    preheader: "Use this link to choose a new password.",
    title: "Reset your password",
    body: `${emailParagraph("We received a request to reset the password for your account. Use the button below to choose a new one.")}
${emailButton("Reset password", url)}
${emailMuted("If you did not request this, you can safely ignore this email. Your password will not change.")}`
  });
}
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}

// features/keystone/mcp-oauth/session.ts
async function resolveMcpAccessToken(context, token, listKey = "User") {
  try {
    const sudo = context.sudo();
    const record = await sudo.db.OAuthToken.findOne({ where: { token: digestToken(token) } });
    if (!record || record.tokenType !== "access_token" || record.isRevoked !== "false" || !record.userId || !record.expiresAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      return void 0;
    }
    const app = await sudo.db.OAuthApp.findOne({ where: { clientId: record.clientId } });
    if (!app || app.status !== "active") return void 0;
    const mcp = {
      clientId: record.clientId,
      scopes: storedScopes(record.scopes),
      tokenId: String(record.id)
    };
    return { itemId: String(record.userId), listKey, mcp };
  } catch {
    return void 0;
  }
}
function withMcpBearerSessions(strategy, listKey = "User") {
  return {
    ...strategy,
    async get({ context }) {
      const token = bearerToken(context?.req?.headers?.authorization);
      if (isMcpAccessToken(token)) return resolveMcpAccessToken(context, token, listKey);
      return strategy.get({ context });
    }
  };
}

// features/keystone/database-url.ts
var POOL_SIZES = { web: 15, worker: 5 };
var OVERRIDE_ENV = {
  web: "DATABASE_CONNECTION_LIMIT",
  worker: "DATABASE_CONNECTION_LIMIT_WORKER"
};
function pooledDatabaseUrl(url, role = "web") {
  if (!url || !/^postgres(ql)?:\/\//.test(url)) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.searchParams.has("connection_limit")) return url;
  const override = Number(process.env[OVERRIDE_ENV[role]]);
  parsed.searchParams.set("connection_limit", String(Number.isInteger(override) && override > 0 ? override : POOL_SIZES[role]));
  return parsed.toString();
}

// features/keystone/lib/keystonePrismaErrors.ts
var RAW_METHOD = /^\$(queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe|queryRawTyped|runCommandRaw)$/;
var clients = /* @__PURE__ */ new WeakMap();
var delegates = /* @__PURE__ */ new WeakMap();
function isKeystonePrismaError(value) {
  return value instanceof Error && value.extensions?.code === "KS_PRISMA_ERROR";
}
function rethrowKeystonePrismaError(value) {
  if (!isKeystonePrismaError(value)) return value;
  const prisma = value.extensions.prisma ?? {};
  throw Object.assign(value, { code: prisma.code, meta: prisma.meta, clientVersion: prisma.clientVersion });
}
function throwing(result) {
  if (!result || typeof result.then !== "function") return rethrowKeystonePrismaError(result);
  const settled = () => result.then(rethrowKeystonePrismaError);
  return new Proxy(result, {
    get(target, key) {
      if (key === "then") return (ok, fail) => settled().then(ok, fail);
      if (key === "catch") return (fail) => settled().catch(fail);
      if (key === "finally") return (done) => settled().finally(done);
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}
function throwingDelegate(delegate) {
  const cached = delegates.get(delegate);
  if (cached) return cached;
  const wrapped = new Proxy(delegate, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? (...args) => throwing(value.apply(target, args)) : value;
    }
  });
  delegates.set(delegate, wrapped);
  return wrapped;
}
function throwKeystonePrismaErrors(client) {
  const cached = clients.get(client);
  if (cached) return cached;
  const wrapped = new Proxy(client, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      if (key === "$transaction" && typeof value === "function") {
        return (work, ...options) => {
          if (typeof work === "function") return value.call(target, (tx) => work(throwKeystonePrismaErrors(tx)), ...options);
          return Promise.resolve(value.call(target, work, ...options)).then((results) => Array.isArray(results) ? results.map(rethrowKeystonePrismaError) : results);
        };
      }
      if (key === "$extends" && typeof value === "function") return (...args) => throwKeystonePrismaErrors(value.apply(target, args));
      if (typeof key === "string" && RAW_METHOD.test(key) && typeof value === "function") return (...args) => throwing(value.apply(target, args));
      if (typeof value === "function") return value.bind(target);
      if (typeof key === "string" && !key.startsWith("$") && value && typeof value === "object" && typeof value.findFirst === "function") return throwingDelegate(value);
      return value;
    }
  });
  clients.set(client, wrapped);
  return wrapped;
}

// features/keystone/index.ts
var databaseURL = process.env.DATABASE_URL || "file:./keystone.db";
var sessionConfig = {
  maxAge: 60 * 60 * 24 * 360,
  // How long they stay signed in?
  secret: process.env.SESSION_SECRET || "this secret should only be used in testing"
};
var {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com"
} = process.env;
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          ...Object.fromEntries(permissionNames.map((name2) => [name2, true]))
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    }
  },
  sessionData: `
    name
    email
    role {
      id
      name
      ${permissionNames.join("\n")}
    }
  `
});
var keystone_default = withAuth(
  (0, import_core47.config)({
    db: {
      provider: "postgresql",
      url: pooledDatabaseUrl(databaseURL),
      // Keystone returns failed queries as values; this makes them throw so transactions roll back.
      extendPrismaClient: throwKeystonePrismaErrors
    },
    lists: models,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5e3 },
        forcePathStyle: true
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false
    },
    // MCP OAuth bearer tokens resolve to the approving user; everything else is unchanged.
    session: withMcpBearerSessions((0, import_session.statelessSessions)(sessionConfig)),
    graphql: {
      extendGraphqlSchema
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
