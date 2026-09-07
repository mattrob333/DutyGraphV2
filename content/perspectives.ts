export type Perspective = {
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  category: string;
  published: string;
  updated?: string;
  image: string;
  imageAlt: string;
  introduction: string[];
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    sources?: { label: string; url: string }[];
  }[];
  takeaway: string;
};

export const perspectives: Perspective[] = [
  {
    slug: "the-demand-side-of-ai-agents",
    title: "The demand side of the agent economy",
    seoTitle:
      "AI Governance Landscape: DutyGraph and the Demand Side of Agents",
    description:
      "Agent platforms expand what AI can do. DutyGraph starts upstream: defining the structured work, human responsibility, and outcomes that make delegation useful.",
    category: "AI governance & strategy",
    published: "2026-09-07",
    image: "/perspectives/images/demand-side-agents.png",
    imageAlt:
      "Ivory work modules connected by precise amber tracks to translucent blue components, illustrating structured work feeding agent capacity.",
    introduction: [
      "A company can give an AI agent a name, connect it to software, and put controls around its access. It still needs to answer a more basic question: what useful work should this agent actually do?",
      "“Help procurement” is an ambition. “Prepare a supplier-document completeness checklist from these approved inputs, flag missing items, and return it to this person for review” is a defined assignment. The distance between those two statements is where much of the implementation work lives.",
      "DutyGraph is being built around that upstream problem. We describe it as the demand side of the agent economy: the structured units of work a business needs performed, connected to the people responsible for them. This is our positioning thesis, not a claim that nobody else studies work or business context.",
    ],
    sections: [
      {
        id: "landscape",
        title:
          "The AI governance landscape addresses several different questions",
        paragraphs: [
          "AI governance is a broad category. To understand the landscape, it helps to separate the questions buyers are trying to answer. These categories overlap; a single platform may address several of them.",
          "Building and orchestration: how do we create, test, and deploy an agent? Salesforce’s Agentforce documentation, for example, describes building agents and connecting them to actions and business data. This is part of the capacity side of the market: making AI able to perform work.",
          "Identity and access: who or what is acting, and which resources may it use? Microsoft Entra Agent ID provides identity foundations for agents, alongside governance capabilities. An agent identity is an important control surface; a useful assignment also needs a description of its intended work.",
          "Discovery and security: which AI assets exist, including ones the organization has not approved? Noma describes discovering agents and other AI assets and maintaining an inventory. This addresses visibility into the environment and the security team's need to understand what is operating.",
          "Risk and assurance: how are AI systems evaluated, documented, and governed over their lifecycle? IBM watsonx.governance addresses governance and risk across AI assets. This work extends beyond agent construction into organizational oversight.",
          "Operational context: how does the business run, and what information helps AI act usefully within it? Celonis explicitly positions its process intelligence and context model around business operations and AI. This is an adjacent space that matters when assessing DutyGraph's position.",
        ],
        sources: [
          {
            label: "Salesforce: Design and Implement Agents",
            url: "https://help.salesforce.com/s/articleView?id=ai.copilot_intro.htm&language=en_US&type=5",
          },
          {
            label: "Microsoft: Entra Agent ID",
            url: "https://learn.microsoft.com/en-us/entra/agent-id/",
          },
          {
            label: "Noma: AI asset discovery",
            url: "https://www.noma.security/solutions/ai-asset-discovery",
          },
          {
            label: "IBM: watsonx.governance",
            url: "https://www.ibm.com/products/watsonx-governance",
          },
          {
            label: "Celonis: Context Model",
            url: "https://www.celonis.com/platform/context-model",
          },
        ],
      },
      {
        id: "supply-demand",
        title: "Agent capacity needs an equally clear definition of demand",
        paragraphs: [
          "We use “supply side” as shorthand for the tools that make agents available and operable: models, builders, orchestration, identities, access controls, and security. Those tools serve different purposes, and governance itself is broader than this metaphor.",
          "The demand side asks what the business needs accomplished. Which task contributes to an outcome? What starts it? What does good completion look like? Who needs the result? What judgment or authority must stay with a person?",
          "A buyer's interest in AI is commercial demand. Here, we mean something more operational: a reviewed description of work that can become a candidate assignment. A pile of vague automation ideas does not provide that.",
          "An agent can be correctly authenticated and still be doing poorly specified work. A beautifully specified task can also be unsafe to execute without appropriate controls. Productive delegation needs both.",
        ],
      },
      {
        id: "work-unit",
        title: "The structured work unit is the bridge",
        paragraphs: [
          "A role such as procurement manager contains several duties. A duty such as maintaining supplier records contains multiple tasks. Checking whether documents are present, preparing a record draft, resolving contradictions, and routing final approval have different inputs, risks, and decision requirements.",
          "A useful work unit names its responsible human and parent duty. It describes the trigger, incoming information and source, ordered actions, software, expected output, recipient, and exceptions. It preserves the evidence behind the description.",
          "For a delegation proposal, that description also needs a review boundary and a way to judge success. What may the agent prepare? What may it change? When must it stop and ask? How will a person know that the result is correct?",
          "This structure gives a builder a better specification, a reviewer a clearer scope, and an advisor something concrete to discuss. It does not, by itself, prove that an agent will perform the task reliably. That requires evaluation.",
        ],
      },
      {
        id: "example",
        title:
          "From “automate procurement” to an assignment someone can review",
        paragraphs: [
          "Consider a fictional distributor whose procurement team maintains supplier records. An interview reveals six tasks: check the incoming packet, prepare the record draft, resolve missing information, prepare the Finance handoff, summarize open handoffs, and route final approval.",
          "Document checking might be a candidate for AI assistance. The input is a supplier folder and an approved checklist. The actions are to compare the files with the checklist and identify missing or unreadable material. The output is a draft checklist with source references. A named person reviews it.",
          "That assignment does not include changing bank details, approving a supplier, or activating a record in an enterprise system. Those actions require different authority and evaluation.",
          "The same discovery may reveal that nobody knows who gives final supplier approval. Adding an agent to chase the request would leave the ownership problem unresolved. The immediate productive action is a leadership decision.",
          "This is why the upstream work matters. It can identify a suitable automation candidate, narrow an overbroad request, or show that the next improvement needs a human decision. Each is a useful outcome.",
        ],
      },
      {
        id: "dutygraph",
        title: "Where DutyGraph enters the picture",
        paragraphs: [
          "DutyGraph starts with an advisor and a company. Public research supplies initial context. Leadership explains departments, responsibilities, goals, and problems. The people doing the work then describe their tasks, including the exceptions and handoffs that a job title rarely captures.",
          "AI prepares granular task descriptions from those accounts. Participants review and edit them to confirm their understanding. The advisor can inspect the returned cards and follow connections in the company work map.",
          "That review is deliberately specific: a participant confirms what they understand their work to be. Conflicting accounts can still exist, ownership can still need resolution, and an automation proposal still needs separate authorization.",
          "Our intended position is upstream of selecting and governing an agent: helping the company establish the work it wants to delegate and the human responsibility behind it. The result should make the next conversation with an implementation or governance team more concrete.",
        ],
      },
      {
        id: "blue-ocean",
        title: "A blue-ocean direction, with a testable distinction",
        paragraphs: [
          "The opportunity we see is to compete on the clarity of the assignment and the value of discovery. Can a company leave the process knowing which work matters, where a handoff fails, and which bounded tasks deserve an AI pilot?",
          "That is a blue-ocean direction for our product strategy. It is not evidence of an empty market. Process intelligence, task mining, business architecture, workflow design, and consulting already address parts of this problem. Agent platforms also incorporate business context.",
          "Celonis's stated focus on operational context is a useful reminder of that overlap. DutyGraph must earn its position through its particular entry point: advisor-led discovery, employee-reviewed task accounts, and a traceable connection from duty to proposed delegation.",
          "The distinction needs to hold up in practice. Less effort to reach a usable task specification, fewer corrections, and better decisions about what to automate would be meaningful evidence. Describing a new category is only the starting point.",
        ],
        sources: [
          {
            label: "Celonis: Process Intelligence and effective AI agents",
            url: "https://www.celonis.com/blog/how-process-intelligence-helps-companies-build-more-effective-ai-agents-at-scale",
          },
        ],
      },
      {
        id: "ecosystem",
        title:
          "Better discovery can make the surrounding ecosystem more useful",
        paragraphs: [
          "For an advisor, the work map creates a basis for recommending an intervention. The answer might be AI assistance, a clearer responsibility, a workflow change, or further investigation. Software consolidation could be worth exploring when the evidence supports it.",
          "For an agent builder, reviewed work units can become candidate specifications and evaluation scenarios. For an identity or access team, the same record can explain why a scope is requested and who is responsible for the underlying work. For a risk reviewer, it can preserve the intended boundary and supporting account.",
          "These are complementary roles. DutyGraph's proposed governance direction is to connect a task and its responsible person to a manifest reviewed against effective access and policy. Actual provisioning and enforcement require real integrations; a task description cannot grant permission.",
          "Our current advisor pilot supports discovery, reviewed task descriptions, work maps, and strategy drafts. The governance examples are fictional demonstrations, and the pilot does not establish live IAM provisioning or customer-system agent execution.",
        ],
      },
      {
        id: "start",
        title: "Start with the work you need done",
        paragraphs: [
          "Before choosing another agent, choose one business outcome and ask the people involved to explain the work that contributes to it. Capture the inputs, actions, outputs, systems, and dependencies. Review the account together. Then decide which task is worth testing with AI.",
          "The agent economy needs capable technology and trustworthy controls. It also needs assignments grounded in the reality of a business.",
          "That is the demand side DutyGraph aims to make visible: structured work that people understand, can review, and can deliberately choose to delegate.",
        ],
      },
    ],
    takeaway:
      "Agent platforms supply capability. DutyGraph helps define the work that gives that capability a purpose.",
  },
  {
    slug: "the-adaptive-business",
    title: "Inside the adaptive business",
    seoTitle: "The Adaptive Business: AI Strategy and the Future of Work",
    description:
      "How AI could connect strategy to everyday work—and help people adapt with clearer goals, better context, and accountable decisions.",
    category: "The future of work",
    published: "2026-09-07",
    image: "/perspectives/images/adaptive-business.png",
    imageAlt:
      "Architectural blocks and translucent panels joined by branching tracks, with an amber decision point against a charcoal background.",
    introduction: [
      "Imagine a Monday leadership meeting that starts with a useful question: what changed in the business last week, and what should we do differently because of it?",
      "The team can see a shift in customer demand, an unresolved handoff between departments, and a recurring task consuming time without improving the result. Beside each observation sits its evidence. Beside each proposed response sits a responsible person, a clear boundary, and a way to measure whether it helped.",
      "That is our vision of an adaptive business: a company that can turn new information into deliberate changes in how it works. AI could make that cycle faster and more accessible. Its usefulness will depend on the quality of the company’s context—and on the people who decide what to do with it.",
    ],
    sections: [
      {
        id: "context",
        title: "The missing ingredient is a shared understanding of the work",
        paragraphs: [
          "A business plan describes where the company wants to go. An org chart names the people. Application records capture parts of what happened. Between them sits the practical knowledge of how the business actually operates: what arrives, who acts on it, what they produce, and who depends on the result.",
          "Much of that knowledge lives in people’s explanations, informal agreements, and exceptions. A job title rarely tells the full story. Two teams can use the same word for different responsibilities and discover the disagreement only when a customer is waiting.",
          "For an AI strategist to make useful recommendations, it needs this context. It needs to distinguish a documented rule from a customary workaround, an observation from an assumption, and a proposed change from an approved one. A stronger model does not remove the need for those distinctions.",
        ],
      },
      {
        id: "strategy",
        title: "An AI strategist needs a company model it can question",
        paragraphs: [
          "We see an opportunity for AI to become a persistent strategy partner: comparing new evidence with the company’s goals, surfacing contradictions, and preparing options for the people running the business.",
          "Strategy frameworks can give that reasoning structure. A Business Model Canvas can clarify how value is created and captured. Industry analysis can challenge assumptions about customers and competitors. A Theory of Constraints investigation can ask which limitation most affects a chosen outcome. A scorecard can connect an intervention to the measure that should change.",
          "These views should draw on a shared body of evidence. A new customer interview might change a market assumption. A task owner’s response might expose a missing approval. A system record might support one explanation for a delay and weaken another. Each change should make it clear which earlier conclusions need review.",
          "The strategic advantage we would test is a shorter, better-informed path from noticing a change to taking an effective action. Producing more analyses is useful only when the business can decide what to do next.",
        ],
      },
      {
        id: "loop",
        title: "Connect goals to the next useful task",
        paragraphs: [
          "A goal such as “improve delivery reliability” needs to become specific enough to guide work. Which orders are in scope? What counts as on time? Which team owns the measure? What trade-offs would make an apparent improvement unacceptable?",
          "Each key performance indicator, or KPI, needs a definition, an owner, and a measurement window. Faster handling means little if errors rise or customers receive the wrong result. An AI strategist should make those trade-offs visible when it proposes a task or a change.",
          "With those questions answered, an AI-assisted strategy process could prepare a bounded action: check why a particular handoff is waiting, resolve a responsibility gap, or test a different review sequence. The instruction should state the input, the action, the expected output, the responsible person, and the review date.",
          "The people doing the work need room to correct the proposal. They may know about an exception, a capacity limit, or a customer commitment that the system cannot see. Their response becomes part of the context for the next decision.",
          "This creates a practical cycle: observe what changed, interpret it against the goal, propose an action, approve the appropriate scope, do the work, and review the result. The business learns when it can connect the result back to the decision that produced it.",
        ],
      },
      {
        id: "example",
        title: "A supplier delay becomes a strategy question",
        paragraphs: [
          "Consider a fictional distributor. Procurement says supplier records are complete. Finance says it has checked the bank details. Operations is still waiting to activate the supplier. Everyone has finished what they believe is their part.",
          "A connected work map could reveal the unresolved question: who gives the final business approval? The advisor can bring the conflicting accounts to leadership and ask for an explicit decision.",
          "The AI strategy partner could also offer a competing explanation. Perhaps incomplete packets create more delay than the approval gap. The next useful instruction is to compare where complete and incomplete requests wait over an agreed period. Naming the loudest problem as the company’s bottleneck would skip that investigation.",
          "Once the team understands the cause, it can consider AI assistance for a narrow task such as preparing a completeness checklist. Approval of a supplier, access to banking information, and changes in an enterprise system remain separate decisions. A useful proposal explains those boundaries alongside the potential benefit.",
          "This is an illustrative future workflow, not a reported customer result. It shows the relationship we want to make visible: business goal, evidence, task, decision, and measured outcome.",
        ],
      },
      {
        id: "signals",
        title: "Continuous inputs need boundaries and a review rhythm",
        paragraphs: [
          "An adaptive business would bring together several kinds of input: employee accounts, customer feedback, operational records, changes in policy, and public market research. Each source offers a different view. None provides a complete picture by itself.",
          "A recommendation should show the systems and time period it covers, the age of its evidence, and what remains unknown. Missing data should invite a question. It should not become a confident assertion that an event never happened.",
          "Constant input also does not require constant interruption. A practical design would separate urgent exceptions from changes that belong in the weekly review. Teams need a stable plan long enough to act and measure, with clear rules for when a new signal justifies revisiting it.",
        ],
      },
      {
        id: "accountability",
        title: "Adaptation works when responsibility stays clear",
        paragraphs: [
          "The company still needs people to choose its goals, weigh trade-offs, and approve consequential changes. AI can prepare instructions and recommendations; the organization must decide who can accept them, what may execute within an existing approval, and what requires a new decision.",
          "This does not mean every task needs a meeting. It means the permitted scope is explicit. A routine action can operate inside a defined boundary. A change to that boundary needs an appropriate review. A record of the evidence, decision, owner, and version makes the change inspectable later.",
          "There is room for both dependable workflows and flexible agents. Anthropic’s engineering guidance distinguishes predefined workflows from agents that choose their own tool use, and emphasizes starting simply and evaluating the trade-offs. Dynamic behavior should earn its place through a better result.",
          "For the organizational side, NIST’s AI Risk Management Framework provides a reference for incorporating trustworthiness into how AI is designed, developed, used, and evaluated. Our future vision depends on that kind of ongoing responsibility rather than treating an initial deployment as the end of the work.",
        ],
        sources: [
          {
            label: "Anthropic: Building effective agents",
            url: "https://www.anthropic.com/engineering/building-effective-agents",
          },
          {
            label: "NIST: AI Risk Management Framework",
            url: "https://www.nist.gov/itl/ai-risk-management-framework",
          },
        ],
      },
      {
        id: "advisor",
        title: "The advisor helps the company learn to adapt",
        paragraphs: [
          "An advisor has an important role in establishing the first reliable picture of the business. They facilitate discovery, compare accounts across departments, challenge premature conclusions, and help leadership choose a tractable problem.",
          "Over time, the engagement can become a regular operating discipline. Review the evidence. Agree an intervention. Measure the result. Revisit the explanation. Train an internal owner to maintain the work map and keep the review process useful.",
          "That progression gives AI a meaningful place beside the strategist and the team. It can help maintain continuity between conversations and prepare the next set of questions. The people remain responsible for understanding the consequences and making the commitments.",
        ],
      },
      {
        id: "today",
        title: "Where DutyGraph fits today—and where this vision leads",
        paragraphs: [
          "DutyGraph’s current advisor pilot brings together discovery, participant-reviewed task descriptions, company work maps, and strategy framework drafts. It helps make responsibilities, handoffs, evidence, and proposed AI work visible for review.",
          "The continuously sensing strategy partner described in this article is a direction for exploration. The current pilot does not autonomously reorganize a company, continuously ingest every business system, or execute agents inside customer applications. Governance examples use fictional scenarios, and proposed AI scope does not itself grant access.",
          "Our immediate question is practical: can better discovery and a shared work map help an advisor and a company make better decisions about what to improve? Pilots will help us test that usefulness, the effort required, and the results that can actually be demonstrated.",
        ],
      },
      {
        id: "begin",
        title: "Start with one flow and one outcome",
        paragraphs: [
          "A company can begin by choosing one outcome that matters and one flow that contributes to it. Ask the people involved to explain the work. Connect their accounts. Identify the unresolved assumptions. Agree what evidence would distinguish between possible causes.",
          "Then make one bounded change and review what happens. Useful adaptation grows from that discipline. The long-term opportunity is a business that can preserve what it has learned, recognize when the conditions have changed, and give its people a clearer next step.",
        ],
      },
    ],
    takeaway:
      "Before AI can help a business adapt, the business needs a shared understanding of its work.",
  },
];
