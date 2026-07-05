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

**FORMULA BREAKDOWN — QPS CALCULATIONS:**

### **Avg QPS (Mental Math): (DAU × Req/day) ÷ 100K**
### **Avg QPS (Exact): (DAU × Req/day) ÷ 86,400**
### **Peak QPS: Avg QPS × Peak Multiplier**
### **Servers Needed: Peak QPS ÷ 1,000 QPS/server**

<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 9px;">
<thead style="background-color: #f0f0f0; font-weight: bold; border-bottom: 2px solid #333;">
<tr>
<th style="border: 1px solid #ddd; padding: 1px; width: 11%;">System</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">DAU(M)</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 5%;">Req/day</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 7%; font-weight: bold;">Formula</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Avg MM</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Avg Exact</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 3%;">×</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Peak MM</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Peak Exact</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 5%;">Servers</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 9%;">Notes</th>
</tr>
</thead>
<tbody style="font-size: 8px;">
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Twitter</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">150K</td>
<td style="border: 1px solid #ddd; padding: 2px;">174K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696</td>
<td style="border: 1px solid #ddd; padding: 2px;">High write: tweets, RTs, favorites</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">YouTube</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>500M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(500M×50)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.25M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1450</td>
<td style="border: 1px solid #ddd; padding: 2px;">Read-heavy: cache critical</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Instagram</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>400M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(400M×80)÷100K</strong></td>
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
<td style="border: 1px solid #ddd; padding: 2px;"><strong>200M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(200M×150)÷100K</strong></td>
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
<td style="border: 1px solid #ddd; padding: 2px;"><strong>300M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">120</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(300M×120)÷100K</strong></td>
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
<td style="border: 1px solid #ddd; padding: 2px;"><strong>50M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">500</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(50M×500)÷100K</strong></td>
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
<td style="border: 1px solid #ddd; padding: 2px;"><strong>100M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(100M×80)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">400K</td>
<td style="border: 1px solid #ddd; padding: 2px;">465K</td>

<td style="border: 1px solid #ddd; padding: 2px;">465</td>
<td style="border: 1px solid #ddd; padding: 2px;">B2B: less peak variance</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Slack</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>10M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(10M×200)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">20K</td>
<td style="border: 1px solid #ddd; padding: 2px;">23K</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">200K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231K</td>

<td style="border: 1px solid #ddd; padding: 2px;">231</td>
<td style="border: 1px solid #ddd; padding: 2px;">Messaging: high peak during work hours</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Netflix</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>200M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">20</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(200M×20)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">40K</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">120K</td>
<td style="border: 1px solid #ddd; padding: 2px;">139K</td>

<td style="border: 1px solid #ddd; padding: 2px;">139</td>
<td style="border: 1px solid #ddd; padding: 2px;">Streaming: metadata QPS low, bandwidth high</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>50M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(50M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50K</td>
<td style="border: 1px solid #ddd; padding: 2px;">58K</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">500K</td>
<td style="border: 1px solid #ddd; padding: 2px;">579K</td>

<td style="border: 1px solid #ddd; padding: 2px;">579</td>
<td style="border: 1px solid #ddd; padding: 2px;">High peak: holiday shopping</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Search</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>1000M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(1000M×10)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>

<td style="border: 1px solid #ddd; padding: 2px;">347</td>
<td style="border: 1px solid #ddd; padding: 2px;">Distributed: federated queries</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Banking App</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>30M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(30M×50)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">45K</td>
<td style="border: 1px solid #ddd; padding: 2px;">52K</td>

<td style="border: 1px solid #ddd; padding: 2px;">52</td>
<td style="border: 1px solid #ddd; padding: 2px;">Low peak: predictable hours</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Notification</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>500M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(500M×50)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.25M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1450</td>
<td style="border: 1px solid #ddd; padding: 2px;">Push service: bursty</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Weather App</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>100M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(100M×30)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">30K</td>
<td style="border: 1px solid #ddd; padding: 2px;">35K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2</td>
<td style="border: 1px solid #ddd; padding: 2px;">60K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K</td>

<td style="border: 1px solid #ddd; padding: 2px;">69</td>
<td style="border: 1px solid #ddd; padding: 2px;">Steady: low variance</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Stripe</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>10M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">1000</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(10M×1000)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694K</td>

<td style="border: 1px solid #ddd; padding: 2px;">694</td>
<td style="border: 1px solid #ddd; padding: 2px;">Payment: complex validation</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Drive</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>200M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(200M×30)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">60K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">240K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K</td>

<td style="border: 1px solid #ddd; padding: 2px;">278</td>
<td style="border: 1px solid #ddd; padding: 2px;">File storage: read-heavy</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Dropbox</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>100M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">40</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(100M×40)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">40K</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">200K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231K</td>

<td style="border: 1px solid #ddd; padding: 2px;">231</td>
<td style="border: 1px solid #ddd; padding: 2px;">Sync service: CDC patterns</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">IRCTC</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>5M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(5M×300)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">750K</td>
<td style="border: 1px solid #ddd; padding: 2px;">868K</td>

<td style="border: 1px solid #ddd; padding: 2px;">868</td>
<td style="border: 1px solid #ddd; padding: 2px;">Extreme peak: ticket release</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Newsfeed</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>300M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(300M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>1.39M÷1K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">1390</td>
<td style="border: 1px solid #ddd; padding: 2px;">Personalization: complex ranking</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Zerodha</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>20M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">2000</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(20M×2000)÷100K</strong></td>
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
<td style="border: 1px solid #ddd; padding: 2px;"><strong>15M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(15M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">75K</td>
<td style="border: 1px solid #ddd; padding: 2px;">87K</td>

<td style="border: 1px solid #ddd; padding: 2px;">87</td>
<td style="border: 1px solid #ddd; padding: 2px;">Banking: low DAU, steady</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">HDFC Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>20M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(20M×80)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">16K</td>
<td style="border: 1px solid #ddd; padding: 2px;">19K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">80K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K</td>

<td style="border: 1px solid #ddd; padding: 2px;">93</td>
<td style="border: 1px solid #ddd; padding: 2px;">Banking: steady + audit logs</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Maps</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×200)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>1.39M÷1K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">1390</td>
<td style="border: 1px solid #ddd; padding: 2px;">Geo: location updates + routing</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Spotify</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>400M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">60</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(400M×60)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">240K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">720K</td>
<td style="border: 1px solid #ddd; padding: 2px;">833K</td>

<td style="border: 1px solid #ddd; padding: 2px;">833</td>
<td style="border: 1px solid #ddd; padding: 2px;">Streaming: metadata + playlist</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Gaana</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">70</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×70)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">105K</td>
<td style="border: 1px solid #ddd; padding: 2px;">122K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">315K</td>
<td style="border: 1px solid #ddd; padding: 2px;">365K</td>

<td style="border: 1px solid #ddd; padding: 2px;">365</td>
<td style="border: 1px solid #ddd; padding: 2px;">Music: India regional</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Amazon</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×150)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">225K</td>
<td style="border: 1px solid #ddd; padding: 2px;">260K</td>
<td style="border: 1px solid #ddd; padding: 2px;">8</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>2.08M÷1K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">2080</td>
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce: inventory + search</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Airbnb</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>50M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(50M×200)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694K</td>

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
Daily Data = Avg QPS × Write% × 86,400 sec/day × Bytes/Write
Total Storage = Daily Data × Retention Days × Redundancy ÷ Compression Ratio
Annual Cost = Tiered cost breakdown (Hot + Warm + Cold)
```

**Key inputs vary by system:**
- **Write % of QPS:** Twitter/messaging 15-50%, YouTube/streaming 5-8%, Banking 3-5%
- **Bytes per write:** Messages 1-2KB, Metadata 5KB, Video chunks 50KB, Transactions 500B
- **Retention:** Compliance 7y (banking), Lifetime (social), 30d (logs), 1-2y (media)
- **Redundancy:** 2× (99.9%), 3× (99.99%+)
- **Compression:** Text 1.5-1.8×, JSON 1.3-1.5×, Video 1.05-1.1×, DB 1.2×

**Storage tiers & costs:**
- **HOT** (0–90 days): $276/TB/year — SSD/NVMe, <10ms access
- **WARM** (91–365 days): $36/TB/year — HDD/Standard, 50–100ms access
- **COLD** (365+ days): $4/TB/year — Glacier/Tape, hours to retrieve

### Storage Reference Table

**FORMULA BREAKDOWN — STORAGE CALCULATIONS:**

### **Daily Data Volume: Avg QPS × Write% × 86,400 × Bytes/Write**
### **Total Storage: (Daily Data × Retention Days × Redundancy) ÷ Compression Ratio**

**Compression Ratio Guide:**
- **1.5× compression** = 33% size reduction (text/JSON)
- **1.2× compression** = 17% size reduction (database exports)
- **1.1× compression** = 9% size reduction (video/audio, already compressed)
- **1.05× compression** = 5% size reduction (streaming media)

**Example (Twitter):**
- **Daily Data** = 174K QPS × 15% writes × 86,400 × 1KB = **2.3 PB/day**
- **Total Storage** = (2.3 PB × 1825 days × 3) ÷ 1.5 = **6.8 EB**

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
<td style="border: 1px solid #ddd; padding: 2px;">2.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2.3×1825×3)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">6.8 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">28%</td>
<td style="border: 1px solid #ddd; padding: 2px;">60%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$680M</td>
<td style="border: 1px solid #ddd; padding: 2px;">174K avg QPS, 15% writes, 1KB/write (5y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">YouTube</td>
<td style="border: 1px solid #ddd; padding: 2px;">100 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100×730×3)÷1.1</td>
<td style="border: 1px solid #ddd; padding: 2px;">200 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">87%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$4.8B</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K avg QPS, 8% writes, 50KB/write (2y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Instagram</td>
<td style="border: 1px solid #ddd; padding: 2px;">32 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(32×1825×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">146 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">8%</td>
<td style="border: 1px solid #ddd; padding: 2px;">22%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$3.2B</td>
<td style="border: 1px solid #ddd; padding: 2px;">370K avg QPS, 20% writes, 5KB/write (5y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">WhatsApp</td>
<td style="border: 1px solid #ddd; padding: 2px;">30 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(30×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">14.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.5B</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K avg QPS, 50% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Facebook</td>
<td style="border: 1px solid #ddd; padding: 2px;">45 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(45×1825×3)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">188 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">18%</td>
<td style="border: 1px solid #ddd; padding: 2px;">75%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$4.1B</td>
<td style="border: 1px solid #ddd; padding: 2px;">417K avg QPS, 25% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Uber</td>
<td style="border: 1px solid #ddd; padding: 2px;">15 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(15×90×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">3.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$280M</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K avg QPS, 30% writes, 2KB/write (90d)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">LinkedIn</td>
<td style="border: 1px solid #ddd; padding: 2px;">8 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(8×1825×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">22.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">33%</td>
<td style="border: 1px solid #ddd; padding: 2px;">55%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.3B</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K avg QPS, 20% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Slack</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2.4×365×2)÷1.8</td>
<td style="border: 1px solid #ddd; padding: 2px;">1 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$110M</td>
<td style="border: 1px solid #ddd; padding: 2px;">23K avg QPS, 40% writes, 3KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Netflix</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(0.2×730×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.28 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">65%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$18M</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K avg QPS, 5% writes, 1KB/write (2y, metadata only)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(1.5×365×2)÷1.4</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.78 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$88M</td>
<td style="border: 1px solid #ddd; padding: 2px;">58K avg QPS, 15% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Search</td>
<td style="border: 1px solid #ddd; padding: 2px;">20 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(20×30×1)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">0%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$50M</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K avg QPS, 2% writes, 100KB/write (30d, ephemeral index)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Banking App</td>
<td style="border: 1px solid #ddd; padding: 2px;">73 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(73T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.31 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">80%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$31M</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K avg QPS, 10% writes, 500B/write (7y compliance)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Notification</td>
<td style="border: 1px solid #ddd; padding: 2px;">22.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(22.6×30×2)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.68 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$76M</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K avg QPS, 90% writes, 1KB/write (30d, ephemeral logs)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Weather App</td>
<td style="border: 1px solid #ddd; padding: 2px;">3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(3×365×2)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.1 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$80M</td>
<td style="border: 1px solid #ddd; padding: 2px;">35K avg QPS, 10% writes, 10KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Stripe</td>
<td style="border: 1px solid #ddd; padding: 2px;">4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(4×2555×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">25.55 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.6B</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K avg QPS, 80% writes, 500B/write (7y compliance)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Drive</td>
<td style="border: 1px solid #ddd; padding: 2px;">12 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(12×1825×3)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">62.7 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">63%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.4B</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K avg QPS, 20% writes, 10KB/write (∞)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Dropbox</td>
<td style="border: 1px solid #ddd; padding: 2px;">5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5×1825×3)÷1.1</td>
<td style="border: 1px solid #ddd; padding: 2px;">24.8 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$560M</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K avg QPS, 25% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">IRCTC</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.88 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(0.88×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.43 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">75%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$48M</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K avg QPS, 30% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Newsfeed</td>
<td style="border: 1px solid #ddd; padding: 2px;">30 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(30×730×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">33.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$3.4B</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K avg QPS, 20% writes, 5KB/write (2y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Zerodha</td>
<td style="border: 1px solid #ddd; padding: 2px;">10 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(10×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">4.9 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$600M</td>
<td style="border: 1px solid #ddd; padding: 2px;">463K avg QPS, 25% writes, 1KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">ICICI Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">220 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(220T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.93 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">85%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$93M</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K avg QPS, 15% writes, 1KB/write (7y compliance)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">HDFC Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">250 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(250T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.06 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">85%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$106M</td>
<td style="border: 1px solid #ddd; padding: 2px;">19K avg QPS, 15% writes, 1KB/write (7y compliance)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Maps</td>
<td style="border: 1px solid #ddd; padding: 2px;">9 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(9×365×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$640M</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K avg QPS, 15% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Spotify</td>
<td style="border: 1px solid #ddd; padding: 2px;">12 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(12×1825×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">41.7 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.2B</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K avg QPS, 10% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Gaana</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5.3×1825×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">18.6 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$530M</td>
<td style="border: 1px solid #ddd; padding: 2px;">122K avg QPS, 10% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Amazon</td>
<td style="border: 1px solid #ddd; padding: 2px;">13.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(13.4×365×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">7.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$870M</td>
<td style="border: 1px solid #ddd; padding: 2px;">260K avg QPS, 20% writes, 3KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Airbnb</td>
<td style="border: 1px solid #ddd; padding: 2px;">6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(6×730×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">7.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">55%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$840M</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K avg QPS, 20% writes, 3KB/write (2y)</td>
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
