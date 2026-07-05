# System Design Calculations — QPS, Storage, Bandwidth, Database

*Last updated: July 2026*

---

## Table of Contents

1. [QPS Calculations](#qps-calculations)
2. [Storage Calculations](#storage-calculations)
3. [Bandwidth Calculations](#bandwidth-calculations) (To do)
4. [Database Capacity Calculations](#database-capacity-calculations) (To do)
5. [Cache Planning](#cache-planning) (To do)

---

## QPS Calculations

### Key Assumptions

**1,000 QPS per server** = typical capacity for modern web server with DB queries, logging, serialization.
- Real-world range: 500–5,000 QPS per server (depends on: server spec, app complexity, DB latency, caching hit ratio)
- Formula: `(DAU × Req/day) ÷ 100K` = mental math avg QPS
- Exact: `(DAU × Req/day) ÷ 86,400` = precise avg QPS
- Peak multiplier: typically 2–10× average (varies by system)

### QPS Reference Table

<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 10px;">
<thead style="background-color: #f0f0f0; font-weight: bold; border-bottom: 2px solid #333;">
<tr>
<th style="border: 1px solid #ddd; padding: 2px; width: 12%;">System</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 5%;">DAU(M)</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 5%;">Req/day</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 8%;">Formula</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 7%;">Avg MM</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 7%;">Avg Exact</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 4%;">×</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 7%;">Peak MM</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 7%;">Peak Exact</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">÷1K</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 5%;">Servers</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 10%;">Design Notes</th>
</tr>
</thead>
<tbody style="font-size: 9px;">
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Twitter</td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">(150×100)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">150K</td>
<td style="border: 1px solid #ddd; padding: 2px;">174K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696</td>
<td style="border: 1px solid #ddd; padding: 2px;">High write: tweets, RTs, favorites</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">YouTube</td>
<td style="border: 1px solid #ddd; padding: 2px;">500</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">(500×50)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.25M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">1450</td>
<td style="border: 1px solid #ddd; padding: 2px;">Read-heavy: cache critical</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Instagram</td>
<td style="border: 1px solid #ddd; padding: 2px;">400</td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px;">(400×80)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">320K</td>
<td style="border: 1px solid #ddd; padding: 2px;">370K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.6M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.85M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.85M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">1850</td>
<td style="border: 1px solid #ddd; padding: 2px;">Photo upload + feed reads</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">WhatsApp</td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px;">(200×150)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2080</td>
<td style="border: 1px solid #ddd; padding: 2px;">Message broker: high throughput</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Facebook</td>
<td style="border: 1px solid #ddd; padding: 2px;">300</td>
<td style="border: 1px solid #ddd; padding: 2px;">120</td>
<td style="border: 1px solid #ddd; padding: 2px;">(300×120)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">360K</td>
<td style="border: 1px solid #ddd; padding: 2px;">417K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.44M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.67M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.67M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">1670</td>
<td style="border: 1px solid #ddd; padding: 2px;">Social feed: complex DAG</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Uber</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">500</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50×500)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">8</td>
<td style="border: 1px solid #ddd; padding: 2px;">2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.31M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.31M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2310</td>
<td style="border: 1px solid #ddd; padding: 2px;">Geo-location: real-time tracking</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">LinkedIn</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100×80)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">80K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">400K</td>
<td style="border: 1px solid #ddd; padding: 2px;">465K</td>
<td style="border: 1px solid #ddd; padding: 2px;">465÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">465</td>
<td style="border: 1px solid #ddd; padding: 2px;">B2B: less peak variance</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Slack</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px;">(10×200)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">20K</td>
<td style="border: 1px solid #ddd; padding: 2px;">23K</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">200K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231</td>
<td style="border: 1px solid #ddd; padding: 2px;">Messaging: high peak during work hours</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Netflix</td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px;">20</td>
<td style="border: 1px solid #ddd; padding: 2px;">(200×20)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">40K</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">120K</td>
<td style="border: 1px solid #ddd; padding: 2px;">139K</td>
<td style="border: 1px solid #ddd; padding: 2px;">139÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">139</td>
<td style="border: 1px solid #ddd; padding: 2px;">Streaming: metadata QPS low, bandwidth high</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50×100)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">50K</td>
<td style="border: 1px solid #ddd; padding: 2px;">58K</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">500K</td>
<td style="border: 1px solid #ddd; padding: 2px;">579K</td>
<td style="border: 1px solid #ddd; padding: 2px;">579÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">579</td>
<td style="border: 1px solid #ddd; padding: 2px;">High peak: holiday shopping</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Search</td>
<td style="border: 1px solid #ddd; padding: 2px;">1000</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">(1000×10)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347</td>
<td style="border: 1px solid #ddd; padding: 2px;">Distributed: federated queries</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Banking App</td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">(30×50)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">45K</td>
<td style="border: 1px solid #ddd; padding: 2px;">52K</td>
<td style="border: 1px solid #ddd; padding: 2px;">52÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">52</td>
<td style="border: 1px solid #ddd; padding: 2px;">Low peak: predictable hours</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Notification</td>
<td style="border: 1px solid #ddd; padding: 2px;">500</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">(500×50)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.25M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">1450</td>
<td style="border: 1px solid #ddd; padding: 2px;">Push service: bursty</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Weather App</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100×30)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">30K</td>
<td style="border: 1px solid #ddd; padding: 2px;">35K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2</td>
<td style="border: 1px solid #ddd; padding: 2px;">60K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69</td>
<td style="border: 1px solid #ddd; padding: 2px;">Steady: low variance</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Stripe</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">1000</td>
<td style="border: 1px solid #ddd; padding: 2px;">(10×1000)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694</td>
<td style="border: 1px solid #ddd; padding: 2px;">Payment: complex validation</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Drive</td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px;">(200×30)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">60K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">240K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278</td>
<td style="border: 1px solid #ddd; padding: 2px;">File storage: read-heavy</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Dropbox</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">40</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100×40)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">40K</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">200K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231</td>
<td style="border: 1px solid #ddd; padding: 2px;">Sync service: CDC patterns</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">IRCTC</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">300</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5×300)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">750K</td>
<td style="border: 1px solid #ddd; padding: 2px;">868K</td>
<td style="border: 1px solid #ddd; padding: 2px;">868÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">868</td>
<td style="border: 1px solid #ddd; padding: 2px;">Extreme peak: ticket release</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Newsfeed</td>
<td style="border: 1px solid #ddd; padding: 2px;">300</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">(300×100)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">1390</td>
<td style="border: 1px solid #ddd; padding: 2px;">Personalization: complex ranking</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Zerodha</td>
<td style="border: 1px solid #ddd; padding: 2px;">20</td>
<td style="border: 1px solid #ddd; padding: 2px;">2000</td>
<td style="border: 1px solid #ddd; padding: 2px;">(20×2000)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">400K</td>
<td style="border: 1px solid #ddd; padding: 2px;">463K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.31M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.31M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2310</td>
<td style="border: 1px solid #ddd; padding: 2px;">Trading: real-time updates</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">ICICI Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">15</td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px;">(15×100)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">75K</td>
<td style="border: 1px solid #ddd; padding: 2px;">87K</td>
<td style="border: 1px solid #ddd; padding: 2px;">87÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">87</td>
<td style="border: 1px solid #ddd; padding: 2px;">Banking: low DAU, steady</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">HDFC Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">20</td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px;">(20×80)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">16K</td>
<td style="border: 1px solid #ddd; padding: 2px;">19K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">80K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93</td>
<td style="border: 1px solid #ddd; padding: 2px;">Banking: steady + audit logs</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Maps</td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px;">(150×200)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">1390</td>
<td style="border: 1px solid #ddd; padding: 2px;">Geo: location updates + routing</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Spotify</td>
<td style="border: 1px solid #ddd; padding: 2px;">400</td>
<td style="border: 1px solid #ddd; padding: 2px;">60</td>
<td style="border: 1px solid #ddd; padding: 2px;">(400×60)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">240K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">720K</td>
<td style="border: 1px solid #ddd; padding: 2px;">833K</td>
<td style="border: 1px solid #ddd; padding: 2px;">833÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">833</td>
<td style="border: 1px solid #ddd; padding: 2px;">Streaming: metadata + playlist</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Gaana</td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px;">70</td>
<td style="border: 1px solid #ddd; padding: 2px;">(150×70)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">105K</td>
<td style="border: 1px solid #ddd; padding: 2px;">122K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">315K</td>
<td style="border: 1px solid #ddd; padding: 2px;">365K</td>
<td style="border: 1px solid #ddd; padding: 2px;">365÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">365</td>
<td style="border: 1px solid #ddd; padding: 2px;">Music: India regional</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Amazon</td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px;">(150×150)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">225K</td>
<td style="border: 1px solid #ddd; padding: 2px;">260K</td>
<td style="border: 1px solid #ddd; padding: 2px;">8</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2080</td>
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce: inventory + search</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Airbnb</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50×200)÷100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694÷1K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694</td>
<td style="border: 1px solid #ddd; padding: 2px;">Booking: peak during holiday</td>
</tr>
</tbody>
</table>

---

## Storage Calculations

### Key Assumptions

**Storage formula:**
```
Daily Data Volume = Write QPS ÷ 86,400 × Avg Bytes/Write
Total Storage = Daily Data × Retention Days × Redundancy ÷ Compression Ratio
Annual Cost = Total Storage (TB) × Tier Cost per TB/year
```

**Redundancy tiers:**
- 2X = Primary + 1 backup (99.9% availability)
- 3X = Primary + 2 backups (99.99%+ availability)

**Storage tiers & costs:**
- **HOT** (0–90 days): $276/TB/year — SSD/NVMe, <10ms access
- **WARM** (91–365 days): $36/TB/year — HDD/Standard, 50–100ms access
- **COLD** (365+ days): $4/TB/year — Glacier/Tape, hours to retrieve

### Storage Reference Table

<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 9px;">
<thead style="background-color: #f0f0f0; font-weight: bold; border-bottom: 2px solid #333;">
<tr>
<th style="border: 1px solid #ddd; padding: 2px; width: 9%;">System</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 8%;">Daily Data</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 14%;">Formula</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 10%;">Total (TB)</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">Hot %</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">Warm %</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">Cold %</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 12%;">Annual Cost</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 13%;">Notes</th>
</tr>
</thead>
<tbody style="font-size: 8px;">
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Twitter</td>
<td style="border: 1px solid #ddd; padding: 2px;">500 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(500P×1825×3)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1000 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">60%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$180M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Tweets + media (5y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">YouTube</td>
<td style="border: 1px solid #ddd; padding: 2px;">25 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(25E×730×3)÷1.1</td>
<td style="border: 1px solid #ddd; padding: 2px;">50 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">80%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.2B</td>
<td style="border: 1px solid #ddd; padding: 2px;">Video + metadata (2y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Instagram</td>
<td style="border: 1px solid #ddd; padding: 2px;">8 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(8E×1825×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">44 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">8%</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">67%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$980M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Photos + stories (5y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">WhatsApp</td>
<td style="border: 1px solid #ddd; padding: 2px;">2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2P×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$120M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Messages (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Facebook</td>
<td style="border: 1px solid #ddd; padding: 2px;">12 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(12E×1825×3)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">51 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">73%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.14B</td>
<td style="border: 1px solid #ddd; padding: 2px;">Posts + media (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Uber</td>
<td style="border: 1px solid #ddd; padding: 2px;">100 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100T×90×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">22.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Trips + locations (90d)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">LinkedIn</td>
<td style="border: 1px solid #ddd; padding: 2px;">2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2P×1825×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">53%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$560M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Posts + profiles (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Slack</td>
<td style="border: 1px solid #ddd; padding: 2px;">50 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50T×365×2)÷1.8</td>
<td style="border: 1px solid #ddd; padding: 2px;">20 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Messages + files (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Netflix</td>
<td style="border: 1px solid #ddd; padding: 2px;">500 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(500T×730×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">190 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$3.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Video content (2y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce</td>
<td style="border: 1px solid #ddd; padding: 2px;">10 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(10T×365×2)÷1.4</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$600M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Listings + images (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Search</td>
<td style="border: 1px solid #ddd; padding: 2px;">15 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(15E×30×1)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">225 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">0%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$27M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Index (30d, ephemeral)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Banking App</td>
<td style="border: 1px solid #ddd; padding: 2px;">5 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">21 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">80%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.1M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Txns (7y compliance)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Notification</td>
<td style="border: 1px solid #ddd; padding: 2px;">50 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50T×30×2)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$120M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Logs (30d, ephemeral)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Weather App</td>
<td style="border: 1px solid #ddd; padding: 2px;">100 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100T×365×2)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">36.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.3M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Weather data (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Stripe</td>
<td style="border: 1px solid #ddd; padding: 2px;">50 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50T×2555×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">318 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$31.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Txns (7y compliance)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Drive</td>
<td style="border: 1px solid #ddd; padding: 2px;">500 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(500T×1825×3)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.5 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">63%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$280M</td>
<td style="border: 1px solid #ddd; padding: 2px;">User files (∞)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Dropbox</td>
<td style="border: 1px solid #ddd; padding: 2px;">300 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(300T×1825×3)÷1.1</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.5 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$168M</td>
<td style="border: 1px solid #ddd; padding: 2px;">User files (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">IRCTC</td>
<td style="border: 1px solid #ddd; padding: 2px;">1 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(1T×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">490 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">75%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.5M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Bookings (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Newsfeed</td>
<td style="border: 1px solid #ddd; padding: 2px;">5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5P×730×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$580M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Articles + metadata (2y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Zerodha</td>
<td style="border: 1px solid #ddd; padding: 2px;">500 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(500T×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">244 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$14.6M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Trades + mkt data (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">ICICI Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">2 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">8.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">85%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$840M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Txns (7y compliance)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">HDFC Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.5 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2.5T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">10.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">85%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.05B</td>
<td style="border: 1px solid #ddd; padding: 2px;">Txns (7y compliance)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Maps</td>
<td style="border: 1px solid #ddd; padding: 2px;">2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2P×365×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$140M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Geo data + history (1y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Spotify</td>
<td style="border: 1px solid #ddd; padding: 2px;">1 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(1P×1825×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">3.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.1M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Audio files (∞)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Gaana</td>
<td style="border: 1px solid #ddd; padding: 2px;">300 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(300T×1825×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.05 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$630M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Audio files (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Amazon</td>
<td style="border: 1px solid #ddd; padding: 2px;">50 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(50T×365×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">28 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Orders + inventory (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Airbnb</td>
<td style="border: 1px solid #ddd; padding: 2px;">20 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(20T×730×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">24 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">55%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.6M</td>
<td style="border: 1px solid #ddd; padding: 2px;">Bookings + reviews (2y)</td>
</tr>
</tbody>
</table>

---

## Bandwidth Calculations

(To do)

---

## Database Capacity Calculations

(To do)

---

## Cache Planning

(To do)
