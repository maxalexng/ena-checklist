import type { Agency } from "./types";

// The full checklist template, ported 1:1 from submissions-register-MASTER.html's
// `AGENCIES` constant (originally ~lines 2070-2457). This is the office's single shared
// definition of every regulatory submission and checklist item, for every project — see
// src/template/changelog.ts for the revision history convention carried forward from the
// prototype's TEMPLATE_VERSION/TEMPLATE_CHANGELOG.
//
// To change the template (add/edit/remove an item, submission, or agency), edit this file
// and bump TEMPLATE_VERSION in changelog.ts — the change then applies to every project on
// next deploy, with no manual per-project copying (unlike the old MASTER.html workflow).
export const AGENCIES: Agency[] = [
  {
    id: "ura",
    code: "URA",
    name: "Urban Redevelopment Authority",
    full: "URA",
    blurb:
      "Land use planning — GFA, site coverage, building height, setbacks, and conservation control.",
    submissions: [
      {
        code: "PP",
        name: "Planning Permission (Written Permission)",
        when: "New erection, reconstruction, or any addition/alteration that changes GFA, use, or the building envelope.",
        items: [
          "Design locked — client's Design Freeze Sign-off (Design Development step) and QP sign-off obtained before lodging PP (further changes go through a formal variation, not folded in quietly)",
          "Application lodged via CORENET X / CORENET 2.0",
          "QP declaration form",
          "Landowner's consent and title particulars",
          "Payment of Planning Permission application fee",
          "Written Permission letter obtained (required before BCA Building Plan submission)",
        ],
      },
      {
        code: "PL",
        name: "Plan Lodgement — minor A&A to a landed house",
        conditional: true,
        when: "Minor additions or alterations that do not trigger full Planning Permission.",
        items: [
          "PL checklist and application via CORENET e-service",
          "Simplified existing and proposed drawings",
          "PE endorsement where structural works are involved",
          "Compliance declaration against the Prevailing Planning Controls for Landed Housing",
        ],
      },
      {
        code: "OP",
        name: "Outline Permission",
        conditional: true,
        when: "Large, phased, or subdivision schemes seeking in-principle clearance before detailed plans.",
        items: [
          "Concept site plan / masterplan layout",
          "Statement of intended land use and phasing",
          "Supporting technical study summaries (traffic, drainage) where required",
        ],
      },
      {
        code: "SUB",
        name: "Subdivision / Amalgamation of Lots",
        conditional: true,
        when: "Splitting or combining land parcels — common on GCB sites.",
        items: [
          "SLA cadastral subdivision or amalgamation plan",
          "Compliance check against URA subdivision guidelines (minimum plot size, frontage)",
          "Confirmation of road / back-lane reserve and access",
          "Application via CORENET and payment of subdivision fee",
        ],
      },
      {
        code: "DC/DP",
        name: "Development Charge / Differential Premium assessment",
        conditional: true,
        when: "Where the proposal increases GFA or changes use, before Written Permission is issued.",
        items: ["GFA and use-change computation", "DC/DP payment or exemption declaration"],
      },
      {
        code: "CONSV",
        name: "Conservation Permission",
        conditional: true,
        when: "Conservation bungalows or shophouses.",
        items: [
          "Heritage / conservation guidelines compliance write-up",
          "Historical photographs and measured drawings of existing conserved elements",
          "Materials and restoration methodology statement",
        ],
      },
    ],
  },
  {
    id: "bca",
    code: "BCA",
    name: "Building and Construction Authority",
    full: "BCA",
    blurb:
      "Building control — structural safety, buildability, accessibility, and statutory completion.",
    submissions: [
      {
        code: "BP",
        name: "Building Plan submission",
        when: "After URA Written Permission is obtained, before works commence.",
        items: [
          "Construction (working) drawing set developed and coordinated across all consultants — architectural, C&S, M&E",
          {
            text: "Prepare submission drawings",
            checklist: [
              "Architectural drawings (plans, elevations, sections) signed and endorsed by the QP",
              "Structural drawings cross-referenced to the BCA ST submission",
              "Fifth Schedule compliance declaration (objectives and performance requirements)",
              "Compliance with the current Approved Document",
              "Code on Accessibility in the Built Environment compliance, where triggered",
              "Household shelter / civil defence shelter plans and specifications",
            ],
          },
          "QP appointment form and Superintending Officer appointment, plus Notification of Appointment of Project QP, Accredited Checker (where applicable) and Builder lodged with BCA — Form LU-NAPPQP01",
          "Registered builder / contractor appointment",
          "URA Written Permission reference number",
          "Payment of BP submission fee (Second Schedule, Building Control Regulations)",
        ],
      },
      {
        code: "ST",
        name: "Structural Plan submission",
        items: [
          "Structural calculations and design basis, signed by the PE",
          "Geotechnical / soil investigation report and foundation design",
          "PE's structural drawings (foundation, framing, retaining walls)",
          "Record Structural Plan (C-Forms) for minor structural works, where applicable",
          "Party wall / adjoining structure impact assessment, where applicable",
          "Peer review report, for complex or high-risk structures",
        ],
      },
      {
        code: "PERMIT",
        name: "Permit to Commence Building Works",
        items: [
          "Approved BP and ST plans on hand",
          "Contractor's registration with the BCA Contractors Registry",
          "Site safety supervisor / competent person appointment",
          "Insurance and performance bond documentation in place",
        ],
      },
      {
        code: "DEMO",
        name: "Demolition Permit",
        conditional: true,
        when: "Where an existing structure is being demolished.",
        items: [
          "Purchase of the existing building's as-built plans from the BCA archive (needed to support the demolition permit application)",
          "Demolition method statement",
          "Confirmation of existing utilities disconnection (PUB, SP Group)",
          "Adjoining property protection plan",
          {
            text: "Change of SP utilities account from the owner's name to the company's name",
            agencyCode: "SP",
          },
        ],
      },
      {
        code: "TOP",
        name: "Temporary Occupation Permit",
        items: [
          "As-built architectural drawings",
          "Clearance letters from referral agencies (SCDF, PUB, NEA, LTA, NParks, as applicable)",
          "Fire Safety Certificate or Temporary Fire Permit from SCDF",
          "PUB clearance certificate",
          "Completion certificate from the QP and Superintending Officer",
          "Accessibility compliance inspection sign-off",
          "Payment of TOP application fee",
          "Household Shelter (HS) inspection sign-off",
          "Form B — QP's notice of completion and TOP application form",
        ],
      },
      {
        code: "CSC",
        name: "Certificate of Statutory Completion",
        items: [
          "All TOP conditions satisfied within the stipulated period",
          "Final as-built plans endorsed by the QP",
          "All outstanding agency clearances closed out",
          "Payment of CSC application fee",
          "Form B1 (Parts 1 & 2) — QP/PE's notice of completion and CSC application form",
        ],
      },
    ],
  },
  {
    id: "scdf",
    code: "SCDF",
    name: "Singapore Civil Defence Force",
    full: "SCDF",
    blurb:
      "Fire safety — means of escape, active and passive fire systems, and civil defence shelters.",
    submissions: [
      {
        code: "FS",
        name: "Fire Safety plan submission",
        items: [
          "Fire safety drawings — means of escape and travel distances",
          "Fire alarm and detection system layout",
          "Fire hydrant / hose reel and firefighting water supply layout",
          "Household / civil defence shelter fire safety compliance",
          "Fire engineering report, where a performance-based design is used",
          "QP or fire safety consultant declaration",
        ],
      },
      {
        code: "FSC/TFP",
        name: "Fire Safety Certificate / Temporary Fire Permit",
        items: [
          "As-built fire safety installation inspection",
          "Compliance certificates for fire safety products and equipment",
          "Testing and commissioning reports for fire systems",
          "FSC/TFP application and fee payment",
        ],
      },
    ],
  },
  {
    id: "pub",
    code: "PUB",
    name: "PUB, Singapore's National Water Agency",
    full: "PUB",
    blurb: "Sewerage and sanitary works, surface water drainage, and potable water supply.",
    submissions: [
      {
        code: "SS",
        name: "Sewerage & Sanitary plan submission",
        items: [
          "Sanitary plumbing layout (soil, waste, and vent pipes)",
          "Sewer connection point and invert level details",
          "Grease trap / interceptor design, where wet kitchen areas require it",
          "Compliance declaration against the Code of Practice on Sewerage and Sanitary Works (3rd Edition)",
          "QP/PE endorsement",
        ],
      },
      {
        code: "SW",
        name: "Surface Water Drainage plan submission",
        items: [
          "Site drainage layout and discharge point",
          "Detention tank / ABC Waters design, where triggered by site area or impermeable surface",
          "Peak flow calculations",
          "QP/PE endorsement",
        ],
      },
      {
        code: "WS",
        name: "Water Supply / service connection",
        items: [
          "Water service connection application",
          "Meter installation location and specification",
          "Potable water pipe sizing calculation",
        ],
      },
      {
        code: "CLR",
        name: "PUB Clearance Certificate",
        when: "Required before TOP.",
        items: [
          "Sewerage and sanitary works inspection passed",
          "Drainage works inspection passed",
          "Outstanding PUB queries closed",
        ],
      },
    ],
  },
  {
    id: "nea",
    code: "NEA",
    name: "National Environment Agency",
    full: "NEA",
    blurb: "Environmental clearance — construction impact, refuse access, and vector control.",
    submissions: [
      {
        code: "ENV",
        name: "Joint referral / environmental clearance",
        items: [
          "Environmental control measures for construction dust and noise",
          "Refuse / bin collection point siting with access for collection vehicles",
          "Construction noise permit, where extended or night works are needed",
          "Vector control (mosquito breeding prevention) site management plan",
        ],
      },
      {
        code: "ASBESTOS",
        name: "Asbestos Survey & Removal",
        conditional: true,
        when: "Any existing structure built or added to before around 1991 — asbestos-containing materials were commonly used in Singapore construction until phased out around then.",
        items: [
          "Pre-demolition/pre-construction asbestos survey conducted for any part of the existing structure built or altered before ~1991",
          "Where asbestos-containing material is found, removal carried out by an NEA-registered asbestos contractor and completed before affected works proceed",
        ],
      },
    ],
  },
  {
    id: "lta",
    code: "LTA",
    name: "Land Transport Authority",
    full: "LTA",
    blurb: "Vehicular access, works within the road reserve, and traffic impact.",
    submissions: [
      {
        code: "ACCESS",
        name: "Vehicular access & road works",
        items: [
          "Vehicular crossover / driveway access application and layout",
          "Road Opening Permit / Works within Road Reserve (WRR) permit",
          "Temporary occupation of road / footpath permit for hoarding and material laydown",
          "Earth control measures compliance plan for works near roads",
          "Reinstatement of road / footpath bond",
        ],
      },
      {
        code: "TIA",
        name: "Traffic Impact Assessment",
        conditional: true,
        when: "Larger sites or multiple crossovers.",
        items: ["Traffic generation and impact study", "LTA review and clearance"],
      },
    ],
  },
  {
    id: "nparks",
    code: "NParks",
    name: "National Parks Board",
    full: "NParks",
    blurb: "Tree protection, felling approval, and landscape replacement.",
    submissions: [
      {
        code: "TREE",
        name: "Tree preservation & felling",
        items: [
          "Pre-submission tree survey (girth, species, condition) for all trees ≥1m girth",
          "Tree felling / pruning approval application under the Parks and Trees Act",
          "Tree protection plan (root protection zones, hoarding during construction)",
          "Tree Conservation Area check (Central or Changi TCA)",
        ],
      },
      {
        code: "GREEN",
        name: "Greenery / landscape replacement",
        conditional: true,
        items: [
          {
            text: "Prepare submission drawings",
            checklist: [
              "Landscape / greenery replacement provision per NParks guidelines",
              "Replanting / compensatory planting schedule",
            ],
          },
          "Application lodged / submitted to NParks",
        ],
      },
    ],
  },
  {
    id: "admin",
    code: "ADMIN",
    name: "Practice Administration",
    full: "Practice Administration",
    blurb: "Internal practice tasks, not government submissions — done before design work begins.",
    submissions: [
      {
        code: "INTAKE",
        name: "Client Information & Contact Details",
        when: "At project kickoff, before design work begins.",
        items: [
          "Client's contact particulars on file — full name(s) (and, for a company, the registered entity name and UEN), mobile number(s), email address(es), and mailing/correspondence address",
        ],
      },
      {
        code: "SITEVISIT",
        name: "Initial Site Visit — Documentation & Records",
        // Overrides the parent "admin" agency's own code/name/blurb for this step's header
        // only — this step is really a site walkthrough, not practice admin.
        stepCode: "VISIT",
        stepName: "Site Visit — Documentation & Records",
        stepBlurb:
          "One walkthrough before design starts, while the site is still in its original condition — much of this is hard or impossible to capture again once hoarding goes up or the existing building changes.",
        when: "One walkthrough before design starts, while the site is still in its original condition — much of this is hard or impossible to capture again once hoarding goes up or the existing building changes.",
        items: [
          {
            text: "Site walkthrough — photograph, video and record everything below before conditions change",
            checklist: [
              "Full photographic record of the existing building — all elevations, roof, and internal spaces",
              "Continuous video walkthrough of the site and existing building, for reference",
              "Photographic record of adjoining properties along the shared boundary — existing condition of boundary walls, fences and any visible cracks (for later dispute reference)",
              "Existing structural defects, cracks or water seepage on the existing building, photographed and noted",
              "Existing utility inspection chamber (IC) and manhole locations, marked on a sketch or the site plan",
              "PUB water meter — reading, meter number and location",
              "Electricity meter — reading, meter number and location; confirm incoming supply capacity and phase (single- or three-phase) with SP Group",
              "Gas meter — reading and location, where reticulated town gas is connected",
              "Telecom / fibre entry point (IMDA / OpenNet) location",
              "Existing sewer connection point and invert level, where visible",
              "Existing trees on site — species, approximate girth and location, for NParks tree preservation compliance",
              "Existing boundary markers / survey pegs, cross-checked against the SLA cadastral plan",
              "Overhead cables or lines crossing the site, and nearby SP Group / PUB installations",
              "Site access — gate/driveway width, road frontage condition, and obstructions affecting future hoarding or site setup",
            ],
          },
        ],
      },
      {
        code: "TOPDOCS",
        name: "TOP Documents — Joint Checklist with Builder",
        // Same override convention as SITEVISIT above — this is the builder/PE document
        // handover checklist that feeds the TOP application, not a government submission.
        stepCode: "TOPDOCS",
        stepName: "TOP Documents — Joint Checklist with Builder",
        stepBlurb:
          'The joint checklist tracking each as-built document, certificate and endorsement the builder/PE hand over to ENA ahead of lodging the TOP application — item numbering follows the office\'s standard joint checklist so it cross-references directly against the builder\'s own copy. "By" in brackets is who the document is coming from.',
        when: "Runs through the second half of Construction and into TOP Preparation, as each trade closes out its as-built documentation.",
        items: [
          "1. Builder Certificate (Builder)",
          "2(a). Certificate of Supervision of Lightning Protection System — Form BPD_CSC03, with commissioning test report (Builder-PE)",
          "2(b)i. As-built lightning protection layout floor plans — rolling sphere method (Builder-PE)",
          "2(b)ii. As-built lightning protection elevations — rolling sphere method (Builder-PE)",
          "2(c). Lightning protection site report (Builder-PE)",
          "3(a). Certificate of Supervision for Installation of Lift(s)/Escalator(s) — Form BPD_CSC04 (Builder-PE)",
          "3(b). Lift details — lift no., brand of lift, lift installer, name of professional engineer (Builder-PE)",
          "3(c). Site inspection checklist — site inspection checklist photos (ENA)",
          "3(d). Lift PTO (Builder-PE)",
          "4(a). Certificate of Supervision of Air-conditioning/Mechanical Ventilation System — Form BPD_CSC05 (Builder)",
          "4(b). As-built ACMV drawings (full building drawings with sections and elevations showing condensing unit) for DCLD submission (Builder)",
          "5(a). Daylight reflectance — external paint (Builder)",
          "5(b). Daylight reflectance — glass (Builder)",
          "5(c). Daylight reflectance — metal roof, if applicable (Builder)",
          "5(d). Daylight reflectance — façade cladding, if applicable (Builder)",
          "6(a)i. Drainage — as-built topographic survey drawing, with endorsement (PDF) (Builder-Surveyor)",
          "6(a)ii. Drainage — as-built topographic survey drawing, with endorsement (CAD) (Builder-Surveyor)",
          "6(b)i. Drainage — as-built floor plan layout in CAD (Builder)",
          "6(b)ii. Drainage — rainwater as-built sump pump details: floor plans and sections with swan neck, with endorsement (Builder-PE)",
          "6(b)iii. Drainage — rainwater as-built sump pump details: detail plans and detail sections with swan neck, with endorsement (Builder-PE)",
          "6(b)iv. Drainage — rainwater as-built sump pump calculations, with endorsement (Builder-PE)",
          "6(b)v. Drainage — rainwater sump pump SOP, with endorsement (Builder-PE)",
          "6(b)vi. Drainage — rainwater sump pump T&C (testing and commissioning) report, with endorsement (Builder-PE)",
          "6(b)vii. Drainage — rainwater sump pump stormwater tank PE report, with endorsement (PE)",
          "6(b)viii. Drainage — rainwater sump pump swan neck photo (Builder)",
          "6(c). Sanitary/sewerage — as-built floor plan layout drawings in CAD (Builder)",
          "6(d). Sanitary schematic diagram, with endorsement (Builder-LP)",
          "6(e). Hydrostatic test report, with endorsement (Builder-LP)",
          "6(f). Leak test and air test results, with endorsement (Builder-LP)",
          "6(g). Sanitary material certificate list (Builder)",
          "6(h). Sanitary COC (Builder)",
          "6(i). As-built swimming pool layout, with endorsement — if the development has a pool (Builder-PE)",
          "6(j). Swimming pool filtration method statement — how filtration backwash water is conveyed to the floor trap, e.g. by sump pump (Builder-PE Mech)",
          "6(k). Post-completion CCTV submission — video and report (Builder-CCTV contractor)",
          "7(a). Household Shelter (HS) commissioning checklist (Builder)",
          "7(b)i. Certificate of Supervision of Building Works in respect of CD shelter(s) — architect (Arch)",
          "7(b)ii. Certificate of Supervision of Building Works in respect of CD shelter(s) — PE (PE)",
          "8(a). SCDF Certificate of Conformity (COC) & Declaration of Origin for the HFAD installed — certification category, certification body, serial numbers, validity period, delivery date (Builder)",
          "8(b)i. COC & Declaration of Conformity for fire-rated door/fire partition system, with endorsement (Builder)",
          "8(b)ii. Regulated Fire Safety Products Installation Certificate — Form SCDF-FSC02, with PE endorsement (Builder-PE)",
          "8(c). Registered Inspector (RI) appointment form, with endorsement (RI-ENA)",
          "8(d). RI's Certificate of Inspection — Form 1 or Form 2, with endorsement (RI-ENA)",
          '9(a). "C" form — as-built summary status (PE/Builder-PE)',
          "9(b). Annex A — listing of safety barriers, with endorsement (PE/Builder-PE)",
          "9(c). Annex A — listing of engineered façades, with endorsement (PE/Builder-PE)",
          "9(d). PE confirmation on use of glass barriers, with endorsement (PE/Builder-PE)",
          "10(a). Water tank submission, if applicable (Builder-PE)",
          "11(a). Cable-readiness certificate (Builder)",
        ],
      },
      {
        code: "TENDER",
        name: "Tender Calling & Evaluation",
        stepCode: "TENDER",
        stepName: "Tender Calling & Evaluation",
        stepBlurb:
          "Calling tender on the approved tender set, managing queries and addenda through the tender period, then evaluating the returned tenders and recommending one to the client for award.",
        when: "From the client's approval of the tender documents until the client approves the tender recommendation, ahead of the Letter of Award.",
        designLog: "tenderCall",
        items: [
          "Tender invitation issued to the approved list of contractors (BCA-licensed general builders), with the tender drawings, specifications and documents, and the closing date and time",
          "Site show-round / tender briefing held for the tenderers",
          "Tender queries answered, with every clarification issued to all tenderers as a numbered tender addendum",
          "Tenders received by the closing date and opened in the presence of the client, with a tender opening record of prices and qualifications",
          "QS tender report — arithmetic check, qualifications and exclusions, and comparison against the pre-tender estimate",
          "Tender interviews / post-tender clarifications with the shortlisted tenderers, confirmed in writing",
          "Architect's tender recommendation report to the client, with the QS report attached",
          "Client's written approval of the recommended tenderer, then unsuccessful tenderers notified once the Letter of Award is issued",
        ],
      },
      {
        code: "AWARD",
        name: "Contract Award & Documents",
        // Same override convention as SITEVISIT above — this is the office's own paperwork
        // for awarding the main contract at the close of tender, not a government submission.
        stepCode: "AWARD",
        stepName: "Contract Award & Documents",
        stepBlurb:
          "Closing out the tender: the Letter of Award to the successful contractor, and the signed contract documents compiled by the QS kept on file.",
        when: "At the close of Tendering, once the client approves the tender recommendation and before construction starts.",
        items: [
          "Prepare the Letter of Award (LOA)",
          "File the digital copy of the signed compiled Contract Documents from the QS",
        ],
      },
      {
        code: "DESIGN",
        name: "Concept Design & Client Presentations",
        stepCode: "DESIGN",
        stepName: "Concept Design & Client Presentations",
        stepBlurb:
          "The initial concept design, every round of client presentations after it, and the final revised design the client confirms, each with its date, so the number of rounds and the time between them are on record.",
        when: "Through Concept Design, from the first design proposal until the client confirms the design for Design Development.",
        // Renders the Concept Design log (initial design, any number of presentations, then
        // revise and confirm) below this step's single clearable item. Entries are stored
        // as milestones under this step's key; see template/designLogs.ts.
        designLog: "concept",
        items: ["Concept design confirmed by the client, ready for Design Development"],
      },
      {
        code: "DEV",
        name: "Design Development & Client Sign-off",
        stepCode: "DEV",
        stepName: "Design Development & Client Sign-off",
        stepBlurb:
          "Developing the confirmed concept with the consultants' input into a coordinated, costed design, then getting the client to sign it off and freeze it before Planning Permission is lodged.",
        when: "Once the consultants are briefed, through Design Development, until the client signs off the design freeze ahead of the PP submission.",
        designLog: "dev",
        items: [
          "Design brief issued to the consultants (C&S, M&E, QS, landscape) based on the confirmed concept",
          "Developed architectural plans, elevations and sections, incorporating the structural grid and member sizes, M&E risers, AC ledge and plant positions, and water tank and DB locations",
          "C&S preliminary structural scheme — foundation type, structural grid and key member sizes",
          "M&E schematic design — electrical load estimate, plumbing and sanitary layout, AC concept, rainwater and drainage concept",
          "Outline specification and schedule of key materials and finishes (façade, roof, windows, main floor finishes)",
          "Area / GFA schedule checked against URA's landed housing controls (setbacks, storey heights, attic and basement rules)",
          "QS cost plan / elemental estimate reconciled against the client's budget",
          "Design Freeze Sign-off form signed and dated by the client — lists the approved DD drawing numbers and revisions, the acknowledged cost plan figure, and that later changes are variations with fee and time implications",
        ],
      },
      {
        code: "PCSUMS",
        name: "PC Sum Schedule & Client Selections",
        stepCode: "PCSUMS",
        stepName: "PC Sum Schedule & Client Selections",
        stepBlurb:
          "Going through every possible PC (Prime Cost) sum item with the client: which apply, whether the client has their own pick or goes with our recommendation, the supplier or brand agreed, and the allowance carried into the tender.",
        when: "In Detailed Design, before the tender drawing set and documents are produced.",
        isPcSumSchedule: true,
        items: [
          "Standard PC sum list run through with the client, with items not in this project marked N/A",
          "Supplier / brand agreed for every remaining PC sum, as the client's own choice or our recommendation",
          "PC sum allowances set with the QS and carried into the tender documents",
          "Client's written confirmation of the PC sum schedule",
        ],
      },
      {
        code: "TENDERSET",
        name: "Tender Drawing Set & Documents",
        stepCode: "TENDERSET",
        stepName: "Tender Drawing Set & Documents",
        stepBlurb:
          "Producing the coordinated tender drawing set, specifications and tender documents from the frozen design, and getting the client's approval before tender is called.",
        when: "Through Detailed Design, after the design freeze, until the tender set is ready to issue to contractors.",
        designLog: "tender",
        items: [
          {
            text: "Architectural tender drawings",
            checklist: [
              "General arrangement plans, elevations and sections",
              "Wall and roof sections",
              "Details — staircases, toilets, kitchen, façade",
              "Door and window schedule",
              "Finishes schedule",
              "Reflected ceiling plans",
              "External works",
            ],
          },
          "C&S tender drawings — foundation, framing and typical details",
          "M&E tender drawings and specifications — electrical, ACMV, plumbing and sanitary, ELV, and fire protection where applicable",
          "Landscape and ID drawings, where they are in the main contract",
          "Architectural specification, plus each consultant's own specification",
          "Cross-discipline coordination check (combined services and clashes), with each consultant confirming their part of the set",
          "QS bills of quantities / schedule of rates, and a pre-tender estimate reconciled against the DD cost plan",
          {
            text: "Tender documents",
            checklist: [
              "Preliminaries",
              "Conditions of Contract (usually SIA Lump Sum for private residential)",
              "Form of Tender and Appendix — contract period, liquidated damages, retention",
              "Drawing register",
            ],
          },
          "Client approval of the pre-tender estimate, the tender documents and the list of contractors invited, before tender is called",
        ],
      },
      {
        code: "CONSULTANTS",
        name: "Consultant Appointments",
        stepCode: "CONSULTANTS",
        stepName: "Consultant Appointments",
        stepBlurb:
          "The office's own record of every specialist consultant appointed on the project — company, role, and the date they were signed on.",
        when: "Appointed progressively through Concept Design, as the design team is assembled ahead of Design Development.",
        // Renders the dedicated Consultants widget above a normal (single-item) checklist —
        // isConsultantList doesn't replace the items list, just adds the roster widget
        // before it, so this step is still an actual clearable item like every other step.
        isConsultantList: true,
        items: ["All required consultants appointed and on record above"],
      },
    ],
  },
  {
    id: "site",
    code: "SITE",
    name: "Site Investigation & Utility Records",
    full: "Site Investigation",
    blurb:
      "Pre-design survey and utility/asset records purchased before design starts, so the design team knows what's actually on and under the site.",
    submissions: [
      {
        code: "PREINV",
        name: "Site Investigation & Utility Plans",
        when: "Before design commences, to establish ground conditions and existing services.",
        items: [
          "Topographic survey (site levels, existing structures and features)",
          "Soil investigation / geotechnical investigation report",
          "Drainage Improvement Plan (DIP) purchased from PUB",
          "Sewerage Improvement Plan (SIP) purchased from PUB",
          "Road Line Plan (RLP) purchased from SLA",
          "Railway protection / rail corridor plan from LTA, where the site is near an MRT line or tunnel (if applicable)",
        ],
      },
    ],
  },
  {
    id: "sla",
    code: "SLA",
    name: "Singapore Land Authority",
    full: "SLA",
    blurb: "Cadastral boundaries, survey, and state land matters.",
    submissions: [
      {
        code: "SURVEY",
        name: "Cadastral & boundary survey",
        items: [
          "Certified true copy of the cadastral / boundary survey plan",
          "Registered surveyor's current site survey (levels, existing structures, boundary corners)",
          "State land / road reserve encroachment licence, where boundary walls or works encroach",
          "Subdivision / amalgamation survey plan lodgement, coordinated with URA approval",
          "Final as-built survey plan lodgement, post-completion",
        ],
      },
    ],
  },
  {
    id: "utilities",
    code: "SP/Gas",
    name: "SP Group / SP PowerGrid",
    full: "SP Group",
    blurb: "Electricity supply connection, metering, and coordinated trenching.",
    submissions: [
      {
        code: "ELEC",
        name: "Electricity supply application",
        items: [
          "Licensed Electrical Worker (LEW) appointment",
          "Supply / connection application and applied load calculation",
          "Connection charge quotation and payment",
          "Gate pillar / metering position coordinated with LTA, PUB and NParks for shared trenching",
          "First inspection and turn-on application",
        ],
      },
      {
        code: "TEST",
        name: "SP Testing & Commissioning",
        when: "Arrange this well ahead of TOP — a critical, date-driven item; log the arranged date in the Timeline below so it also shows on the Overview tab.",
        items: [
          "SP Group testing & commissioning appointment arranged",
          "Testing and commissioning completed, supply confirmed ready for turn-on",
        ],
      },
      {
        code: "GAS",
        name: "Gas supply connection",
        conditional: true,
        when: "Where reticulated town gas is provided.",
        items: [
          "Gas supply connection application",
          "Internal gas pipe layout and appliance schedule",
        ],
      },
    ],
  },
  {
    id: "imda",
    code: "IMDA",
    name: "Info-communications Media Development Authority",
    full: "IMDA",
    blurb: "Ducting and access provisions for telecom services.",
    submissions: [
      {
        code: "COPIF",
        name: "Info-communications facilities compliance",
        items: [
          "Compliance with the Code of Practice for Info-communications Facilities in Buildings (COPIF)",
          "Fibre / broadband termination point coordinated with the telco",
        ],
      },
    ],
  },
  {
    id: "tp",
    code: "SPF",
    name: "Traffic Police",
    full: "Singapore Police Force",
    conditional: true,
    blurb: "Temporary traffic management for works affecting a public road.",
    submissions: [
      {
        code: "TTM",
        name: "Temporary Traffic Management",
        items: [
          "Temporary Traffic Management (TTM) plan",
          "Road / lane closure permit application",
        ],
      },
    ],
  },
  {
    id: "mom",
    code: "MOM",
    name: "Ministry of Manpower",
    full: "MOM",
    conditional: true,
    blurb: "Project notification and site welfare, where thresholds are met.",
    submissions: [
      {
        code: "WSH",
        name: "WSH project notification",
        items: [
          "Notice of Consultative Committee / WSH project notification",
          "Foreign worker dormitory / housing declaration, if on-site",
          "Contractor's safety and health management system documentation",
        ],
      },
    ],
  },
  {
    id: "iras",
    code: "IRAS",
    name: "Inland Revenue Authority of Singapore",
    full: "IRAS",
    blurb:
      "Statutory submissions administered by IRAS across the project — house/unit numbering once demolition proceeds, and property tax reassessment after completion.",
    submissions: [
      {
        code: "NUMBERING",
        name: "House & Unit Numbering",
        when: "Once the demolition permit is issued or the lot's numbering otherwise lapses — the property cannot legally use its address until the new Certificate of Numbering (CON) is issued.",
        items: [
          "Street name confirmed with the Street and Building Names Board (SBNB), where the works create or rename an access road (subdivision, new internal driveway)",
          "Application for house/unit number(s) submitted via the Property Name and Address e-service",
          "Certificate of Numbering (CON) downloaded within 30 days of approval and forwarded to the client",
          "New house/unit number displayed at the property in a conspicuous place, per Property Tax Act requirements",
        ],
      },
      {
        code: "PTAX",
        name: "Property tax reassessment",
        items: [
          "Property tax reassessment application after TOP",
          "Updated annual value declaration",
        ],
      },
    ],
  },
  {
    id: "corenet",
    code: "CORENET",
    name: "CORENET Project Membership",
    full: "CORENET e-Submission System",
    blurb:
      "Keeping the project's CORENET member list current — who is registered to lodge and act on submissions for this project.",
    submissions: [
      {
        code: "TEAM",
        name: "CORENET — Project Team Registration",
        stepName: "CORENET — Project Team Registration",
        stepBlurb:
          "Registering the project's QP and consultants as CORENET members at the outset, so they can lodge submissions under this project.",
        items: [
          "QP, C&S Engineer, M&E Engineer and other consultants added as CORENET project members",
        ],
      },
      {
        code: "LEW",
        name: "CORENET — Lightning Protection (LEW) Member Addition",
        stepName: "CORENET — Lightning Protection (LEW) Member Addition",
        stepBlurb:
          "Adding the appointed LEW as a CORENET project member once appointed, so the Lightning Protection System submission can be lodged.",
        items: [
          "Appointed LEW added as a CORENET project member for the Lightning Protection System submission",
        ],
      },
    ],
  },
  {
    id: "tfcc",
    code: "TFCC",
    name: "Telecommunication Facility Co-ordination Committee",
    full: "TFCC / NetLink Trust",
    blurb:
      "Telecom facility coordination for the building — NetLink Trust, as the TFCC member responsible for fibre, reviews the telecom plans and brings the fibre lead-in to the house.",
    submissions: [
      {
        code: "PLAN",
        name: "Telecom facility plans & NetLink Trust registration",
        stepName: "TFCC — Telecom Facility Plans & NetLink Registration",
        when: "During Detailed Design, alongside the IMDA COPIF compliance work.",
        items: [
          "Project set up with NetLink Trust (TFCC's fibre coordinator), with the QP and builder as the project contacts",
          "Telecommunication facility plans (lead-in pipe route from the boundary, termination point location) submitted to TFCC via CORENET, compliant with COPIF",
          "TFCC / NetLink Trust comments on the telecom facility plans addressed and plans cleared",
        ],
      },
      {
        code: "FIBRE",
        name: "Fibre lead-in & NetLink Trust appointment",
        stepName: "TFCC — Fibre Lead-in & NetLink Appointment",
        when: "Notify TFCC at least three months before TOP, so NetLink Trust can survey and lay the fibre lead-in in time.",
        items: [
          "TFCC notified via CORENET at least three months before TOP (mandatory for A&A works that affect existing telecom facilities)",
          "Lead-in pipe and termination point installed by the builder, per the cleared telecom facility plans",
          "NetLink Trust site survey / inspection appointment booked",
          "Fibre lead-in cable and termination point installed by NetLink Trust, and fibre readiness confirmed",
          "Client informed the house is fibre-ready, so they can order broadband from their service provider",
        ],
      },
    ],
  },
];
