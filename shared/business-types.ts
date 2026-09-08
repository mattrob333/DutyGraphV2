import { z } from "zod";
import { stageProvenanceSchema } from "./stage-provenance.ts";
export const backbone = [
  { id: "get", label: "Get work" },
  { id: "shape", label: "Shape work" },
  { id: "commit", label: "Commit work" },
  { id: "do", label: "Do work" },
  { id: "collect", label: "Collect value" },
  { id: "grow", label: "Keep / grow customer" },
] as const;
export type BusinessTemplate = {
  id: string;
  label: string;
  group: string;
  description: string;
  stages: {
    id: string;
    name: string;
    description?: string;
    functionIds: (typeof backbone)[number]["id"][];
  }[];
};
export const businessTemplates: BusinessTemplate[] = [
  {
    id: "generic",
    label: "General business",
    group: "General",
    description:
      "Broad starting point when the operating model is still unclear.",
    stages: [
      {
        id: "generic-1",
        name: "Attract",
        functionIds: ["get"],
      },
      {
        id: "generic-2",
        name: "Qualify",
        functionIds: ["shape"],
      },
      {
        id: "generic-3",
        name: "Commit",
        functionIds: ["commit"],
      },
      {
        id: "generic-4",
        name: "Deliver",
        functionIds: ["do"],
      },
      {
        id: "generic-5",
        name: "Collect",
        functionIds: ["collect"],
      },
      {
        id: "generic-6",
        name: "Retain",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "advisory",
    label: "Advisory & consulting",
    group: "Services",
    description: "Expert-led diagnosis and recommendations.",
    stages: [
      {
        id: "advisory-1",
        name: "Prospect",
        functionIds: ["get"],
      },
      {
        id: "advisory-2",
        name: "Diagnose",
        functionIds: ["shape"],
      },
      {
        id: "advisory-3",
        name: "Propose & agree",
        functionIds: ["commit"],
      },
      {
        id: "advisory-4",
        name: "Deliver advice",
        functionIds: ["do"],
      },
      {
        id: "advisory-5",
        name: "Invoice",
        functionIds: ["collect"],
      },
      {
        id: "advisory-6",
        name: "Expand",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "professional-services",
    label: "Professional services",
    group: "Services",
    description: "Project or retainer delivery by skilled professionals.",
    stages: [
      {
        id: "professional-services-1",
        name: "Develop demand",
        functionIds: ["get"],
      },
      {
        id: "professional-services-2",
        name: "Scope work",
        functionIds: ["shape"],
      },
      {
        id: "professional-services-3",
        name: "Agree engagement",
        functionIds: ["commit"],
      },
      {
        id: "professional-services-4",
        name: "Deliver service",
        functionIds: ["do"],
      },
      {
        id: "professional-services-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "professional-services-6",
        name: "Maintain relationship",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "agency",
    label: "Marketing & creative agency",
    group: "Services",
    description: "Creative production or campaign delivery.",
    stages: [
      {
        id: "agency-1",
        name: "Attract clients",
        functionIds: ["get"],
      },
      {
        id: "agency-2",
        name: "Develop brief",
        functionIds: ["shape"],
      },
      {
        id: "agency-3",
        name: "Agree campaign",
        functionIds: ["commit"],
      },
      {
        id: "agency-4",
        name: "Create & deliver",
        functionIds: ["do"],
      },
      {
        id: "agency-5",
        name: "Invoice",
        functionIds: ["collect"],
      },
      {
        id: "agency-6",
        name: "Optimize & renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "legal",
    label: "Legal practice",
    group: "Services",
    description: "Matter-based professional service.",
    stages: [
      {
        id: "legal-1",
        name: "Receive inquiry",
        functionIds: ["get"],
      },
      {
        id: "legal-2",
        name: "Assess matter",
        functionIds: ["shape"],
      },
      {
        id: "legal-3",
        name: "Agree engagement",
        functionIds: ["commit"],
      },
      {
        id: "legal-4",
        name: "Perform legal work",
        functionIds: ["do"],
      },
      {
        id: "legal-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "legal-6",
        name: "Maintain relationship",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "accounting",
    label: "Accounting & bookkeeping",
    group: "Services",
    description: "Recurring or periodic financial record services.",
    stages: [
      {
        id: "accounting-1",
        name: "Attract clients",
        functionIds: ["get"],
      },
      {
        id: "accounting-2",
        name: "Assess records",
        functionIds: ["shape"],
      },
      {
        id: "accounting-3",
        name: "Agree engagement",
        functionIds: ["commit"],
      },
      {
        id: "accounting-4",
        name: "Prepare & review",
        functionIds: ["do"],
      },
      {
        id: "accounting-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "accounting-6",
        name: "Renew engagement",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "engineering",
    label: "Engineering & design",
    group: "Services",
    description: "Technical design or engineering project delivery.",
    stages: [
      {
        id: "engineering-1",
        name: "Identify project",
        functionIds: ["get"],
      },
      {
        id: "engineering-2",
        name: "Develop requirements",
        functionIds: ["shape"],
      },
      {
        id: "engineering-3",
        name: "Agree scope",
        functionIds: ["commit"],
      },
      {
        id: "engineering-4",
        name: "Design & validate",
        functionIds: ["do"],
      },
      {
        id: "engineering-5",
        name: "Invoice",
        functionIds: ["collect"],
      },
      {
        id: "engineering-6",
        name: "Support next phase",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "managed-it",
    label: "Managed IT & security services",
    group: "Technology",
    description: "Ongoing operation or support of client systems.",
    stages: [
      {
        id: "managed-it-1",
        name: "Attract clients",
        functionIds: ["get"],
      },
      {
        id: "managed-it-2",
        name: "Assess environment",
        functionIds: ["shape"],
      },
      {
        id: "managed-it-3",
        name: "Agree service",
        functionIds: ["commit"],
      },
      {
        id: "managed-it-4",
        name: "Operate & support",
        functionIds: ["do"],
      },
      {
        id: "managed-it-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "managed-it-6",
        name: "Review & renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "saas",
    label: "Software as a service",
    group: "Technology",
    description: "Hosted software sold through a recurring relationship.",
    stages: [
      {
        id: "saas-1",
        name: "Market",
        functionIds: ["get"],
      },
      {
        id: "saas-2",
        name: "Qualify & sell",
        functionIds: ["shape"],
      },
      {
        id: "saas-3",
        name: "Subscribe",
        functionIds: ["commit"],
      },
      {
        id: "saas-4",
        name: "Onboard & serve",
        functionIds: ["do"],
      },
      {
        id: "saas-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "saas-6",
        name: "Renew & expand",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "licensed-software",
    label: "Licensed software",
    group: "Technology",
    description: "Software licensing with implementation or maintenance.",
    stages: [
      {
        id: "licensed-software-1",
        name: "Generate demand",
        functionIds: ["get"],
      },
      {
        id: "licensed-software-2",
        name: "Evaluate fit",
        functionIds: ["shape"],
      },
      {
        id: "licensed-software-3",
        name: "License",
        functionIds: ["commit"],
      },
      {
        id: "licensed-software-4",
        name: "Deploy & support",
        functionIds: ["do"],
      },
      {
        id: "licensed-software-5",
        name: "Collect fees",
        functionIds: ["collect"],
      },
      {
        id: "licensed-software-6",
        name: "Upgrade & renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "custom-software",
    label: "Custom software development",
    group: "Technology",
    description: "Client-specific software projects.",
    stages: [
      {
        id: "custom-software-1",
        name: "Find projects",
        functionIds: ["get"],
      },
      {
        id: "custom-software-2",
        name: "Discover requirements",
        functionIds: ["shape"],
      },
      {
        id: "custom-software-3",
        name: "Agree delivery",
        functionIds: ["commit"],
      },
      {
        id: "custom-software-4",
        name: "Build & release",
        functionIds: ["do"],
      },
      {
        id: "custom-software-5",
        name: "Invoice",
        functionIds: ["collect"],
      },
      {
        id: "custom-software-6",
        name: "Maintain & extend",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace & brokerage platform",
    group: "Commerce",
    description: "Multiple participant groups transact through a platform.",
    stages: [
      {
        id: "marketplace-1",
        name: "Attract both sides",
        functionIds: ["get"],
      },
      {
        id: "marketplace-2",
        name: "Match supply & demand",
        functionIds: ["shape"],
      },
      {
        id: "marketplace-3",
        name: "Confirm transaction",
        functionIds: ["commit"],
      },
      {
        id: "marketplace-4",
        name: "Facilitate fulfillment",
        functionIds: ["do"],
      },
      {
        id: "marketplace-5",
        name: "Collect fees",
        functionIds: ["collect"],
      },
      {
        id: "marketplace-6",
        name: "Drive repeat use",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    group: "Commerce",
    description: "Online ordering and physical product fulfillment.",
    stages: [
      {
        id: "ecommerce-1",
        name: "Attract shoppers",
        functionIds: ["get"],
      },
      {
        id: "ecommerce-2",
        name: "Merchandise & select",
        functionIds: ["shape"],
      },
      {
        id: "ecommerce-3",
        name: "Place order",
        functionIds: ["commit"],
      },
      {
        id: "ecommerce-4",
        name: "Fulfill & deliver",
        functionIds: ["do"],
      },
      {
        id: "ecommerce-5",
        name: "Settle payment",
        functionIds: ["collect"],
      },
      {
        id: "ecommerce-6",
        name: "Support & repurchase",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "retail",
    label: "Physical retail",
    group: "Commerce",
    description: "Location-based product sales.",
    stages: [
      {
        id: "retail-1",
        name: "Attract shoppers",
        functionIds: ["get"],
      },
      {
        id: "retail-2",
        name: "Assist selection",
        functionIds: ["shape"],
      },
      {
        id: "retail-3",
        name: "Complete purchase",
        functionIds: ["commit"],
      },
      {
        id: "retail-4",
        name: "Provide goods",
        functionIds: ["do"],
      },
      {
        id: "retail-5",
        name: "Settle receipts",
        functionIds: ["collect"],
      },
      {
        id: "retail-6",
        name: "Support & return visits",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "wholesale",
    label: "Wholesale & distribution",
    group: "Commerce",
    description: "Products sourced and distributed to business customers.",
    stages: [
      {
        id: "wholesale-1",
        name: "Develop accounts",
        functionIds: ["get"],
      },
      {
        id: "wholesale-2",
        name: "Quote availability",
        functionIds: ["shape"],
      },
      {
        id: "wholesale-3",
        name: "Confirm order",
        functionIds: ["commit"],
      },
      {
        id: "wholesale-4",
        name: "Source & fulfill",
        functionIds: ["do"],
      },
      {
        id: "wholesale-5",
        name: "Invoice & collect",
        functionIds: ["collect"],
      },
      {
        id: "wholesale-6",
        name: "Replenish accounts",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "manufacturing",
    label: "Discrete manufacturing",
    group: "Production",
    description:
      "Physical goods assembled or fabricated. Source, make and ship support delivery.",
    stages: [
      {
        id: "manufacturing-1",
        name: "Forecast demand",
        functionIds: ["get"],
      },
      {
        id: "manufacturing-2",
        name: "Plan production",
        functionIds: ["shape"],
      },
      {
        id: "manufacturing-3",
        name: "Confirm orders",
        functionIds: ["commit"],
      },
      {
        id: "manufacturing-4",
        name: "Source materials",
        functionIds: ["do"],
      },
      {
        id: "manufacturing-5",
        name: "Make",
        functionIds: ["do"],
      },
      {
        id: "manufacturing-6",
        name: "Ship",
        functionIds: ["do"],
      },
      {
        id: "manufacturing-7",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "manufacturing-8",
        name: "Support",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "process-manufacturing",
    label: "Process manufacturing",
    group: "Production",
    description:
      "Materials transformed through batch or continuous processing.",
    stages: [
      {
        id: "process-manufacturing-1",
        name: "Forecast demand",
        functionIds: ["get"],
      },
      {
        id: "process-manufacturing-2",
        name: "Plan batches",
        functionIds: ["shape"],
      },
      {
        id: "process-manufacturing-3",
        name: "Commit supply",
        functionIds: ["commit"],
      },
      {
        id: "process-manufacturing-4",
        name: "Source inputs",
        functionIds: ["do"],
      },
      {
        id: "process-manufacturing-5",
        name: "Process & test",
        functionIds: ["do"],
      },
      {
        id: "process-manufacturing-6",
        name: "Release & ship",
        functionIds: ["do"],
      },
      {
        id: "process-manufacturing-7",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "process-manufacturing-8",
        name: "Support",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "contract-manufacturing",
    label: "Contract manufacturing",
    group: "Production",
    description: "Production carried out for another business.",
    stages: [
      {
        id: "contract-manufacturing-1",
        name: "Find programs",
        functionIds: ["get"],
      },
      {
        id: "contract-manufacturing-2",
        name: "Engineer & quote",
        functionIds: ["shape"],
      },
      {
        id: "contract-manufacturing-3",
        name: "Agree production",
        functionIds: ["commit"],
      },
      {
        id: "contract-manufacturing-4",
        name: "Source & manufacture",
        functionIds: ["do"],
      },
      {
        id: "contract-manufacturing-5",
        name: "Deliver",
        functionIds: ["do"],
      },
      {
        id: "contract-manufacturing-6",
        name: "Invoice",
        functionIds: ["collect"],
      },
      {
        id: "contract-manufacturing-7",
        name: "Extend program",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture & food production",
    group: "Production",
    description: "Seasonal or biological production and sale.",
    stages: [
      {
        id: "agriculture-1",
        name: "Assess demand",
        functionIds: ["get"],
      },
      {
        id: "agriculture-2",
        name: "Plan growing cycle",
        functionIds: ["shape"],
      },
      {
        id: "agriculture-3",
        name: "Commit supply",
        functionIds: ["commit"],
      },
      {
        id: "agriculture-4",
        name: "Grow & harvest",
        functionIds: ["do"],
      },
      {
        id: "agriculture-5",
        name: "Grade & distribute",
        functionIds: ["do"],
      },
      {
        id: "agriculture-6",
        name: "Collect",
        functionIds: ["collect"],
      },
      {
        id: "agriculture-7",
        name: "Plan next cycle",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "extractives",
    label: "Mining & resource extraction",
    group: "Production",
    description: "Resource production connected to downstream buyers.",
    stages: [
      {
        id: "extractives-1",
        name: "Identify demand",
        functionIds: ["get"],
      },
      {
        id: "extractives-2",
        name: "Assess resource & plan",
        functionIds: ["shape"],
      },
      {
        id: "extractives-3",
        name: "Agree supply",
        functionIds: ["commit"],
      },
      {
        id: "extractives-4",
        name: "Extract & process",
        functionIds: ["do"],
      },
      {
        id: "extractives-5",
        name: "Transport",
        functionIds: ["do"],
      },
      {
        id: "extractives-6",
        name: "Collect",
        functionIds: ["collect"],
      },
      {
        id: "extractives-7",
        name: "Maintain supply",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "construction",
    label: "Construction contractor",
    group: "Built environment",
    description: "Project-based construction with subcontractor coordination.",
    stages: [
      {
        id: "construction-1",
        name: "Find projects",
        functionIds: ["get"],
      },
      {
        id: "construction-2",
        name: "Estimate & plan",
        functionIds: ["shape"],
      },
      {
        id: "construction-3",
        name: "Contract",
        functionIds: ["commit"],
      },
      {
        id: "construction-4",
        name: "Build & inspect",
        functionIds: ["do"],
      },
      {
        id: "construction-5",
        name: "Invoice & collect",
        functionIds: ["collect"],
      },
      {
        id: "construction-6",
        name: "Maintain relationship",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "property-development",
    label: "Property development",
    group: "Built environment",
    description: "Development projects with capital and delivery milestones.",
    stages: [
      {
        id: "property-development-1",
        name: "Identify opportunity",
        functionIds: ["get"],
      },
      {
        id: "property-development-2",
        name: "Assess & design",
        functionIds: ["shape"],
      },
      {
        id: "property-development-3",
        name: "Secure commitments",
        functionIds: ["commit"],
      },
      {
        id: "property-development-4",
        name: "Develop & deliver",
        functionIds: ["do"],
      },
      {
        id: "property-development-5",
        name: "Sell or lease",
        functionIds: ["collect"],
      },
      {
        id: "property-development-6",
        name: "Manage next phase",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "real-estate",
    label: "Real estate brokerage",
    group: "Built environment",
    description: "Intermediation of property transactions.",
    stages: [
      {
        id: "real-estate-1",
        name: "Generate leads",
        functionIds: ["get"],
      },
      {
        id: "real-estate-2",
        name: "Match property & need",
        functionIds: ["shape"],
      },
      {
        id: "real-estate-3",
        name: "Agree transaction",
        functionIds: ["commit"],
      },
      {
        id: "real-estate-4",
        name: "Coordinate closing",
        functionIds: ["do"],
      },
      {
        id: "real-estate-5",
        name: "Collect commission",
        functionIds: ["collect"],
      },
      {
        id: "real-estate-6",
        name: "Maintain relationship",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "property-management",
    label: "Property management",
    group: "Built environment",
    description: "Ongoing property operations and tenant service.",
    stages: [
      {
        id: "property-management-1",
        name: "Attract owners & tenants",
        functionIds: ["get"],
      },
      {
        id: "property-management-2",
        name: "Assess property",
        functionIds: ["shape"],
      },
      {
        id: "property-management-3",
        name: "Agree management or lease",
        functionIds: ["commit"],
      },
      {
        id: "property-management-4",
        name: "Operate & maintain",
        functionIds: ["do"],
      },
      {
        id: "property-management-5",
        name: "Collect & account",
        functionIds: ["collect"],
      },
      {
        id: "property-management-6",
        name: "Renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "field-service",
    label: "Field service & trades",
    group: "Services",
    description: "On-site work organized around jobs and dispatch.",
    stages: [
      {
        id: "field-service-1",
        name: "Receive inquiry",
        functionIds: ["get"],
      },
      {
        id: "field-service-2",
        name: "Diagnose & quote",
        functionIds: ["shape"],
      },
      {
        id: "field-service-3",
        name: "Book work",
        functionIds: ["commit"],
      },
      {
        id: "field-service-4",
        name: "Dispatch & perform",
        functionIds: ["do"],
      },
      {
        id: "field-service-5",
        name: "Invoice",
        functionIds: ["collect"],
      },
      {
        id: "field-service-6",
        name: "Maintain & return",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "repair",
    label: "Repair & maintenance",
    group: "Services",
    description: "Restoring or maintaining equipment or products.",
    stages: [
      {
        id: "repair-1",
        name: "Receive item or request",
        functionIds: ["get"],
      },
      {
        id: "repair-2",
        name: "Diagnose",
        functionIds: ["shape"],
      },
      {
        id: "repair-3",
        name: "Approve estimate",
        functionIds: ["commit"],
      },
      {
        id: "repair-4",
        name: "Repair & test",
        functionIds: ["do"],
      },
      {
        id: "repair-5",
        name: "Collect payment",
        functionIds: ["collect"],
      },
      {
        id: "repair-6",
        name: "Follow up",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "staffing",
    label: "Staffing & contingent labor",
    group: "Services",
    description: "Workers supplied on assignments.",
    stages: [
      {
        id: "staffing-1",
        name: "Find employer demand",
        functionIds: ["get"],
      },
      {
        id: "staffing-2",
        name: "Source & qualify talent",
        functionIds: ["shape"],
      },
      {
        id: "staffing-3",
        name: "Agree placement",
        functionIds: ["commit"],
      },
      {
        id: "staffing-4",
        name: "Deploy & manage time",
        functionIds: ["do"],
      },
      {
        id: "staffing-5",
        name: "Bill & pay",
        functionIds: ["collect"],
      },
      {
        id: "staffing-6",
        name: "Extend assignment",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "recruiting",
    label: "Recruitment & executive search",
    group: "Services",
    description: "Permanent placement or executive search.",
    stages: [
      {
        id: "recruiting-1",
        name: "Find hiring needs",
        functionIds: ["get"],
      },
      {
        id: "recruiting-2",
        name: "Define role & search",
        functionIds: ["shape"],
      },
      {
        id: "recruiting-3",
        name: "Agree engagement",
        functionIds: ["commit"],
      },
      {
        id: "recruiting-4",
        name: "Assess & place",
        functionIds: ["do"],
      },
      {
        id: "recruiting-5",
        name: "Collect fee",
        functionIds: ["collect"],
      },
      {
        id: "recruiting-6",
        name: "Support retention",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "outsourcing",
    label: "Business process outsourcing",
    group: "Services",
    description: "Recurring client processes delivered by an external team.",
    stages: [
      {
        id: "outsourcing-1",
        name: "Find accounts",
        functionIds: ["get"],
      },
      {
        id: "outsourcing-2",
        name: "Design service",
        functionIds: ["shape"],
      },
      {
        id: "outsourcing-3",
        name: "Agree transition",
        functionIds: ["commit"],
      },
      {
        id: "outsourcing-4",
        name: "Operate process",
        functionIds: ["do"],
      },
      {
        id: "outsourcing-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "outsourcing-6",
        name: "Improve & renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "freight-brokerage",
    label: "Freight brokerage & forwarding",
    group: "Transport",
    description: "Arranging transportation with multiple providers.",
    stages: [
      {
        id: "freight-brokerage-1",
        name: "Find shipping demand",
        functionIds: ["get"],
      },
      {
        id: "freight-brokerage-2",
        name: "Plan route & quote",
        functionIds: ["shape"],
      },
      {
        id: "freight-brokerage-3",
        name: "Book shipment",
        functionIds: ["commit"],
      },
      {
        id: "freight-brokerage-4",
        name: "Coordinate movement",
        functionIds: ["do"],
      },
      {
        id: "freight-brokerage-5",
        name: "Settle & invoice",
        functionIds: ["collect"],
      },
      {
        id: "freight-brokerage-6",
        name: "Retain shipper",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "transport-carrier",
    label: "Transport carrier",
    group: "Transport",
    description: "Transport using operated assets or crews.",
    stages: [
      {
        id: "transport-carrier-1",
        name: "Find loads or passengers",
        functionIds: ["get"],
      },
      {
        id: "transport-carrier-2",
        name: "Plan capacity",
        functionIds: ["shape"],
      },
      {
        id: "transport-carrier-3",
        name: "Book service",
        functionIds: ["commit"],
      },
      {
        id: "transport-carrier-4",
        name: "Move & deliver",
        functionIds: ["do"],
      },
      {
        id: "transport-carrier-5",
        name: "Collect",
        functionIds: ["collect"],
      },
      {
        id: "transport-carrier-6",
        name: "Retain accounts",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "warehousing",
    label: "Warehousing & fulfillment",
    group: "Transport",
    description: "Inventory handling and fulfillment services.",
    stages: [
      {
        id: "warehousing-1",
        name: "Develop accounts",
        functionIds: ["get"],
      },
      {
        id: "warehousing-2",
        name: "Design storage & service",
        functionIds: ["shape"],
      },
      {
        id: "warehousing-3",
        name: "Agree contract",
        functionIds: ["commit"],
      },
      {
        id: "warehousing-4",
        name: "Receive store pick & dispatch",
        functionIds: ["do"],
      },
      {
        id: "warehousing-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "warehousing-6",
        name: "Optimize & renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "hospitality",
    label: "Hotels & lodging",
    group: "Consumer services",
    description: "Accommodation and guest service.",
    stages: [
      {
        id: "hospitality-1",
        name: "Attract guests",
        functionIds: ["get"],
      },
      {
        id: "hospitality-2",
        name: "Select stay",
        functionIds: ["shape"],
      },
      {
        id: "hospitality-3",
        name: "Book",
        functionIds: ["commit"],
      },
      {
        id: "hospitality-4",
        name: "Host & serve",
        functionIds: ["do"],
      },
      {
        id: "hospitality-5",
        name: "Settle bill",
        functionIds: ["collect"],
      },
      {
        id: "hospitality-6",
        name: "Encourage return",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant & food service",
    group: "Consumer services",
    description: "Food preparation and service.",
    stages: [
      {
        id: "restaurant-1",
        name: "Attract guests",
        functionIds: ["get"],
      },
      {
        id: "restaurant-2",
        name: "Choose order",
        functionIds: ["shape"],
      },
      {
        id: "restaurant-3",
        name: "Confirm order",
        functionIds: ["commit"],
      },
      {
        id: "restaurant-4",
        name: "Prepare & serve",
        functionIds: ["do"],
      },
      {
        id: "restaurant-5",
        name: "Collect payment",
        functionIds: ["collect"],
      },
      {
        id: "restaurant-6",
        name: "Encourage return",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "healthcare-practice",
    label: "Healthcare practice",
    group: "Care & education",
    description: "Patient care with distinct patient and payer relationships.",
    stages: [
      {
        id: "healthcare-practice-1",
        name: "Receive referral or inquiry",
        functionIds: ["get"],
      },
      {
        id: "healthcare-practice-2",
        name: "Assess needs",
        functionIds: ["shape"],
      },
      {
        id: "healthcare-practice-3",
        name: "Arrange care",
        functionIds: ["commit"],
      },
      {
        id: "healthcare-practice-4",
        name: "Provide & document care",
        functionIds: ["do"],
      },
      {
        id: "healthcare-practice-5",
        name: "Bill & reconcile",
        functionIds: ["collect"],
      },
      {
        id: "healthcare-practice-6",
        name: "Follow up",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "hospital",
    label: "Hospital & care network",
    group: "Care & education",
    description: "Multiple care pathways and supporting clinical operations.",
    stages: [
      {
        id: "hospital-1",
        name: "Receive referral or arrival",
        functionIds: ["get"],
      },
      {
        id: "hospital-2",
        name: "Triage & assess",
        functionIds: ["shape"],
      },
      {
        id: "hospital-3",
        name: "Plan care",
        functionIds: ["commit"],
      },
      {
        id: "hospital-4",
        name: "Treat & coordinate",
        functionIds: ["do"],
      },
      {
        id: "hospital-5",
        name: "Bill & reconcile",
        functionIds: ["collect"],
      },
      {
        id: "hospital-6",
        name: "Follow up",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "education",
    label: "Education & training",
    group: "Care & education",
    description: "Learner outcomes with tuition or sponsor funding.",
    stages: [
      {
        id: "education-1",
        name: "Attract learners",
        functionIds: ["get"],
      },
      {
        id: "education-2",
        name: "Assess fit",
        functionIds: ["shape"],
      },
      {
        id: "education-3",
        name: "Enroll",
        functionIds: ["commit"],
      },
      {
        id: "education-4",
        name: "Teach & assess",
        functionIds: ["do"],
      },
      {
        id: "education-5",
        name: "Collect fees or funding",
        functionIds: ["collect"],
      },
      {
        id: "education-6",
        name: "Support progression",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "research",
    label: "Research organization",
    group: "Care & education",
    description: "Research outputs with grants, contracts or sponsors.",
    stages: [
      {
        id: "research-1",
        name: "Identify question & funding",
        functionIds: ["get"],
      },
      {
        id: "research-2",
        name: "Design study",
        functionIds: ["shape"],
      },
      {
        id: "research-3",
        name: "Approve project",
        functionIds: ["commit"],
      },
      {
        id: "research-4",
        name: "Research & validate",
        functionIds: ["do"],
      },
      {
        id: "research-5",
        name: "Report & account",
        functionIds: ["collect"],
      },
      {
        id: "research-6",
        name: "Extend research",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "insurance-broker",
    label: "Insurance agency & broker",
    group: "Financial services",
    description: "Advice and intermediation between clients and insurers.",
    stages: [
      {
        id: "insurance-broker-1",
        name: "Find clients",
        functionIds: ["get"],
      },
      {
        id: "insurance-broker-2",
        name: "Assess needs",
        functionIds: ["shape"],
      },
      {
        id: "insurance-broker-3",
        name: "Bind placement",
        functionIds: ["commit"],
      },
      {
        id: "insurance-broker-4",
        name: "Service policy",
        functionIds: ["do"],
      },
      {
        id: "insurance-broker-5",
        name: "Collect fees",
        functionIds: ["collect"],
      },
      {
        id: "insurance-broker-6",
        name: "Renew & remarket",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "insurer",
    label: "Insurance carrier",
    group: "Financial services",
    description:
      "Risk-bearing policies and claims, with multiple interacting flows.",
    stages: [
      {
        id: "insurer-1",
        name: "Attract risks",
        functionIds: ["get"],
      },
      {
        id: "insurer-2",
        name: "Assess & price",
        functionIds: ["shape"],
      },
      {
        id: "insurer-3",
        name: "Bind coverage",
        functionIds: ["commit"],
      },
      {
        id: "insurer-4",
        name: "Administer & handle claims",
        functionIds: ["do"],
      },
      {
        id: "insurer-5",
        name: "Collect & reconcile",
        functionIds: ["collect"],
      },
      {
        id: "insurer-6",
        name: "Renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "lending",
    label: "Lending",
    group: "Financial services",
    description: "Financing followed by servicing and collections.",
    stages: [
      {
        id: "lending-1",
        name: "Source applicants",
        functionIds: ["get"],
      },
      {
        id: "lending-2",
        name: "Assess application",
        functionIds: ["shape"],
      },
      {
        id: "lending-3",
        name: "Agree financing",
        functionIds: ["commit"],
      },
      {
        id: "lending-4",
        name: "Fund & service",
        functionIds: ["do"],
      },
      {
        id: "lending-5",
        name: "Collect repayments",
        functionIds: ["collect"],
      },
      {
        id: "lending-6",
        name: "Retain relationship",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "payments",
    label: "Payments services",
    group: "Financial services",
    description: "Transaction processing and merchant service.",
    stages: [
      {
        id: "payments-1",
        name: "Acquire merchants",
        functionIds: ["get"],
      },
      {
        id: "payments-2",
        name: "Assess fit",
        functionIds: ["shape"],
      },
      {
        id: "payments-3",
        name: "Agree service",
        functionIds: ["commit"],
      },
      {
        id: "payments-4",
        name: "Process & reconcile",
        functionIds: ["do"],
      },
      {
        id: "payments-5",
        name: "Collect fees",
        functionIds: ["collect"],
      },
      {
        id: "payments-6",
        name: "Retain & expand",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "investment-management",
    label: "Investment management",
    group: "Financial services",
    description: "Ongoing management for a client mandate.",
    stages: [
      {
        id: "investment-management-1",
        name: "Develop relationships",
        functionIds: ["get"],
      },
      {
        id: "investment-management-2",
        name: "Assess mandate",
        functionIds: ["shape"],
      },
      {
        id: "investment-management-3",
        name: "Agree mandate",
        functionIds: ["commit"],
      },
      {
        id: "investment-management-4",
        name: "Manage & report",
        functionIds: ["do"],
      },
      {
        id: "investment-management-5",
        name: "Collect fees",
        functionIds: ["collect"],
      },
      {
        id: "investment-management-6",
        name: "Review & retain",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "nonprofit",
    label: "Nonprofit & mission delivery",
    group: "Public & mission",
    description:
      "Mission outcomes and funding are distinct; donors are not necessarily beneficiaries.",
    stages: [
      {
        id: "nonprofit-1",
        name: "Identify community need",
        functionIds: ["get"],
      },
      {
        id: "nonprofit-2",
        name: "Design program",
        functionIds: ["shape"],
      },
      {
        id: "nonprofit-3",
        name: "Secure commitments",
        functionIds: ["commit"],
      },
      {
        id: "nonprofit-4",
        name: "Deliver mission",
        functionIds: ["do"],
      },
      {
        id: "nonprofit-5",
        name: "Account for funding",
        functionIds: ["collect"],
      },
      {
        id: "nonprofit-6",
        name: "Sustain relationships",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "public-service",
    label: "Public services",
    group: "Public & mission",
    description:
      "Public outcomes and accountability; no assumption of a paying customer.",
    stages: [
      {
        id: "public-service-1",
        name: "Identify public need",
        functionIds: ["get"],
      },
      {
        id: "public-service-2",
        name: "Assess eligibility & plan",
        functionIds: ["shape"],
      },
      {
        id: "public-service-3",
        name: "Authorize service",
        functionIds: ["commit"],
      },
      {
        id: "public-service-4",
        name: "Deliver service",
        functionIds: ["do"],
      },
      {
        id: "public-service-5",
        name: "Account for resources",
        functionIds: ["collect"],
      },
      {
        id: "public-service-6",
        name: "Review outcomes",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "membership",
    label: "Membership & associations",
    group: "Consumer services",
    description: "Recurring member benefits and community.",
    stages: [
      {
        id: "membership-1",
        name: "Attract members",
        functionIds: ["get"],
      },
      {
        id: "membership-2",
        name: "Explain fit",
        functionIds: ["shape"],
      },
      {
        id: "membership-3",
        name: "Join",
        functionIds: ["commit"],
      },
      {
        id: "membership-4",
        name: "Deliver benefits",
        functionIds: ["do"],
      },
      {
        id: "membership-5",
        name: "Collect dues",
        functionIds: ["collect"],
      },
      {
        id: "membership-6",
        name: "Renew membership",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "events",
    label: "Events & experiences",
    group: "Consumer services",
    description: "Timed experiences with attendees, sponsors and suppliers.",
    stages: [
      {
        id: "events-1",
        name: "Attract audiences & sponsors",
        functionIds: ["get"],
      },
      {
        id: "events-2",
        name: "Design experience",
        functionIds: ["shape"],
      },
      {
        id: "events-3",
        name: "Book or register",
        functionIds: ["commit"],
      },
      {
        id: "events-4",
        name: "Produce event",
        functionIds: ["do"],
      },
      {
        id: "events-5",
        name: "Settle revenue",
        functionIds: ["collect"],
      },
      {
        id: "events-6",
        name: "Build next event",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "media",
    label: "Media & publishing",
    group: "Technology",
    description: "Content monetized by readers, advertisers or sponsors.",
    stages: [
      {
        id: "media-1",
        name: "Build audience",
        functionIds: ["get"],
      },
      {
        id: "media-2",
        name: "Plan content or campaign",
        functionIds: ["shape"],
      },
      {
        id: "media-3",
        name: "Secure subscriptions or advertisers",
        functionIds: ["commit"],
      },
      {
        id: "media-4",
        name: "Produce & distribute",
        functionIds: ["do"],
      },
      {
        id: "media-5",
        name: "Collect revenue",
        functionIds: ["collect"],
      },
      {
        id: "media-6",
        name: "Retain audience",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "telecom",
    label: "Telecommunications",
    group: "Technology",
    description: "Network service provision and ongoing customer operations.",
    stages: [
      {
        id: "telecom-1",
        name: "Generate demand",
        functionIds: ["get"],
      },
      {
        id: "telecom-2",
        name: "Qualify coverage",
        functionIds: ["shape"],
      },
      {
        id: "telecom-3",
        name: "Contract",
        functionIds: ["commit"],
      },
      {
        id: "telecom-4",
        name: "Provision & operate",
        functionIds: ["do"],
      },
      {
        id: "telecom-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "telecom-6",
        name: "Support & renew",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities & infrastructure services",
    group: "Production",
    description: "Infrastructure-based service delivery.",
    stages: [
      {
        id: "utilities-1",
        name: "Forecast need",
        functionIds: ["get"],
      },
      {
        id: "utilities-2",
        name: "Plan capacity",
        functionIds: ["shape"],
      },
      {
        id: "utilities-3",
        name: "Authorize connection",
        functionIds: ["commit"],
      },
      {
        id: "utilities-4",
        name: "Supply & maintain",
        functionIds: ["do"],
      },
      {
        id: "utilities-5",
        name: "Meter bill & collect",
        functionIds: ["collect"],
      },
      {
        id: "utilities-6",
        name: "Support continuity",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "franchise",
    label: "Franchisor & network operator",
    group: "Commerce",
    description: "A parent network supporting separately operated locations.",
    stages: [
      {
        id: "franchise-1",
        name: "Attract operators",
        functionIds: ["get"],
      },
      {
        id: "franchise-2",
        name: "Assess fit",
        functionIds: ["shape"],
      },
      {
        id: "franchise-3",
        name: "Agree franchise",
        functionIds: ["commit"],
      },
      {
        id: "franchise-4",
        name: "Launch & support locations",
        functionIds: ["do"],
      },
      {
        id: "franchise-5",
        name: "Collect fees",
        functionIds: ["collect"],
      },
      {
        id: "franchise-6",
        name: "Develop network",
        functionIds: ["grow"],
      },
    ],
  },
  {
    id: "rental",
    label: "Equipment rental & leasing",
    group: "Commerce",
    description: "Use of assets sold over a period rather than outright.",
    stages: [
      {
        id: "rental-1",
        name: "Find demand",
        functionIds: ["get"],
      },
      {
        id: "rental-2",
        name: "Match asset & term",
        functionIds: ["shape"],
      },
      {
        id: "rental-3",
        name: "Reserve or contract",
        functionIds: ["commit"],
      },
      {
        id: "rental-4",
        name: "Deliver maintain & return",
        functionIds: ["do"],
      },
      {
        id: "rental-5",
        name: "Bill",
        functionIds: ["collect"],
      },
      {
        id: "rental-6",
        name: "Renew or re-rent",
        functionIds: ["grow"],
      },
    ],
  },
];
export const functionSchema = z.enum([
  "get",
  "shape",
  "commit",
  "do",
  "collect",
  "grow",
]);
export const businessProfileSchema = z
  .object({
    industry: z.string().trim().max(200),
    status: z.enum(["proposed", "advisor_reviewed"]),
    rationale: z.string().trim().max(3000),
    streams: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(100),
            templateId: z
              .string()
              .refine(
                (id) =>
                  id === "custom" || businessTemplates.some((t) => t.id === id),
                "Unknown business template",
              ),
            name: z.string().trim().min(1).max(200),
            stages: z
              .array(
                z
                  .object({
                    id: z
                      .string()
                      .regex(/^[a-z0-9-]+$/)
                      .max(100),
                    name: z.string().trim().min(1).max(100),
                    description: z.string().trim().max(600).optional(),
                    provenance: stageProvenanceSchema.optional(),
                    functionIds: z.array(functionSchema).min(1).max(6),
                  })
                  .strict(),
              )
              .min(1)
              .max(16),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (new Set(p.streams.map((s) => s.id)).size !== p.streams.length)
      ctx.addIssue({
        code: "custom",
        message: "Flow IDs must be unique",
        path: ["streams"],
      });
    p.streams.forEach((s, i) => {
      if (new Set(s.stages.map((n) => n.id)).size !== s.stages.length)
        ctx.addIssue({
          code: "custom",
          message: "Stage IDs must be unique",
          path: ["streams", i, "stages"],
        });
    });
  });
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export const businessClassificationInstructions = `Classify operating models separately from industry. Propose one or several business streams using these template IDs: ${businessTemplates.map((t) => `${t.id}: ${t.label} (${t.description})`).join("; ")}. Use custom if no model fits. These are starting hypotheses, never proof of internal work or authority. Label uncertainty, cite supplied evidence and ask leadership to confirm. Support hybrid companies. In saved profiles, the first stream is the primary focus for the engagement; later streams are supporting work streams, not inferred revenue shares. Cover each included stream and their shared functions. The six common functions are Get work, Shape work, Commit work, Do work, Collect value, Keep/grow customer. A named stage may cover multiple functions; do not force positional equivalence. Supporting IT, HR, legal and finance work can enable several stages. Mission delivery and public services need outcome/funding language instead of forcing all work into revenue. Do not infer tasks, permissions or measured bottlenecks from a template.`;
