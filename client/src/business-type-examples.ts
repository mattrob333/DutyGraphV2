// Recognition aids for the catalog only. Never used as company evidence or AI input.
export type BusinessExample = { name: string; url?: string; context: string };
export const businessTypeExamples: Record<string, BusinessExample> = {
  generic: {
    name: "A local business combining sales and services",
    context:
      "Use this flexible starting point when a more specific pattern does not fit.",
  },
  advisory: {
    name: "McKinsey & Company",
    url: "https://www.mckinsey.com/about-us/overview",
    context: "Helping leadership diagnose problems and make decisions.",
  },
  "professional-services": {
    name: "Deloitte",
    url: "https://www.deloitte.com/",
    context:
      "Skilled teams delivering client projects and ongoing professional services.",
  },
  agency: {
    name: "Ogilvy",
    url: "https://www.ogilvy.com/",
    context:
      "Creating brands, advertising and marketing campaigns for clients.",
  },
  legal: {
    name: "Baker McKenzie",
    url: "https://www.bakermckenzie.com/",
    context: "Lawyers advising clients and handling legal matters.",
  },
  accounting: {
    name: "H&R Block",
    url: "https://www.hrblock.com/",
    context: "Preparing tax returns and providing tax-related services.",
  },
  engineering: {
    name: "AECOM",
    url: "https://aecom.com/",
    context: "Engineering and designing infrastructure for clients.",
  },
  "managed-it": {
    name: "Kyndryl",
    url: "https://www.kyndryl.com/us/en/services/cloud/managed",
    context: "Operating and supporting clients’ technology infrastructure.",
  },
  saas: {
    name: "Salesforce",
    url: "https://www.salesforce.com/crm/",
    context: "Customers subscribe to hosted business software.",
  },
  "licensed-software": {
    name: "Oracle Database",
    url: "https://www.oracle.com/support/license-codes/",
    context:
      "Licensing software for customer use, with support and maintenance.",
  },
  "custom-software": {
    name: "Thoughtworks",
    url: "https://www.thoughtworks.com/what-we-do",
    context: "Engineering software around a client’s particular needs.",
  },
  marketplace: {
    name: "eBay",
    url: "https://www.ebayinc.com/company/",
    context: "Connecting buyers and sellers through a transaction platform.",
  },
  ecommerce: {
    name: "Chewy",
    url: "https://www.chewy.com/",
    context: "Taking online orders and delivering physical products.",
  },
  retail: {
    name: "Target",
    url: "https://corporate.target.com/",
    context: "Selling products through a network of stores; also sells online.",
  },
  wholesale: {
    name: "Wesco",
    url: "https://www.wesco.com/",
    context:
      "Distributing electrical, communications and utility products to businesses.",
  },
  manufacturing: {
    name: "Toyota",
    url: "https://www.toyota.com/",
    context: "Assembling individual products, such as cars, from parts.",
  },
  "process-manufacturing": {
    name: "Dow",
    url: "https://www.dow.com/",
    context:
      "Transforming materials through chemical and industrial processes.",
  },
  "contract-manufacturing": {
    name: "Jabil",
    url: "https://www.jabil.com/solutions/manufacturing.html",
    context: "Manufacturing products for other companies’ brands.",
  },
  agriculture: {
    name: "Dole",
    url: "https://www.doleplc.com/our-business/our-business-units/dole-fresh-fruit/default.aspx",
    context: "Growing and sourcing fresh fruit for sale.",
  },
  extractives: {
    name: "Rio Tinto",
    url: "https://www.riotinto.com/",
    context: "Extracting and supplying minerals and metals.",
  },
  construction: {
    name: "Turner Construction",
    url: "https://www.turnerconstruction.com/",
    context:
      "Delivering construction projects with specialist trades and suppliers.",
  },
  "property-development": {
    name: "Prologis",
    url: "https://www.prologis.com/real-estate/development",
    context:
      "Developing logistics properties; development is one part of its business.",
  },
  "real-estate": {
    name: "RE/MAX",
    url: "https://www.remax.com/",
    context: "Its agents and offices help clients buy and sell property.",
  },
  "property-management": {
    name: "Greystar",
    url: "https://www.greystar.com/business/services/property-management",
    context: "Managing rental properties and serving residents.",
  },
  "field-service": {
    name: "Roto-Rooter",
    url: "https://www.rotorooter.com/",
    context:
      "Dispatching technicians to customers for plumbing and drain work.",
  },
  repair: {
    name: "Jiffy Lube",
    url: "https://www.jiffylube.com/",
    context: "Maintaining vehicles through scheduled service jobs.",
  },
  staffing: {
    name: "Adecco",
    url: "https://www.adecco.com/",
    context: "Placing workers into temporary and other client assignments.",
  },
  recruiting: {
    name: "Korn Ferry",
    url: "https://www.kornferry.com/capabilities/talent-acquisition/executive-search",
    context: "Finding and placing leaders through executive search.",
  },
  outsourcing: {
    name: "Concentrix",
    url: "https://www.concentrix.com/",
    context:
      "Running customer-service and related operations for other companies.",
  },
  "freight-brokerage": {
    name: "C.H. Robinson",
    url: "https://www.chrobinson.com/",
    context:
      "Arranging shipments between customers and transportation providers.",
  },
  "transport-carrier": {
    name: "UPS",
    url: "https://www.ups.com/",
    context: "Moving shipments using a transportation network.",
  },
  warehousing: {
    name: "GXO",
    url: "https://gxo.com/",
    context:
      "Handling inventory, warehousing and order fulfillment for clients.",
  },
  hospitality: {
    name: "Marriott hotels",
    url: "https://www.marriott.com/",
    context: "The guest-facing hotel operation: bookings, stays and service.",
  },
  restaurant: {
    name: "Chipotle",
    url: "https://www.chipotle.com/",
    context: "Preparing meals and serving customers in restaurants.",
  },
  "healthcare-practice": {
    name: "Aspen Dental practices",
    url: "https://www.aspendental.com/",
    context: "Dental teams scheduling visits and providing patient care.",
  },
  hospital: {
    name: "Mayo Clinic",
    url: "https://www.mayoclinic.org/",
    context: "Coordinating care across specialties, clinics and hospitals.",
  },
  education: {
    name: "Kumon",
    url: "https://www.kumon.com/",
    context: "Delivering structured learning through education centers.",
  },
  research: {
    name: "RAND",
    url: "https://www.rand.org/about.html",
    context: "Producing research and analysis for policy decisions.",
  },
  "insurance-broker": {
    name: "Marsh",
    url: "https://www.marsh.com/",
    context: "Helping clients arrange insurance and manage risk.",
  },
  insurer: {
    name: "Progressive",
    url: "https://www.progressive.com/",
    context: "Issuing insurance policies and handling covered claims.",
  },
  lending: {
    name: "Rocket Mortgage",
    url: "https://www.rocketmortgage.com/",
    context: "Originating home loans and supporting borrowers.",
  },
  payments: {
    name: "Stripe",
    url: "https://stripe.com/payments",
    context: "Processing payments for businesses.",
  },
  "investment-management": {
    name: "Vanguard",
    url: "https://corporate.vanguard.com/",
    context: "Managing investment products and client assets.",
  },
  nonprofit: {
    name: "American Red Cross",
    url: "https://www.redcross.org/",
    context:
      "Using donations and other support to deliver a public-service mission.",
  },
  "public-service": {
    name: "US Postal Service",
    url: "https://about.usps.com/",
    context:
      "Delivering a public service with defined obligations and accountability.",
  },
  membership: {
    name: "AAA",
    url: "https://www.aaa.com/",
    context: "Providing recurring benefits and services to members.",
  },
  events: {
    name: "Live Nation",
    url: "https://www.livenationentertainment.com/",
    context: "Organizing concerts and live experiences.",
  },
  media: {
    name: "The New York Times",
    url: "https://www.nytco.com/",
    context: "Publishing content supported by subscriptions and advertising.",
  },
  telecom: {
    name: "AT&T",
    url: "https://www.att.com/",
    context: "Providing ongoing mobile and network connectivity.",
  },
  utilities: {
    name: "Duke Energy",
    url: "https://www.duke-energy.com/",
    context:
      "Delivering electricity and other utility services through infrastructure.",
  },
  franchise: {
    name: "McDonald’s franchise network",
    url: "https://corporate.mcdonalds.com/corpmcd/franchising-overview.html",
    context: "A franchisor supporting independently operated restaurants.",
  },
  rental: {
    name: "United Rentals",
    url: "https://www.unitedrentals.com/",
    context:
      "Renting equipment for a period, then collecting and servicing it.",
  },
};
