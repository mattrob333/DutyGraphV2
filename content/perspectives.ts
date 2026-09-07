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
