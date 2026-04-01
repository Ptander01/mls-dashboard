# OSINT Sprint 2 Methodology Report

**Date:** April 1, 2026
**Project:** DC Parcel Dashboard OSINT Enrichment (Sprint 2)
**Author:** Manus AI

## 1. Executive Summary

This report outlines the methodology, sources, and challenges encountered during OSINT Sprint 2, which focused on expanding coverage across 10 high-priority data center sites. Building upon the learnings from Sprint 1, the research successfully extracted structured intelligence across three core domains: Entity Resolution, Development Timelines, and Capacity/Infrastructure, while intentionally de-scoping granular parcel-level acquisition details.

## 2. Research Methodology and Source Evaluation

The research strategy heavily leveraged the high-confidence domains identified in Sprint 1, utilizing a combination of state-level corporate registries, municipal records, utility filings, and local news sources.

### 2.1 Corporate Registries and Entity Resolution
State-level Secretary of State business searches and open-source corporate databases (e.g., OpenCorporates) were instrumental in tracing LLC officers and registered agents back to parent companies. 

**Observations:**
- Texas and Wisconsin provided relatively transparent corporate registry access, allowing for straightforward linkage between shell entities (e.g., "Rolling Plains EV Stations LLC") and parent organizations.
- In some cases, multiple parent entities were identified (e.g., Abilene, TX), reflecting complex joint ventures or phased developments involving developers (Lancium, Crusoe) and end-users (OpenAI, Microsoft).

### 2.2 Municipal and Environmental Records
Local government portals proved highly valuable for establishing development timelines and verifying aggregate acreage.

**Observations:**
- City council meeting minutes, planning commission agendas, and tax abatement agreements (e.g., Armstrong County, TX for the Claude site) were critical sources for land acquisition dates, zoning approvals, and estimated capital investments.
- State environmental portals (e.g., TCEQ in Texas, EGLE in Michigan) provided insights into infrastructure requirements, such as air permits for backup generators and stormwater permits, which often correlate with construction milestones.

### 2.3 Utility Filings and Interconnection Queues
Determining projected IT capacity (MW) and infrastructure status relied heavily on utility provider announcements and regional grid operator data.

**Observations:**
- Public Utility Commission (PUC) dockets and ISO interconnection queues (e.g., ERCOT, PJM) were the primary sources for MW capacity figures.
- Information regarding utility infrastructure (e.g., substations, transmission lines) was often found in presentations by developers to local authorities or in utility company press releases.

## 3. Challenges and Regional Variances

While the methodology was generally successful, several challenges were encountered, highlighting regional variances in public records access and project transparency.

### 3.1 Varying Degrees of Transparency
- **High Transparency:** Sites involving significant public subsidies or tax abatements (e.g., Claude, TX; Santa Teresa, NM) generally had more robust public documentation available through local economic development authorities.
- **Low Transparency:** Projects in early stages or those developed by highly secretive entities (e.g., xAI in Memphis, TN) presented challenges in confirming exact MW capacities or comprehensive development timelines, often requiring reliance on investigative journalism rather than direct public filings.

### 3.2 Navigating Moratoriums and Local Opposition
Several sites (e.g., Lordstown, OH; Saline, MI) are facing local opposition or municipal moratoriums on data center development. These situations complicate timeline projections, as regulatory hurdles introduce significant uncertainty regarding "First Power" dates.

### 3.3 Data Consistency
In some instances, reported figures for acreage, investment, and capacity varied across different sources (e.g., a developer's press release vs. a local news article). In these cases, the most recent or authoritative source (e.g., a signed tax abatement agreement) was prioritized.

## 4. Conclusion

OSINT Sprint 2 successfully validated the targeted methodology for extracting macro-level intelligence on data center developments. By focusing on corporate registries, municipal records, and utility filings, the research effectively populated the required data schemas for the 10 target sites. Future sprints should continue to refine these techniques, particularly in navigating regions with less transparent public records or those experiencing regulatory pushback against data center expansion.
