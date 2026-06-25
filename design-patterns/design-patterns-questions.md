# Design Patterns & Architecture — Interview Preparation

**Project Context**: Capital Access, S&P Global — Azure microservices, .NET 8, C# 12
**Audience Level**: Senior Developer (5+ years)
**Last Updated**: June 2026

> Every pattern is explained through a real example from Capital Access. No abstract theory — only stories you can tell in the interview.

---

## Table of Contents

1. [How to Answer Any Pattern Question](#0-how-to-answer-any-pattern-question)
2. [GoF Design Patterns — Creational](#1-creational-patterns)
3. [GoF Design Patterns — Structural](#2-structural-patterns)
4. [GoF Design Patterns — Behavioral](#3-behavioral-patterns)
5. [Code Smells & Anti-Patterns](#5-code-smells--anti-patterns)

---

## 0. How to Answer Any Pattern Question

Always follow this 4-step structure:

```
1. PROBLEM    → what pain does this solve? (one sentence)
2. SOLUTION   → what does the pattern do? (one sentence)
3. EXAMPLE    → Capital Access real usage (specific, named)
4. TRADE-OFF  → what does it cost? when NOT to use it?
```

The three GoF categories exist for a reason:

```
CREATIONAL  → Decouple object CREATION from object USE
              "new ClassName()" creates tight coupling — caller knows the concrete class
              These patterns hide how objects are created

STRUCTURAL  → Compose classes into larger structures
              Classes need to work together but weren't designed to
              These patterns describe how objects are assembled

BEHAVIORAL  → Define how objects COMMUNICATE
              Tight coupling between communicating objects kills testability
              These patterns define how objects talk to each other
```

---

## 1. Creational Patterns

---

### Q1. [Topic: Design Patterns] [EPAM] What is the Singleton pattern? When do you use it?

**Problem without Singleton in Capital Access:**

```csharp
// Every service creates its OWN expensive instance ❌
public class EngagementService
{
    public async Task ProcessAsync()
    {
        var busClient = new ServiceBusClient("Endpoint=sb://capital-access.servicebus...");
        // NEW TCP connection every call ❌
    }
}
public class ReportService
{
    public async Task GenerateAsync()
    {
        var busClient = new ServiceBusClient("Endpoint=sb://capital-access.servicebus...");
        // ANOTHER TCP connection ❌
    }
}
// 50 requests/sec = 50 TCP connections → Azure throttles → 429 errors ❌
// Each MemoryCache is isolated → cache populated by one service invisible to others ❌
```

**How Singleton solves it:**

```csharp
// Program.cs — registered ONCE, shared across entire application lifetime
builder.Services.AddSingleton<ServiceBusClient>(_ =>
    new ServiceBusClient(builder.Configuration["ServiceBus:ConnectionString"]));
builder.Services.AddSingleton<IMemoryCache, MemoryCache>();

// Every service gets THE SAME instance injected
public class EngagementService
{
    private readonly ServiceBusClient _bus; // SAME instance ✅
    public EngagementService(ServiceBusClient bus) => _bus = bus;
}
public class ReportService
{
    private readonly ServiceBusClient _bus; // SAME instance ✅
    private readonly IMemoryCache _cache;   // SAME cache ✅
}
```

**Manual Singleton (when DI is not available):**

```csharp
// Before builder.Build(), in library code, or static context
public sealed class TenantConfigCache
{
    private static readonly Lazy<TenantConfigCache> _instance =
        new(() => new TenantConfigCache());

    public static TenantConfigCache Instance => _instance.Value;
    private TenantConfigCache() { }
}
```

**AddSingleton IS the Singleton pattern** — the DI container manages the one instance instead of the class itself. Always prefer `AddSingleton` in ASP.NET Core because:

```
AddSingleton:       testable (swap in tests), follows DI principles ✅
Manual Singleton:   needed outside DI scope (pre-startup, library code, static context)
```

**Capital Access mapping:**
```
Singleton:  ServiceBusClient, IMemoryCache, IConfiguration, HttpClient factory
Scoped:     EngagementDbContext, IEngagementRepository  ← NEVER make these Singleton
```

**Pattern theory:**
```
Intent:    Ensure a class has ONLY ONE instance, provide global access point
Thread-safety: Lazy<T> handles thread-safe creation in .NET
When NOT:  ❌ Anything holding per-request state (use Scoped)
           ❌ Anything not thread-safe (concurrent writes = data corruption)
```

---

### Q2. [Topic: Design Patterns] [EPAM] What is the Factory Method pattern?

**Problem without Factory in Capital Access:**

```csharp
// If-else scattered in EVERY controller that needs report generation ❌
[HttpPost("{id}/generate")]
public async Task<IActionResult> Generate(Guid id, [FromQuery] string format)
{
    byte[] bytes;
    if (format == "pdf")
    {
        var generator = new PdfReportGenerator(new ITextSharpRenderer(), new PdfHeaderBuilder());
        bytes = await generator.GenerateAsync(id);
    }
    else if (format == "xlsx")
    {
        var generator = new ExcelReportGenerator(new EpPlusWorkbookFactory(), new CurrencyFormatter());
        bytes = await generator.GenerateAsync(id);
    }
    else if (format == "csv")
    {
        var generator = new CsvReportGenerator(new CsvHelper.Configuration(), Encoding.UTF8);
        bytes = await generator.GenerateAsync(id);
    }
    else return BadRequest();
    return File(bytes, GetContentType(format));
}
// SAME if-else in ScheduledReportService, BulkExportService, PreviewController ❌
// Adding PowerPoint → touch 4 files ❌
```

**How Factory Method solves it:**

```csharp
// Step 1: Interface — all generators look the same to callers
public interface IReportGenerator
{
    string Format { get; }
    Task<byte[]> GenerateAsync(Guid reportId);
}

// Step 2: Each generator is self-contained
public class PdfReportGenerator  : IReportGenerator { public string Format => "pdf";  ... }
public class ExcelReportGenerator: IReportGenerator { public string Format => "xlsx"; ... }
public class CsvReportGenerator  : IReportGenerator { public string Format => "csv";  ... }

// Step 3: Factory — ONE place that routes by format
public class ReportGeneratorFactory
{
    private readonly Dictionary<string, IReportGenerator> _generators;

    public ReportGeneratorFactory(IEnumerable<IReportGenerator> generators)
        => _generators = generators.ToDictionary(g => g.Format);

    public IReportGenerator Create(string format)
        => _generators.TryGetValue(format, out var gen)
            ? gen
            : throw new ArgumentException($"Unsupported format: {format}");
}

// Register all generators in DI
builder.Services.AddScoped<IReportGenerator, PdfReportGenerator>();
builder.Services.AddScoped<IReportGenerator, ExcelReportGenerator>();
builder.Services.AddScoped<IReportGenerator, CsvReportGenerator>();
builder.Services.AddScoped<ReportGeneratorFactory>();

// Controller — 3 lines, zero knowledge of generator types ✅
[HttpPost("{id}/generate")]
public async Task<IActionResult> Generate(Guid id, [FromQuery] string format)
{
    var generator = _factory.Create(format);
    var bytes     = await generator.GenerateAsync(id);
    return File(bytes, GetContentType(format));
}

// Adding PowerPoint: ONE class + ONE DI registration. Zero other changes. ✅
public class PowerPointReportGenerator : IReportGenerator { public string Format => "pptx"; ... }
builder.Services.AddScoped<IReportGenerator, PowerPointReportGenerator>();
```

**Pattern theory:**
```
Intent:    Define an interface for creating an object, defer instantiation to one place.
           "I need to create objects but don't know which concrete class until runtime."

Open/Closed Principle: open for extension (add new type), closed for modification
When to use:   ✅ Multiple implementations of same interface, chosen at runtime
               ✅ Adding new type = add class, never modify callers
When NOT:      ❌ Only one implementation will ever exist
               ❌ Object creation is trivial
```

---

### Q3. [Topic: Design Patterns] [EPAM] What is the Abstract Factory pattern? How is it different from Factory Method?

**One-sentence difference:**
```
Factory Method:    creates ONE product.         "Give me a report generator."
Abstract Factory:  creates a FAMILY of products "Give me email + SMS + Teams —
                   that MUST match each other.   all from the same vendor."
```

**Problem that Factory Method CANNOT solve:**

Using three separate Factory Methods for notification channels:
```csharp
var emailSender = EmailSenderFactory.Create("sendgrid"); // SendGrid
var smsSender   = SmsSenderFactory.Create("twilio");     // Twilio  ← DIFFERENT vendor ❌
var teamsPoster = TeamsPosterFactory.Create("microsoft");// Microsoft ← THIRD vendor ❌
// Nothing prevents this accidental mix.
// EU compliance violation: mixed EU + non-EU vendors ❌
// Delivery receipts inconsistent across vendors ❌
// Switching vendors = find every Factory.Create() call ❌
```

**How Abstract Factory solves it:**

```csharp
// ONE factory produces ALL three — compatibility guaranteed
public interface INotificationFactory
{
    IEmailSender  CreateEmailSender();
    ISmsSender    CreateSmsSender();
    ITeamsPoster  CreateTeamsPoster();
}

// Global factory — all three from global-compliant vendors
public class GlobalNotificationFactory : INotificationFactory
{
    public IEmailSender  CreateEmailSender()  => new SendGridEmailSender();
    public ISmsSender    CreateSmsSender()    => new TwilioSmsSender();
    public ITeamsPoster  CreateTeamsPoster()  => new MicrosoftTeamsPoster();
}

// EU factory — all three from EU-certified vendors
public class EuNotificationFactory : INotificationFactory
{
    public IEmailSender  CreateEmailSender()  => new MessageBirdEmailSender();
    public ISmsSender    CreateSmsSender()    => new CmComSmsSender();
    public ITeamsPoster  CreateTeamsPoster()  => new EuTeamsPoster();
}

// DI — switch entire vendor suite at one line
builder.Services.AddScoped<INotificationFactory>(sp =>
    tenant.IsEuResident
        ? new EuNotificationFactory()
        : new GlobalNotificationFactory());

// NotificationService — cannot accidentally mix vendors ✅
public class NotificationService
{
    private readonly INotificationFactory _factory;

    public async Task SendAsync(string userId, string message)
    {
        var email = _factory.CreateEmailSender(); // correct vendor ✅
        var sms   = _factory.CreateSmsSender();   // SAME vendor family ✅
        var teams = _factory.CreateTeamsPoster(); // SAME vendor family ✅
    }
}
```

**Going deeper — Country-level variation within EU:**

If EU itself has per-country vendor restrictions (Germany allows X, France allows Y), adding one class per country causes class explosion (27 EU countries = 27 classes). Solution: **Factory Registry**.

```csharp
// Config record — data instead of classes ✅
public record NotificationProviderConfig(
    string EmailProvider, string SmsProvider, string TeamsProvider,
    string EmailApiKey,   string SmsApiKey);

// Registry — dictionary of country code → config
public class NotificationFactoryRegistry
{
    private readonly Dictionary<string, NotificationProviderConfig> _countryConfigs = new()
    {
        ["DE"] = new("mailjet",     "cmcom",   "eu-teams", "mj-key-de", "cm-key-de"),
        ["FR"] = new("mailjet",     "ovh-sms", "eu-teams", "mj-key-fr", "ovh-key-fr"),
        ["NL"] = new("sparkpost",   "cmcom",   "eu-teams", "sp-key-nl", "cm-key-nl"),
        // Adding Poland: ONE line. Zero new classes. ✅
        ["PL"] = new("messagebird", "cmcom",   "eu-teams", "mb-key-pl", "cm-key-pl"),
    };

    private readonly Dictionary<string, NotificationProviderConfig> _regionConfigs = new()
    {
        ["EU"]      = new("messagebird", "cmcom",  "eu-teams",  "mb-eu-key",  "cm-eu-key"),
        ["APAC"]    = new("sendgrid",    "twilio", "microsoft", "sg-apac-key","tw-apac-key"),
        ["DEFAULT"] = new("sendgrid",    "twilio", "microsoft", "sg-key",     "tw-key"),
    };

    // Fallback chain: Country → Region → Global
    public INotificationFactory GetFactory(string countryCode, string region)
    {
        var config = _countryConfigs.TryGetValue(countryCode, out var cc) ? cc
                   : _regionConfigs.TryGetValue(region, out var rc)       ? rc
                   : _regionConfigs["DEFAULT"];

        return BuildFactory(config);
    }

    private INotificationFactory BuildFactory(NotificationProviderConfig cfg)
    {
        IEmailSender email = cfg.EmailProvider switch
        {
            "mailjet"     => new MailjetEmailSender(cfg.EmailApiKey),
            "sendgrid"    => new SendGridEmailSender(cfg.EmailApiKey),
            "messagebird" => new MessageBirdEmailSender(cfg.EmailApiKey),
            "sparkpost"   => new SparkPostEmailSender(cfg.EmailApiKey),
            _ => throw new ArgumentException($"Unknown email provider: {cfg.EmailProvider}")
        };
        ISmsSender sms = cfg.SmsProvider switch
        {
            "cmcom"   => new CmComSmsSender(cfg.SmsApiKey),
            "twilio"  => new TwilioSmsSender(cfg.SmsApiKey),
            "vonage"  => new VonageSmsSender(cfg.SmsApiKey),
            "ovh-sms" => new OvhSmsSender(cfg.SmsApiKey),
            _ => throw new ArgumentException($"Unknown SMS provider: {cfg.SmsProvider}")
        };
        ITeamsPoster teams = cfg.TeamsProvider switch
        {
            "eu-teams"  => new EuTeamsPoster(),
            "microsoft" => new MicrosoftTeamsPoster(),
            _ => throw new ArgumentException($"Unknown Teams provider: {cfg.TeamsProvider}")
        };
        return new ConfiguredNotificationFactory(email, sms, teams);
    }
}

// ConfiguredNotificationFactory — built from config, not hardcoded
public class ConfiguredNotificationFactory : INotificationFactory
{
    private readonly IEmailSender _email;
    private readonly ISmsSender   _sms;
    private readonly ITeamsPoster _teams;

    public ConfiguredNotificationFactory(IEmailSender e, ISmsSender s, ITeamsPoster t)
        => (_email, _sms, _teams) = (e, s, t);

    public IEmailSender  CreateEmailSender()  => _email;
    public ISmsSender    CreateSmsSender()    => _sms;
    public ITeamsPoster  CreateTeamsPoster()  => _teams;
}

// Lookup chain in action:
// Tenant country = "DE", region = "EU"
// 1. Check countryConfigs["DE"] → FOUND → Mailjet + CM.com + EU Teams ✅
// 2. (if not found) Check regionConfigs["EU"] → MessageBird + CM.com + EU Teams
// 3. (if not found) regionConfigs["DEFAULT"] → SendGrid + Twilio + Microsoft
```

**Pattern theory:**
```
Intent:    Create FAMILIES of related objects that must be compatible,
           without specifying concrete classes.

Key constraint: products from one factory are GUARANTEED compatible
                AbstractFactory prevents accidental cross-family mixing

Factory Method vs Abstract Factory:
  Factory:          creates ONE product
  Abstract Factory: creates a FAMILY — all products guaranteed from same suite

Furniture analogy:
  Factory Method:   "Give me a chair." — just a chair, from anywhere
  Abstract Factory: "Give me Modern-style furniture." →
                    Modern chair + Modern table + Modern sofa — all matching ✅
                    Cannot accidentally get Modern chair + Vintage table ✅

Extension with Registry:
  One class per country = class explosion (27 EU = 27 classes) ❌
  Registry = dictionary of country → config. Adding country = one line ✅

When to use:   ✅ Products come in families that must be compatible
               ✅ Switching an entire family at once (vendor switch, theme switch)
When NOT:      ❌ Products don't need to be compatible with each other
               ❌ Only one implementation will ever exist
```

---

### Q4. [Topic: Design Patterns] [EPAM] What is the Builder pattern?

**Problem without Builder in Capital Access:**

```csharp
// Constructor grew to 12 parameters over 2 years ❌
var request = new ReportRequest(
    "spg-001", "port-abc",
    DateTime.Today.AddMonths(-3), DateTime.Today,
    null,        // companyFilters? or sectorFilters? must count params ❌
    null,
    true, false, // which bool is which? ❌
    "pdf", null, "CONFIDENTIAL", Priority.High);
// Two adjacent bools swapped → no compiler error, silent bug ❌
// Adding param 13 → every call site must be updated ❌
```

**How Builder solves it:**

```csharp
public class ReportRequestBuilder
{
    private readonly ReportRequest _request = new();
    private bool _tenantSet, _portfolioSet, _dateSet, _formatSet;

    public ReportRequestBuilder ForTenant(string tenantId)
        { _request.TenantId = tenantId; _tenantSet = true; return this; }

    public ReportRequestBuilder ForPortfolio(string portfolioId)
        { _request.PortfolioId = portfolioId; _portfolioSet = true; return this; }

    public ReportRequestBuilder DateRange(DateTime from, DateTime to)
    {
        if (from >= to) throw new ArgumentException("fromDate must be before toDate");
        _request.FromDate = from; _request.ToDate = to; _dateSet = true; return this;
    }

    public ReportRequestBuilder FilterByCompanies(params string[] tickers)
        { _request.CompanyFilters = tickers; return this; }

    public ReportRequestBuilder WithCharts()
        { _request.IncludeCharts = true; return this; }

    public ReportRequestBuilder WithRawData(int? maxRows = null)
        { _request.IncludeRawData = true; _request.MaxRows = maxRows; return this; }

    public ReportRequestBuilder AsFormat(string format)
        { _request.OutputFormat = format; _formatSet = true; return this; }

    public ReportRequestBuilder WithWatermark(string text)
        { _request.Watermark = text; return this; }

    public ReportRequest Build()
    {
        if (!_tenantSet)    throw new InvalidOperationException("TenantId is required");
        if (!_portfolioSet) throw new InvalidOperationException("PortfolioId is required");
        if (!_dateSet)      throw new InvalidOperationException("DateRange is required");
        if (!_formatSet)    throw new InvalidOperationException("OutputFormat is required");
        return _request;
    }
}

// Self-documenting, impossible to mix up parameters ✅
var request = new ReportRequestBuilder()
    .ForTenant("spg-001")
    .ForPortfolio("port-abc")
    .DateRange(DateTime.Today.AddMonths(-3), DateTime.Today)
    .FilterByCompanies("AAPL", "MSFT", "GOOGL")
    .WithCharts()
    .WithWatermark("CONFIDENTIAL")
    .AsFormat("pdf")
    .Build();
```

**You already use Builder daily:**
```csharp
var builder = WebApplication.CreateBuilder(args); // creates builder
builder.Services.AddControllers();                 // configure
var app = builder.Build();                         // Build() → final object ✅
```

**Pattern theory:**
```
Intent:    Construct complex objects step-by-step.
Problem:   "Telescoping constructor" — object with many optional parameters.

return this → enables fluent method chaining
Build()     → validates all required fields in ONE place ✅

When to use:   ✅ Object has 4+ parameters, several optional
               ✅ Construction involves validation
               ✅ Same object type built with different configurations
When NOT:      ❌ 2-3 params — use named parameters or object initializer
```

---

### Q5. [Topic: Design Patterns] [EPAM] What is the Prototype pattern?

**Problem without Prototype in Capital Access:**

```csharp
// Report template: complex object loaded from DB + Blob Storage
public async Task<ReportTemplate> GetTemplateForTenantAsync(string tenantId)
{
    var config    = await _db.ReportTemplates.Include(t => t.Sections)
                        .FirstOrDefaultAsync(t => t.TenantId == tenantId); // DB call ❌
    var logoBytes = await _blobClient.DownloadAsync($"logos/{tenantId}.png"); // 200ms ❌
    var fonts     = FontParser.Parse(config.FontConfig); // CPU intensive ❌
    return new ReportTemplate { ... };
}
// Bulk report: 200 investors → 200 × (DB + Blob + CPU) = ~100 seconds ❌
```

**How Prototype solves it:**

```csharp
public class ReportTemplate : ICloneable
{
    public string      TenantId    { get; set; } = "";
    public string      Layout      { get; set; } = "";
    public ColorScheme ColorScheme { get; set; } = new();
    public List<ReportSection> Sections { get; set; } = new();
    public byte[]      Logo        { get; set; } = [];

    // Deep clone — fully independent copy, no shared references
    public ReportTemplate DeepClone() => new()
    {
        TenantId    = TenantId,
        Layout      = Layout,
        ColorScheme = ColorScheme with { },            // record copy
        Sections    = Sections.Select(s => s.Clone() as ReportSection).ToList()!,
        Logo        = (byte[])Logo.Clone(),            // copy byte array ✅
    };

    public ReportTemplate CustomizeFor(string investorId, string investorName)
    {
        var clone = DeepClone();
        clone.CustomFields["InvestorId"]   = investorId;
        clone.CustomFields["InvestorName"] = investorName;
        return clone; // master template UNCHANGED ✅
    }

    public object Clone() => MemberwiseClone();
}

// Cache master template — load ONCE
public async Task GenerateBulkAsync(string tenantId, List<Investor> investors)
{
    var master = await _cache.GetOrCreateAsync($"template:{tenantId}", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
        return await LoadFromDbAndBlobAsync(tenantId); // called ONCE ✅
    });

    // Clone per investor — microseconds each ✅
    var tasks = investors.Select(inv =>
        _reportGenerator.GenerateAsync(master.CustomizeFor(inv.Id, inv.Name)));

    await Task.WhenAll(tasks); // 1 DB call + 200 cheap clones ✅
}
```

**Pattern theory:**
```
Intent:    Create new objects by CLONING an existing prototype instead of creating from scratch.

Shallow vs Deep Clone — THE trap:
  Shallow (MemberwiseClone): copies reference types by REFERENCE
    → two clones share same Logo byte[] → one modifies it, both affected ❌
  Deep Clone: copies everything recursively — fully independent ✅
  Rule: if ANY nested object is mutable, you MUST deep clone it.

When to use:   ✅ Object creation is expensive (DB, network, CPU)
               ✅ Many similar objects needed with small differences
When NOT:      ❌ Object creation is cheap — just use new()
               ❌ All fields are immutable — shallow clone is safe
```

---

## 2. Structural Patterns

---

### Q6. [Topic: Design Patterns] [EPAM] What is the Repository pattern?

**Problem without Repository in Capital Access:**

```csharp
// EF Core leaks into every service ❌
public class EngagementService
{
    private readonly EngagementDbContext _context; // EF Core dependency ❌

    public async Task CompleteAsync(Guid id, string notes)
    {
        var activity = await _context.EngagementActivities.FindAsync(id);
        activity!.Status = "Completed"; // raw string — no domain logic ❌
        activity.CompletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(); // EF Core in business layer ❌
    }
}
// ReportService duplicates the same count query ❌
// Unit test requires mocking DbContext — notoriously painful ❌
// Replace EF Core with Dapper → touch every service ❌
```

**How Repository solves it:**

```csharp
// Interface — defined in Domain layer
public interface IEngagementRepository
{
    Task<EngagementActivity?> GetByIdAsync(Guid id);
    Task<List<EngagementActivity>> GetUpcomingAsync(string tenantId);
    Task<int> GetYearlyCountAsync(string tenantId, int year);
    void Add(EngagementActivity activity);
    Task SaveAsync();
}

// Implementation — ALL EF Core lives HERE only
public class SqlEngagementRepository : IEngagementRepository
{
    private readonly EngagementDbContext _context;

    public Task<EngagementActivity?> GetByIdAsync(Guid id)
        => _context.EngagementActivities.Include(e => e.Attendees)
               .FirstOrDefaultAsync(e => e.Id == id);

    public Task<int> GetYearlyCountAsync(string tenantId, int year)
        => _context.EngagementActivities
               .Where(e => e.TenantId == tenantId && e.ScheduledAt.Year == year
                        && e.Status != ActivityStatus.Cancelled)
               .CountAsync(); // defined ONCE, reused everywhere ✅

    public void Add(EngagementActivity a) => _context.EngagementActivities.Add(a);
    public Task SaveAsync() => _context.SaveChangesAsync();
}

// Service — zero EF Core knowledge ✅
public class EngagementService
{
    private readonly IEngagementRepository _repo; // interface only ✅

    public async Task CompleteAsync(Guid id, string notes)
    {
        var activity = await _repo.GetByIdAsync(id)
            ?? throw new EngagementNotFoundException(id);
        activity.Complete(notes); // domain method — business rule in entity ✅
        await _repo.SaveAsync();
    }
}

// Unit test — mock is trivial ✅
var mockRepo = new Mock<IEngagementRepository>();
mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((EngagementActivity?)null);
var service = new EngagementService(mockRepo.Object);
await Assert.ThrowsAsync<EngagementNotFoundException>(() => service.CompleteAsync(Guid.NewGuid(), ""));
```

**Pattern theory:**
```
Intent:    Abstraction layer between business logic and data access.
           Business logic works with interface — never knows about SQL or EF Core.

What Repository is NOT:
  ❌ Generic CRUD repo exposing IQueryable<T> — leaks EF Core to callers
  ✅ Named methods representing BUSINESS operations: GetUpcomingAsync, GetByTenantAsync

When to use:   ✅ Need to unit test business logic without a database
               ✅ Queries reused across multiple services
               ✅ Isolate ORM to Infrastructure layer
When NOT:      ❌ Simple CRUD app — EF Core already IS a repository
```

---

### Q7. [Topic: Design Patterns] [EPAM] What is the Decorator pattern?

**Problem without Decorator in Capital Access:**

```csharp
// Option A: Modify SqlEngagementRepository to add Redis caching — two concerns ❌
public class SqlEngagementRepository : IEngagementRepository
{
    private readonly EngagementDbContext _context;
    private readonly IDistributedCache _redis; // SQL + caching mixed ❌

    public async Task<EngagementActivity?> GetByIdAsync(Guid id)
    {
        var cached = await _redis.GetStringAsync($"engagement:{id}");
        if (cached != null) return JsonSerializer.Deserialize<EngagementActivity>(cached);
        var result = await _context.EngagementActivities.FindAsync(id);
        // ... cache the result
        return result;
    }
    // Violates Single Responsibility ❌ Unit test requires Redis mock ❌
}
```

**How Decorator solves it:**

```csharp
public class CachingEngagementRepository : IEngagementRepository
{
    private readonly IEngagementRepository _inner;  // wraps ANY implementation ✅
    private readonly IDistributedCache _redis;
    private readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);

    public CachingEngagementRepository(IEngagementRepository inner, IDistributedCache redis)
        => (_inner, _redis) = (inner, redis);

    public async Task<EngagementActivity?> GetByIdAsync(Guid id)
    {
        var key    = $"engagement:id:{id}";
        var cached = await _redis.GetStringAsync(key);
        if (cached != null) return JsonSerializer.Deserialize<EngagementActivity>(cached)!;

        var result = await _inner.GetByIdAsync(id); // delegate to real repo ✅
        if (result != null)
            await _redis.SetStringAsync(key, JsonSerializer.Serialize(result),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _ttl });
        return result;
    }

    public void Add(EngagementActivity a) => _inner.Add(a);     // pass through
    public Task SaveAsync()               => _inner.SaveAsync(); // pass through
    public Task<List<EngagementActivity>> GetUpcomingAsync(string tenantId)
        => _inner.GetUpcomingAsync(tenantId); // could add caching here too
    public Task<int> GetYearlyCountAsync(string tenantId, int year)
        => _inner.GetYearlyCountAsync(tenantId, year);
}

// Wire up — transparent to ALL services ✅
builder.Services.AddScoped<SqlEngagementRepository>();
builder.Services.AddScoped<IEngagementRepository>(sp =>
    new CachingEngagementRepository(
        sp.GetRequiredService<SqlEngagementRepository>(),
        sp.GetRequiredService<IDistributedCache>()));

// Stack decorators — Logging → Caching → SQL
builder.Services.AddScoped<IEngagementRepository>(sp =>
    new LoggingEngagementRepository(
        new CachingEngagementRepository(
            sp.GetRequiredService<SqlEngagementRepository>(),
            sp.GetRequiredService<IDistributedCache>()),
        sp.GetRequiredService<ILogger<LoggingEngagementRepository>>()));
```

**Pattern theory:**
```
Intent:    Add behaviour to an object DYNAMICALLY by wrapping it, without modifying it.
           Decorator and inner object share THE SAME interface.

Decorator vs Inheritance:
  Inheritance: CachingRepo extends SqlRepo — tied to one class
  Decorator:   CachingRepo wraps IEngagementRepository — works with ANY implementation ✅

Decorator vs Proxy:
  Decorator: ADDS new behaviour (caching, logging, metrics)
  Proxy:     CONTROLS access (lazy load, permission check, remote call)

When to use:   ✅ Add cross-cutting concerns (caching, logging) without modifying class
               ✅ Stack behaviours in any combination
When NOT:      ❌ Interface has 30 methods — too many pass-throughs to write
```

---

### Q8. [Topic: Design Patterns] [EPAM] What is the Facade pattern?

**Problem without Facade in Capital Access:**

```csharp
// Controller knows entire subsystem and orchestrates 7 dependencies ❌
public class ReportController : ControllerBase
{
    private readonly IEngagementRepository _engagementRepo;
    private readonly IOwnershipServiceClient _ownershipClient;
    private readonly ITargetingServiceClient _targetingClient;
    private readonly IReportRepository _reportRepo;
    private readonly ServiceBusClient _bus;
    private readonly INotificationService _notificationSvc;
    private readonly ICurrentTenantService _tenantSvc; // 7 deps ❌

    [HttpPost]
    public async Task<IActionResult> GenerateReport([FromBody] ReportRequestDto dto)
    {
        // 30 lines of orchestration in controller ❌
        var reportId      = Guid.NewGuid();
        await _reportRepo.CreateJobAsync(reportId, dto, _tenantSvc.TenantId);
        var ownershipData = await _ownershipClient.GetPortfolioAsync(dto.PortfolioId);
        var targetingData = await _targetingClient.GetFiltersAsync(dto.TenantId, dto.Filters);
        await _bus.CreateSender("report-topic")
            .SendMessageAsync(new ServiceBusMessage(JsonSerializer.Serialize(
                new { reportId, ownershipData, targetingData })));
        await _notificationSvc.NotifyAsync(dto.RequestedBy, "Report queued", reportId);
        return Accepted(new { reportId });
        // BulkExportController duplicates all 30 lines ❌
    }
}
```

**How Facade solves it:**

```csharp
// Facade — all orchestration and all dependencies live here
public class ReportFacade
{
    private readonly IOwnershipServiceClient _ownershipClient;
    private readonly ITargetingServiceClient _targetingClient;
    private readonly IReportRepository _reportRepo;
    private readonly ServiceBusClient  _bus;
    private readonly INotificationService _notificationSvc;
    private readonly ICurrentTenantService _tenantSvc;

    public async Task<ReportQueuedResult> RequestReportAsync(ReportRequestDto dto)
    {
        var reportId = Guid.NewGuid();
        try
        {
            await _reportRepo.CreateJobAsync(reportId, dto, _tenantSvc.TenantId);

            // Fetch in PARALLEL — Facade orchestrates ✅
            var ownershipTask = _ownershipClient.GetPortfolioAsync(dto.PortfolioId);
            var targetingTask = _targetingClient.GetFiltersAsync(_tenantSvc.TenantId, dto.Filters);
            await Task.WhenAll(ownershipTask, targetingTask);

            if (ownershipTask.Result == null)
                throw new PortfolioNotFoundException(dto.PortfolioId);

            await _bus.CreateSender("report-topic")
                .SendMessageAsync(new ServiceBusMessage(JsonSerializer.Serialize(
                    new ReportRequestedEvent(reportId, ownershipTask.Result, targetingTask.Result))));

            await _notificationSvc.NotifyAsync(dto.RequestedBy, "Report queued", reportId);
            return new ReportQueuedResult(reportId, "Queued");
        }
        catch
        {
            await _reportRepo.MarkAsFailedAsync(reportId);
            throw; // error handling centralized here ✅
        }
    }
}

// Controller — 1 dependency, 3 lines ✅
public class ReportController : ControllerBase
{
    private readonly ReportFacade _facade;

    [HttpPost]
    public async Task<IActionResult> GenerateReport([FromBody] ReportRequestDto dto)
        => Accepted(await _facade.RequestReportAsync(dto));
}

// BulkExportController reuses same facade — zero duplication ✅
public class BulkExportController : ControllerBase
{
    private readonly ReportFacade _facade;

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkExport([FromBody] List<ReportRequestDto> requests)
    {
        var results = await Task.WhenAll(requests.Select(_facade.RequestReportAsync));
        return Accepted(results);
    }
}
```

**Pattern theory:**
```
Intent:    Provide a SIMPLIFIED interface to a complex subsystem.

Facade vs Adapter:
  Adapter: translates ONE interface to ANOTHER — compatibility bridge (one-to-one)
  Facade:  SIMPLIFIES a complex subsystem — many-to-one reduction

Facade vs Mediator:
  Facade:   one-way — clients call facade, facade calls subsystem
  Mediator: bidirectional — objects communicate THROUGH mediator

When to use:   ✅ Controller/service needs 5+ collaborators for one operation
               ✅ Orchestration duplicated across multiple callers
               ✅ Subsystem changes should not ripple to all callers
When NOT:      ❌ Operation is simple — facade is unnecessary indirection
```

---

### Q9. [Topic: Design Patterns] [EPAM] What is the Adapter pattern?

**Problem without Adapter in Capital Access:**

```csharp
// Bloomberg SDK has its own types — incompatible with our interface
public class BloombergDataService // external SDK, cannot modify
{
    public BbgInvestorRecord[] QueryInvestors(
        string bbgPortfolioCode,     // Bloomberg naming ❌
        DateTimeOffset asOfDate,     // Bloomberg uses DateTimeOffset ❌
        string[] bbgSecurityIds,     // Bloomberg format: /isin/US037... ❌
        BbgDataFields fields) { }
}

// TargetingService knows about Bloomberg — vendor leaks into business layer ❌
public class TargetingService
{
    private readonly BloombergDataService _bloomberg; // vendor dependency ❌

    public async Task<List<string>> GetTargetsAsync(string portfolioId)
    {
        var bbgCode = portfolioId.Replace("PORT-", "BBG-"); // translation here ❌
        var results = _bloomberg.QueryInvestors(bbgCode, DateTimeOffset.UtcNow, ..., BbgDataFields.All);
        return results.Select(r => r.LegalEntityName).ToList(); // translation here too ❌
        // Same translation duplicated in ProfileService, ContactsService ❌
    }
}
// Switch Bloomberg → Refinitiv: change every service ❌
```

**How Adapter solves it:**

```csharp
// Our interface — what services expect
public interface IInvestorDataProvider
{
    Task<List<InvestorDto>> GetInvestorsByPortfolioAsync(string portfolioId, DateOnly asOf);
}

// Adapter — bridges Bloomberg SDK to our interface
public class BloombergInvestorAdapter : IInvestorDataProvider
{
    private readonly BloombergDataService _bloomberg; // Bloomberg SDK hidden here ONLY ✅

    public Task<List<InvestorDto>> GetInvestorsByPortfolioAsync(string portfolioId, DateOnly asOf)
    {
        // Translate OUR params → Bloomberg params
        var bbgCode = portfolioId.Replace("PORT-", "BBG-");
        var bbgDate = new DateTimeOffset(asOf.ToDateTime(TimeOnly.MinValue));
        var secIds  = new[] { $"/isin/{portfolioId}" };

        var rawResults = _bloomberg.QueryInvestors(bbgCode, bbgDate, secIds, BbgDataFields.All);

        // Translate Bloomberg types → OUR types
        return Task.FromResult(rawResults.Select(r => new InvestorDto
        {
            Id      = r.BbgId,
            Name    = r.LegalEntityName,
            AumUsd  = r.AumUsd,
            Address = new AddressDto
            {
                Country  = r.Address.CountryCode,
                City     = r.Address.Municipality,
                PostCode = r.Address.PostalCode
            }
        }).ToList());
    }
}

// Register — services inject IInvestorDataProvider only ✅
builder.Services.AddScoped<IInvestorDataProvider, BloombergInvestorAdapter>();

// TargetingService — zero Bloomberg knowledge ✅
public class TargetingService
{
    private readonly IInvestorDataProvider _investorData; // our interface ✅

    public async Task<List<string>> GetTargetsAsync(string portfolioId)
    {
        var investors = await _investorData.GetInvestorsByPortfolioAsync(
            portfolioId, DateOnly.FromDateTime(DateTime.UtcNow));
        return investors.Select(i => i.Name).ToList();
    }
}
// Switch to Refinitiv: one DI line change ✅
builder.Services.AddScoped<IInvestorDataProvider, RefinitivInvestorAdapter>();
```

**Pattern theory:**
```
Intent:    Convert the interface of a class into ANOTHER interface that clients expect.
           Makes incompatible interfaces work together.

Two forms:
  Object Adapter (preferred): wraps instance via composition — flexible
  Class Adapter:              inherits from adaptee — limited by single inheritance

Adapter vs Facade:
  Adapter: ONE-TO-ONE — makes one interface work as another
  Facade:  MANY-TO-ONE — hides complex subsystem behind simple interface

When to use:   ✅ Third-party library interface is incompatible with yours
               ✅ Decouple codebase from external vendor
               ✅ Support multiple external providers behind one interface
When NOT:      ❌ Interfaces are already compatible
```

---

### Q10. [Topic: Design Patterns] [EPAM] What is the Proxy pattern?

**Problem without Proxy in Capital Access:**

```csharp
// Every call to Ownership service hits Cosmos DB — even identical calls ❌
public class OwnershipServiceClient
{
    public async Task<OwnershipData?> GetPortfolioAsync(string portfolioId)
        => await _http.GetFromJsonAsync<OwnershipData>($"/api/portfolios/{portfolioId}");
}
// During one report generation:
// TargetingService:  GetPortfolioAsync("PORT-abc") → Cosmos DB call ❌
// ProfilesService:   GetPortfolioAsync("PORT-abc") → same Cosmos DB call ❌
// ReportService:     GetPortfolioAsync("PORT-abc") → same Cosmos DB call ❌
// 3× identical calls, same request lifecycle ❌

// Also: no access control — any code with the client can call ANY portfolio ❌
```

**How Proxy solves it:**

```csharp
// Caching Proxy — eliminates duplicate calls within same request scope
public class CachingOwnershipServiceProxy : IOwnershipServiceClient
{
    private readonly IOwnershipServiceClient _real;
    private readonly Dictionary<string, OwnershipData?> _requestCache = new();
    // Scoped lifetime → cache lives for ONE HTTP request ✅

    public async Task<OwnershipData?> GetPortfolioAsync(string portfolioId)
    {
        if (_requestCache.TryGetValue(portfolioId, out var cached))
            return cached; // second/third call → instant return ✅

        var result = await _real.GetPortfolioAsync(portfolioId);
        _requestCache[portfolioId] = result;
        return result;
    }
}

// Protection Proxy — adds tenant access control
public class TenantProtectedOwnershipProxy : IOwnershipServiceClient
{
    private readonly IOwnershipServiceClient _real;
    private readonly ICurrentTenantService _tenant;

    public async Task<OwnershipData?> GetPortfolioAsync(string portfolioId)
    {
        var allowed = await _tenant.OwnsPortfolioAsync(portfolioId);
        if (!allowed) throw new UnauthorizedAccessException(
            $"Tenant {_tenant.TenantId} cannot access portfolio {portfolioId}");

        return await _real.GetPortfolioAsync(portfolioId);
    }
}

// Stack proxies: Protection → Caching → Real
builder.Services.AddScoped<IOwnershipServiceClient>(sp =>
    new TenantProtectedOwnershipProxy(
        new CachingOwnershipServiceProxy(
            sp.GetRequiredService<RealOwnershipServiceClient>()),
        sp.GetRequiredService<ICurrentTenantService>()));
```

**Five types of Proxy — interviewers love this:**
```
1. Virtual Proxy:    lazy initialization — expensive object only created when accessed
2. Caching Proxy:   cache results — avoid repeat expensive calls ✅ (used above)
3. Protection Proxy: access control — check permissions before operation ✅ (used above)
4. Logging Proxy:   audit trail — log every method call
5. Remote Proxy:    hide network — gRPC stub IS a remote proxy (local call → network call)

Proxy vs Decorator:
  Both: same interface, wraps real object
  Proxy:     CONTROLS ACCESS — lazy, cache, protect, log
  Decorator: ADDS BEHAVIOUR — new functionality, extra processing
```

---

### Q11. [Topic: Design Patterns] [EPAM] What is the Composite pattern?

**Problem without Composite in Capital Access:**

```csharp
// Targeting filters are simple AND-only conditions ❌
public List<Investor> ApplyFilters(List<Investor> investors,
    string? country, string? sector, decimal? minAum)
{
    var query = investors.AsQueryable();
    if (country != null) query = query.Where(i => i.Country == country);
    if (sector  != null) query = query.Where(i => i.Sectors.Contains(sector));
    if (minAum  != null) query = query.Where(i => i.Aum >= minAum);
    return query.ToList();
    // PM: "Find investors (In US AND > $1B) OR (In EU AND Technology AND > $500M)"
    // Cannot express this — all conditions are AND ❌
}
```

**How Composite solves it:**

```csharp
// Leaf and Composite share the SAME interface — key insight
public interface ITargetingFilter
{
    bool Matches(Investor investor);
    string Describe();
}

// LEAF filters — simplest unit
public class CountryFilter : ITargetingFilter
{
    private readonly string _country;
    public CountryFilter(string country) => _country = country;
    public bool Matches(Investor i) => i.Country == _country;
    public string Describe() => $"Country = {_country}";
}

public class AumFilter : ITargetingFilter
{
    private readonly decimal _minAum;
    public AumFilter(decimal min) => _minAum = min;
    public bool Matches(Investor i) => i.Aum >= _minAum;
    public string Describe() => $"AUM >= {_minAum:C0}";
}

public class SectorFilter : ITargetingFilter
{
    private readonly string _sector;
    public SectorFilter(string sector) => _sector = sector;
    public bool Matches(Investor i) => i.Sectors.Contains(_sector);
    public string Describe() => $"Sector = {_sector}";
}

// COMPOSITE — combines other filters (leaves OR other composites)
public class AndFilter : ITargetingFilter
{
    private readonly List<ITargetingFilter> _filters;
    public AndFilter(params ITargetingFilter[] filters) => _filters = filters.ToList();
    public bool Matches(Investor i)  => _filters.All(f => f.Matches(i));
    public string Describe()         => $"({string.Join(" AND ", _filters.Select(f => f.Describe()))})";
}

public class OrFilter : ITargetingFilter
{
    private readonly List<ITargetingFilter> _filters;
    public OrFilter(params ITargetingFilter[] filters) => _filters = filters.ToList();
    public bool Matches(Investor i)  => _filters.Any(f => f.Matches(i));
    public string Describe()         => $"({string.Join(" OR ", _filters.Select(f => f.Describe()))})";
}

// "(In US AND > $1B) OR (In EU AND Technology AND > $500M)"
var filter = new OrFilter(
    new AndFilter(new CountryFilter("US"), new AumFilter(1_000_000_000m)),
    new AndFilter(new CountryFilter("EU"), new SectorFilter("Technology"), new AumFilter(500_000_000m))
);

var targets = allInvestors.Where(i => filter.Matches(i)).ToList();
// filter.Describe() → "((Country = US AND AUM >= $1B) OR (Country = EU AND Sector = Technology AND AUM >= $500M))"
```

**Pattern theory:**
```
Intent:    Compose objects into TREE structures representing part-whole hierarchies.
           Clients treat leaves and composites UNIFORMLY — same interface for both.

Key insight: Composite implements the SAME interface as Leaf
             → nest composites inside composites → infinite depth ✅

Real-world uses:
  File system:   File (leaf) + Directory (composite) → both IFileSystemItem
  UI:            Button (leaf) + Panel (composite, has children) → both IComponent
  Menu:          MenuItem (leaf) + SubMenu (composite) → both IMenuComponent

When to use:   ✅ Tree structure — part-whole hierarchy
               ✅ Clients need to treat leaves and groups uniformly
               ✅ Arbitrary nesting (filters, permissions, expressions)
When NOT:      ❌ Fixed depth — simpler approach works
```

---

## 3. Behavioral Patterns

---

### Q12. [Topic: Design Patterns] [EPAM] What is the Observer pattern?

**Problem without Observer in Capital Access:**

```csharp
// Handler coupled to ALL downstream effects ❌
public class CompleteEngagementHandler
{
    private readonly IEngagementRepository _repo;
    private readonly IEmailNotificationService _email;
    private readonly IActivityFeedService _activityFeed;
    private readonly IOwnershipSyncService _ownershipSync;
    private readonly IAuditService _audit; // 5 deps ❌

    public async Task Handle(CompleteEngagementCommand cmd)
    {
        var activity = await _repo.GetByIdAsync(cmd.ActivityId);
        activity!.Complete(cmd.Notes);
        await _repo.SaveAsync();

        await _email.SendCompletionEmailAsync(activity.AttendeeEmails, activity.CompanyId);
        await _activityFeed.RecordCompletionAsync(activity.Id, activity.TenantId);
        await _ownershipSync.SyncEngagementScoreAsync(activity.CompanyId, activity.TenantId);
        await _audit.LogAsync("EngagementCompleted", activity.Id, cmd.RequestedBy);
        // Add Salesforce sync? Modify this class + add 6th dependency ❌
    }
}
```

**How Observer solves it:**

```csharp
// Event (notification) — describes what happened
public record EngagementCompletedEvent(
    Guid ActivityId, string TenantId, string CompanyId,
    string[] AttendeeEmails, string CompletedBy, DateTime CompletedAt) : INotification;

// Handler — ONLY completes engagement + publishes event (2 deps only ✅)
public class CompleteEngagementHandler : IRequestHandler<CompleteEngagementCommand>
{
    private readonly IEngagementRepository _repo;
    private readonly IPublisher _publisher;

    public async Task Handle(CompleteEngagementCommand cmd, CancellationToken ct)
    {
        var activity = await _repo.GetByIdAsync(cmd.ActivityId)
            ?? throw new EngagementNotFoundException(cmd.ActivityId);
        activity.Complete(cmd.Notes);
        await _repo.SaveAsync();

        // Publish — knows NOTHING about who listens ✅
        await _publisher.Publish(new EngagementCompletedEvent(
            activity.Id, activity.TenantId, activity.CompanyId,
            activity.AttendeeEmails, cmd.RequestedBy, DateTime.UtcNow), ct);
    }
}

// Observers — each handles ONE concern independently
public class SendCompletionEmailObserver : INotificationHandler<EngagementCompletedEvent>
{
    public Task Handle(EngagementCompletedEvent e, CancellationToken ct)
        => _email.SendAsync(e.AttendeeEmails, $"Engagement with {e.CompanyId} completed");
}

public class SyncOwnershipScoreObserver : INotificationHandler<EngagementCompletedEvent>
{
    public Task Handle(EngagementCompletedEvent e, CancellationToken ct)
        => _bus.CreateSender("ownership-sync")
               .SendMessageAsync(new ServiceBusMessage(
                   JsonSerializer.Serialize(new { e.CompanyId, e.TenantId })));
}

public class AuditEngagementObserver : INotificationHandler<EngagementCompletedEvent>
{
    public Task Handle(EngagementCompletedEvent e, CancellationToken ct)
        => _audit.LogAsync("EngagementCompleted", e.ActivityId, e.CompletedBy);
}

// Add Salesforce sync: ONE new class, zero changes to handler or other observers ✅
public class SalesforceSyncObserver : INotificationHandler<EngagementCompletedEvent>
{
    public Task Handle(EngagementCompletedEvent e, CancellationToken ct)
        => _salesforce.UpdateEngagementAsync(e.CompanyId, e.CompletedAt);
}
```

**Pattern theory:**
```
Intent:    Define one-to-many dependency: when ONE object changes state,
           ALL dependents notified automatically.

MediatR = built-in Observer implementation for .NET:
  IPublisher.Publish() → routes to ALL INotificationHandler<T> implementations ✅

Push vs Pull:
  PUSH (Capital Access): event carries all data observers need ✅
  PULL: event carries minimal data, observers fetch details themselves

Observer vs Chain of Responsibility:
  Observer: ALL observers receive the event
  Chain:    first handler that CAN process stops the chain

When to use:   ✅ One event causes multiple unrelated effects
               ✅ Effects added/removed independently (different teams own observers)
               ✅ Event-driven architecture — domain events
When NOT:      ❌ Observers must run in specific ORDER (use Chain instead)
               ❌ Only one observer ever — direct call is simpler
```

---

### Q13. [Topic: Design Patterns] [EPAM] What is the Strategy pattern?

**Problem without Strategy in Capital Access:**

```csharp
// Giant if-else grows with every new channel ❌
public async Task NotifyAsync(string userId, string message)
{
    var prefs = await _prefsRepo.GetAsync(userId);
    if (prefs.PreferredChannel == "email")
    {
        // SendGrid-specific code ❌
    }
    else if (prefs.PreferredChannel == "sms")
    {
        // Twilio-specific code ❌
    }
    else if (prefs.PreferredChannel == "teams")
    {
        // Microsoft Graph-specific code ❌
    }
    // Adding WhatsApp → modify this class. Open/Closed violation ❌
}
```

**How Strategy solves it:**

```csharp
// Strategy interface
public interface INotificationStrategy
{
    string ChannelName { get; }
    Task<NotificationResult> SendAsync(NotificationContext context);
}

// Each channel = ONE class, self-contained ✅
public class EmailNotificationStrategy : INotificationStrategy
{
    public string ChannelName => "email";
    public async Task<NotificationResult> SendAsync(NotificationContext ctx)
    {
        var msg = new SendGridMessage();
        msg.SetFrom("noreply@capitalaccess.com");
        msg.AddTo(ctx.Email);
        msg.SetSubject($"Capital Access: {ctx.EventType}");
        msg.AddContent(MimeType.Html, ctx.Message);
        var response = await _client.SendEmailAsync(msg);
        return new NotificationResult(response.IsSuccessStatusCode, "email");
    }
}

public class TeamsNotificationStrategy : INotificationStrategy
{
    public string ChannelName => "teams";
    public async Task<NotificationResult> SendAsync(NotificationContext ctx)
    {
        await _graph.Teams[ctx.TeamsChannelId].Channels["default"]
            .Messages.PostAsync(new ChatMessage { Body = new ItemBody { Content = ctx.Message } });
        return new NotificationResult(true, "teams");
    }
}

// Context — selects strategy at runtime
public class NotificationService
{
    private readonly Dictionary<string, INotificationStrategy> _strategies;

    public NotificationService(IEnumerable<INotificationStrategy> strategies)
        => _strategies = strategies.ToDictionary(s => s.ChannelName);

    public async Task<NotificationResult> NotifyAsync(string userId, string message, string eventType)
    {
        var prefs    = await _prefsRepo.GetAsync(userId);
        var ctx      = new NotificationContext(userId, prefs.Email, prefs.Phone,
                                               prefs.TeamsChannelId, message, eventType);
        if (!_strategies.TryGetValue(prefs.PreferredChannel, out var strategy))
            throw new ArgumentException($"Unknown channel: {prefs.PreferredChannel}");
        return await strategy.SendAsync(ctx);
    }
}

// Adding WhatsApp: one class + one DI registration. Zero other changes. ✅
builder.Services.AddScoped<INotificationStrategy, EmailNotificationStrategy>();
builder.Services.AddScoped<INotificationStrategy, TeamsNotificationStrategy>();
builder.Services.AddScoped<INotificationStrategy, WhatsAppNotificationStrategy>(); // new ✅
```

**Pattern theory:**
```
Intent:    Define a family of algorithms, encapsulate each, make them interchangeable.
           Algorithm varies independently from clients that use it.

Strategy vs Factory:
  Factory:   "Which object to CREATE?" — instantiation decision
  Strategy:  "Which ALGORITHM to RUN at runtime?" — behavioral decision

Strategy vs Template Method:
  Strategy:        COMPOSITION — inject different strategy object at runtime (flexible)
  Template Method: INHERITANCE — subclass overrides specific steps (compile-time)
  Rule: "Favor composition over inheritance" → prefer Strategy when possible

When to use:   ✅ Multiple variants of same algorithm chosen at runtime
               ✅ Class has multiple behaviors appearing as if-else (code smell)
When NOT:      ❌ Only one algorithm — interface adds overhead
               ❌ Algorithms are trivial one-liners — use lambdas
```

---

### Q14. [Topic: Design Patterns] [EPAM] What is the Command pattern?

**Problem without Command in Capital Access:**

```csharp
// Direct calls — no undo, no history ❌
[HttpPost("bulk-reschedule")]
public async Task<IActionResult> BulkReschedule([FromBody] BulkRescheduleDto dto)
{
    foreach (var item in dto.Items)
    {
        var activity = await _repo.GetByIdAsync(item.ActivityId);
        var oldDate  = activity!.ScheduledAt; // lost after update ❌
        activity.ScheduledAt = item.NewDate;
        await _repo.SaveAsync();
        // Admin rescheduled 50 engagements by mistake? No undo. ❌
    }
    return Ok();
}
```

**How Command solves it:**

```csharp
// Command interface — every operation has Execute + Undo
public interface IEngagementCommand
{
    string CommandId { get; }
    string Description { get; }
    Task ExecuteAsync();
    Task UndoAsync();
}

// Concrete command — encapsulates ONE operation + its reversal
public class RescheduleEngagementCommand : IEngagementCommand
{
    private readonly Guid _activityId;
    private readonly DateTime _newDate;
    private DateTime _previousDate; // captured on Execute for undo ✅
    private readonly IEngagementRepository _repo;

    public string CommandId   { get; } = Guid.NewGuid().ToString();
    public string Description => $"Reschedule {_activityId} to {_newDate:d}";

    public async Task ExecuteAsync()
    {
        var activity  = await _repo.GetByIdAsync(_activityId);
        _previousDate = activity!.ScheduledAt; // remember original ✅
        activity.ScheduledAt = _newDate;
        await _repo.SaveAsync();
    }

    public async Task UndoAsync()
    {
        var activity     = await _repo.GetByIdAsync(_activityId);
        activity!.ScheduledAt = _previousDate; // restore ✅
        await _repo.SaveAsync();
    }
}

// Invoker — executes commands, tracks history for undo
public class EngagementCommandInvoker
{
    private readonly Stack<IEngagementCommand> _history = new();

    public async Task ExecuteAsync(IEngagementCommand cmd)
    {
        await cmd.ExecuteAsync();
        _history.Push(cmd);
        _logger.LogInformation("Executed: {Desc} [{Id}]", cmd.Description, cmd.CommandId);
    }

    public async Task UndoLastAsync()
    {
        if (_history.TryPop(out var last))
        {
            await last.UndoAsync();
            _logger.LogInformation("Undone: {Desc}", last.Description);
        }
    }

    public async Task UndoAllAsync()
    {
        while (_history.Count > 0) await UndoLastAsync(); // reverse order ✅
    }
}

[HttpPost("bulk-reschedule")]
public async Task<IActionResult> BulkReschedule([FromBody] BulkRescheduleDto dto)
{
    var commands = dto.Items.Select(i =>
        new RescheduleEngagementCommand(i.ActivityId, i.NewDate, _repo));
    await _invoker.ExecuteBatchAsync(commands);
    return Ok(new { message = $"{dto.Items.Count} rescheduled. POST /undo to revert." });
}

[HttpPost("undo")]
public async Task<IActionResult> Undo()
{
    await _invoker.UndoLastAsync(); // reverses last operation ✅
    return Ok();
}
```

**MediatR = Command pattern:**
```csharp
// IRequest<TResult> = Command interface
// IRequestHandler<T> = executor
// mediator.Send(cmd) = Invoker.Execute(command)
// Pipeline Behaviours = pre/post processing around each command
```

**Pattern theory:**
```
Intent:    Encapsulate a request as an OBJECT — enables queuing, logging, undo/redo.

Four capabilities:
  1. Parameterize: pass command as object — store, pass around, invoke later
  2. Queue:        batch commands, execute delayed
  3. Log:          command history = audit trail
  4. Undo/Redo:    each command knows how to reverse itself

When to use:   ✅ Need undo/redo
               ✅ Need audit trail of all operations
               ✅ Need to queue/batch operations
When NOT:      ❌ Simple one-off operations with no undo requirement
```

---

### Q15. [Topic: Design Patterns] [EPAM] What is the Chain of Responsibility pattern?

**Problem without Chain of Responsibility in Capital Access:**

```csharp
// All validation in ONE action — grows with every new rule ❌
[HttpPost]
public async Task<IActionResult> CreateEngagement([FromBody] CreateEngagementDto dto)
{
    if (!User.Identity!.IsAuthenticated) return Unauthorized();
    var tenantId = User.FindFirst("tenantId")?.Value;
    if (string.IsNullOrEmpty(tenantId)) return Forbid();
    if (!User.IsInRole("IRAdmin")) return Forbid("Insufficient role");
    if (await _rateLimiter.IsExceededAsync(tenantId)) return StatusCode(429);
    if (string.IsNullOrEmpty(dto.CompanyId)) return BadRequest("CompanyId required");
    if (dto.ScheduledAt < DateTime.UtcNow) return BadRequest("Must be future date");
    if (await _repo.HasActiveEngagementAsync(dto.CompanyId, tenantId))
        return Conflict("Already exists");
    // Same 6 checks duplicated in UpdateEngagement, BulkImport, ScheduleReport ❌
    var id = await _engagementService.CreateAsync(dto, tenantId);
    return Created($"/api/engagements/{id}", new { id });
}
```

**How Chain of Responsibility solves it:**

```csharp
// Handler interface — each link in chain has same shape
public abstract class EngagementRequestHandler
{
    private EngagementRequestHandler? _next;

    public EngagementRequestHandler SetNext(EngagementRequestHandler next)
    { _next = next; return next; } // fluent chaining ✅

    public async Task<IActionResult?> HandleAsync(EngagementRequestContext ctx)
    {
        var result = await ProcessAsync(ctx);
        if (result != null) return result;   // handled → stop chain
        return _next != null ? await _next.HandleAsync(ctx) : null;
    }

    protected abstract Task<IActionResult?> ProcessAsync(EngagementRequestContext ctx);
}

// Each handler has ONE responsibility
public class AuthenticationHandler : EngagementRequestHandler
{
    protected override Task<IActionResult?> ProcessAsync(EngagementRequestContext ctx)
        => Task.FromResult<IActionResult?>(
            ctx.User.Identity!.IsAuthenticated ? null : new UnauthorizedResult());
}

public class RateLimitHandler : EngagementRequestHandler
{
    protected override async Task<IActionResult?> ProcessAsync(EngagementRequestContext ctx)
        => await _limiter.IsExceededAsync(ctx.TenantId!) ? new StatusCodeResult(429) : null;
}

public class DuplicateEngagementHandler : EngagementRequestHandler
{
    protected override async Task<IActionResult?> ProcessAsync(EngagementRequestContext ctx)
    {
        var exists = await _repo.HasActiveEngagementAsync(ctx.Dto.CompanyId, ctx.TenantId!);
        return exists ? new ConflictObjectResult("Already exists") : null;
    }
}

// Wire chain and use it
public class EngagementController : ControllerBase
{
    private readonly EngagementRequestHandler _pipeline;

    public EngagementController(AuthenticationHandler auth, TenantClaimHandler tenant,
        RateLimitHandler rateLimit, InputValidationHandler validation,
        DuplicateEngagementHandler duplicate)
    {
        auth.SetNext(tenant).SetNext(rateLimit).SetNext(validation).SetNext(duplicate);
        _pipeline = auth;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEngagementDto dto)
    {
        var ctx = new EngagementRequestContext(User, dto);
        var rejection = await _pipeline.HandleAsync(ctx);
        if (rejection != null) return rejection;
        var id = await _engagementService.CreateAsync(dto, ctx.TenantId!);
        return Created($"/api/engagements/{id}", new { id });
    }
}
```

**ASP.NET Core IS Chain of Responsibility:**
```csharp
// Each middleware is a handler — calls next() to pass down the chain
app.UseExceptionHandler();   // handles? → stop. else → next
app.UseAuthentication();     // handles? → 401. else → next
app.UseAuthorization();      // handles? → 403. else → next
app.MapControllers();        // final handler ✅

// MediatR Pipeline Behaviours — same pattern
// ValidationBehaviour → LoggingBehaviour → AuthBehaviour → Handler ✅
```

**Pattern theory:**
```
Intent:    Pass requests along a CHAIN of handlers. Each handler decides to
           process the request OR pass it to the next handler.

Chain vs Observer:
  Observer: ALL observers receive the event
  Chain:    FIRST handler that matches stops the chain

When to use:   ✅ Multiple sequential checks/validations
               ✅ Set of handlers changes dynamically
               ✅ Request must pass auth → validation → business rules in order
When NOT:      ❌ ALL handlers must always process — use Observer instead
```

---

### Q16. [Topic: Design Patterns] [EPAM] What is the Template Method pattern?

**Problem without Template Method in Capital Access:**

```csharp
// Three generators duplicate the same algorithm skeleton ❌
public class PdfReportGenerator
{
    public async Task<byte[]> GenerateAsync(Guid reportId)
    {
        var data   = await LoadData(reportId);   // DUPLICATE ❌
        var header = BuildHeader(data);           // DUPLICATE ❌
        var content = BuildPdfContent(data);      // PDF-specific
        var footer  = BuildFooter();              // DUPLICATE ❌
        return RenderToBytes(header, content, footer); // DUPLICATE ❌
    }
}
public class ExcelReportGenerator
{
    public async Task<byte[]> GenerateAsync(Guid reportId)
    {
        var data    = await LoadData(reportId);   // DUPLICATE ❌
        var header  = BuildHeader(data);           // DUPLICATE ❌
        var content = BuildExcelContent(data);     // Excel-specific
        var footer  = BuildFooter();               // DUPLICATE ❌
        return RenderToBytes(header, content, footer); // DUPLICATE ❌
    }
}
// Bug in footer → fix in 3 files ❌ New step (watermark) → add to 3 files ❌
```

**How Template Method solves it:**

```csharp
// Base class: algorithm skeleton — shared steps here once ✅
public abstract class ReportGenerator
{
    private readonly IReportDataRepository _repo;
    protected ReportGenerator(IReportDataRepository repo) => _repo = repo;

    // TEMPLATE METHOD — sealed: subclasses cannot change the order ✅
    public sealed async Task<byte[]> GenerateAsync(Guid reportId)
    {
        var data      = await LoadDataAsync(reportId); // shared ✅
        var header    = BuildHeader(data);             // shared ✅
        var content   = await BuildContentAsync(data); // ← subclass fills this
        var watermark = AddWatermark(data);            // hook — optional override
        var footer    = BuildFooter();                 // shared ✅
        return await RenderAsync(header, content, watermark, footer); // shared ✅
    }

    // Shared steps — implemented once
    private async Task<ReportData> LoadDataAsync(Guid id)
    {
        var data = await _repo.GetReportDataAsync(id);
        return data ?? throw new ReportNotFoundException(id);
    }
    private ReportHeader BuildHeader(ReportData d) => new()
        { Title = $"Capital Access — {d.TenantId}", GeneratedAt = DateTime.UtcNow };
    private ReportFooter BuildFooter() => new() { Confidential = true };
    private Task<byte[]> RenderAsync(ReportHeader h, ContentSection c, Watermark? w, ReportFooter f)
        => Task.FromResult(Array.Empty<byte>()); // common renderer

    // ABSTRACT — must be overridden by each subclass
    protected abstract Task<ContentSection> BuildContentAsync(ReportData data);

    // HOOK — optional override, default = no watermark
    protected virtual Watermark? AddWatermark(ReportData data) => null;
}

// Subclasses: ONLY implement what's different ✅
public class PdfReportGenerator : ReportGenerator
{
    private readonly ITextSharpRenderer _renderer;
    public PdfReportGenerator(IReportDataRepository repo, ITextSharpRenderer r) : base(repo)
        => _renderer = r;

    protected override async Task<ContentSection> BuildContentAsync(ReportData data)
    {
        var pdf = await _renderer.RenderAsync(data.Engagements);
        return new PdfContentSection(pdf); // PDF-specific only ✅
    }

    protected override Watermark? AddWatermark(ReportData data)
        => data.IsConfidential ? new Watermark("CONFIDENTIAL") : null; // PDF overrides hook ✅
}

public class ExcelReportGenerator : ReportGenerator
{
    private readonly EpPlusWorkbookFactory _factory;
    public ExcelReportGenerator(IReportDataRepository repo, EpPlusWorkbookFactory f) : base(repo)
        => _factory = f;

    protected override Task<ContentSection> BuildContentAsync(ReportData data)
    {
        var workbook = _factory.Create();
        // populate cells...
        return Task.FromResult<ContentSection>(new ExcelContentSection(workbook.GetAsByteArray()));
        // No watermark override → uses base class default (null) ✅
    }
}
// Bug in footer? Fix once in base class — all three generators fixed. ✅
// New step needed? Add to base class template — all three get it. ✅
```

**Pattern theory:**
```
Intent:    Define the SKELETON of an algorithm in a base class,
           deferring specific steps to subclasses.

Three method types:
  Concrete methods: shared, fully implemented — DO NOT override
  Abstract methods: NO implementation — subclass MUST override (BuildContentAsync)
  Hook methods:     default implementation — subclass CAN override (AddWatermark)

sealed on template method: prevents subclasses from changing the order ✅

Template Method vs Strategy:
  Template Method: INHERITANCE — subclass extends base (compile-time decision)
  Strategy:        COMPOSITION — inject strategy object (runtime decision)
  Rule: if behavior varies PER TYPE (PDF vs Excel) → Template ✅
        if behavior varies PER REQUEST → Strategy ✅

When to use:   ✅ Multiple classes share same algorithm, differ only in specific steps
               ✅ Steps must run in fixed order
When NOT:      ❌ Algorithm varies per request — use Strategy instead
               ❌ Deep inheritance hierarchy — fragile base class risk
```

---

## 5. Code Smells & Anti-Patterns

---

### Q17. [Topic: Design Patterns] [EPAM] What are code smells? Name and explain the most common ones.

Code smells are symptoms of poor design — they don't break code immediately but make it fragile and hard to maintain.

```
God Object:          One class knows/does everything
                     Symptom: EngagementService that validates + notifies + logs + reports
                     Fix: split into focused, single-responsibility classes

Anemic Domain:       Entities are bags of properties, all logic in Service classes
                     Symptom: activity.Status = "Completed" in the service instead of
                              activity.Complete() in the entity
                     Fix: move business rules INTO the entity

Long Method:         Method does too much — hard to name, hard to test
                     Fix: extract smaller, named methods

Long Parameter List: Method with 6+ params
                     Symptom: CreateReport(id, tenantId, format, from, to, null, true, "pdf")
                     Fix: parameter object (Command/DTO) or Builder

Magic Numbers/Strings: if (status == 3) or if (type == "pdf")
                     Fix: enum, named constant

Duplicate Code:      Same logic in 3 places — bug fixed in one, broken in two others
                     Fix: extract to shared method / Repository / base class

Feature Envy:        Method uses another class's data more than its own
                     Symptom: EngagementService.Calculate() reads 5 fields from Activity
                     Fix: move the method INTO Activity

Shotgun Surgery:     One change requires touching 10 files
                     Fix: consolidate related responsibilities

Primitive Obsession: string for email, string for tenantId — no validation guarantee
                     Fix: Value Objects
```

```csharp
// SMELL: Primitive Obsession
public void SendReport(string tenantId, string email) { }
// Is tenantId validated? Is email a real email? No guarantee.

// ✅ Fix: Value Objects
public record TenantId(string Value)
{
    public TenantId(string value) : this(value)
    {
        if (string.IsNullOrEmpty(value) || !value.StartsWith("spg-"))
            throw new ArgumentException($"Invalid TenantId: {value}");
    }
}
public record Email(string Value)
{
    public Email(string value) : this(value)
    {
        if (!value.Contains('@'))
            throw new ArgumentException($"Invalid email: {value}");
    }
}
public void SendReport(TenantId tenantId, Email email) { }
// Self-validating. Type system enforces correctness. ✅
```

**Anti-patterns (wrong solutions applied to real problems):**
```
Singleton Abuse:         Everything is Singleton → hidden global state → untestable
Premature Abstraction:   Add pattern because it "feels right" — not because problem exists
                         Fix: YAGNI — start simple, refactor when pattern earns its place
Copy-Paste Programming:  Same logic in 3 places → bug fixed in one, broken in two
Magic String Factory:    if (type == "pdf") scattered everywhere → typo-prone
```

---

## Pattern Relationships — How They Connect

```
CREATIONAL
  Singleton    ← DI container manages via AddSingleton
  Factory      ← often returns Singleton or Prototype instances
  Builder      ← creates complex objects that contain Strategies
  Prototype    ← clones objects created by Factory
  Abstract Factory ← creates families of objects (Factory of Factories concept)

STRUCTURAL
  Repository   ← Facade over data access; wrapped by Decorator (caching)
  Decorator    ← wraps Repository to add caching/logging transparently
  Facade       ← hides complexity; internally uses multiple Repositories
  Adapter      ← plugs incompatible third-party code into your interfaces
  Proxy        ← same interface; controls access (cache, protect, lazy load)

BEHAVIORAL
  Observer     ← MediatR INotification; Handlers are Observers
  Strategy     ← Factory often creates the right Strategy
  Command      ← MediatR IRequest; Chain of Responsibility in pipeline behaviours
  Chain        ← ASP.NET Core middleware pipeline IS Chain of Responsibility
  Template     ← base class skeleton; Strategies are often preferred alternative

AddSingleton vs Manual Singleton:
  AddSingleton:    testable (swappable in tests), DI-friendly → prefer this in ASP.NET Core
  Manual Singleton: needed outside DI scope (pre-startup, library code, static context)
```
