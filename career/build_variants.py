"""Builds variants.json (tailored resume copy) with hard length limits so every
generated resume stays on exactly one page. Run this, then `node build_resumes.cjs`."""
import json

MAX_BULLET  = 124   # one rendered line at Calibri 10pt across a 7.4in text column
MAX_SKILL   = 250   # two rendered lines
MAX_SUMMARY = 250   # two rendered lines

def V(f,h,s,sk,o,b,pr=None):
    return {"file":f,"headline":h,"summary":s,"skills":sk,"order":o,"bullets":b,"projects":pr or []}

SE = V("Miles_Tipton_Sales_Engineer","SALES ENGINEER | SOLUTIONS ENGINEER",
 "Sales Engineer with 3+ years in technical pre-sales across Generative AI, Conversational AI, and managed IT services. 20+ executive demos delivered, $60K in services closed in three months, and hands-on with the APIs and LLMs I sell.",
 [["Technical Pre-Sales","Technical pre-sales, solutions engineering, technical discovery, solution design, product demos, proof of concept (POC), RFP/RFI responses, technical win, sales cycle management, stakeholder management"],
  ["AI & Automation","Generative AI, Large Language Models (LLM), Conversational AI, NLP chatbots, prompt engineering, multi-agent workflows, OpenAI AgentKit, n8n, Zapier, Make, GPT-4, Claude, Gemini"],
  ["Customer & Enablement","Requirements gathering, objection handling, executive presentations, sales enablement, technical documentation, implementation handoff, cross-functional collaboration, customer onboarding"],
  ["Technical & GTM","REST APIs, API integration, webhooks, React, Django REST Framework, SQL, Python, JavaScript, Power BI (Power Query, DAX), Microsoft Azure, Git/GitHub, HubSpot CRM, Apollo.io, SaaS, B2B"]],
 ["socialhogg","upath","merly","momentum","inbenta","homegrown"],
 {"socialhogg":["Run 60+ outbound discovery calls daily to SMB decision-makers, qualifying on budget, need, and buying authority.",
                "Closed 20+ new accounts and generated 50+ qualified leads by mapping visibility gaps to SEO and paid social solutions."],
  "upath":["Architect multi-agent AI workflows on OpenAI AgentKit, n8n, and Manus, increasing prospect research speed 40%.",
           "Built a custom CRM ingesting and enriching lead data via APIs, generating 50+ qualified inbound leads in Q1."],
  "merly":["Built outbound infrastructure for a technical product using segmentation and A/B-tested messaging to engineering buyers.",
           "Achieved a 60% email open rate; managed research, enrichment, and pipeline hygiene in HubSpot CRM and Apollo.io."],
  "momentum":["Built AI outbound workflows with GPT-4, Zapier, and Make that cut manual sales-operations tasks 30%."],
  "inbenta":["Delivered 20+ tailored Generative AI and Conversational AI demos to executive stakeholders across multiple industries.",
             "Ran technical discovery, converting customer requirements into scoped solutions and integration guidance for AEs.",
             "Authored technical documentation, demo assets, and enablement materials used company-wide in the pre-sales process.",
             "Partnered with product and engineering on custom solutions for complex requirements as technical point of contact."],
  "homegrown":["Closed $60,000 in managed IT and professional services contracts in three months via technical discovery and scoping.",
               "Built Power BI dashboards (Power Query, DAX, Microsoft Azure) turning customer data into operational insights."]})

SC = V("Miles_Tipton_AI_Solutions_Consultant","AI SOLUTIONS CONSULTANT | FORWARD-DEPLOYED SOLUTIONS",
 "AI Solutions Consultant who sells and builds. 3+ years turning Generative AI and automation into scoped, working customer solutions: 20+ executive demos, $60K in services closed, production multi-agent workflows on AgentKit, n8n, and GPT-4.",
 [["AI Solutions","Generative AI, Large Language Models (LLM), Conversational AI, NLP chatbots, prompt engineering, multi-agent orchestration, agentic workflows, OpenAI AgentKit, n8n, Zapier, Make, Manus, GPT-4, Claude, Gemini"],
  ["Consulting & Delivery","Technical discovery, requirements gathering, solution design, scoping, proof of concept (POC), implementation, stakeholder management, executive presentations, technical documentation, training and enablement"],
  ["Customer & Delivery","Customer onboarding, implementation handoff, cross-functional collaboration, objection handling, change management, process improvement, solutions engineering, sales cycle management"],
  ["Technical & GTM","REST APIs, API integration, webhooks, React, Django REST Framework, SQL, Python, JavaScript, Power BI (Power Query, DAX), Microsoft Azure, Airtable, Framer, Git/GitHub, HubSpot CRM, Apollo.io, B2B SaaS"]],
 ["upath","socialhogg","merly","momentum","inbenta","homegrown"],
 {"upath":["Design multi-agent AI workflows on OpenAI AgentKit, n8n, and Manus, increasing prospect research speed 40%.",
           "Built a custom CRM and qualification pipeline enriching data via APIs, generating 50+ qualified inbound leads in Q1.",
           "Own engagements end to end: discovery, scoping, build, deployment, and ongoing optimization."],
  "socialhogg":["Closed 20+ SMB deals and generated 50+ qualified leads by uncovering owner needs and driving follow-up to close.",
                "Leverage ChatGPT, Claude, and Gemini to research and personalize 60+ daily outbound touches."],
  "merly":["Achieved a 60% outbound open rate by researching pain points and tailoring communication to technical audiences.",
           "Used HubSpot CRM, ChatGPT, and Apollo.io to research prospects, enrich account data, and maintain follow-up."],
  "momentum":["Built an AI outbound workflow with GPT-4, Zapier, and Make that reduced manual sales-operations tasks 30%."],
  "inbenta":["Presented tailored Generative AI and Conversational AI demos to 20+ executives, driving adoption across industries.",
             "Conducted deep-dive technical discovery, translating findings into actionable solution recommendations for AEs.",
             "Authored technical documentation and training materials supporting complex cycles and implementation handoffs.",
             "Collaborated with product and engineering on custom solutions for complex customer requirements."],
  "homegrown":["Closed $60,000 in managed and professional IT services contracts in three months by scoping customer needs.",
               "Built Power BI dashboards (Power Query, Microsoft Azure, DAX) turning customer data into actionable insights."]})

TAM = V("Miles_Tipton_Technical_Account_Manager","TECHNICAL ACCOUNT MANAGER | IMPLEMENTATION & ONBOARDING",
 "Customer-facing technical professional with 3+ years across AI software, IT services, and startup operations. Onboards and implements technical products end to end: requirements, configuration, integration, documentation, and training.",
 [["Customer Success & Implementation","Customer onboarding, implementation coordination, requirements gathering, solution configuration, project coordination, open-item tracking, escalation management, customer training, adoption, retention, QBRs"],
  ["Technical","REST API integration, webhooks, troubleshooting, SQL, Python, JavaScript, React, Django REST Framework, Power BI (Power Query, DAX), Microsoft Azure, Airtable, Git/GitHub"],
  ["AI & Systems","Generative AI, Large Language Models (LLM), Conversational AI, NLP chatbots, workflow automation, OpenAI AgentKit, n8n, Zapier, Make, GPT-4, Claude, Gemini, HubSpot CRM, technical documentation, SaaS"],
  ["Pre-Sales & Delivery","Technical discovery, product demos, proof of concept (POC), solution design, executive presentations, stakeholder management, sales cycle management, cross-functional collaboration"]],
 ["inbenta","upath","merly","momentum","socialhogg","homegrown"],
 {"inbenta":["Presented Generative AI and Conversational AI demos to 20+ executives, translating capability into business terms.",
             "Collaborated cross-functionally with sales and technical teams on solutions for complex customer requirements.",
             "Built technical documentation and training materials that made capabilities easier for customer teams to convey.",
             "Served as technical point of contact through evaluation and handoff, tracking open items to implementation."],
  "upath":["Design multi-step AI and data workflows on OpenAI AgentKit, Manus, and n8n that reduce manual delivery work.",
           "Built a customer-facing platform in Manus and Framer connecting front-end UX to back-end automations via APIs.",
           "Built automated qualification and CRM workflows organizing follow-up, next steps, and account handoffs."],
  "merly":["Used HubSpot CRM, ChatGPT, and Apollo.io to research accounts, enrich data, and maintain lifecycle follow-up.",
           "Achieved a 60% outbound open rate by researching pain points and tailoring communication to each audience."],
  "momentum":["Built GPT-4, Zapier, and Make workflows cutting manual tasks 30%, with real-time Airtable dashboards."],
  "socialhogg":["Manage 60+ customer conversations per day, tracking needs, objections, next steps, and handoffs.",
                "Research each account and tailor conversations to the owner's operations and technical familiarity."],
  "homegrown":["Closed and coordinated delivery of $60,000 in managed and professional IT services contracts in three months.",
               "Built Power BI dashboards (Power Query, Microsoft Azure, DAX) turning customer data into account insights."]})

AE = V("Miles_Tipton_Account_Executive","ACCOUNT EXECUTIVE | TECHNICAL SALES REPRESENTATIVE",
 "Quota-carrying sales professional with 3+ years selling technical products: Generative AI software, managed IT services, and digital marketing. $60K closed in three months, 20+ accounts closed on a 60-call daily cadence, 20+ executive demos.",
 [["Sales","Full-cycle sales, new business development, outbound prospecting, cold calling, discovery, needs analysis, solution selling, objection handling, negotiation, closing, quota attainment, pipeline generation, forecasting"],
  ["Technical Sales","Product demonstrations, technical discovery, proof of concept (POC), solution scoping, SaaS, B2B, API integration, competitive positioning, business case and ROI development, executive presentations"],
  ["AI & Systems","Generative AI, Large Language Models (LLM), Conversational AI, GPT-4, Claude, Gemini, OpenAI AgentKit, n8n, Zapier, Make, HubSpot CRM, Apollo.io, LinkedIn Sales Navigator, Power BI"],
  ["Customer & Process","Requirements gathering, stakeholder management, sales cycle management, cross-functional collaboration, technical documentation, sales enablement, customer onboarding, implementation handoff"]],
 ["socialhogg","upath","merly","momentum","inbenta","homegrown"],
 {"socialhogg":["Closed 20+ new SMB accounts and generated 50+ qualified leads on a 60+ daily cold-call cadence across North America.",
                "Qualify prospects by diagnosing online-visibility gaps, then position SEO and paid social to their revenue goals.",
                "Use ChatGPT, Claude, and Gemini to research accounts and personalize outreach at scale."],
  "upath":["Generated 50+ qualified inbound leads via SEO, LinkedIn, and referrals, owning every deal from first call to close.",
           "Built a custom CRM and qualification workflow on OpenAI AgentKit and n8n, increasing research speed 40%."],
  "merly":["Built outbound infrastructure through segmentation and A/B-tested messaging to technical buyers, hitting a 60% open rate.",
           "Managed prospect research, data enrichment, and pipeline hygiene in HubSpot CRM and Apollo.io."],
  "momentum":["Built an AI outbound workflow with GPT-4, Zapier, and Make that reduced manual sales-operations tasks 30%."],
  "inbenta":["Delivered 20+ Generative AI and Conversational AI demos to executives, converting capability into business terms.",
             "Partnered with Account Executives on competitive deals, running discovery and producing solution recommendations.",
             "Built technical documentation, demo assets, and training materials supporting the sales process company-wide."],
  "homegrown":["Closed $60,000 in managed IT and professional services contracts in three months, running discovery to signature.",
               "Built Power BI dashboards (Power Query, DAX, Microsoft Azure) to develop data-backed business cases in deals."]})

VARIANTS = {"sales_engineer":SE,"solutions_consultant":SC,
            "technical_account_manager":TAM,"account_executive":AE}

if __name__ == "__main__":
    problems = []
    for k, v in VARIANTS.items():
        if len(v["summary"]) > MAX_SUMMARY:
            problems.append(f"summary {k}: {len(v['summary'])} > {MAX_SUMMARY}")
        for lbl, txt in v["skills"]:
            n = len(lbl) + 2 + len(txt)
            if n > MAX_SKILL:
                problems.append(f"skill {k}/{lbl}: {n} > {MAX_SKILL}")
        for rk, bs in v["bullets"].items():
            for b in bs:
                if len(b) > MAX_BULLET:
                    problems.append(f"bullet {k}/{rk}: {len(b)} > {MAX_BULLET} :: {b}")
    if problems:
        raise SystemExit("LENGTH CHECKS FAILED:\n  " + "\n  ".join(problems))
    json.dump(VARIANTS, open("variants.json", "w"), indent=2)
    print("Length checks passed; variants.json written.")
    for k, v in VARIANTS.items():
        print(f"  {k:28s} bullets={sum(len(b) for b in v['bullets'].values())}")
