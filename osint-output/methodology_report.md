# Data Center OSINT Collection Benchmark: Methodology Report & Confidence Assessment

## 1. Executive Summary

This report details the methodology, sources, and confidence levels of an open-source intelligence (OSINT) collection exercise targeting three hyperscale data center development clusters: New Carlisle, Indiana (AWS); Mount Pleasant, Wisconsin (Microsoft); and Ridgeland/Canton, Mississippi (AWS). The objective was to benchmark the efficacy of public data against proprietary analyst sourcing for site identification, entity relationships, land acquisition, and development timelines.

The findings demonstrate that OSINT can successfully identify primary shell entities, parent companies, aggregate acreage, high-level development milestones, and utility interconnection details. However, granular parcel-level GIS data and exact purchase prices for shell company transactions remain challenging to extract without paid database access or manual navigation of county-specific interactive GIS portals.

## 2. Methodology and Source Efficacy

The collection exercise utilized a combination of corporate registries, environmental permit databases, local economic development authority portals, and public utility commission dockets. 

### 2.1 Corporate Registries and Shell Entities
Tracing shell companies to their parent organizations was highly successful using state business registries and OpenCorporates. For example, Razor5 LLC was identified as the shell entity for AWS in Indiana, with matching registrations in Delaware and Indiana. In contrast, Microsoft purchased land directly under its own name in Wisconsin, and Amazon utilized its direct subsidiaries (Amazon Data Services, Inc. and Amazon.com Services LLC) in Mississippi.

**Most Valuable Sources:** OpenCorporates, Indiana INBiz.
**Limitations:** Corporate registries rarely explicitly name the parent company (e.g., AWS) on the shell entity's filing. Linkage requires cross-referencing registered agent addresses (e.g., Corporation Service Company) or relying on subsequent public announcements by local officials.

### 2.2 County Assessor and GIS Portals
Extracting precise Assessor Parcel Numbers (APNs) and exact transaction amounts proved to be the most significant challenge of the OSINT exercise. 

**Most Valuable Sources:** Local economic development authorities (e.g., RCEDC in Racine County), which often publish aggregated acreage and transaction amounts for major developments.
**Limitations:** Many county assessor portals (such as St. Joseph County's MACOG portal) require interactive map navigation, manual clicking on specific parcels, or exact owner name matches. Furthermore, shell company transactions often mask the true purchase price until deeds are formally recorded and indexed by third-party data aggregators.

### 2.3 Municipal and Environmental Records
Environmental permit databases provided excellent, highly reliable data regarding facility addresses, exact entity names, and backup power infrastructure.

**Most Valuable Sources:** Mississippi Department of Environmental Quality (MDEQ) enSearch Online portal, Indiana Department of Environmental Management (IDEM) public records.
**Limitations:** Environmental permits are typically filed later in the development timeline, meaning they are less useful for early-stage site identification but invaluable for confirming infrastructure details (e.g., the number of backup diesel generators).

### 2.4 Public Utility Commissions (PUC)
PUC dockets were instrumental in uncovering power capacity requirements, substation construction timelines, and utility provider agreements.

**Most Valuable Sources:** Public Service Commission of Wisconsin (PSC) dockets, Indiana Utility Regulatory Commission (IURC) filings.
**Limitations:** Utility filings often redact specific megawatt (MW) capacities or customer names under trade secret protections, requiring analysts to infer capacities from the size of the proposed gas plants or substations (e.g., We Energies' 1,200 MW gas plant proposal for the Microsoft data center).

## 3. Confidence Assessment

The overall confidence in the collected OSINT data is evaluated across the four required domains:

| Data Domain | Confidence Level | Assessment |
| :--- | :--- | :--- |
| **Entity Resolution** | High | Shell companies and direct subsidiaries were successfully linked to parent hyperscalers through a combination of corporate filings and official government announcements. |
| **Land Acquisition** | Medium | Aggregate acreage and general locations were easily identified. However, granular APNs and exact transaction amounts for shell company purchases were difficult to extract systematically without paid tools. |
| **Development Timelines** | High | Public announcements, environmental permits, and local news coverage provided a robust and detailed timeline of zoning, permitting, and construction milestones. |
| **Capacity & Infrastructure** | Medium-High | Utility providers and major infrastructure upgrades (e.g., substations, gas plants) were clearly identified. Exact IT capacity (MW) is sometimes obscured, but total grid impact can be accurately estimated from PUC filings. |

## 4. Conclusion

OSINT is highly effective for establishing the macro-level narrative of a hyperscale data center development, including the entities involved, total investment, utility requirements, and development milestones. It serves as an excellent validation tool for proprietary data. However, for precise, parcel-by-parcel GIS mapping and real-time transaction tracking, proprietary analyst sourcing and paid real estate databases remain necessary to overcome the fragmentation and access barriers of local county assessor portals.
