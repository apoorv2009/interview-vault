# .NET Backend — Interview Preparation

**Project Context**: Capital Access, S&P Global — Azure microservices, .NET 8, C# 12, EF Core 8
**Audience Level**: Senior Developer (5+ years)
**Last Updated**: June 24, 2026

> Every answer is framed through the Capital Access project so you can tell real stories in the interview, not recite textbook definitions.

---

## Table of Contents

1. [OOP Fundamentals](#1-oop-fundamentals)
2. [C# Language Features](#2-c-language-features)
3. [SOLID Principles](#3-solid-principles)
4. [Garbage Collection Deep Dive (Q31–Q54)](#4-garbage-collection-deep-dive)
5. [.NET Core & ASP.NET Core](#5-net-core--aspnet-core)
6. [Entity Framework Core](#6-entity-framework-core)
7. [LINQ](#7-linq)

---

## 1. OOP Fundamentals

---

### Q1. [Topic: OOP] [EPAM] What are the four pillars of OOP? Explain each with a real project example.

The four pillars are **Encapsulation, Abstraction, Inheritance, and Polymorphism**.

---

**Encapsulation** — bundle data and behaviour in one class; hide internal state so it can only be changed through controlled methods.

```csharp
// Capital Access — EngagementActivity in the IR Engagement Service
public class EngagementActivity
{
    public EngagementStatus Status { get; private set; }   // private setter — data protected
    public DateTime? CompletedAt { get; private set; }
    public string? OutcomeNotes { get; private set; }

    // The ONLY way to complete a meeting — rules enforced here
    public void Complete(string outcomeNotes)
    {
        if (Status != EngagementStatus.Scheduled)
            throw new InvalidOperationException("Only scheduled meetings can be completed.");
        if (string.IsNullOrWhiteSpace(outcomeNotes))
            throw new ArgumentException("Outcome notes are required.");

        Status = EngagementStatus.Completed;
        CompletedAt = DateTime.UtcNow;   // set together atomically — no broken state
        OutcomeNotes = outcomeNotes;
    }
}

// Without encapsulation — broken state is possible:
activity.Status = EngagementStatus.Completed; // ❌ compiler error — private setter
activity.CompletedAt = null;                  // ❌ can't touch directly
```

> **Interview line**: "In our Engagement Service, EngagementActivity has private setters on all state fields. The only way to mark a meeting completed is through `Complete()`, which enforces outcome notes are present and sets the timestamp atomically. This prevents broken state like a meeting marked completed with no timestamp."

---

**Abstraction** — hide implementation complexity; expose only what the caller needs to know.

```csharp
// Capital Access — INotificationSender abstracts email vs in-app delivery
public interface INotificationSender
{
    Task SendAsync(string recipientId, string message); // caller only sees this
}

public class EmailNotificationSender : INotificationSender
{
    public async Task SendAsync(string recipientId, string message)
    {
        // SMTP setup, HTML template rendering, retry logic, bounce handling — all hidden
    }
}

public class InAppNotificationSender : INotificationSender
{
    public async Task SendAsync(string recipientId, string message)
    {
        // SignalR hub call, delivery tracking, read receipts — all hidden
    }
}

// Caller — no idea it's email or in-app
public class OwnershipAlertHandler
{
    private readonly INotificationSender _sender;

    public async Task Notify(string userId, string message)
    {
        await _sender.SendAsync(userId, message); // same call regardless of channel
    }
}
```

> **Interview line**: "We abstract notification delivery behind INotificationSender. The handler that reacts to ownership change events calls SendAsync and has no idea whether it triggers an email or an in-app notification. Adding a new delivery channel means writing a new implementation — nothing else changes."

---

**Inheritance** — a child class inherits fields and behaviour from a parent; avoids repeating common code.

```csharp
// Capital Access — BaseEntity carries fields every entity needs
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public string TenantId { get; protected set; } = string.Empty;
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; protected set; } = DateTime.UtcNow;
    public bool IsDeleted { get; protected set; }

    public void SoftDelete()
    {
        IsDeleted = true;
        UpdatedAt = DateTime.UtcNow;
    }
}

// Children inherit everything — no repetition
public class EngagementActivity : BaseEntity
{
    public ActivityType ActivityType { get; private set; }
    public EngagementStatus Status { get; private set; }
    // Id, TenantId, CreatedAt, UpdatedAt, IsDeleted, SoftDelete() — all inherited ✅
}

public class FollowUpTask : BaseEntity
{
    public string TaskType { get; private set; }
    public DateTime DueDate { get; private set; }
    // Same inherited fields — without repeating them ✅
}
```

> **Interview line**: "Every entity in our Engagement Service inherits from BaseEntity, which provides Id, TenantId, timestamps, and SoftDelete(). This is also why our EF Core global query filters work uniformly — IsDeleted and TenantId are always present on every entity."

---

**Polymorphism** — one interface, many implementations; same method call behaves differently at runtime.

Two types:
- **Runtime polymorphism** (overriding) — child overrides parent's virtual method; resolved at runtime
- **Compile-time polymorphism** (overloading) — same method name, different parameters; resolved at compile time

```csharp
// Capital Access — runtime polymorphism in the Report Worker
public interface IReportGenerator
{
    string Format { get; }
    Task<byte[]> GenerateAsync(ReportData data);
}

public class PdfReportGenerator : IReportGenerator
{
    public string Format => "pdf";
    public async Task<byte[]> GenerateAsync(ReportData data) { /* QuestPDF logic */ }
}

public class ExcelReportGenerator : IReportGenerator
{
    public string Format => "excel";
    public async Task<byte[]> GenerateAsync(ReportData data) { /* EPPlus logic */ }
}

// Orchestrator — same call, different behaviour at runtime
public class ReportOrchestrator
{
    private readonly IEnumerable<IReportGenerator> _generators;

    public async Task<byte[]> GenerateAsync(ReportData data, string format)
    {
        var generator = _generators.First(g => g.Format == format);
        return await generator.GenerateAsync(data); // polymorphic — no if/else ✅
    }
}

// Compile-time polymorphism (overloading):
public class EngagementRepository
{
    public Task<EngagementActivity?> GetByIdAsync(Guid id) { ... }
    public Task<EngagementActivity?> GetByIdAsync(Guid id, string tenantId) { ... }
    public Task<List<EngagementActivity>> GetByIdAsync(List<Guid> ids) { ... }
}
```

> **Interview line**: "In our Report Worker, we use runtime polymorphism through IReportGenerator. The orchestrator calls GenerateAsync() without any if/else for PDF vs Excel — the DI container resolves the correct implementation. Adding CSV means adding a new class. The orchestrator doesn't change."

---

### Q2. [Topic: OOP] [EPAM] Why do Encapsulation and Abstraction sound similar? What is the real difference?

Both involve "hiding" something — but they hide different things.

| | What it hides | Purpose |
|---|---|---|
| **Encapsulation** | **Data** (fields, internal state) | Protect state — control WHO can read/write it |
| **Abstraction** | **Complexity** (how it works) | Simplify the interface — control WHAT the caller needs to know |

**ATM analogy:**
- **Encapsulation** → your PIN and account balance are private data sealed inside the bank's system. You cannot touch the balance field directly — you use controlled methods (withdraw, deposit).
- **Abstraction** → when you press "Withdraw ₹5000", the SMTP calls, fraud checks, ledger updates, and cash dispenser logic are all hidden from you. You only see the button.

**In the same class — both happen simultaneously:**
```csharp
public class EngagementActivity
{
    private string _outcomeNotes;         // Encapsulation: data is private

    public void Complete(string notes)
    {
        ValidateNotes(notes);             // Abstraction: caller doesn't know about validation
        _outcomeNotes = notes;
        Status = EngagementStatus.Completed;
    }

    private void ValidateNotes(string notes) { ... } // hidden complexity
}
```

`_outcomeNotes` is encapsulation (data protection). `ValidateNotes` being private is abstraction (complexity hiding). Same class, two different things hidden.

> **Interview line**: "Encapsulation hides data — who can read or write internal state. Abstraction hides implementation — what complexity the caller needs to understand. They feel similar because both hide something. In EngagementActivity, private setters are encapsulation, and the Complete() method hiding its validation rules is abstraction."

---

### Q3. [Topic: OOP] [EPAM] When do you use an Abstract Class vs an Interface?

| | Abstract Class | Interface |
|---|---|---|
| Has fields? | Yes | No |
| Has method bodies? | Yes (`virtual` methods) | Yes (default implementations, C# 8+) |
| Has constructors? | Yes | No |
| Multiple inheritance? | No — one parent class only | Yes — implement many interfaces |
| Use when | Shared implementation + common base behaviour | Pure contract / capability across unrelated classes |

```csharp
// ABSTRACT CLASS — shared implementation for related classes
public abstract class BaseAzureService
{
    protected readonly ILogger _logger;
    protected readonly string _tenantId;

    protected BaseAzureService(ILogger logger, ICurrentTenantService tenantService)
    {
        _logger = logger;
        _tenantId = tenantService.TenantId; // shared setup all services need
    }

    protected void LogServiceCall(string operation)
        => _logger.LogInformation("[{Tenant}] {Operation}", _tenantId, operation);

    public abstract Task<bool> HealthCheckAsync(); // each service implements its own
}

public class EngagementService : BaseAzureService
{
    public override async Task<bool> HealthCheckAsync()
        => await _context.Database.CanConnectAsync();
}

// INTERFACE — capability shared by unrelated classes
public interface IExportable
{
    Task<byte[]> ExportAsync(ExportFormat format);
}

public class EngagementActivity : BaseEntity, IExportable { ... }  // entity
public class OwnershipReport : IExportable { ... }                 // report — unrelated to entity
```

> **Rule**: use abstract class when multiple related classes share real code. Use interface when expressing a capability that unrelated classes can implement.

---

## 3. SOLID Principles

---

### Q4. [Topic: SOLID] [EPAM] Explain the Single Responsibility Principle with a real example.

**Definition**: A class should have one job and one reason to change.

```csharp
// ❌ Violates SRP — one class does database work, email, Service Bus, and logging
public class EngagementService
{
    public async Task CompleteActivityAsync(Guid id, string notes)
    {
        var activity = await _context.EngagementActivities.FindAsync(id); // DB
        activity.Complete(notes);
        await _context.SaveChangesAsync();

        var smtp = new SmtpClient("smtp.sendgrid.com");                   // Email
        await smtp.SendMailAsync(...);

        var sbClient = new ServiceBusClient(connectionString);            // Service Bus
        await sbClient.SendMessageAsync(...);

        File.AppendAllText("audit.log", $"{id} completed");              // Logging
    }
}
// Changes when: DB schema changes, email provider changes, Service Bus changes, log format changes
// Four reasons to change = four responsibilities
```

```csharp
// ✅ SRP — each class has exactly one job
public class EngagementService        // job: business logic only
{
    public async Task CompleteActivityAsync(Guid id, string notes)
    {
        var activity = await _repo.GetByIdAsync(id);
        activity.Complete(notes);
        await _repo.SaveAsync();
        await _publisher.PublishAsync(new EngagementCompletedEvent(id));
    }
}

public class EngagementRepository     // job: data access only
public class ServiceBusEventPublisher // job: event publishing only
public class NotificationService      // job: notification sending only
```

> **Interview line**: "In our Engagement Service we split the work into focused classes: the service owns business logic, a repository owns data access, a publisher owns Service Bus events, and a notification service owns email. When SendGrid changed their API, we updated exactly one class. Nothing else changed."

---

### Q5. [Topic: SOLID] [EPAM] Explain the Open/Closed Principle with a real example.

**Definition**: Open for extension, closed for modification. Add new behaviour by writing new code — not by editing existing code.

```csharp
// ❌ Violates OCP — every new format requires editing this class
public class ReportWorker
{
    public async Task<byte[]> GenerateAsync(ReportData data, string format)
    {
        if (format == "pdf")   { /* PDF logic */ }
        else if (format == "excel") { /* Excel logic */ }
        else if (format == "csv")   { /* CSV — must edit class again */ }
        // Grows forever — every addition risks breaking existing formats
    }
}
```

```csharp
// ✅ OCP — add a new format by adding a new class, touching nothing existing
public interface IReportGenerator
{
    string Format { get; }
    Task<byte[]> GenerateAsync(ReportData data);
}

public class PdfReportGenerator   : IReportGenerator { public string Format => "pdf";   ... }
public class ExcelReportGenerator : IReportGenerator { public string Format => "excel"; ... }
public class CsvReportGenerator   : IReportGenerator { public string Format => "csv";   ... } // new ✅

// Orchestrator never changes regardless of how many formats are added
public class ReportOrchestrator
{
    private readonly IEnumerable<IReportGenerator> _generators;

    public async Task<byte[]> GenerateAsync(ReportData data, string format)
        => await _generators.First(g => g.Format == format).GenerateAsync(data);
}

// Only change needed: one new line in Program.cs
builder.Services.AddScoped<IReportGenerator, CsvReportGenerator>();
```

OCP also applies at the architecture level: when we needed the Engagement Service to react to `OwnershipChanged` events, we added a new Service Bus subscription. The Ownership Service that publishes the event was not modified at all.

> **Interview line**: "OCP is why our Service Bus Topic pattern scales well. Adding a new subscriber means creating a new subscription — the publisher never changes. Same principle in the Report Worker — CSV support was a new class, not an edit to existing code."

---

### Q6. [Topic: SOLID] Explain the Liskov Substitution Principle with a real example.

**Definition**: Objects of a child class must be substitutable for objects of the parent class without breaking the application. Children must honour the parent's full contract.

```csharp
// ❌ Violates LSP — child breaks the parent's contract
public class RestrictedReportGenerator : IReportGenerator
{
    public string Format => "pdf";
    public async Task<byte[]> GenerateAsync(ReportData data)
    {
        if (data.CompanyId != "AAPL")
            throw new NotSupportedException("Only AAPL supported"); // surprise!
        return pdfBytes;
    }
}
// ReportOrchestrator trusts any IReportGenerator works for any company.
// This child breaks that trust — swapping it in breaks the system.

// LSP violation test: if a child throws NotImplementedException or adds
// hidden restrictions the parent contract doesn't declare → LSP violation.
```

```csharp
// ✅ LSP — every implementation honours the full contract
public class PdfReportGenerator : IReportGenerator
{
    public string Format => "pdf";
    public async Task<byte[]> GenerateAsync(ReportData data)
    {
        // Works for ANY valid ReportData — no hidden restrictions ✅
    }
}

// INotificationSender LSP example:
INotificationSender s1 = new EmailNotificationSender();
INotificationSender s2 = new InAppNotificationSender();

await s1.SendAsync("user-1", "Ownership alert"); // ✅
await s2.SendAsync("user-1", "Ownership alert"); // ✅ — fully interchangeable
```

> **Interview line**: "LSP is what makes our DI container trustworthy. When the orchestrator gets an IReportGenerator, it expects it to handle any valid report request. If a child class throws for certain inputs the interface contract doesn't warn about, you've introduced a hidden landmine."

---

### Q7. [Topic: SOLID] Explain the Interface Segregation Principle with a real example.

**Definition**: Don't force a class to implement methods it doesn't need. Split fat interfaces into small, focused ones.

```csharp
// ❌ Violates ISP — one fat interface forces all consumers to implement everything
public interface IReportService
{
    Task<byte[]> GenerateAsync(ReportData data);      // Report Worker needs this
    Task<JobStatus> GetStatusAsync(Guid jobId);        // Angular UI needs this
    Task<string> GetDownloadUrlAsync(Guid jobId);      // Angular UI needs this
    Task SendByEmailAsync(Guid jobId, string email);   // Email job needs this
    Task ArchiveAsync(Guid jobId);                     // Cleanup job needs this
}

// Report Worker only generates — forced to stub 4 methods it never uses:
public class ReportWorker : IReportService
{
    public Task<byte[]> GenerateAsync(ReportData data) { /* real work */ }
    public Task<JobStatus> GetStatusAsync(Guid jobId) => throw new NotImplementedException();
    public Task<string> GetDownloadUrlAsync(Guid jobId) => throw new NotImplementedException();
    public Task SendByEmailAsync(Guid jobId, string email) => throw new NotImplementedException();
    public Task ArchiveAsync(Guid jobId) => throw new NotImplementedException();
}
```

```csharp
// ✅ ISP — split into focused interfaces, each consumer depends on only what it needs
public interface IReportGenerator    { Task<byte[]> GenerateAsync(ReportData data); }
public interface IReportStatusProvider { Task<JobStatus> GetStatusAsync(Guid jobId); Task<string> GetDownloadUrlAsync(Guid jobId); }
public interface IReportEmailSender  { Task SendByEmailAsync(Guid jobId, string email); }

public class ReportWorker : IReportGenerator          // only what it needs ✅
{
    public Task<byte[]> GenerateAsync(ReportData data) { /* real work */ }
}

public class ReportController : IReportStatusProvider // only what it needs ✅
{
    public Task<JobStatus> GetStatusAsync(Guid jobId) { ... }
    public Task<string> GetDownloadUrlAsync(Guid jobId) { ... }
}
```

> **Interview line**: "We hit an ISP violation early when a single IReportService interface bundled generation, status checking, download, and archiving. The Report Worker only generates — it was forced to stub four methods. We split it into three focused interfaces. Each class now depends on exactly the surface it needs."

---

### Q8. [Topic: SOLID] [EPAM] Explain the Dependency Inversion Principle with a real example.

**Definition**: High-level modules should not depend on low-level modules. Both should depend on abstractions (interfaces). Dependencies should be injected, not created.

```csharp
// ❌ Violates DIP — high-level class hardwired to concrete low-level classes
public class EngagementService
{
    private readonly SqlEngagementRepository _repo     = new SqlEngagementRepository();
    private readonly SmtpNotificationSender  _notifier = new SmtpNotificationSender();
    private readonly ServiceBusEventPublisher _pub     = new ServiceBusEventPublisher();
    // Changing email provider or DB → must edit EngagementService
}
```

```csharp
// ✅ DIP — depend on abstractions; concrete classes injected from outside
public class EngagementService
{
    private readonly IEngagementRepository _repo;
    private readonly INotificationSender   _notifier;
    private readonly IEventPublisher       _publisher;

    public EngagementService(
        IEngagementRepository repo,
        INotificationSender notifier,
        IEventPublisher publisher)
    {
        _repo = repo; _notifier = notifier; _publisher = publisher;
    }

    public async Task CompleteActivityAsync(Guid id, string notes)
    {
        var activity = await _repo.GetByIdAsync(id);
        activity.Complete(notes);
        await _repo.SaveAsync();
        await _notifier.SendAsync(...);
        await _publisher.PublishAsync(...);
    }
}

// Wiring in ONE place — Program.cs
builder.Services.AddScoped<IEngagementRepository, SqlEngagementRepository>();
builder.Services.AddScoped<INotificationSender,   EmailNotificationSender>();
builder.Services.AddScoped<IEventPublisher,        ServiceBusEventPublisher>();

// Switch to SendGrid? One line change in Program.cs. EngagementService never changes.
```

> **Interview line**: "DIP is exactly what .NET's built-in DI container implements. EngagementService depends on IEngagementRepository and INotificationSender — not on SqlEngagementRepository or SmtpSender. The wiring lives in Program.cs. When we changed notification providers, we wrote a new class and updated one line in Program.cs. The service didn't need to know."

---

### Q9. [Topic: SOLID] [EPAM] How does the Dependency Inversion Principle make unit testing better?

**Core problem without DIP**: if a class creates its own dependencies, you cannot isolate it in a test.

```csharp
// Without DIP — test requires real SQL Server, real email, real Service Bus
public class EngagementService
{
    private readonly SqlEngagementRepository _repo = new SqlEngagementRepository();
    // constructor creates real dependencies → test cannot substitute them
}

[Test]
public async Task CompleteActivity_ShouldSetStatus()
{
    var service = new EngagementService();
    // ❌ This test hits a real database, sends a real email, publishes a real event
    // Slow, flaky, needs infrastructure, has side effects
}
```

**With DIP — inject fakes in tests:**

```csharp
// Option 1: Hand-written fakes
public class FakeEngagementRepository : IEngagementRepository
{
    private readonly List<EngagementActivity> _store = new();
    public void Seed(EngagementActivity a) => _store.Add(a);
    public Task<EngagementActivity?> GetByIdAsync(Guid id) => Task.FromResult(_store.FirstOrDefault(a => a.Id == id));
    public Task SaveAsync() => Task.CompletedTask; // does nothing ✅
}

public class FakeNotificationSender : INotificationSender
{
    public List<string> SentMessages { get; } = new();
    public Task SendAsync(string userId, string msg) { SentMessages.Add(msg); return Task.CompletedTask; }
}

[Test]
public async Task CompleteActivity_ShouldSetStatusToCompleted()
{
    var repo      = new FakeEngagementRepository();
    var notifier  = new FakeNotificationSender();
    var publisher = new FakeEventPublisher();

    var activity = new EngagementActivity(Guid.NewGuid(), "tenant-abc", ActivityType.Roadshow);
    repo.Seed(activity);

    var service = new EngagementService(repo, notifier, publisher);
    await service.CompleteActivityAsync(activity.Id, "Great meeting with BlackRock");

    Assert.AreEqual(EngagementStatus.Completed, activity.Status); // ✅
    Assert.Single(notifier.SentMessages);                         // ✅
    // No SQL, no email, no Service Bus — runs in milliseconds ✅
}
```

```csharp
// Option 2: Moq — generates fakes automatically
[Test]
public async Task CompleteActivity_ShouldPublishEvent()
{
    var mockRepo      = new Mock<IEngagementRepository>();
    var mockNotifier  = new Mock<INotificationSender>();
    var mockPublisher = new Mock<IEventPublisher>();

    var activity = new EngagementActivity(Guid.NewGuid(), "tenant-abc", ActivityType.NDR);
    mockRepo.Setup(r => r.GetByIdAsync(activity.Id)).ReturnsAsync(activity);

    var service = new EngagementService(mockRepo.Object, mockNotifier.Object, mockPublisher.Object);
    await service.CompleteActivityAsync(activity.Id, "Strong interest from Vanguard");

    mockPublisher.Verify(p => p.PublishAsync(It.IsAny<EngagementCompletedEvent>()), Times.Once);
    mockRepo.Verify(r => r.SaveAsync(), Times.Once);
}
```

```csharp
// Option 3: EF Core InMemory provider — for testing repositories directly
[Test]
public async Task Repository_ShouldReturnActivity_ForCurrentTenant()
{
    var options = new DbContextOptionsBuilder<EngagementDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()) // fresh DB per test
        .Options;

    using var context = new EngagementDbContext(options, new FakeTenantService("tenant-abc"));
    context.EngagementActivities.Add(new EngagementActivity(Guid.NewGuid(), "tenant-abc", ActivityType.Roadshow));
    await context.SaveChangesAsync();

    var repo = new EngagementRepository(context);
    var result = await repo.GetByIdAsync(activity.Id);

    Assert.NotNull(result);
    Assert.AreEqual("tenant-abc", result.TenantId); // global filter enforced ✅
}
```

```
WITHOUT DIP:                          WITH DIP:
  Class creates SqlRepository    →     Inject FakeRepo / Mock
  Class creates SmtpSender       →     Inject FakeNotifier / Mock
  Class creates ServiceBusClient →     Inject FakePublisher / Mock
  Test needs real infrastructure       Test runs in milliseconds
  Slow, flaky, has side effects        Fast, isolated, no side effects
```

> **Interview line**: "DIP is the design principle that makes unit testing practical. EngagementService depends on interfaces, not on concrete SQL or SMTP classes. In production the DI container wires in real implementations. In tests we inject fakes or Moq mocks. The test never touches a database or network. It runs in milliseconds and proves business logic is correct in complete isolation."

---

### SOLID — Quick Reference Table

| Principle | One Line | Capital Access Hook |
|---|---|---|
| **S**ingle Responsibility | One class, one reason to change | Service / Repository / Publisher / Notification each own their own job |
| **O**pen/Closed | Extend by adding, not editing | New report format = new class, not editing ReportOrchestrator |
| **L**iskov Substitution | Children must honour parent's contract | Any IReportGenerator works for any valid report request |
| **I**nterface Segregation | Small focused interfaces, not fat ones | IReportGenerator / IReportStatusProvider / IReportEmailSender |
| **D**ependency Inversion | Depend on interfaces, wire in Program.cs | EngagementService → IEngagementRepository, swappable in tests |

---

## 2. C# Language Features

---

### Q10. [Topic: C#] [EPAM] What is the difference between Value Types and Reference Types?

| | Value Type | Reference Type |
|---|---|---|
| Stored on | Stack (usually) | Heap |
| Copied by | Value — independent copy | Reference — both point to same object |
| Examples | `int`, `bool`, `decimal`, `struct`, `DateTime`, `Guid` | `class`, `string`, `array`, `List<T>` |
| Null by default? | No (use `int?` to allow null) | Yes |

```csharp
// VALUE TYPE — copied by value
int a = 10;
int b = a;   // b is an independent copy
b = 99;
Console.WriteLine(a); // 10 — a is unchanged ✅

// REFERENCE TYPE — copied by reference
var activity1 = new EngagementActivity(id, "tenant-abc");
var activity2 = activity1;  // both point to the SAME object on heap
activity2.Status = EngagementStatus.Completed;
Console.WriteLine(activity1.Status); // Completed — same object was modified ❗

// STRING — special: reference type but IMMUTABLE
string a = "hello";
string b = a;
b = "world";             // creates a NEW string object — does NOT modify a
Console.WriteLine(a);    // "hello" — original unchanged ✅
// This is why string concatenation in a loop is expensive — creates new objects constantly
```

**struct vs class:**
```csharp
// struct = value type — use for small, immutable, data-only objects
public struct Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; }
}

Money price1 = new Money { Amount = 100m, Currency = "USD" };
Money price2 = price1;  // independent copy — no shared state

// Capital Access: we use struct for small value objects like Money, Coordinates
// We use class for entities like EngagementActivity (need identity, heap lifetime)
```

> **Interview line**: "Value types live on the stack and are copied by value — changing one copy doesn't affect another. Reference types live on the heap and are copied by reference — two variables can point to the same object. The practical implication in Capital Access is that all our entities are classes. We use structs only for small immutable value objects like money amounts."

---

### Q11. [Topic: C#] [EPAM] What are Generics? Why are they important?

Generics let you write code that works with any type while remaining type-safe. The type is specified at usage time, not definition time.

```csharp
// Without generics — must use object → boxing + casting → not type-safe
public object GetById(int id) { ... }
var activity = (EngagementActivity)GetById(1); // cast can fail at runtime ❌

// With generics — type-safe, no boxing, compiler checks everything
public async Task<T?> GetByIdAsync<T>(Guid id) where T : BaseEntity
{
    return await _context.Set<T>().FindAsync(id);
}

// Usage — type is specified by caller
var activity = await GetByIdAsync<EngagementActivity>(activityId);  // ✅ typed
var task     = await GetByIdAsync<FollowUpTask>(taskId);             // ✅ typed

// Generic constraints — T must be a BaseEntity (has Id, TenantId etc.)
where T : BaseEntity          // must inherit BaseEntity
where T : class               // must be a reference type
where T : new()               // must have parameterless constructor
where T : IReportGenerator    // must implement interface
```

**Generic classes — Capital Access examples:**

```csharp
// Generic API response wrapper
public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? ErrorMessage { get; init; }

    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResponse<T> Fail(string error) => new() { Success = false, ErrorMessage = error };
}

// Works for any type
ApiResponse<EngagementActivity> response = ApiResponse<EngagementActivity>.Ok(activity);
ApiResponse<List<ReportJob>>    jobs     = ApiResponse<List<ReportJob>>.Ok(jobList);
```

> **Interview line**: "Generics are how we avoid the object-casting trap. Our ApiResponse<T> wrapper works for any type the controller returns. EF Core's DbSet<T> is a generic — _context.Set<T>() gives us type-safe access to any entity. Without generics you'd cast from object and lose compile-time safety."

---

### Q12. [Topic: C#] [EPAM] What are Nullable types? How do you handle null safely in C#?

```csharp
// Nullable reference types (C# 8+, enabled in .NET 6+)
// string  = NOT nullable — compiler warns if you assign null
// string? = nullable — you're explicitly saying null is valid

public async Task<EngagementActivity?> GetByIdAsync(Guid id) // ? = may return null
{
    return await _context.EngagementActivities.FindAsync(id);
}

// Null-conditional operator ?.  — short-circuits to null if left side is null
string? notes = activity?.OutcomeNotes;      // null if activity is null
int?    count = activity?.Attendees?.Count;  // null if activity or Attendees is null

// Null-coalescing operator ?? — provide a default when null
string display = activity?.CompanyId ?? "Unknown Company";

// Null-coalescing assignment ??= — assign only if currently null
activity.OutcomeNotes ??= "No notes provided";

// Null-forgiving operator ! — tell compiler "I know this isn't null"
// Use sparingly — removes compiler protection
var activity = await GetByIdAsync(id);
activity!.Complete(notes);  // you're asserting activity is not null

// Pattern matching null check (preferred over == null)
if (activity is null)
    return NotFound();

if (activity is not null)
    activity.Complete(notes);
```

> **Interview line**: "We enable nullable reference types in all our services. GetByIdAsync returns EngagementActivity? — the question mark is a contract saying null is possible. The caller must handle it. We use ?. for safe navigation, ?? for defaults, and 'is null' pattern matching for guards. The compiler catches unhandled nulls before they become NullReferenceExceptions in production."

---

### Q13. [Topic: C#] [EPAM] What is Boxing and Unboxing? Why is it a performance concern?

```csharp
// BOXING — wrapping a value type in a reference type (object)
// Value leaves the stack → copied to the heap → wrapped in object shell
int score = 92;
object boxed = score;   // int is BOXED → heap allocation + GC pressure

// UNBOXING — extracting the value type back from the object
int unboxed = (int)boxed;            // explicit cast required
int wrong   = (string)boxed;        // ❌ InvalidCastException at runtime

// Why it's a problem — in tight loops (Hashtable, old ArrayList)
Hashtable oldCache = new Hashtable();
oldCache["AAPL"] = 92.5;            // decimal BOXED → heap allocation
double score = (double)oldCache["AAPL"]; // UNBOXED → another allocation

// ✅ Fix — use generics, no boxing
Dictionary<string, double> cache = new();
cache["AAPL"] = 92.5;               // no boxing — stored as double directly
double score = cache["AAPL"];       // no unboxing — already typed

// Capital Access: we never use Hashtable or ArrayList
// All collections are generic → Dictionary<K,V>, List<T>, HashSet<T>
// EF Core entities are typed → no boxing anywhere in the data layer
```

> **Interview line**: "Boxing happens when a value type gets stored as object — it moves from stack to heap and the GC must track it. The classic example is the old Hashtable which stored everything as object. We use generic Dictionary<K,V> everywhere, so decimal scores stay as decimal — no boxing, no unnecessary heap allocations."

---

### Q14. [Topic: C#] [EPAM] Explain the main collection types and when to use each.

**Array vs List\<T> vs LinkedList\<T>:**

```csharp
// ARRAY — fixed size, fastest random access O(1)
byte[] rowVersion = new byte[8];        // EF Core concurrency token — fixed size ✅
int[] scores = new int[5];              // size fixed at creation

// LIST<T> — dynamic size, O(1) amortised add, O(1) random access
var attendees = new List<AttendeeRecord>();
attendees.Add(new AttendeeRecord(...));    // grows automatically
attendees[2];                             // O(1) index access

// Pre-size if count is known — avoids internal array resizing
var results = new List<EngagementSummaryDto>(2500);

// Expose as read-only from entities — prevent external mutation
public IReadOnlyCollection<AttendeeRecord> Attendees => _attendees.AsReadOnly();

// LINKEDLIST<T> — O(1) insert/remove anywhere, O(n) random access
var pipeline = new LinkedList<ReportStep>();
pipeline.AddFirst(new ReportStep("Validate")); // O(1) — add to front
pipeline.Remove(someStep);                     // O(1) — relink pointers
// Use when: frequent insert/remove in middle. Rare in Capital Access.
```

**Dictionary\<K,V> vs Hashtable:**

```csharp
// DICTIONARY<K,V> — generic, type-safe, O(1) average get/set
var targetingCache = new Dictionary<string, TargetingScore>();
targetingCache["AAPL"] = new TargetingScore(92.5);

// Always use TryGetValue — avoids KeyNotFoundException
if (targetingCache.TryGetValue("AAPL", out var score))
    return score; // key found ✅

// HASHTABLE — old, non-generic, boxes value types. Avoid in new code.
Hashtable old = new Hashtable();
old["AAPL"] = 92.5;              // double BOXED ❌
double s = (double)old["AAPL"]; // unboxed + cast required ❌
```

**HashSet\<T> — fast existence checks, no duplicates, O(1) lookup:**

```csharp
// Capital Access — idempotency guard in Notifications Service
// Service Bus delivers at-least-once → prevent duplicate alerts
var processedEventIds = new HashSet<Guid>();

public async Task HandleOwnershipChangedEvent(OwnershipChangedEvent e)
{
    if (!processedEventIds.Add(e.EventId)) // Add returns false if already present
        return; // duplicate — skip ✅

    await _notificationSender.SendAsync(e.UserId, "Ownership changed");
}

// O(1) vs List.Contains which is O(n)
list.Contains(eventId);  // O(n) — scans every item ❌
set.Contains(eventId);   // O(1) — hash lookup ✅
```

**Queue\<T> and Stack\<T>:**

```csharp
// QUEUE — FIFO (First In, First Out)
var reportQueue = new Queue<ReportJob>();
reportQueue.Enqueue(new ReportJob("AAPL")); // add to back
reportQueue.Enqueue(new ReportJob("MSFT"));
var job = reportQueue.Dequeue(); // removes from FRONT → AAPL (first in, first out)
// Capital Access: mirrors Azure Service Bus Queue — fair processing order

// STACK — LIFO (Last In, First Out)
var navHistory = new Stack<string>();
navHistory.Push("/targeting");
navHistory.Push("/contacts");
var current = navHistory.Pop(); // "/contacts" — last in, first out
// Capital Access: browser back button history, undo/redo for IR notes
```

**ConcurrentDictionary — thread-safe cache:**

```csharp
// Regular Dictionary is NOT thread-safe — multiple threads = race condition → crash
// ConcurrentDictionary — built-in fine-grained locking per bucket

private readonly ConcurrentDictionary<string, TenantFeatureFlags> _cache = new();

// GetOrAdd — atomic: get if exists, add if not — no race condition
var flags = _cache.GetOrAdd(
    tenantId,
    id => LoadFlagsFromDatabase(id)); // factory called only if key missing ✅

// Capital Access: tenant feature flag cache — read on every request
// ConcurrentDictionary allows safe concurrent reads AND writes
```

**IEnumerable vs ICollection vs IList vs IQueryable — the hierarchy:**

```csharp
// IEnumerable<T> — just iteration. Forward-only. Lazy.
// Use as parameter type when you only need foreach.
public void Export(IEnumerable<EngagementActivity> activities) { foreach ... }

// ICollection<T> — adds Count, Add, Remove, Contains
public void Merge(ICollection<AttendeeRecord> target) { target.Count; target.Add(...); }

// IList<T> — adds index access [i], Insert, RemoveAt
public AttendeeRecord GetPrimary(IList<AttendeeRecord> list) => list[0];

// IQueryable<T> — THE critical one for EF Core
// Builds an expression tree → translated to SQL — NOT executed in memory

// ❌ IEnumerable: loads ALL rows from DB first, then filters in C#
IEnumerable<EngagementActivity> all = _context.EngagementActivities.AsEnumerable();
var completed = all.Where(e => e.Status == EngagementStatus.Completed);
// SELECT * FROM EngagementActivities → 2.5M rows → filter in memory ❌

// ✅ IQueryable: WHERE clause goes to SQL — only matching rows returned
IQueryable<EngagementActivity> query = _context.EngagementActivities;
var completed = query.Where(e => e.Status == EngagementStatus.Completed);
// SELECT * FROM EngagementActivities WHERE Status = 'Completed' ✅
await completed.ToListAsync(); // SQL executes HERE

// Build queries step by step — SQL runs only at ToList/FirstOrDefault
IQueryable<EngagementActivity> q = _context.EngagementActivities
    .Where(e => e.CompanyId == companyId);
if (filter.HasValue)
    q = q.Where(e => e.ActivityType == filter.Value); // still no SQL yet
return await q.AsNoTracking().ToListAsync();           // SQL runs here ✅
```

| | `Array` | `List<T>` | `Dictionary<K,V>` | `HashSet<T>` | `ConcurrentDictionary` |
|---|---|---|---|---|---|
| Size | Fixed | Dynamic | Dynamic | Dynamic | Dynamic |
| Random access | O(1) | O(1) | O(1) by key | N/A | O(1) by key |
| Thread-safe | No | No | No | No | Yes |
| Duplicates | Yes | Yes | No (keys) | No | No (keys) |
| Use when | Fixed-size binary data | Most ordered collections | Key-value lookup | Existence check | Multi-threaded cache |

---

### Q15. [Topic: C#] [EPAM] What is async/await? How is it different from creating a Thread?

**The problem async solves:**
Without async, a thread is BLOCKED waiting for I/O (database, HTTP, file). Under load, blocked threads exhaust the thread pool and the application slows down.

**I/O = anything outside the CPU**: database calls, HTTP requests, file reads, Azure Service Bus, Redis cache. The CPU is idle while the external system responds.

```csharp
// WITHOUT async — thread is BLOCKED for the entire DB wait (50ms)
public EngagementActivity GetActivity(Guid id)
{
    return _context.EngagementActivities.Find(id); // thread stuck here
}
// 100 requests → 100 blocked threads → thread pool exhausted → queuing

// WITH async/await — thread is RELEASED while DB responds
public async Task<EngagementActivity?> GetActivityAsync(Guid id)
{
    // await = "start the DB call, release my thread back to the pool"
    //         "when DB responds, pick up execution from here"
    return await _context.EngagementActivities.FindAsync(id);
}
// 100 requests → maybe 5 threads handle all of them by releasing during DB waits
```

**What async/await actually does:**
```csharp
public async Task CompleteActivityAsync(Guid id, string notes)
{
    // STATE 0: runs normally
    var activity = await _repo.GetByIdAsync(id);
    // PAUSE: thread released → compiler saves state → awaits DB response
    // RESUME: any thread pool thread picks up with 'activity' populated

    activity.Complete(notes);

    await _repo.SaveAsync();
    // PAUSE again: thread released → awaits DB save to complete
    // RESUME: picks up and continues

    await _publisher.PublishAsync(new EngagementCompletedEvent(id));
}
// Compiler transforms this into a state machine — think numbered checkpoints
```

**Task vs Thread:**

```csharp
// THREAD — OS-level object. ~1MB stack. Heavy. Old way.
var thread = new Thread(() => ProcessReport(data)); // dedicated OS thread
thread.Start();
thread.Join(); // wait for it

// TASK — abstraction over thread pool. Lightweight.
// For I/O: no thread consumed during wait (async/await)
// For CPU: uses thread pool thread (Task.Run)
var task = Task.Run(() => CalculateScore(data)); // CPU-bound → thread pool
await task;

// async/await with I/O — NO thread used during the wait at all
var activity = await _context.FindAsync(id); // 0 threads used while DB responds
```

| | `Thread` | `Task` / `async-await` |
|---|---|---|
| What it is | OS-level thread | Unit of work (abstraction) |
| Memory | ~1MB per thread | Minimal state machine |
| Thread pool? | No — dedicated | Yes — shared pool |
| Good for | Long-running background work | I/O bound, short CPU tasks |
| Blocks thread? | Yes | No — released during I/O |
| Capital Access | Not used directly | All API calls, DB, Service Bus |

> **Interview line**: "async/await is not about threads — it's about freeing threads during I/O waits. A thread is released when it hits an await on a DB call or HTTP request. When the I/O completes, any available thread picks up. In Capital Access, every controller and service method is async because we're I/O-heavy. With synchronous blocking code, 100 concurrent requests would need 100 threads. With async, a handful of threads can handle all 100 by sharing time."

---

### Q16. [Topic: C#] [EPAM] What is Task.WhenAll vs Parallel.ForEach? When to use each?

```csharp
// Task.WhenAll — async I/O operations in parallel — threads released during waits
// Capital Access: Report Worker aggregates data from 4 services simultaneously

// ❌ Sequential — 50+40+60+30 = 180ms
var ownership = await _ownershipService.GetHistoryAsync(companyId);
var profile   = await _profilesService.GetProfileAsync(companyId);
var targeting = await _targetingService.GetScoresAsync(companyId);
var contacts  = await _contactsService.GetContactsAsync(companyId);

// ✅ Parallel — all 4 fire simultaneously → total ≈ 60ms (slowest)
var t1 = _ownershipService.GetHistoryAsync(companyId);
var t2 = _profilesService.GetProfileAsync(companyId);
var t3 = _targetingService.GetScoresAsync(companyId);
var t4 = _contactsService.GetContactsAsync(companyId);

await Task.WhenAll(t1, t2, t3, t4);
// results available — just unwrap
var ownership = await t1; var profile = await t2;

// Parallel.ForEach — CPU-bound work spread across multiple CPU cores
// Capital Access: calculating targeting scores for 2500 companies (pure computation)
Parallel.ForEach(allCompanies, company =>
{
    var score = CalculateTargetingScore(company); // CPU work — each on its own thread
    results.TryAdd(company.Id, score);
});

// ❌ NEVER use Parallel.ForEach for async I/O — it doesn't understand async
Parallel.ForEach(companyIds, async id =>
{
    var data = await _api.GetAsync(id); // fire-and-forget inside Parallel → wrong ❌
});
```

| | `Task.WhenAll` | `Parallel.ForEach` |
|---|---|---|
| Best for | I/O bound (DB, HTTP, Service Bus) | CPU bound (calculations, transformations) |
| Threads during wait | 0 — released | 1 per item from thread pool |
| async support | Native | Problematic |
| Capital Access use | Report data aggregation (4 services) | Score calculations for 2500 companies |

---

### Q17. [Topic: C#] [EPAM] What is the IDisposable pattern? Why is it needed? Explain using, destructor, and GC.SuppressFinalize.

**The problem:** The GC handles managed memory automatically. But some objects hold **unmanaged resources** — database connections, file handles, HTTP clients, network sockets. The GC doesn't know how to clean these up. You must do it explicitly.

**Why destructor alone is NOT enough:**
```csharp
public class SqlEngagementRepository
{
    private SqlConnection _connection = new SqlConnection(connectionString);

    ~SqlEngagementRepository() // destructor — GC calls this "eventually"
    {
        _connection.Dispose(); // cleans up... someday
    }
}
// Problems:
// 1. "Eventually" = non-deterministic — GC decides when, could be minutes
// 2. DB connection pool = 100 connections max
//    If 100 requests open connections and destructor hasn't run yet → pool exhausted ❌
// 3. File handles left open → other processes can't access the file
```

**IDisposable — deterministic cleanup (you control exactly when):**
```csharp
public class EngagementExporter : IDisposable
{
    private readonly FileStream _outputFile;
    private bool _disposed = false;

    public EngagementExporter(string filePath)
    {
        _outputFile = new FileStream(filePath, FileMode.Create); // unmanaged resource
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this); // tell GC: don't call destructor — already cleaned up
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return; // never dispose twice

        if (disposing)
            _outputFile?.Dispose(); // release managed resources here

        // release unmanaged resources here if any (raw handles, native memory)
        _disposed = true;
    }

    ~EngagementExporter() // SAFETY NET — if caller forgot to call Dispose()
    {
        Dispose(false); // only clean unmanaged here — managed may already be collected
    }
}
```

**Why GC.SuppressFinalize:**
When Dispose() runs, resources are already cleaned. Without SuppressFinalize, GC still puts the object on the finalizer queue, waits for the finalizer thread to run it — object survives an extra GC cycle (promoted to Gen 1 unnecessarily). SuppressFinalize removes this overhead.

**using block — automatic Dispose, even on exception:**
```csharp
// MANUAL — easy to forget, especially when exception is thrown
SqlConnection conn = new SqlConnection(connectionString);
conn.Open();
DoWork(conn);
conn.Dispose(); // ❌ if DoWork() throws, this line never runs → leak

// USING BLOCK — compiler generates try/finally automatically
using (var conn = new SqlConnection(connectionString))
{
    conn.Open();
    DoWork(conn); // if this throws, Dispose() still called ✅
}

// C# 8+ USING DECLARATION — cleanest
using var conn = new SqlConnection(connectionString);
conn.Open();
DoWork(conn);
// Dispose() called at end of enclosing scope automatically ✅

// Capital Access — DbContext is IDisposable
using var context = new EngagementDbContext(options, tenantService);
var results = await context.EngagementActivities.ToListAsync();
// context.Dispose() → releases DB connection back to pool immediately ✅
```

> **Interview line**: "IDisposable gives you deterministic resource cleanup — you decide when, not the GC. The destructor is a safety net for when callers forget to call Dispose. We use GC.SuppressFinalize so when Dispose runs first, the GC doesn't waste time running the destructor too. In Capital Access, every DbContext, SqlConnection, and FileStream is inside a using block — guaranteed cleanup even when exceptions occur."

---

### Q18. [Topic: C#] [EPAM] What is managed vs unmanaged memory? How does the GC work (Gen 0, 1, 2)?

**Managed memory** = memory the .NET GC controls. You allocate objects; GC cleans them up automatically when they have no more references.

**Unmanaged memory** = memory outside the GC. Database connections, file handles, network sockets, native Windows API handles. Must be cleaned up manually via IDisposable.

**GC Generations — why three exist:**

The core insight: **most objects die young**. 80–90% of objects are short-lived — created to handle a request, then immediately garbage. A few objects live forever (caches, singletons).

```
GEN 0 — newly allocated objects (few MB, collected most often, < 1ms)
    ↓ survived Gen 0 → promoted
GEN 1 — medium-lived objects (buffer layer, collected less often)
    ↓ survived Gen 1 → promoted
GEN 2 — long-lived objects (large, collected rarely, full GC)
    + Large Object Heap (LOH) — objects > 85KB go here directly
```

**Why three and not one or two:**
- One generation → every GC run scans entire heap (hundreds of MB) → seconds of pause
- Without Gen 1 → medium-lived objects pollute Gen 2 → full GC runs constantly
- Three generations → Gen 0 collects cheap short-lived garbage in < 1ms. Gen 2 (full GC) only runs when truly needed — minutes apart in a healthy app.

**Capital Access — what lives where:**
```
Gen 0: request DTOs, LINQ intermediate results, temporary strings, HttpContext objects
Gen 1: EF Core DbContext (scoped — lives slightly longer than one operation)
Gen 2: Singleton services, ConcurrentDictionary feature flag cache, static configuration
LOH:   byte[] PDF/Excel report buffers > 85KB → use ArrayPool<byte> to avoid GC pressure

// ArrayPool — rent and return large buffers without GC allocating/collecting them
var buffer = ArrayPool<byte>.Shared.Rent(2 * 1024 * 1024); // 2MB — from pool
try { BuildPdfContent(buffer); }
finally { ArrayPool<byte>.Shared.Return(buffer); } // back to pool — no GC needed ✅
```

> **Interview line**: "The GC has three generations because most objects die young. Gen 0 collects short-lived request objects in under a millisecond — frequently and cheaply. Gen 2 is collected rarely — it holds singletons and caches that live for the lifetime of the app. Without this separation, every GC run would scan the entire heap. In Capital Access, our report worker previously allocated 2MB byte arrays per report — they went to the LOH and caused Gen 2 pressure. We switched to ArrayPool to rent and return buffers, eliminating those allocations entirely."

---

### Q19. [Topic: C#] [EPAM] What is a deadlock? How do you avoid it in .NET?

**Deadlock:** Two or more threads each hold a resource the other needs — both wait forever, neither can proceed.

```csharp
// Thread 1 holds Lock A, waiting for Lock B
// Thread 2 holds Lock B, waiting for Lock A → deadlock

private static object _lockA = new();
private static object _lockB = new();

// Thread 1
lock (_lockA) { Thread.Sleep(100); lock (_lockB) { /* needs B — but T2 has it */ } }

// Thread 2
lock (_lockB) { Thread.Sleep(100); lock (_lockA) { /* needs A — but T1 has it */ } }
// Both frozen forever ❌
```

**The classic async deadlock — most common in real .NET code:**
```csharp
// Calling .Result or .Wait() on an async method from sync context
// (deadly in old ASP.NET / WinForms — not in ASP.NET Core which has no SynchronizationContext)
public string GetActivityName(Guid id)
{
    var activity = GetActivityAsync(id).Result; // ← blocks current thread
    return activity.CompanyId;
}

public async Task<EngagementActivity> GetActivityAsync(Guid id)
{
    var result = await _context.FindAsync(id);
    // tries to resume on the calling thread — but it's blocked by .Result → deadlock ❌
    return result;
}
```

**How to avoid deadlocks:**
```csharp
// Rule 1: async all the way — never call .Result or .Wait() on async methods
public async Task<string> GetActivityNameAsync(Guid id)
{
    var activity = await GetActivityAsync(id); // ✅ no blocking
    return activity.CompanyId;
}

// Rule 2: lock ordering — always acquire locks in the same order everywhere
lock (_lockA) { lock (_lockB) { /* safe — same order in all threads */ } }

// Rule 3: use timeout on locks — detect and bail out instead of waiting forever
bool acquired = Monitor.TryEnter(_lockA, TimeSpan.FromSeconds(5));
if (!acquired) throw new TimeoutException("Possible deadlock detected");

// Rule 4: SemaphoreSlim — async-compatible lock (thread not blocked during wait)
private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

public async Task UpdateCacheAsync(string tenantId, TenantFeatureFlags flags)
{
    await _semaphore.WaitAsync(); // async wait — thread not blocked ✅
    try { _cache[tenantId] = flags; }
    finally { _semaphore.Release(); }
}
// Capital Access: used in Targeting Service cache updates to prevent race conditions

// Rule 5: throttle parallel calls — avoid thundering herd
var semaphore = new SemaphoreSlim(10); // max 10 concurrent API calls
var tasks = companies.Select(async company =>
{
    await semaphore.WaitAsync();
    try { return await _api.GetScoreAsync(company.Id); }
    finally { semaphore.Release(); }
});
await Task.WhenAll(tasks); // 10 at a time, not 2500 simultaneously ✅
```

> **Interview line**: "The most common async deadlock in .NET is mixing sync and async — calling .Result on an async method in old ASP.NET caused the continuation to wait for the blocked calling thread, which was waiting for the continuation. In ASP.NET Core there's no SynchronizationContext so it doesn't deadlock the same way, but the pattern is still wrong. In Capital Access, we maintain async all the way — from controller to repository. For shared state like our tenant cache, we use SemaphoreSlim which supports async waiting so threads aren't blocked."

---

### Q20. [Topic: C#] [EPAM] Is async/await always safe? What problems can it cause?

async/await is the right tool for I/O-bound work, but has specific failure modes:

```csharp
// PROBLEM 1: async void — exception crashes process silently
private async void OnAlert(object sender, AlertEventArgs e)
{
    await SendNotificationAsync(); // if this throws → process crash ❌
}
// Fix: only use async void for event handlers. Everywhere else: async Task.

// PROBLEM 2: Fire and forget — exception disappears silently
_ = SyncOwnershipDataAsync(); // launched but not awaited ❌
// If exception thrown → no one catches it → silently lost
// Fix: use IHostedService or Azure Function for background work
// If you must fire-and-forget: log exceptions explicitly
_ = SyncDataAsync().ContinueWith(t =>
{
    if (t.IsFaulted) _logger.LogError(t.Exception, "Background sync failed");
});

// PROBLEM 3: Unnecessary async on sync paths — overhead for nothing
public async Task<int> AddAsync(int a, int b) // pointless async ❌
{
    return await Task.FromResult(a + b); // creates state machine with no benefit
}
// Fix: just be synchronous, or return Task.FromResult without async
public Task<int> AddAsync(int a, int b) => Task.FromResult(a + b); // no state machine

// PROBLEM 4: Not handling Task.WhenAll failures properly
var t1 = FetchOwnershipAsync(id);
var t2 = FetchProfileAsync(id);
await t1; // if t2 threw → its exception is unobserved ❌
await t2;

// Fix: WhenAll captures ALL failures
try { await Task.WhenAll(t1, t2); }
catch (Exception ex)
{
    // first exception surfaced; t1.Exception and t2.Exception have all details
    _logger.LogError(ex, "Data fetch failed");
    throw;
}

// PROBLEM 5: Thundering herd — too many parallel tasks overwhelm downstream
var tasks = companies.Select(c => _api.GetScoreAsync(c.Id)); // 2500 at once ❌
// Fix: SemaphoreSlim to throttle — see deadlock section above
```

> **Interview line**: "We ran into the fire-and-forget problem early in Capital Access — a background sync task was not awaited, and when it failed the exception was silently swallowed. We moved all background work to Azure Durable Functions where failures are tracked and retried. The rule we follow: if you launch a Task, you must await it or explicitly handle its result. Async void is banned except for event handlers."

---

### Q21. [Topic: C#] Records — Immutable Data Carriers

Records (C# 9+) auto-generate: constructor, property getters, Equals by value, GetHashCode, ToString, and deconstruction.

```csharp
// One line replaces 30+ lines of boilerplate
public record EngagementCompletedEvent(
    Guid ActivityId,
    string TenantId,
    string CompanyId,
    DateTime CompletedAt);

// Equality by VALUE (not by reference like class)
var e1 = new EngagementCompletedEvent(id, "t1", "AAPL", DateTime.UtcNow);
var e2 = new EngagementCompletedEvent(id, "t1", "AAPL", DateTime.UtcNow);
Console.WriteLine(e1 == e2); // ✅ true — value equality

// with expression — non-destructive copy with one field changed
var updated = e1 with { CompanyId = "MSFT" }; // e1 unchanged ✅

// ToString auto-generated and readable:
// EngagementCompletedEvent { ActivityId = ..., TenantId = t1, CompanyId = AAPL, ... }

// Capital Access uses records for:
// 1. Service Bus events — immutable, value equality enables idempotency checks
// 2. API DTOs — no accidental mutation, simple comparison in tests
public record ReportRequestDto(string CompanyId, string Quarter, string Format);
public record OwnershipChangedEvent(string EventId, string CompanyId, decimal NewOwnershipPct);
```

---

### Q22. [Topic: C#] Extension Methods — Add Methods Without Modifying a Type

```csharp
// Must be in a static class. Method must be static. First param is 'this Type'.
public static class EngagementExtensions
{
    public static bool IsOverdue(this EngagementActivity activity)
        => activity.Status == EngagementStatus.Scheduled
        && activity.ScheduledAt < DateTime.UtcNow.AddDays(-1);

    public static string ToDisplayString(this EngagementStatus status) => status switch
    {
        EngagementStatus.Scheduled => "Upcoming",
        EngagementStatus.Completed => "Done",
        EngagementStatus.Cancelled => "Cancelled",
        _ => status.ToString()
    };
}

// Used as if it's a native method on the type
if (activity.IsOverdue())
    Console.WriteLine("Needs follow-up");

Console.WriteLine(activity.Status.ToDisplayString()); // "Upcoming"

// Capital Access — extending IQueryable for reusable EF Core filters
public static class EngagementQueryExtensions
{
    public static IQueryable<EngagementActivity> ForTenant(
        this IQueryable<EngagementActivity> query, string tenantId)
        => query.Where(e => e.TenantId == tenantId);

    public static IQueryable<EngagementActivity> CompletedInYear(
        this IQueryable<EngagementActivity> query, int year)
        => query.Where(e => e.Status == EngagementStatus.Completed
                         && e.CompletedAt!.Value.Year == year);
}

// Chain fluently — generates one SQL query
var results = await _context.EngagementActivities
    .ForTenant("tenant-abc")
    .CompletedInYear(2025)
    .ToListAsync();
// SQL: WHERE TenantId = 'tenant-abc' AND Status = 'Completed' AND YEAR(CompletedAt) = 2025
```

---

### Q23. [Topic: C#] Delegates, Func\<>, Action\<> — Passing Behaviour as a Parameter

```csharp
// DELEGATE — a type that holds a reference to a method (type-safe function pointer)
public delegate bool EngagementFilter(EngagementActivity activity);

EngagementFilter isRoadshow = a => a.ActivityType == ActivityType.Roadshow;
bool result = isRoadshow(myActivity); // calls the lambda ✅

// Func<TInput, TOutput> — built-in delegate that takes input and returns output
Func<EngagementActivity, bool> isCompleted = a => a.Status == EngagementStatus.Completed;
Func<string, int> getLength = s => s.Length;
Func<int, int, int> add = (a, b) => a + b;

// Action<T> — built-in delegate that takes input, returns nothing (void)
Action<EngagementActivity> log = a =>
    _logger.LogInformation("Activity {Id} processed", a.Id);

// Predicate<T> — shorthand for Func<T, bool>
Predicate<EngagementActivity> isOverdue =
    a => a.ScheduledAt < DateTime.UtcNow && a.Status == EngagementStatus.Scheduled;

// Capital Access — passing behaviour as parameter (strategy pattern without subclasses)
public List<EngagementActivity> Filter(
    List<EngagementActivity> activities,
    Func<EngagementActivity, bool> predicate)
{
    return activities.Where(predicate).ToList();
}

// Caller decides the filter at runtime
var roadshows   = Filter(activities, a => a.ActivityType == ActivityType.Roadshow);
var thisQuarter = Filter(activities, a => a.ScheduledAt.Year == 2025);
var highPriority = Filter(activities, a => a.AttendeeCount > 10);
// LINQ's Where/Select/OrderBy all accept Func<T,bool> — this is why LINQ is so flexible
```

---

### Q24. [Topic: C#] readonly vs const vs static readonly

```csharp
public class EngagementService
{
    // const — compile-time constant. Value baked into compiled IL.
    // Must be primitive or string. Cannot be changed ever.
    private const int MaxAttendeesPerMeeting = 50;
    private const string DefaultActivityType = "Roadshow";

    // static readonly — set once at runtime (inline or static constructor). Any type.
    // Shared across all instances. Cannot be changed after initialisation.
    private static readonly TimeSpan TokenCacheExpiry = TimeSpan.FromHours(1);
    private static readonly HashSet<string> ValidFormats = new() { "pdf", "excel", "csv" };

    // readonly — set once in instance constructor. Per-instance value.
    private readonly string _tenantId;
    private readonly IEngagementRepository _repo;

    public EngagementService(string tenantId, IEngagementRepository repo)
    {
        _tenantId = tenantId; // set here — immutable after this
        _repo = repo;
    }
}

// const   → compile-time, primitives only, fastest (no indirection)
// static readonly → runtime, any type, shared across all instances
// readonly → runtime, any type, per-instance, set in constructor only
```

### Q25. [Topic: C#] ref, out, in Parameters — Pass by Reference

```csharp
// ref — caller passes variable BY REFERENCE. Method can READ and WRITE the original.
// Variable MUST be initialised before passing.
public void ApplyDiscount(ref decimal price, decimal discountPercent)
{
    price = price * (1 - discountPercent / 100); // modifies original variable
}

decimal score = 100m;
ApplyDiscount(ref score, 10);
Console.WriteLine(score); // 90 — original was modified ✅

// out — method MUST write to it before returning. Variable need NOT be initialised.
// Capital Access — TryGet pattern avoids KeyNotFoundException
public bool TryGetEngagement(Guid id, out EngagementActivity? activity)
{
    activity = _store.FirstOrDefault(e => e.Id == id); // must assign before return
    return activity is not null;
}

// Clean usage — no exception handling needed
if (TryGetEngagement(id, out var activity))
{
    activity.Complete(notes); // activity is not null here — safe ✅
}

// in — passes by reference but READ-ONLY. Method cannot modify the value.
// Use for large structs to avoid copying without allowing modification.
public decimal CalculateScore(in EngagementMetrics metrics)
{
    // metrics.TotalMeetings = 0; // ❌ compile error — in is read-only
    return metrics.TotalMeetings * 10m + metrics.UniqueInvestors * 5m;
}

EngagementMetrics m = new(TotalMeetings: 5, UniqueInvestors: 3);
CalculateScore(in m); // passed by reference, no copy, cannot be modified ✅
```

| | `ref` | `out` | `in` |
|---|---|---|---|
| Direction | Read + Write | Write only (output) | Read only |
| Pre-initialised? | Must be | Not required | Must be |
| Method must assign? | No | Yes | N/A |
| Use case | Modify caller's variable | Return multiple values | Large struct, avoid copy |

---

### Q26. [Topic: C#] Pattern Matching — switch expressions, property patterns

```csharp
// IS PATTERN — type check + variable declaration in one line
public string Describe(object item)
{
    if (item is EngagementActivity eng)          // type check + variable
        return $"Engagement: {eng.Status}";

    if (item is FollowUpTask task && !task.IsCompleted) // type + condition
        return $"Pending task due {task.DueDate:d}";

    if (item is null)                            // null check
        return "Nothing";

    return "Unknown";
}

// SWITCH EXPRESSION — clean multi-branch, returns a value
public string GetStatusLabel(EngagementStatus status) => status switch
{
    EngagementStatus.Scheduled  => "Upcoming",
    EngagementStatus.Completed  => "Done",
    EngagementStatus.Cancelled  => "Cancelled",
    _                           => "Unknown"    // default
};

// PROPERTY PATTERN — match on specific property values
public decimal GetEngagementScore(EngagementActivity a) => a switch
{
    { Status: EngagementStatus.Completed, ActivityType: ActivityType.Roadshow }
        => 100m,   // roadshow completed = max score
    { Status: EngagementStatus.Completed }
        => 75m,    // other completed activity
    { Status: EngagementStatus.Cancelled }
        => 0m,     // cancelled = no score
    _   => 25m     // default (scheduled/in-progress)
};

// TUPLE PATTERN — match on multiple values together
public string GetReportGenerator(string format, bool isLarge) => (format, isLarge) switch
{
    ("pdf",   true)  => "HeavyPdfGenerator",
    ("pdf",   false) => "LightPdfGenerator",
    ("excel", _)     => "ExcelGenerator",
    ("csv",   _)     => "CsvGenerator",
    _                => throw new ArgumentException($"Unknown format: {format}")
};

// Capital Access — pattern matching in report orchestrator removes all if/else
public IReportGenerator SelectGenerator(ReportRequest req) => req switch
{
    { Format: "pdf",   PageCount: > 50 } => _pdfHeavyGenerator,
    { Format: "pdf"                     } => _pdfLightGenerator,
    { Format: "excel"                   } => _excelGenerator,
    _ => throw new NotSupportedException($"Format {req.Format} not supported")
};
```

> **Interview line**: "Pattern matching replaced a chain of if/else type checks and property comparisons in our report orchestrator. The property pattern `{ Format: "pdf", PageCount: > 50 }` reads like a specification — the compiler generates the same IL as the explicit if/else, but the code is far more readable and exhaustive (compiler warns if you miss a case)."

---

### Q27. [Topic: C#] Memory Leaks in .NET — Causes and How to Find Them

Even with a GC, memory leaks happen when objects stay reachable (referenced) but are no longer needed. GC cannot collect objects that still have references.

**Cause 1 — Event handlers not unsubscribed (most common):**
```csharp
// Publisher holds a reference to subscriber through the event delegate
// If subscriber is not unsubscribed → publisher keeps subscriber alive forever
public class OwnershipAlertService
{
    public event EventHandler<OwnershipChangedEvent>? OwnershipChanged;
}

public class NotificationPanel
{
    public NotificationPanel(OwnershipAlertService alertService)
    {
        // Subscribe — alertService now holds a reference to THIS component
        alertService.OwnershipChanged += OnOwnershipChanged; // ❌ leak if never removed
    }

    private void OnOwnershipChanged(object? s, OwnershipChangedEvent e) { ... }

    // FIX — unsubscribe when component is disposed
    public void Dispose()
    {
        _alertService.OwnershipChanged -= OnOwnershipChanged; // ✅ release reference
    }
}
```

**Cause 2 — Static collections accumulating data:**
```csharp
// Static field lives for the entire app lifetime
private static readonly List<EngagementActivity> _auditLog = new();

public void TrackActivity(EngagementActivity activity)
{
    _auditLog.Add(activity); // ❌ grows forever — nothing ever removes items
}
// After weeks of production: millions of entries, GBs of memory
// FIX: use IMemoryCache with expiry, or cap the list size
```

**Cause 3 — IDisposable objects not disposed:**
```csharp
// DbContext, HttpClient, SqlConnection — all hold unmanaged resources
// If not disposed → connections stay open, resources leak
public async Task GetData()
{
    var context = new EngagementDbContext(options); // ❌ not in using block
    var results = await context.EngagementActivities.ToListAsync();
    // context never disposed → DB connection stays open ❌
}

// FIX
using var context = new EngagementDbContext(options); // disposed automatically ✅
```

**Cause 4 — Unbounded cache:**
```csharp
private static Dictionary<string, ReportData> _cache = new();

public void Cache(string key, ReportData data)
{
    _cache[key] = data; // ❌ never expires, never evicts → grows forever
}
// FIX: use IMemoryCache with SlidingExpiration
_memoryCache.Set(key, data, new MemoryCacheEntryOptions
{
    SlidingExpiration = TimeSpan.FromMinutes(30) // auto-evict unused entries ✅
});
```

**Cause 5 — Closures capturing large objects:**
```csharp
public Func<string> CreateFormatter(List<ReportData> allReports)
{
    // Lambda captures 'allReports' — keeps entire list alive as long as lambda lives
    return () => allReports.Count.ToString(); // ❌ allReports = potentially GBs
}
// FIX: capture only what you need
var count = allReports.Count;
return () => count.ToString(); // captures int only ✅
```

**How to detect memory leaks:**
```
1. dotnet-counters — CLI tool to watch GC heap size in real time
   dotnet-counters monitor --process-id <pid> System.Runtime

2. dotnet-dump — capture heap dump on high memory
   dotnet-dump collect --process-id <pid>
   dotnet-dump analyze <dump-file>

3. Azure App Insights — memory usage metrics, alerts on Gen2 GC pressure

4. Visual Studio Diagnostic Tools — .NET Object Allocation Tracking
   (shows which types are holding the most memory)

Capital Access: We set up App Insights alerts when managed heap > 1.5GB
When triggered: dotnet-dump → analyze → look for unexpected EngagementActivity
instances that should have been collected but are still referenced
```

> **Interview line**: "The most common memory leak we faced in Capital Access was event handler subscriptions. The Service Bus event dispatcher held references to all subscribers via delegates. When a new subscriber registered but never unregistered, it prevented GC collection. We fixed it by implementing IDisposable on subscribers and unsubscribing in Dispose(). We detect leaks via App Insights GC Gen2 heap alerts and dotnet-dump analysis."

---

### Q28. [Topic: C#] TaskCompletionSource — Bridging Callbacks to async/await

`TaskCompletionSource<T>` lets you manually control when a Task completes. It bridges old callback-based or event-based APIs with the modern async/await model.

```csharp
// Problem: old callback-based API — not awaitable
public void GetDataWithCallback(string query, Action<ReportData> onSuccess, Action<Exception> onError)
{
    // legacy code that calls onSuccess or onError when done
}

// Without TaskCompletionSource — can't use await
var data = GetDataWithCallback(query, ...); // ❌ returns void, can't await

// WITH TaskCompletionSource — wrap callback API to make it awaitable
public Task<ReportData> GetDataAsync(string query)
{
    var tcs = new TaskCompletionSource<ReportData>();

    GetDataWithCallback(
        query,
        onSuccess: result => tcs.SetResult(result),       // Task completes with value ✅
        onError: ex => tcs.SetException(ex)               // Task completes with error ✅
    );

    return tcs.Task; // caller can await this
}

// Now it's awaitable
var data = await GetDataAsync("SELECT ...");
```

**Capital Access — waiting for an external signal:**
```csharp
// Report generation is async — Azure Function processes it and sends a Service Bus message
// API needs to wait for completion without polling
public class ReportCompletionTracker
{
    private readonly ConcurrentDictionary<Guid, TaskCompletionSource<ReportResult>> _pending = new();

    // Called when report job is submitted
    public Task<ReportResult> WaitForCompletionAsync(Guid jobId, CancellationToken ct)
    {
        var tcs = new TaskCompletionSource<ReportResult>();
        _pending[jobId] = tcs;

        // Cancel when token fires
        ct.Register(() => tcs.TrySetCanceled());

        return tcs.Task; // caller awaits this — suspended until SetResult called
    }

    // Called when Service Bus delivers completion message
    public void OnReportCompleted(Guid jobId, ReportResult result)
    {
        if (_pending.TryRemove(jobId, out var tcs))
            tcs.SetResult(result); // waiting caller resumes here ✅
    }
}
```

**Key methods on TaskCompletionSource:**
```csharp
tcs.SetResult(value);         // complete successfully with a value
tcs.SetException(ex);         // complete with an exception
tcs.SetCanceled();            // complete as cancelled

// "Try" variants — won't throw if already completed (use when multiple paths can complete)
tcs.TrySetResult(value);
tcs.TrySetException(ex);
tcs.TrySetCanceled();
```

> **Interview line**: "TaskCompletionSource is the bridge between callback-based legacy code and async/await. In Capital Access, report generation is handed off to an Azure Durable Function. The API submits the job and the client polls for status. When the function completes, it publishes a Service Bus message. Our completion tracker uses TaskCompletionSource so the long-polling endpoint can genuinely await the result without a busy loop."

---

### Q29. [Topic: C#] How was DI implemented before .NET Core? (.NET Framework 4.7)

.NET Framework 4.7 had **no built-in DI container**. Teams used third-party IoC containers:

```
Unity        → Microsoft's own library (separate NuGet)
Autofac      → most popular, feature-rich
Ninject      → annotation-based
Castle Windsor → enterprise, convention-based
StructureMap → older, still used in legacy apps
```

**How it worked with Unity in WebAPI (old way):**
```csharp
// Global.asax.cs — app startup
public class WebApiApplication : HttpApplication
{
    protected void Application_Start()
    {
        var container = new UnityContainer();

        // Manual registration — no extension methods, no builder pattern
        container.RegisterType<IEngagementRepository, SqlEngagementRepository>(
            new HierarchicalLifetimeManager()); // = Scoped equivalent

        container.RegisterType<INotificationSender, EmailNotificationSender>(
            new ContainerControlledLifetimeManager()); // = Singleton equivalent

        container.RegisterType<IEngagementService, EngagementService>(
            new TransientLifetimeManager()); // = Transient equivalent

        // Wire up Web API to use this container
        GlobalConfiguration.Configuration.DependencyResolver =
            new UnityDependencyResolver(container);
    }
}
```

**Lifetime mapping old → new:**
```
Unity                             .NET Core equivalent
ContainerControlledLifetimeManager  → Singleton
HierarchicalLifetimeManager         → Scoped (one per request)
TransientLifetimeManager            → Transient
PerRequestLifetimeManager           → Scoped (via HTTP module)
```

**.NET Core / .NET 8 — built-in, no third-party needed:**
```csharp
// Program.cs — clean, no ceremony
builder.Services.AddScoped<IEngagementRepository, SqlEngagementRepository>();
builder.Services.AddSingleton<IMemoryCache, MemoryCache>();
builder.Services.AddTransient<IEmailFormatter, HtmlEmailFormatter>();
// No separate container. No DependencyResolver. No Global.asax.
```

**Why .NET Core DI is preferred:**
- Built in — no extra NuGet dependency
- Integrated with ASP.NET Core pipeline (middleware, controllers, background services)
- Better diagnostics — scoped validation enabled by default in dev
- Third-party containers (Autofac, etc.) still work via `IServiceProviderFactory` if needed

> **Interview line**: "In .NET Framework projects I worked with Unity. You'd manually register every type in Application_Start and wire it to GlobalConfiguration.DependencyResolver. .NET Core brought DI as a first-class citizen — builder.Services.AddScoped is cleaner, integrates with the pipeline, and validates scope violations in development automatically. Moving from Unity to the built-in container was one of the wins when we migrated Capital Access from .NET Framework."

---

### Q30. [Topic: C#] Default Interface Methods vs Abstract Class (C# 8+)

**Default interface methods** (C# 8+) allow an interface to provide a default implementation for a method, so existing implementations don't break when a new method is added.

```csharp
// BEFORE C# 8 — adding a method to an interface BREAKS all implementations
public interface IReportGenerator
{
    Task<byte[]> GenerateAsync(ReportData data);
    // Adding this NEW method → ALL existing implementations fail to compile:
    string GetSupportedFormats(); // ❌ breaks PdfReportGenerator, ExcelReportGenerator...
}

// C# 8+ DEFAULT INTERFACE METHOD — existing implementations are not broken
public interface IReportGenerator
{
    Task<byte[]> GenerateAsync(ReportData data);

    // Default implementation — existing classes don't need to implement this
    string GetSupportedFormats() => "Check documentation"; // default ✅

    // Static methods in interfaces (C# 8+) — factory/utility methods
    static IReportGenerator CreateDefault() => new PdfReportGenerator();
}

// Existing class — compiles fine without implementing GetSupportedFormats
public class PdfReportGenerator : IReportGenerator
{
    public async Task<byte[]> GenerateAsync(ReportData data) { /* ... */ }
    // GetSupportedFormats uses default — or can override:
    public string GetSupportedFormats() => "pdf, pdf/a"; // optional override ✅
}
```

**Default Interface Methods vs Abstract Class — when to use which:**

```csharp
// ABSTRACT CLASS — use when: shared state (fields), shared implementation, related hierarchy
public abstract class BaseReportGenerator
{
    protected readonly ILogger _logger;           // fields — interfaces can't have these
    protected readonly string _tenantId;

    protected BaseReportGenerator(ILogger logger, string tenantId)
    {
        _logger = logger; _tenantId = tenantId;   // constructor — interfaces can't have this
    }

    // Shared implementation all generators use
    protected void LogGeneration(string format)
        => _logger.LogInformation("[{Tenant}] Generating {Format} report", _tenantId, format);

    public abstract Task<byte[]> GenerateAsync(ReportData data); // child must implement
}

// DEFAULT INTERFACE METHOD — use when: evolving an existing interface without breaking changes
// OR adding optional/utility behaviour to an interface
public interface IExportable
{
    Task<byte[]> ExportAsync(ExportFormat format);

    // Optional behaviour — implementors can override or use the default
    string GetFileExtension(ExportFormat format) => format switch
    {
        ExportFormat.Pdf   => ".pdf",
        ExportFormat.Excel => ".xlsx",
        _                  => ".dat"
    };
}
```

| | Abstract Class | Default Interface Method |
|---|---|---|
| Can have fields? | ✅ Yes | ❌ No |
| Can have constructor? | ✅ Yes | ❌ No |
| Multiple inheritance? | ❌ One parent only | ✅ Implement many interfaces |
| Shared state? | ✅ Yes | ❌ No |
| Versioning (add without breaking)? | ❌ Adding abstract method breaks children | ✅ Add default = no break |
| Use for | Shared implementation + state | Evolving interfaces, optional capability |

> **Interview line**: "Default interface methods solve the interface versioning problem. Before C# 8, adding any method to a published interface broke every class that implemented it — a serious issue in a library or microservice contract. In Capital Access, we added a GetSupportedFormats() method to IReportGenerator with a default implementation. All existing generators continued to work. New generators can override it to return accurate format info. We'd use abstract class instead if the generators needed shared logger or tenant context fields."

---

## 4. Garbage Collection Deep Dive

---

### Q31. Explain Garbage Collector (GC)?

The **Garbage Collector** is a part of the .NET CLR (Common Language Runtime) that automatically manages memory on the **managed heap**. It allocates memory when you create objects and reclaims memory when objects are no longer needed — freeing you from manual `malloc`/`free` calls (like C/C++).

```csharp
// You allocate — GC cleans up
var activity = new EngagementActivity(id, "tenant-abc", ActivityType.Roadshow);
// activity is on the managed heap
// When activity has no more references pointing to it → GC reclaims the memory

// Without GC (C++):
EngagementActivity* a = new EngagementActivity(); // manual allocation
delete a;                                          // manual cleanup — forget this → memory leak
```

**GC responsibilities:**
- Allocate memory for new objects on the managed heap
- Track which objects are still in use (reachable)
- Reclaim memory of unreachable objects
- Compact the heap to reduce fragmentation

> **Capital Access**: We create thousands of `EngagementActivity`, `ReportJob`, and DTO objects per second across 7 microservices. None of them are manually freed — the GC handles all of it. This lets us focus on business logic instead of memory management.

---

### Q32. How Does the GC Know When to Clean Objects?

The GC uses **reachability analysis** — not reference counting. It traces from **GC Roots** and marks every object it can reach. Anything NOT reachable = garbage = collected.

**GC Roots (starting points for the trace):**
```
1. Local variables on the active call stack
2. Static fields (live for the app's lifetime)
3. CPU registers holding object references
4. GC Handles (explicit pinned handles)
```

```csharp
// Example — when does activity become collectible?
public void ProcessEngagement()
{
    var activity = new EngagementActivity(id, tenantId); // GC root: local variable
    activity.Complete("Great meeting");
    // 'activity' local variable goes out of scope at end of method
    // GC root disappears → object becomes UNREACHABLE → eligible for collection
}

// Static field — object lives FOREVER (app lifetime)
public static class Cache
{
    private static EngagementActivity _lastActivity; // GC root — never collectible while app runs
}

// Circular references are handled correctly
// object A → B → A   (A and B reference each other)
// If nothing from GC Roots reaches A or B → BOTH are collected ✅
// (Reference counting would fail here — counts are 1 each but both are garbage)
```

---

### Q33. Is There a Way to See the Heap Memory?

Yes — multiple tools at different levels:

```bash
# 1. dotnet-counters — real-time GC metrics from CLI
dotnet-counters monitor --process-id <pid> System.Runtime
# Shows: GC Heap Size, Gen0/1/2 collections per second, pause time

# 2. dotnet-dump — capture heap snapshot for offline analysis
dotnet-dump collect --process-id <pid> --output ./dump.dmp
dotnet-dump analyze dump.dmp
> dumpheap -stat          # show all object types and their total size on heap
> dumpheap -type EngagementActivity  # find all EngagementActivity instances
> gcroot <object-address> # show what is keeping this object alive (retention path)

# 3. dotnet-trace — record GC events for PerfView analysis
dotnet-trace collect --process-id <pid> --providers Microsoft-DotNETCore-SampleProfiler
```

```csharp
// 4. From inside the app — GC APIs
long totalMemory = GC.GetTotalMemory(forceFullCollection: false); // bytes on managed heap
Console.WriteLine($"Heap: {totalMemory / 1024 / 1024} MB");

// Generation sizes
long gen0 = GC.GetGenerationSize(0);
long gen2 = GC.GetGenerationSize(2);

// How many collections happened?
int gen0Collections = GC.CollectionCount(0);
int gen2Collections = GC.CollectionCount(2); // if this is high → memory pressure ❌
```

```
// 5. Visual Studio — Diagnostic Tools window (Debug > Windows > Diagnostic Tools)
//    Memory Usage tab → Take Snapshot → Compare snapshots to find leaks

// 6. Azure App Insights (Capital Access)
//    Metrics: "Process physical bytes" and ".NET CLR Memory > # Bytes in all Heaps"
//    Alert when Gen2 heap > 1.5GB → investigate
```

---

### Q34. Does GC Clean Primitive Types?

**It depends on where they live:**

```csharp
// STACK variables — primitive types as local variables live on the STACK
// Stack frames are unwound automatically when a method returns
// GC is NOT involved — the CPU stack pointer moves, memory is reclaimed instantly
public void Calculate()
{
    int count = 100;        // stack — not touched by GC
    decimal score = 92.5m;  // stack — not touched by GC
    bool isValid = true;    // stack — not touched by GC
} // stack frame popped → all gone instantly

// HEAP — primitive types INSIDE objects live on the heap AS PART of the object
public class EngagementActivity
{
    public int AttendeeCount { get; private set; }  // int lives inside the object on heap
    public bool IsDeleted { get; private set; }     // bool lives inside the object on heap
}
// When GC collects EngagementActivity → AttendeeCount and IsDeleted are collected WITH it
// GC doesn't collect the int separately — it collects the whole object

// BOXED primitives — value type stored as object → lives on managed heap → GC collects
object boxed = 42;  // int boxed → on heap → GC manages this
```

**Answer**: GC does NOT directly clean stack primitives (stack handles that). For primitives inside objects, they are collected as part of the parent object. For boxed primitives, GC collects them like any heap object.

---

### Q35. Managed vs Unmanaged Code/Objects/Resources?

```
MANAGED CODE / OBJECTS
  - Written in C#, VB.NET, F# etc. — compiled to IL, runs under CLR
  - Memory managed by GC automatically
  - Examples: EngagementActivity, List<T>, Dictionary, string, any .NET class
  - You allocate (new), GC deallocates

UNMANAGED CODE / RESOURCES
  - Outside CLR control — native OS resources
  - GC has NO knowledge of these
  - Must be cleaned up manually
  - Examples:
    SqlConnection    → database connection handle (limited pool!)
    FileStream       → OS file handle
    HttpClient       → network socket
    SqlCommand       → DB command object
    Timer            → OS timer handle
    Mutex/Semaphore  → OS synchronisation primitive
    COM objects      → legacy Windows objects
    Marshal.AllocHGlobal → native heap memory
```

```csharp
// MANAGED — GC handles it
var activity = new EngagementActivity(id, tenantId); // GC cleans up ✅

// UNMANAGED — you MUST clean it
var connection = new SqlConnection(connectionString); // wraps OS connection handle
// GC can collect the SqlConnection object, but the OS connection handle stays OPEN
// until you call Dispose() or the finalizer eventually runs
// Connection pool exhaustion if you don't dispose promptly ❌
```

---

### Q36. Can GC Clean Unmanaged Code?

**No — GC cannot clean unmanaged resources.** GC only manages the managed heap. It has no visibility into OS handles, file descriptors, or native memory.

However, GC **triggers cleanup indirectly** through the **finalizer/destructor**:

```csharp
// GC collects the managed object → calls the finalizer → finalizer can release unmanaged resource
public class SqlEngagementRepository
{
    private SqlConnection _connection = new SqlConnection(connectionString);

    ~SqlEngagementRepository() // finalizer — GC eventually calls this
    {
        _connection.Dispose(); // INDIRECTLY cleans unmanaged resource through finalizer
    }
}
```

**BUT** — "eventually" is unpredictable. That's why `IDisposable` exists — for **deterministic, immediate** cleanup. Finalizer is only a safety net.

---

### Q37. Explain Generations?

The managed heap is divided into **generations** based on the **Generational Hypothesis**: *most objects die young*.

Research shows: in typical applications, 80–90% of objects are short-lived — created for one operation and immediately garbage. Only a small fraction live for the entire app lifetime.

Generations let GC exploit this pattern: **collect young objects frequently and cheaply, collect old objects rarely**.

```
Generation 0 (Gen 0) → youngest, smallest, collected most often
Generation 1 (Gen 1) → middle tier, buffer layer
Generation 2 (Gen 2) → oldest, largest, collected least often
Large Object Heap     → objects > 85KB, collected with Gen 2
```

---

### Q38. What is GC0, GC1, and GC2?

```
GEN 0
  Size:      Few MB (configurable)
  Contains:  Newly allocated objects
  Collected: Most frequently — every few seconds under load
  Duration:  < 1ms — barely noticeable
  Capital Access: request DTOs, LINQ intermediates, temporary strings, HttpContext

GEN 1
  Contains:  Objects that survived Gen 0 collection (promoted)
  Collected: Less often than Gen 0
  Purpose:   Buffer — second chance to die before reaching Gen 2
  Capital Access: DbContext instances (slightly longer than one DB call)

GEN 2
  Contains:  Long-lived objects — survived Gen 0 + Gen 1
  Collected: Rarely — only when heap is under pressure (full GC)
  Duration:  Can be 10–100ms+ — noticeable in production
  Capital Access: Singleton services, ConcurrentDictionary cache, static config

LARGE OBJECT HEAP (LOH)
  Contains:  Objects > 85,000 bytes — allocated directly here
  Collected: Only with Gen 2
  Capital Access: byte[] PDF buffers (2-5MB per report) — use ArrayPool<byte> to avoid ❌
```

```csharp
// Capital Access: LOH problem with large report buffers
// ❌ Each report allocates a new large byte[] → goes to LOH → Gen 2 pressure
byte[] pdf = new byte[3 * 1024 * 1024]; // 3MB → straight to LOH

// ✅ ArrayPool — rent from pool, return after use → no GC allocation
var buffer = ArrayPool<byte>.Shared.Rent(3 * 1024 * 1024);
try { BuildPdf(buffer); }
finally { ArrayPool<byte>.Shared.Return(buffer); } // no GC cycle needed
```

---

### Q39. Why Do We Need Generations?

**Without generations — one big heap, one expensive GC:**
```
Every GC run → scan ALL live objects on the entire heap
Production app → heap = 500MB → scan 500MB → pause = seconds
Under load: GC every few seconds → multi-second pauses → terrible user experience
```

**With generations — targeted, cheap collections:**
```
Gen 0 is tiny (few MB). 90% of objects die there.
Gen 0 GC: scan tiny Gen 0 only → < 1ms → user doesn't notice
Full GC (Gen 2): only when Gen 2 is full → minutes apart → acceptable

Result: thousands of cheap Gen 0 collections between each expensive Gen 2 collection
```

**Without Gen 1 (just Gen 0 and Gen 2):**
Medium-lived objects (live a few hundred ms, then die) would skip straight to Gen 2. Gen 2 would fill up fast with objects that were about to die anyway → frequent expensive full GCs. Gen 1 acts as a **quarantine** — gives medium-lived objects one more chance to die before promotion to Gen 2.

---

### Q40. Which Is the Best Place to Clean Unmanaged Objects?

**The `Dispose()` method via the IDisposable pattern — always.**

```
Best:    Dispose() — called immediately when you're done with the resource
         using statement / using declaration ensures this always happens

Backup:  Finalizer (~destructor) — GC calls this eventually if Dispose() was forgotten
         Non-deterministic timing — could be minutes later

NEVER:   Rely only on the finalizer — connection pool can be exhausted by then
```

```csharp
// BEST — deterministic, immediate
using var connection = new SqlConnection(connectionString); // Dispose called here
using var context = new EngagementDbContext(options);       // released immediately ✅

// BACKUP — finalizer safety net (non-deterministic)
~SqlEngagementRepository()
{
    _connection?.Dispose(); // eventually — not good enough for production
}
```

**Capital Access rule**: Every `SqlConnection`, `DbContext`, `FileStream`, `HttpResponseMessage` is inside a `using` block. We do not rely on finalizers for resource cleanup.

---

### Q41. How Does GC Behave When We Have a Destructor?

Objects with a destructor (finalizer) go through a **two-step collection process**:

```
NORMAL OBJECT (no destructor):
  GC runs → object unreachable → memory reclaimed immediately ✅ (1 GC cycle)

OBJECT WITH DESTRUCTOR:
  GC runs → object unreachable → NOT collected yet!
  → placed on Finalization Queue
  → Finalizer Thread (separate dedicated thread) picks it up
  → Finalizer runs
  → Object now moved to f-reachable queue
  → NEXT GC cycle → memory reclaimed ❌ (2+ GC cycles, promoted to Gen 1 or Gen 2)
```

```csharp
public class ExpensiveResource : IDisposable
{
    private bool _disposed = false;

    // Having this finalizer means GC cannot immediately collect ExpensiveResource
    // It must go through Finalization Queue first
    ~ExpensiveResource()
    {
        Dispose(false);
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this); // ← removes from Finalization Queue → collected immediately ✅
    }
}
```

**Performance impact**: Objects with finalizers survive longer → promoted to Gen 1 or Gen 2 → trigger more expensive GC collections. Use `GC.SuppressFinalize(this)` in `Dispose()` to opt out of this overhead when already cleaned up.

---

### Q42. What Do You Think About an Empty Destructor?

**An empty destructor is actively harmful — never write one.**

```csharp
// ❌ NEVER DO THIS
public class EngagementActivity
{
    ~EngagementActivity() { } // EMPTY — does absolutely nothing useful
}
```

**Why it's harmful:**
```
Without destructor: EngagementActivity collected in Gen 0 in < 1ms ✅

With empty destructor: 
  → GC puts it on Finalization Queue (even though finalizer does nothing)
  → Finalizer Thread runs it (empty — wastes CPU cycles)
  → Object survives Gen 0 → promoted to Gen 1
  → Requires one MORE GC cycle to collect
  → For 10,000 EngagementActivity objects: 10,000 unnecessary promotions ❌
```

**Rule**: Only write a finalizer when you have **actual unmanaged resources** to release. If you implement `IDisposable` and call `GC.SuppressFinalize(this)` in `Dispose()`, even a real finalizer's cost is eliminated for correctly-used instances.

---

### Q43. Explain the Dispose Pattern?

The full Dispose pattern safely handles both managed and unmanaged resource cleanup, with a finalizer as a safety net:

```csharp
public class EngagementExporter : IDisposable
{
    private FileStream _outputFile;   // managed IDisposable
    private IntPtr _nativeHandle;     // unmanaged resource (hypothetical)
    private bool _disposed = false;   // guard flag

    public EngagementExporter(string path)
    {
        _outputFile = new FileStream(path, FileMode.Create);
    }

    // Step 1: Public entry point — called by user or using statement
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this); // no need for finalizer if Dispose already ran ✅
    }

    // Step 2: Core cleanup logic
    // disposing = true  → called from Dispose()    → safe to touch managed resources
    // disposing = false → called from finalizer    → do NOT touch managed resources
    //                                                (they may already be collected)
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return; // idempotent — safe to call multiple times

        if (disposing)
        {
            _outputFile?.Dispose(); // safe — disposing managed resource
        }

        // Always release unmanaged resources here (both paths)
        if (_nativeHandle != IntPtr.Zero)
        {
            NativeApi.CloseHandle(_nativeHandle);
            _nativeHandle = IntPtr.Zero;
        }

        _disposed = true;
    }

    // Step 3: Safety net — called by GC if user forgot Dispose()
    ~EngagementExporter() => Dispose(false);
}
```

**Capital Access**: `EngagementDbContext` follows this pattern internally. Every entity service gets the context via DI (Scoped lifetime) — the DI container calls Dispose() at end of the HTTP request automatically.

---

### Q44. Finalize vs Destructor?

They are the **same thing** in C# — different names for the same mechanism.

```csharp
// What you write in C# — destructor syntax
public class EngagementExporter
{
    ~EngagementExporter()
    {
        // cleanup
    }
}

// What the compiler generates — override of Object.Finalize()
protected override void Finalize()
{
    try
    {
        // your destructor body
    }
    finally
    {
        base.Finalize(); // MUST call base — compiler handles this
    }
}
```

**You cannot directly write `override Finalize()` in C#** — the compiler blocks it and requires the destructor syntax (`~ClassName()`). The compiler translates it to the proper `Finalize()` override including the try/finally and base call.

| | Destructor | Finalize |
|---|---|---|
| Syntax | `~ClassName() { }` | `protected override void Finalize()` |
| In C# | ✅ Write this | ❌ Compiler blocks direct override |
| Same thing? | ✅ Yes — compiler converts destructor to Finalize |
| Called by | GC (non-deterministic) | GC (same) |

---

### Q45. What Is the Use of the `using` Keyword?

```csharp
// USING STATEMENT — ensures Dispose() is called even if exception occurs
// Compiler generates try/finally behind the scenes
using (var context = new EngagementDbContext(options, tenantService))
{
    var results = await context.EngagementActivities.ToListAsync();
} // Dispose() called HERE — even if exception thrown above ✅

// What the compiler generates:
var context = new EngagementDbContext(options, tenantService);
try
{
    var results = await context.EngagementActivities.ToListAsync();
}
finally
{
    context?.Dispose(); // always runs
}

// C# 8+ USING DECLARATION — cleaner, disposes at end of enclosing scope
using var context = new EngagementDbContext(options, tenantService);
using var connection = new SqlConnection(connectionString);
var results = await context.EngagementActivities.ToListAsync();
// Both disposed at end of method scope ✅

// USING DIRECTIVE (different use — importing namespaces)
using System.Collections.Generic;  // not related to IDisposable
using Microsoft.EntityFrameworkCore;
```

**Capital Access**: Every `DbContext`, `SqlConnection`, `HttpResponseMessage`, `FileStream`, and `MemoryStream` in our codebase uses `using var`. It's enforced via code review and Roslyn analyser rules.

---

### Q46. Can You Force the Garbage Collector?

Yes — `GC.Collect()`:

```csharp
// Force collection of all generations (full GC)
GC.Collect();

// Force specific generation
GC.Collect(0);  // Gen 0 only
GC.Collect(1);  // Gen 0 + Gen 1
GC.Collect(2);  // Full GC — all generations

// More control
GC.Collect(
    generation: 2,
    mode: GCCollectionMode.Forced,
    blocking: true,   // wait for GC to complete before returning
    compacting: true  // compact heap after collection
);

// Wait for finalizers to complete after a collection
GC.WaitForPendingFinalizers();

// Common pattern before heap snapshot (diagnostics only)
GC.Collect();
GC.WaitForPendingFinalizers();
GC.Collect(); // second collect picks up objects whose finalizers just ran
```

---

### Q47. Is It a Good Practice to Force GC?

**Almost never — and definitely not in production request handling.**

```
Why forcing GC is usually wrong:
1. Stop-the-world: GC pauses ALL application threads
   In Capital Access: all 7 services stop responding during a forced full GC
   Users see request timeouts if GC takes > 100ms

2. GC knows better: it's tuned by Microsoft engineers based on decades of data
   It collects at the optimal time for your workload
   Forcing it interrupts that tuning

3. Premature promotion: forcing Gen 0 GC while many short-lived objects are alive
   → survivors get promoted to Gen 1 unnecessarily → more Gen 2 pressure

4. Doesn't fix the root cause: if you think you need to force GC,
   you likely have a real memory issue (leak, LOH pressure, large allocations)
   Fix the cause, not the symptom
```

**The ONE legitimate use case:**
```csharp
// Before taking a diagnostic memory snapshot — you want a clean baseline
GC.Collect();
GC.WaitForPendingFinalizers();
GC.Collect();
var snapshot = TakeHeapSnapshot(); // now snapshot reflects true live objects
// This is diagnostics only — never in production request path
```

---

### Q48. How Can We Detect Memory Issues?

```csharp
// 1. From within the app — basic monitoring
public class MemoryHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct)
    {
        var bytes = GC.GetTotalMemory(forceFullCollection: false);
        var mb = bytes / 1024 / 1024;

        return Task.FromResult(mb > 1500
            ? HealthCheckResult.Degraded($"Heap at {mb}MB — above 1.5GB threshold")
            : HealthCheckResult.Healthy($"Heap at {mb}MB"));
    }
}
```

```
2. Task Manager / Process Explorer
   Watch "Private Bytes" over time — steady growth = potential leak

3. dotnet-counters (real-time)
   dotnet-counters monitor --process-id <pid> System.Runtime
   Key metrics:
   - GC Heap Size (B)          → total managed heap
   - Gen 0/1/2 GC Count        → how often each generation is collected
   - GC Pause Time (%)         → percentage of time spent in GC

4. Azure App Insights (Capital Access)
   Custom metric: "gen2_heap_size_mb" tracked every 30s
   Alert rule: if Gen2 heap > 1.5GB for 5 minutes → PagerDuty alert

5. Windows Performance Monitor (perfmon)
   Counter: .NET CLR Memory > # Bytes in all Heaps
   Watch for: monotonically increasing line over hours = memory leak
```

---

### Q49. How Can We Know the Exact Source of Memory Issues?

**The dotnet-dump workflow — most powerful:**

```bash
# Step 1: Capture heap dump when memory is high
dotnet-dump collect --process-id <pid> --output ./engagement-service.dmp

# Step 2: Analyze
dotnet-dump analyze engagement-service.dmp

# Step 3: Find what's consuming memory by type
> dumpheap -stat
# Output (example):
# MT       Count   TotalSize  Class Name
# 7f3a...  85000   102000000  EngagementActivity  ← 85K instances? should be ~100!
# 7f2b...  2000000  48000000  System.String

# Step 4: Look at actual instances
> dumpheap -type EngagementActivity -min 1000
# Shows addresses of EngagementActivity objects on heap

# Step 5: Find what is KEEPING them alive (retention path)
> gcroot 00007f3a1234abcd
# Output shows the reference chain from GC root to this object:
# Static field Cache._activityStore → List<EngagementActivity> → your object
# Found it! The static cache is holding all 85K activities ❌
```

```csharp
// Visual Studio Memory Profiler workflow
// 1. Debug > Performance Profiler > Memory Usage
// 2. Take snapshot at start
// 3. Run the suspected leaking operation 100 times
// 4. Take snapshot again
// 5. Compare: what types increased?
// 6. Click on a type → see object retention graph → shows what's holding it

// Capital Access: identified a leak in NotificationService where event handlers
// to OwnershipAlertService were never unsubscribed → 50K stale handler objects
```

---

### Q50. What Is a Memory Leak?

A **memory leak** occurs when memory is allocated but never freed, and the amount grows over time — eventually exhausting available memory and crashing the process.

```
NOT a memory leak: object allocated → used → GC collects when unreachable ✅
MEMORY LEAK:       object allocated → used → finished → STILL REFERENCED → GC cannot collect ❌
                   → accumulates → OutOfMemoryException after hours/days
```

```csharp
// Memory leak — static collection grows forever, never trimmed
private static readonly List<EngagementActivity> _auditLog = new();

public void LogActivity(EngagementActivity activity)
{
    _auditLog.Add(activity); // ❌ added but never removed
    // After 1 week production: millions of entries, process crashes with OOM
}

// Memory leak — event handler never unsubscribed
public class NotificationPanel
{
    public NotificationPanel(OwnershipAlertService alertSvc)
    {
        alertSvc.OwnershipChanged += OnOwnershipChanged; // ❌ alertSvc holds reference to this
        // NotificationPanel can never be GC'd as long as alertSvc lives (= forever, it's singleton)
    }
    // Fix: implement IDisposable and unsubscribe in Dispose()
}
```

---

### Q51. Can a .NET Application Have Memory Leaks Even With GC?

**Yes — absolutely.** GC only collects objects with **no references**. If your code accidentally keeps references to objects it no longer needs, GC cannot help.

```
GC is perfect — it works exactly as designed.
The problem is YOUR CODE keeping references longer than needed.

Common .NET memory leaks:
  1. Event handlers not unsubscribed           → subscriber kept alive by publisher
  2. Static collections growing unboundedly   → static = GC root = never collected
  3. IDisposable not disposed                 → unmanaged resources + managed objects linger
  4. Closure capturing large objects          → lambda keeps alive whatever it captured
  5. Cache without expiry/eviction            → IMemoryCache with no expiry = leak
  6. ThreadLocal<T> not disposed              → values per thread never cleaned

Example: GC WANTS to collect but CAN'T
```

```csharp
// GC would love to collect these 10,000 CompanyData objects
// But it can't — they're referenced by the static cache
private static Dictionary<string, CompanyData> _cache = new();
// Dictionary is a GC root (static) → holds all CompanyData references → none collected
// Solution: IMemoryCache with expiry, or WeakReference values
```

---

### Q52. How to Detect Memory Leaks in .NET Applications?

```
STEP 1 — CONFIRM it is a leak (not just expected growth)
  Monitor process memory over 2–4 hours with dotnet-counters
  Leak: memory grows monotonically and never decreases after GC
  Normal: memory fluctuates, GC brings it back down

STEP 2 — IDENTIFY which type is leaking
  dotnet-dump → dumpheap -stat → sort by TotalSize
  Which type has WAY more instances than expected?

STEP 3 — FIND what is holding the reference
  dotnet-dump → gcroot <address>
  Visual Studio Memory Profiler → object retention graph
  PerfView → object allocation stacks

STEP 4 — CODE REVIEW with findings in hand
  Search for: event subscriptions without unsubscription
  Search for: static collections that only add, never remove
  Search for: IDisposable used without using or Dispose()
  Search for: closures in long-lived objects

STEP 5 — FIX and VERIFY
  Deploy fix → monitor for 24h → confirm memory is stable
```

```csharp
// Capital Access: leak detection in production
// App Insights alert fires: Gen2 heap > 1.5GB
// dotnet-dump taken → dumpheap -stat shows 200,000 EngagementActivity instances
// gcroot shows: static _eventHandlers Dictionary<Guid, List<EventHandler>> is root
// Root cause: Durable Function activity callbacks registered but never deregistered
// Fix: store WeakReference<EventHandler> in the dictionary + cleanup on completion
```

---

### Q53. Explain Weak and Strong References?

```csharp
// STRONG REFERENCE — normal reference. Keeps object alive. GC will NOT collect.
var activity = new EngagementActivity(id, tenantId); // strong reference
// As long as 'activity' variable exists and is reachable → object stays on heap

// WEAK REFERENCE — does NOT prevent GC collection
// GC can collect the object even if WeakReference exists
var weakRef = new WeakReference<EngagementActivity>(activity);

activity = null; // remove the strong reference

// GC is now FREE to collect the object (it may not do so immediately)

// Using a weak reference — always check if still alive
if (weakRef.TryGetTarget(out var cachedActivity))
{
    // Object still alive — GC hasn't collected it yet
    return cachedActivity; // use it ✅
}
else
{
    // Object was collected — recreate it
    var fresh = await LoadFromDatabaseAsync(id);
    weakRef.SetTarget(fresh); // update the weak reference
    return fresh;
}
```

```
Strong Reference: 
  Object alive → GC cannot collect → memory always used
  Use for: anything you actively need

Weak Reference:
  Object alive only if memory allows → GC can collect under pressure
  After GC collects it: TryGetTarget returns false
  Use for: caches where data can be regenerated
```

---

### Q54. When Will You Use Weak References?

**Scenario 1 — Memory-sensitive cache (most common):**
```csharp
// Capital Access: large report PDFs cached after generation
// Strong cache: if 2500 tenants each have a cached PDF (3MB each) → 7.5GB ❌
// WeakReference cache: GC evicts least recently used PDFs under memory pressure
private readonly ConcurrentDictionary<Guid, WeakReference<byte[]>> _reportCache = new();

public async Task<byte[]> GetOrGenerateReportAsync(Guid reportId)
{
    if (_reportCache.TryGetValue(reportId, out var weakRef)
        && weakRef.TryGetTarget(out var cachedPdf))
    {
        return cachedPdf; // cache hit — PDF still in memory ✅
    }

    // Cache miss or GC evicted it — regenerate
    var pdf = await _reportGenerator.GenerateAsync(reportId);
    _reportCache[reportId] = new WeakReference<byte[]>(pdf); // store weakly
    return pdf;
}
// Under memory pressure: GC evicts PDFs → next request regenerates
// No OutOfMemoryException — GC acts as automatic cache eviction ✅
```

**Scenario 2 — Event aggregator without holding subscribers alive:**
```csharp
// Publisher holds weak references to subscribers
// When subscriber is no longer used, GC collects it → publisher doesn't prevent it
public class WeakEventAggregator
{
    private readonly List<WeakReference<IOwnershipChangeHandler>> _handlers = new();

    public void Subscribe(IOwnershipChangeHandler handler)
    {
        _handlers.Add(new WeakReference<IOwnershipChangeHandler>(handler));
    }

    public void Publish(OwnershipChangedEvent e)
    {
        _handlers.RemoveAll(wr => !wr.TryGetTarget(out _)); // prune dead refs
        foreach (var wr in _handlers.ToList())
        {
            if (wr.TryGetTarget(out var handler))
                handler.Handle(e);
        }
    }
}
// NotificationPanel can be GC'd naturally — no leak from event subscription ✅
```

**Summary — use WeakReference when:**
```
1. Cache: data can be regenerated if evicted — don't force it to stay in memory
2. Event subscriptions: subscriber should not be kept alive by publisher
3. Observer pattern: observer should die naturally without publisher holding it
4. Any case where "nice to have if memory allows, fine to discard otherwise"

Do NOT use WeakReference for:
  - Data you genuinely need to be present
  - Performance-critical paths (TryGetTarget has overhead)
  - Simple DI-injected dependencies (use strong references)
```

---

## 5. .NET Core & ASP.NET Core

---

### Q55. [Topic: ASP.NET Core] [EPAM] What is the request lifecycle in ASP.NET Core?

Every HTTP request travels through this exact pipeline — order matters:

```
[Browser / Angular SPA]
         │  GET /api/engagements/abc-123
         ▼
[Kestrel — Web Server]
  Parses raw TCP bytes → creates HttpContext object
         │
         ▼
[Middleware Pipeline] ← each middleware WRAPS everything below it
  │
  ├─ [1] ExceptionHandler     ← outermost — catches ALL exceptions below
  ├─ [2] HTTPS Redirection    ← HTTP → HTTPS
  ├─ [3] Correlation ID       ← add/read X-Correlation-Id header
  ├─ [4] Request Logging      ← log incoming request
  ├─ [5] Authentication       ← validate JWT → populate User.Claims
  ├─ [6] Authorization        ← check [Authorize] roles/policies
  ├─ [7] CORS                 ← handle OPTIONS preflight + add headers
  ├─ [8] Rate Limiting        ← quota check per tenant
  ├─ [9] Routing              ← match URL to controller action
  └─ [10] Endpoint / MVC
              │
              ├─ Model Binding     → route/query/body → action params
              ├─ Model Validation  → DataAnnotations
              ├─ Action Filters    → OnActionExecuting
              ├─ ► CONTROLLER ACTION  ← your code runs here
              ├─ Action Filters    → OnActionExecuted
              └─ Result Execution  → serialize to JSON
         │
         ▼ Response travels BACK UP through each middleware
[Kestrel sends bytes to client]
```

```csharp
// Program.cs — ORDER IS CRITICAL
var app = builder.Build();

app.UseExceptionHandler("/error");      // FIRST — catches everything below
app.UseHttpsRedirection();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseAuthentication();                // BEFORE Authorization
app.UseAuthorization();
app.UseCors("CapitalAccessPolicy");
app.UseRateLimiter();
app.MapControllers();                   // LAST

app.Run();
```

**Why order matters:**
```csharp
// ❌ Wrong — Authorization runs before Authentication
app.UseAuthorization();   // User.Claims not populated yet — can't check roles
app.UseAuthentication();

// ✅ Correct
app.UseAuthentication();  // populate User.Claims from JWT
app.UseAuthorization();   // now roles are available ✅
```

**Model binding — where parameters come from:**
```csharp
[HttpGet("{tenantId}/engagements/{id:guid}")]
public async Task<IActionResult> Get(
    [FromRoute]  string tenantId,      // from URL path
    [FromRoute]  Guid id,              // from URL path
    [FromQuery]  string? filter,       // from ?filter=completed
    [FromHeader] string correlationId, // from X-Correlation-Id header
    [FromBody]   UpdateDto dto         // from JSON request body
)
```

> **Interview line**: "In Capital Access, the Correlation ID middleware runs third — before authentication — so even failed auth attempts get a correlation ID in the logs. Authentication runs before Authorization because you can't check roles until the JWT is validated and User.Claims is populated."

---

### Q56. [Topic: ASP.NET Core] [EPAM] What is middleware? List all built-in middleware.

Middleware is a component in the request pipeline that processes requests and responses. Each middleware calls the next one, forming a chain.

```csharp
// BUILT-IN MIDDLEWARE shipped with ASP.NET Core:
app.UseExceptionHandler()       // global exception → ProblemDetails response
app.UseStatusCodePages()        // 404/500 → readable error pages
app.UseHsts()                   // Strict-Transport-Security header
app.UseHttpsRedirection()       // HTTP → HTTPS redirect
app.UseStaticFiles()            // serve wwwroot files
app.UseRouting()                // endpoint routing (implicit in .NET 7+)
app.UseRequestLocalization()    // i18n — culture from Accept-Language header
app.UseAuthentication()         // validate JWT/cookie, populate User
app.UseAuthorization()          // enforce [Authorize] attributes
app.UseCors()                   // CORS headers + preflight handling
app.UseRateLimiter()            // throttle requests per client/tenant
app.UseResponseCaching()        // cache GET responses
app.UseResponseCompression()    // gzip/brotli compress responses
app.UseSession()                // session state (rare in APIs)
app.UseWebSockets()             // HTTP → WebSocket upgrade
app.MapControllers()            // MVC controllers as endpoints
app.MapHealthChecks("/health")  // health check endpoint
```

---

### Q57. [Topic: ASP.NET Core] [EPAM] How do you create custom middleware? Give a real example.

```csharp
// Capital Access — Correlation ID middleware
// Adds unique trace ID to every request so we can trace across all 7 microservices
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;
    private const string Header = "X-Correlation-Id";

    public CorrelationIdMiddleware(RequestDelegate next,
        ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Read from incoming request or generate new one
        var correlationId = context.Request.Headers[Header].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        // Add to response so caller can log it
        context.Response.Headers[Header] = correlationId;
        context.Items["CorrelationId"] = correlationId;

        // Add to all log statements in this request scope
        using (_logger.BeginScope(new Dictionary<string, object>
               { ["CorrelationId"] = correlationId }))
        {
            await _next(context); // call next middleware
        }
        // response flows back through here
    }
}

// Register
app.UseMiddleware<CorrelationIdMiddleware>();

// Propagate to downstream HTTP calls (Capital Access — 7 microservices)
public class CorrelationIdDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _accessor;

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var id = _accessor.HttpContext?.Response.Headers[Header].ToString();
        if (!string.IsNullOrEmpty(id))
            request.Headers.TryAddWithoutValidation(Header, id);
        return base.SendAsync(request, ct);
    }
}
// Every outbound HTTP call now carries the correlation ID ✅
// App Insights: filter by correlationId → see ALL logs for one user action ✅
```

---

### Q58. [Topic: ASP.NET Core] [EPAM] Middleware vs Action Filters — difference and when to use each?

| | Middleware | Action Filter |
|---|---|---|
| Scope | Entire pipeline — every request | MVC layer only — controller actions |
| Access to | Raw `HttpContext` | `ActionContext`, `ModelState`, action result |
| Applied via | `app.UseMiddleware<>()` in Program.cs | `[ServiceFilter]`, global filters |
| Runs before routing? | Yes | No — after routing |
| Use for | Auth, CORS, logging, rate limiting, exceptions | Per-endpoint audit, validation, result shaping |

```csharp
// MIDDLEWARE — for ALL requests (static files, health checks, everything)
public class RequestTimingMiddleware
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var sw = Stopwatch.StartNew();
        await _next(ctx);
        sw.Stop();

        if (sw.ElapsedMilliseconds > 500)
            _logger.LogWarning("Slow: {Method} {Path} — {Ms}ms",
                ctx.Request.Method, ctx.Request.Path, sw.ElapsedMilliseconds);
    }
}

// ACTION FILTER — for specific controllers, has MVC context
public class TenantAuditFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var tenantId = context.HttpContext.User.FindFirst("tenantId")?.Value;
        var action   = context.ActionDescriptor.DisplayName;
        _audit.Record(tenantId, action, DateTime.UtcNow); // per-endpoint audit ✅
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.Exception is not null)
            _audit.RecordFailure(context.Exception.Message);
    }
}

// Apply to specific controller only
[ServiceFilter(typeof(TenantAuditFilter))]
public class EngagementController : ControllerBase { }
```

> **Interview line**: "Middleware runs for every request — even static file requests, health checks. Action Filters only run inside the MVC pipeline, which means they have access to ModelState and the action result. In Capital Access, our request timing and correlation ID are middleware (apply everywhere). Tenant audit logging is an Action Filter — it only makes sense for authenticated controller actions and needs access to the specific action name."

---

### Q59. [Topic: ASP.NET Core] [EPAM] What is DI? What are service lifetimes? What is the captive dependency trap?

**Dependency Injection** — the framework creates and injects dependencies; classes don't create their own. Wired in Program.cs.

```csharp
// TRANSIENT — new instance every time requested from DI
builder.Services.AddTransient<IEmailFormatter, HtmlEmailFormatter>();
// Each class that injects IEmailFormatter gets its own separate instance

// SCOPED — one instance per HTTP request
builder.Services.AddScoped<EngagementDbContext>();
builder.Services.AddScoped<IEngagementRepository, SqlEngagementRepository>();
// All classes within ONE request share the SAME DbContext
// Different requests → different DbContext instances ✅

// SINGLETON — one instance for entire app lifetime
builder.Services.AddSingleton<IMemoryCache, MemoryCache>();
builder.Services.AddSingleton<ServiceBusClient>();
// Shared across ALL requests, ALL threads — must be thread-safe
```

**Capital Access mapping:**
```
Transient:  IEmailFormatter, IPdfRenderer (cheap, stateless)
Scoped:     EngagementDbContext, ICurrentTenantService, IEngagementRepository
Singleton:  IMemoryCache, ServiceBusClient, IConfiguration
```

**The captive dependency trap:**
```csharp
// ❌ Singleton consuming Scoped service — runtime error in dev
builder.Services.AddSingleton<IReportOrchestrator, ReportOrchestrator>();
// ReportOrchestrator injects IEngagementRepository (Scoped)
// Singleton lives forever → captures the FIRST request's Scoped instance
// All subsequent requests share that stale instance → tenant data leaks ❌
// .NET throws: "Cannot consume scoped service from singleton"

// ✅ Fix: IServiceScopeFactory — create scope manually when needed
public class ReportOrchestrator
{
    private readonly IServiceScopeFactory _scopeFactory;

    public async Task GenerateAsync(Guid jobId)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IEngagementRepository>();
        // fresh scoped instance per call ✅
    }
}
```

| Lifetime | New instance | Can inject | Safe in Singleton? |
|---|---|---|---|
| Transient | Every DI request | Anything | ❌ Short-lived captured |
| Scoped | Per HTTP request | Transient | ❌ Captured by singleton |
| Singleton | App start | Transient + Singleton | ✅ |

---

### Q60. [Topic: ASP.NET Core] [EPAM] What is JWT authentication? Explain the full validation flow.

```
1. User logs in → Angular calls Okta /authorize
2. Okta validates credentials → issues JWT:
   Header.Payload.Signature  (Base64 encoded, dot-separated)
   Payload: { "sub": "user-123", "tenantId": "spg-001",
              "roles": ["IRAdmin"], "exp": 1750000000 }
3. Angular stores token IN MEMORY (never localStorage → XSS risk)
4. Every API request: Authorization: Bearer <token>

5. ASP.NET Core Authentication middleware:
   a. Extracts token from Authorization header
   b. Validates SIGNATURE using Okta's public key (RS256)
   c. Checks: expiry (exp), issuer (iss), audience (aud)
   d. Populates HttpContext.User with claims from payload
6. Authorization middleware: checks [Authorize(Roles = "IRAdmin")]
7. Controller: reads tenantId from claims → EF Core global filter uses it
```

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://spglobal.okta.com/oauth2/default";
        options.Audience  = "api://capital-access";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

// Controller
[Authorize(Roles = "IRAdmin")]
[HttpPost]
public async Task<IActionResult> CreateEngagement([FromBody] CreateEngagementDto dto)
{
    var tenantId = User.FindFirst("tenantId")?.Value;    // custom Okta claim
    var userId   = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    // All DB queries auto-filtered to tenantId via global query filter ✅
}
```

---

### Q61. [Topic: ASP.NET Core] [EPAM] What is CORS and how do you configure it?

CORS = Cross-Origin Resource Sharing. A **browser** security mechanism that prevents JavaScript from calling a different domain than the page was served from.

```csharp
// Capital Access: Angular at capitalaccess.spglobal.com, API at api.capitalaccess.com
builder.Services.AddCors(options =>
{
    options.AddPolicy("CapitalAccessPolicy", policy =>
        policy
            .WithOrigins(
                "https://capitalaccess.spglobal.com",
                "https://staging.capitalaccess.com",
                "http://localhost:4200")         // dev
            .AllowAnyMethod()                   // GET, POST, PUT, DELETE, PATCH
            .AllowAnyHeader()                   // Content-Type, Authorization, X-Correlation-Id
            .AllowCredentials());               // allow Authorization header
});

app.UseCors("CapitalAccessPolicy"); // before UseAuthentication

// Preflight (OPTIONS) — browser sends this before POST/PUT/DELETE
// CORS middleware handles it automatically → 204 + CORS headers ✅
```

**Key fact**: CORS is a BROWSER restriction — not server security. The server receives the request regardless. CORS only prevents the browser from showing the response to the calling JavaScript.

---

### Q62. [Topic: ASP.NET Core] [EPAM] What is your error handling strategy in .NET Core?

```csharp
// Global exception handler — registered FIRST in pipeline
app.UseExceptionHandler(errApp =>
{
    errApp.Run(async ctx =>
    {
        var ex     = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
        var corrId = ctx.Response.Headers["X-Correlation-Id"].ToString();

        _logger.LogError(ex, "Unhandled exception. CorrelationId: {Id}", corrId);

        var (status, message) = ex switch
        {
            NotFoundException             => (404, ex.Message),
            ValidationException v         => (400, v.Message),
            UnauthorizedAccessException   => (403, "Access denied"),
            DbUpdateConcurrencyException  => (409, "Data was modified — please refresh"),
            _                             => (500, "An unexpected error occurred")
        };

        ctx.Response.StatusCode  = status;
        ctx.Response.ContentType = "application/problem+json"; // RFC 7807
        await ctx.Response.WriteAsJsonAsync(new
        {
            type   = $"https://capitalaccess.com/errors/{status}",
            title  = message,
            status,
            correlationId = corrId // client reports this to support ✅
        });
    });
});

// Domain exceptions — thrown in business layer, caught by handler above
public class EngagementNotFoundException : NotFoundException
{
    public EngagementNotFoundException(Guid id) : base($"Engagement {id} not found") { }
}
```

---

### Q63. [Topic: ASP.NET Core] [EPAM] How do you validate models in ASP.NET Core?

```csharp
// Data annotations on DTO
public class CreateEngagementDto
{
    [Required]
    [StringLength(20, MinimumLength = 2)]
    public string CompanyId { get; set; } = "";

    [Required]
    [EnumDataType(typeof(ActivityType))]
    public string ActivityType { get; set; } = "";

    [FutureDate]                          // custom attribute
    public DateTime ScheduledAt { get; set; }

    [Range(1, 50)]
    public int ExpectedAttendees { get; set; }
}

// Custom validation attribute
public class FutureDateAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
        => value is DateTime dt && dt > DateTime.UtcNow;

    public override string FormatErrorMessage(string name)
        => $"{name} must be a future date.";
}

// ASP.NET Core auto-validates BEFORE action runs
// Invalid → 400 Bad Request with ModelState errors automatically
// No if (!ModelState.IsValid) needed in every action ✅

// FluentValidation — complex cross-field rules
public class CreateEngagementValidator : AbstractValidator<CreateEngagementDto>
{
    public CreateEngagementValidator()
    {
        RuleFor(x => x.CompanyId)
            .NotEmpty().Length(2, 20)
            .Matches(@"^[A-Z]{2,6}$").WithMessage("Must be ticker format: 2-6 uppercase letters");

        RuleFor(x => x.ScheduledAt)
            .GreaterThan(DateTime.UtcNow).WithMessage("Must be a future date")
            .LessThan(DateTime.UtcNow.AddYears(1)).WithMessage("Cannot schedule more than 1 year ahead");
    }
}
```

---

### Q64. [Topic: ASP.NET Core] [EPAM] How do you manage configuration in .NET Core? What is IOptionsMonitor vs IOptionsSnapshot?

**Configuration priority (highest overrides lowest):**
```
Azure Key Vault → Environment Variables → appsettings.{env}.json → appsettings.json
```

```csharp
// Program.cs — build configuration in priority order
builder.Configuration
    .AddJsonFile("appsettings.json")
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables()
    .AddAzureKeyVault(
        new Uri($"https://ca-prod-kv.vault.azure.net/"),
        new DefaultAzureCredential()); // Managed Identity — zero credentials in code ✅

// Strongly typed options
public class TargetingOptions
{
    public int CacheExpiryMinutes { get; set; }
    public int MaxConcurrentRequests { get; set; }
}
builder.Services.Configure<TargetingOptions>(builder.Configuration.GetSection("Targeting"));
```

```csharp
// IOptions<T> — Singleton. Reads ONCE at startup. Never refreshes.
public class TargetingService(IOptions<TargetingOptions> opts)
{
    // opts.Value — same value for entire app lifetime
}

// IOptionsSnapshot<T> — Scoped. Re-reads per HTTP request. Picks up file changes.
public class ReportController(IOptionsSnapshot<TargetingOptions> opts)
{
    // opts.Value — fresh read per request ✅
}

// IOptionsMonitor<T> — Singleton. Notifies on change. Always current value.
public class FeatureFlagService(IOptionsMonitor<FeatureFlagOptions> monitor)
{
    public FeatureFlagService()
    {
        monitor.OnChange(opts => _logger.LogInformation("Feature flags refreshed"));
    }
    public bool IsEnabled(string flag) => monitor.CurrentValue.GetValueOrDefault(flag, false);
}
```

| | `IOptions<T>` | `IOptionsSnapshot<T>` | `IOptionsMonitor<T>` |
|---|---|---|---|
| Lifetime | Singleton | Scoped | Singleton |
| When read | App startup once | Per request | On change |
| Use for | Immutable settings | Per-request config | Live feature flags |

---

### Q65. [Topic: ASP.NET Core] [EPAM] What is Azure Key Vault and why use Managed Identity instead of credentials?

**The bootstrap problem:** If you need credentials to access Key Vault, where do you safely store those credentials?

**Answer: Managed Identity — no credentials at all.**

```csharp
// ❌ WRONG — client secret in code (circular problem)
.AddAzureKeyVault(vaultUri, new ClientSecretCredential(tenantId, clientId, clientSecret));
// The clientSecret itself needs to be hidden somewhere — back to square one ❌

// ✅ CORRECT — Managed Identity via DefaultAzureCredential
.AddAzureKeyVault(new Uri("https://ca-prod-kv.vault.azure.net/"), new DefaultAzureCredential());
// Zero credentials in code. Azure infrastructure IS the credential. ✅
```

**How Managed Identity works:**
```
[Azure App Service]
    │  "Who am I?"
    ▼
[Azure Instance Metadata Service]
    │  "You are 'ca-prod-api' (Managed Identity)"
    ▼
[Azure Active Directory]
    │  Issues short-lived token automatically — no password
    ▼
[Azure Key Vault]
    │  "Does 'ca-prod-api' have Key Vault Secrets Reader role?" → YES
    ▼
Returns secrets to app
```

**Setup (one-time, no code changes):**
```bash
# Assign Managed Identity to App Service
az webapp identity assign --name ca-prod-api --resource-group ca-rg

# Grant Key Vault access
az keyvault set-policy --name ca-prod-kv --object-id <principalId> --secret-permissions get list
```

**DefaultAzureCredential — tries in order:**
```
Local dev:    Azure CLI (az login once) → your personal account
CI/CD:        Environment variables (AZURE_CLIENT_ID + AZURE_CLIENT_SECRET)
Production:   Managed Identity → automatic, no credentials ✅
```

**What goes where:**
```
appsettings.json (in git — safe to be public)
  ✅ Key Vault URL, cache expiry, feature flags, topic names

Azure Key Vault (access-controlled by Managed Identity)
  ✅ Connection strings, JWT keys, API keys, storage account keys

Code
  ❌ Nothing sensitive — ever
```

---

### Q66. [Topic: ASP.NET Core] [EPAM] What is REST? What are the key principles?

REST = Representational State Transfer. Six constraints:

| Constraint | Meaning | Capital Access |
|---|---|---|
| **Stateless** | Every request is self-contained. No server-side session. | JWT carries all identity. Server holds no session state. |
| **Client-Server** | UI and backend are separated | Angular SPA fully separate from .NET services |
| **Uniform Interface** | Standard HTTP verbs, resource URLs | `GET /api/engagements/{id}`, `POST /api/engagements` |
| **Resource-based URLs** | Nouns, not verbs | ✅ `/api/engagements` ❌ `/api/getEngagement` |
| **Cacheable** | Responses declare cacheability | GET responses include `Cache-Control` headers |
| **Layered System** | Client doesn't know about intermediaries | Angular calls API Gateway — unaware of 7 microservices |

**HTTP Verbs:**
```
GET    /api/engagements          → get all
GET    /api/engagements/{id}     → get one
POST   /api/engagements          → create new
PUT    /api/engagements/{id}     → full replace
PATCH  /api/engagements/{id}     → partial update
DELETE /api/engagements/{id}     → delete
```

**Status codes — must know:**
```
200 OK           → success with body
201 Created      → POST success, Location header points to new resource
204 No Content   → DELETE/PUT success, no body
400 Bad Request  → client sent invalid data
401 Unauthorized → not authenticated (missing/invalid token)
403 Forbidden    → authenticated but wrong role/permission
404 Not Found    → resource doesn't exist
409 Conflict     → optimistic concurrency conflict
422 Unprocessable → validation errors
500 Server Error → unhandled exception
```

---

### Q67. [Topic: ASP.NET Core] [EPAM] How do you achieve API versioning?

```csharp
// Install: Microsoft.AspNetCore.Mvc.Versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true; // adds api-supported-versions header
});

// APPROACH 1 — URL segment (Capital Access choice — most explicit)
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/engagements")]
public class EngagementV1Controller : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(Guid id) { /* basic response */ }
}

[ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/engagements")]
public class EngagementV2Controller : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(Guid id) { /* paginated + richer response */ }
}
// /api/v1/engagements/abc → V1Controller
// /api/v2/engagements/abc → V2Controller

// APPROACH 2 — Query string: GET /api/engagements?api-version=2.0
// APPROACH 3 — Header: api-version: 2.0

// Deprecate old version
[ApiVersion("1.0", Deprecated = true)]
// Response adds: api-deprecated-versions: 1.0 header → clients get warning
```

---

### Q68. [Topic: ASP.NET Core] Content Negotiation — how does it work?

Client declares what format it accepts via `Accept` header. Server responds in best matching format.

```csharp
// Add XML support (JSON is default)
builder.Services.AddControllers().AddXmlSerializerFormatters();

// Capital Access — report download with content negotiation
[HttpGet("{id}/download")]
[Produces("application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
public async Task<IActionResult> DownloadReport(Guid id)
{
    var accept = Request.Headers["Accept"].ToString();

    if (accept.Contains("application/pdf"))
    {
        var bytes = await _reportService.GeneratePdfAsync(id);
        return File(bytes, "application/pdf", "report.pdf");
    }
    if (accept.Contains("spreadsheetml"))
    {
        var bytes = await _reportService.GenerateExcelAsync(id);
        return File(bytes, "application/vnd.openxmlformats...", "report.xlsx");
    }

    return StatusCode(406); // 406 Not Acceptable
}
```

---

### Q69. [Topic: ASP.NET Core] How do you secure a Web API endpoint? Name all best practices.

```
1.  Authentication       → JWT (Okta) — every request needs valid token
2.  Authorization        → [Authorize(Roles = "IRAdmin")] — RBAC on every endpoint
3.  HTTPS only           → UseHttpsRedirection + HSTS header
4.  CORS locked down     → specific origins, never wildcard (*) in production
5.  Rate limiting        → prevent abuse per tenant/IP
6.  Input validation     → FluentValidation on all DTOs
7.  SQL Injection        → EF Core LINQ always — never string SQL concatenation
8.  No secrets in URLs   → tokens/passwords never in query strings (logged everywhere)
9.  Secrets in Key Vault → never in appsettings.json
10. Least privilege DB   → app DB user has SELECT/INSERT/UPDATE only — no DROP/ALTER
11. Security headers     → X-Content-Type-Options, X-Frame-Options, CSP
12. Correlation ID       → every request traceable for security audit

// Security headers middleware (Capital Access)
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"]        = "DENY";
    ctx.Response.Headers["Referrer-Policy"]        = "no-referrer";
    await next();
});
```

---

### Q70. [Topic: ASP.NET Core] SQL Injection — what is it and how do you prevent it?

```csharp
// WHAT IT IS: attacker injects SQL code via user input
string sql = $"SELECT * FROM Users WHERE Name = '{userInput}'";
// Attacker sends: userInput = "'; DROP TABLE Users; --"
// Result: SELECT * FROM Users WHERE Name = ''; DROP TABLE Users; --'
// Table deleted ❌

// PREVENTION 1: EF Core LINQ — always parameterised, injection impossible
var result = await _context.EngagementActivities
    .Where(e => e.TenantId == tenantId) // → WHERE TenantId = @p0 ✅
    .ToListAsync();

// PREVENTION 2: If raw SQL needed — use ExecuteSqlInterpolated (NOT raw)
await _context.Database.ExecuteSqlInterpolatedAsync(
    $"EXEC sp_GetEngagements @tenantId = {tenantId}"); // ✅ parameterised

// ❌ NEVER — string concatenation in raw SQL
await _context.Database.ExecuteSqlRawAsync(
    $"SELECT * WHERE TenantId = '{tenantId}'"); // VULNERABLE ❌
```

---

### Q71. [Topic: ASP.NET Core] How do you debug a slow API response?

```
Step 1 — REPRODUCE: exact endpoint, payload, tenant, time of day
Step 2 — MEASURE: p50 vs p95 vs p99. Always slow or under load only?
Step 3 — APP INSIGHTS: distributed trace shows exactly where time is spent
Step 4 — FIX the specific bottleneck
Step 5 — VERIFY: measure again after fix
```

| Root Cause | Fix |
|---|---|
| Missing DB index | Add index on WHERE/ORDER BY columns |
| N+1 query | `.Include()` or `.Select()` projection |
| No pagination | `.Skip().Take()` + paged response |
| Sequential awaits | `Task.WhenAll()` for independent calls |
| No AsNoTracking on reads | Add `.AsNoTracking()` |
| LOH pressure (large byte[]) | `ArrayPool<byte>` for large buffers |
| DbContext as Singleton | Fix to Scoped — one per request |
| Downstream service slow | Cache + circuit breaker (Polly) |

**N+1 — most common EF Core trap:**
```csharp
// ❌ 1 query + 1 per activity = 101 queries for 100 activities
var activities = await _context.EngagementActivities.ToListAsync();
foreach (var a in activities)
    Console.WriteLine(a.Attendees.Count); // triggers DB call per activity ❌

// ✅ 1 query with JOIN
var activities = await _context.EngagementActivities
    .Include(a => a.Attendees)
    .ToListAsync();

// ✅ Best — project to DTO (select only what you need)
var dtos = await _context.EngagementActivities
    .Select(a => new { a.Id, AttendeeCount = a.Attendees.Count })
    .ToListAsync(); // COUNT(*) in SQL — no data transfer ✅
```

---

### Q72. [Topic: ASP.NET Core] What is Clean Architecture and what are its benefits?

```
Domain Layer      → entities, value objects, domain events, repository INTERFACES
                   Zero framework dependencies (no EF Core, no HTTP)
Application Layer → use cases, command/query handlers, DTOs
                   Depends on Domain only
Infrastructure    → EF Core, SQL Server, Service Bus, Redis, HttpClient
                   Implements Domain interfaces
Presentation      → Controllers, Minimal APIs
                   Depends on Application layer
```

**Dependency rule: always inward. Domain knows nothing about EF Core.**

```csharp
// Domain — zero framework deps, fully unit testable
public interface IEngagementRepository  // interface here, implementation in Infrastructure
{
    Task<EngagementActivity?> GetByIdAsync(Guid id);
    Task SaveAsync();
}

// Application — depends on Domain interfaces only
public class CompleteEngagementHandler
{
    private readonly IEngagementRepository _repo; // interface, not EF Core
    private readonly IEventPublisher _publisher;

    public async Task Handle(CompleteEngagementCommand cmd)
    {
        var activity = await _repo.GetByIdAsync(cmd.ActivityId);
        activity.Complete(cmd.Notes);
        await _repo.SaveAsync();
        await _publisher.PublishAsync(new EngagementCompletedEvent(cmd.ActivityId));
    }
}

// Infrastructure — EF Core lives HERE only
public class SqlEngagementRepository : IEngagementRepository
{
    private readonly EngagementDbContext _context; // hidden from Domain and Application
}
```

**Benefits:**
```
1. Domain + Application are fully unit testable — no database, no HTTP needed
2. Swap EF Core for Dapper → only Infrastructure changes
3. Swap SQL Server for Cosmos DB → same Domain, different Infrastructure
4. Controllers stay thin — all logic in Application/Domain
5. Business rules never leak into Infrastructure
```

---

### Q73. [Topic: ASP.NET Core] What is your approach to migrate from .NET Framework 4.7 to .NET 8?

**Strangler Fig Pattern — don't rewrite all at once:**

```
Phase 1: ASSESS
  Run .NET Upgrade Assistant → scan incompatible packages
  Identify Windows-only deps (COM, System.Web, HttpContext.Current)

Phase 2: SHARED LIBRARY FIRST
  Extract domain logic into .NET Standard 2.0 libraries
  .NET Standard 2.0 works in BOTH Framework 4.7 AND .NET 8
  Both runtimes reference same business rules during migration

Phase 3: MIGRATE ONE SERVICE AT A TIME
  Move packages.config → PackageReference format
  Replace HttpContext.Current → IHttpContextAccessor
  Replace Unity/Autofac DI → built-in builder.Services
  Replace ApiController → ControllerBase
  Replace Global.asax + WebApiConfig → Program.cs

Phase 4: RUN BOTH IN PARALLEL
  New .NET 8 version handles traffic
  Old .NET Framework version on standby
  Feature-flagged traffic split → validate in production

Phase 5: DECOMMISSION old version
```

**Key code changes:**
```csharp
// OLD: Global.asax + WebApiConfig
public class WebApiApplication : HttpApplication
{
    protected void Application_Start()
    {
        GlobalConfiguration.Configure(WebApiConfig.Register);
    }
}

// NEW: Program.cs — single entry point
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();

// OLD: Unity DI
container.RegisterType<IEngagementRepository, SqlEngagementRepository>(
    new HierarchicalLifetimeManager());

// NEW: Built-in DI
builder.Services.AddScoped<IEngagementRepository, SqlEngagementRepository>();

// OLD: System.Web.Http.ApiController
public class EngagementController : ApiController { }

// NEW: Microsoft.AspNetCore.Mvc.ControllerBase
public class EngagementController : ControllerBase { }
// Attributes are the same: [HttpGet], [FromBody], [Route] ✅
```

> **Interview line**: "We migrated Capital Access from .NET Framework 4.7 monolith to .NET 8 microservices using the strangler fig pattern. We extracted domain logic into .NET Standard 2.0 first so both runtimes could reference the same business rules. Then we replaced Unity with built-in DI, Global.asax with Program.cs, and ApiController with ControllerBase. The reward was 2.5× throughput improvement on the same hardware and the ability to deploy on Linux containers."

---

### Q74. [Topic: ASP.NET Core] Rate Limiting — Middleware vs Infrastructure Layer

Both layers serve DIFFERENT purposes — they are complementary, not redundant.

```
[Internet]
    ↓
[API Gateway / Azure APIM / Cloudflare]   ← Layer 1: Infrastructure Rate Limiting
    ↓
[.NET Rate Limiting Middleware]           ← Layer 2: Application Rate Limiting
    ↓
[Controller]
```

**Layer 1 — API Gateway (before request hits your app):**
```
- Per IP address: max 1000 requests/minute
- Per API key: max 10 requests/second
- Block known bad actors by IP
- Stop DDoS before wasting any server CPU
- Cannot see: tenantId, user tier, which endpoint is expensive
  (JWT not yet validated at this layer)
```

**Layer 2 — .NET Middleware (after authentication):**
```csharp
// KNOWS the tenantId (JWT already validated) — apply business rules
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("TenantPolicy", context =>
    {
        var tenantId = context.User.FindFirst("tenantId")?.Value;
        var tier     = context.User.FindFirst("tier")?.Value;

        // Enterprise tenants: 500/min. Standard: 100/min.
        return tier == "enterprise"
            ? RateLimitPartition.GetFixedWindowLimiter(tenantId, _ =>
                new() { PermitLimit = 500, Window = TimeSpan.FromMinutes(1) })
            : RateLimitPartition.GetFixedWindowLimiter(tenantId, _ =>
                new() { PermitLimit = 100, Window = TimeSpan.FromMinutes(1) });
    });

    // Report generation is CPU/memory expensive — stricter limit per endpoint
    options.AddFixedWindowLimiter("ReportLimit", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window      = TimeSpan.FromMinutes(10); // max 5 reports per 10 min
    });
});

[HttpPost("generate")]
[EnableRateLimiting("ReportLimit")] // per-endpoint limit ✅
public async Task<IActionResult> GenerateReport([FromBody] ReportRequestDto dto) { }
```

**Why you need BOTH:**
```
Attack 1 — Bot flood from 500 IPs:
  API Gateway: blocks by IP before reaching .NET ✅ (saves CPU)

Attack 2 — Valid enterprise tenant hammering reports:
  API Gateway: valid client, passes through ✅
  .NET middleware: reads tenantId → 5 reports/10min limit → throttled ✅
  (API Gateway cannot do this — doesn't know which endpoint is expensive)
```

## 5. Entity Framework Core

### What is EF Core?
ORM (Object-Relational Mapper) that maps C# classes to database tables. In Capital Access, the Engagement/Activity service uses EF Core 8 with Azure SQL.

### Code-First vs Database-First

| | Code-First | Database-First |
|---|-----------|---------------|
| Source of truth | C# entity classes | Existing DB schema |
| Command | `dotnet ef migrations add Init` → `dotnet ef database update` | `dotnet ef dbcontext scaffold "connStr" Microsoft.EntityFrameworkCore.SqlServer` |
| Use when | Greenfield, team owns schema | Legacy DB exists, DBA owns schema |

**Capital Access uses Code-First** — migrations tracked in git.

### DbContext and DbSet
```csharp
public class CapitalAccessDbContext : DbContext
{
    public DbSet<EngagementActivity> EngagementActivities { get; set; }
    public DbSet<InvestorProfile>    InvestorProfiles     { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngagementActivity>(e => {
            e.ToTable("EngagementActivities");
            e.HasKey(x => x.Id);
            e.Property(x => x.TenantId).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.TenantId);
            e.HasOne(x => x.Company)
             .WithMany(c => c.Engagements)
             .HasForeignKey(x => x.CompanyId);
        });
    }
}
```

### Entity States — Change Tracking

| State | What happens at SaveChanges() |
|-------|------------------------------|
| Added | INSERT |
| Unchanged | Nothing |
| Modified | UPDATE |
| Deleted | DELETE |
| Detached | Not tracked — ignored |

```csharp
var e = await _context.EngagementActivities.FindAsync(id); // Unchanged
e.Status = "Completed";                                     // Modified (auto-detected)
await _context.SaveChangesAsync();                          // UPDATE runs

// Manually set state (entity from API body — not loaded from context)
_context.Entry(entity).State = EntityState.Modified;
await _context.SaveChangesAsync();
```

### N+1 Problem — Most Important EF Core Interview Question

```csharp
// ❌ N+1: 1 query for engagements + N queries for Company (one per row)
var list = await _context.EngagementActivities.ToListAsync();
foreach (var e in list) Console.WriteLine(e.Company.Name); // lazy load per row ❌

// ✅ Fix: Eager loading with Include — one JOIN query
var list = await _context.EngagementActivities
    .Include(e => e.Company)
    .Include(e => e.Attendees)
        .ThenInclude(a => a.ContactInfo)
    .ToListAsync();
```

**Three loading strategies:**
- **Eager** — `Include()` — one query with JOINs ✅ Use this
- **Lazy** — `virtual` nav props + proxy package — loads on access ❌ Causes N+1
- **Explicit** — `_context.Entry(e).Reference(x => x.Company).LoadAsync()` — manual control

### AsNoTracking — Read-Only Performance
```csharp
// Without: EF tracks every entity → memory + CPU overhead
// With: no snapshot, no change tracking → faster reads ✅
var list = await _context.EngagementActivities
    .AsNoTracking()
    .Where(e => e.TenantId == tenantId)
    .ToListAsync();
// Use for all read-only API endpoints ✅
```

### Migrations
```bash
dotnet ef migrations add AddEngagementPriority  # generates Up() + Down()
dotnet ef database update                        # applies migration
dotnet ef database update PreviousMigration      # rollback
```

### EF Core 8 Bulk Operations (no loading required)
```csharp
// ExecuteUpdateAsync — UPDATE without loading entities
await _context.EngagementActivities
    .Where(e => e.TenantId == tenantId && e.Status == "Pending")
    .ExecuteUpdateAsync(e => e.SetProperty(x => x.Status, "Cancelled"));

// ExecuteDeleteAsync — DELETE without loading entities
await _context.EngagementActivities
    .Where(e => e.IsDeleted)
    .ExecuteDeleteAsync();
```

### EF Performance Bottlenecks
- N+1 queries → use Include()
- No AsNoTracking on read-only queries
- SELECT * (no projection) → use `.Select(e => new Dto {...})`
- Calling `.ToList()` too early → filter in IQueryable before materializing
- Missing indexes on FK / filter columns → add via `HasIndex()` in Fluent API

---

## 6. LINQ (Language Integrated Query)

### Method Syntax vs Query Syntax
```csharp
// Method syntax ← use this in interviews
var result = EngagementActivities
    .Where(e => e.TenantId == "spg-001" && e.Status == "Pending")
    .OrderByDescending(e => e.ScheduledAt)
    .Select(e => new { e.Id, e.Status });

// Query syntax (SQL-like — same result)
var result = from e in EngagementActivities
             where e.TenantId == "spg-001" && e.Status == "Pending"
             orderby e.ScheduledAt descending
             select new { e.Id, e.Status };
```

### Deferred vs Immediate Execution — Most Important LINQ Concept

```csharp
// DEFERRED — query defined but NOT run yet (no DB hit)
var query = engagements.Where(e => e.Status == "Pending");

// IMMEDIATE — executes NOW
var list  = query.ToList();           // ← executes
var arr   = query.ToArray();          // ← executes
var count = query.Count();            // ← executes
var first = query.FirstOrDefault();   // ← executes

// Power of deferred — add filters conditionally, ONE SQL query at the end
var q = _context.EngagementActivities.Where(e => e.TenantId == tenantId);
if (status != null)    q = q.Where(e => e.Status == status);
if (from.HasValue)     q = q.Where(e => e.ScheduledAt >= from);
var results = await q.ToListAsync();  // ONE query with all filters ✅
```

### IQueryable vs IEnumerable

```csharp
// IQueryable → filter translated to SQL → runs in database ✅
IQueryable<Engagement> q = _context.EngagementActivities.Where(e => e.TenantId == id);
var result = q.Where(e => e.AttendeeCount > 10).ToList();
// SQL: WHERE TenantId = ? AND AttendeeCount > 10 — ONE filtered query ✅

// IEnumerable → loads ALL into memory first, then filters in C# ❌
IEnumerable<Engagement> e = q.AsEnumerable();   // loads ALL rows here
var result = e.Where(x => x.AttendeeCount > 10).ToList(); // C# filters in memory ❌
// 100,000 rows fetched, 50 used ❌

// Rule: stay IQueryable as long as possible. AsEnumerable() only for C#-specific logic.
```

### Key LINQ Operators

```csharp
// Filtering
.Where(e => e.Status == "Pending")
.OfType<ConcreteType>()

// Projection
.Select(e => new EngagementDto { Id = e.Id, Status = e.Status })

// SelectMany — flatten nested collections (1:many → flat list)
var emails = engagements.SelectMany(e => e.Attendees).Select(a => a.Email);
// [[a1,a2],[a3],[a4,a5]] → [a1,a2,a3,a4,a5] ← flattened ✅
// Select vs SelectMany: Select = 1:1, SelectMany = 1:many flatten

// Ordering
.OrderBy(e => e.TenantId).ThenByDescending(e => e.ScheduledAt)

// Grouping
engagements.GroupBy(e => e.TenantId)
           .Select(g => new { TenantId = g.Key, Count = g.Count() })

// Aggregation
.Count()                          // total rows
.Count(e => e.Status == "Pending") // conditional count
.Sum(e => e.AttendeeCount)
.Average(e => e.AttendeeCount)
.Min(e => e.ScheduledAt)
.Max(e => e.ScheduledAt)

// Element operators
.First(e => e.Id == id)           // throws if empty
.FirstOrDefault(e => e.Id == id)  // null if empty ← use this ✅
.Single(e => e.Id == id)          // throws if 0 or >1 match
.SingleOrDefault(e => e.Id == id) // null if empty, throws if >1

// Quantifiers
.Any(e => e.Status == "Pending")  // true if at least one ✅ (short-circuits)
.All(e => e.Status == "Active")   // true if ALL match
.Contains(item)

// Any() is faster than Count() > 0 for existence check ✅

// Set operations
.Distinct()
.Union(otherList)     // distinct values from both
.Intersect(otherList) // values in both
.Except(otherList)    // values in first NOT in second

// Pagination
.Skip(20).Take(10)    // page 2 of 10

// Conversion
.ToList() .ToArray() .ToDictionary(e => e.Id) .ToHashSet()
```

### Divisible-by-N Examples (EPAM Specific)
```csharp
var numbers = Enumerable.Range(1, 30);

// Divisible by 3
var divBy3 = numbers.Where(n => n % 3 == 0).ToList();

// Divisible by 5
var divBy5 = numbers.Where(n => n % 5 == 0).ToList();

// Divisible by BOTH (FizzBuzz)
var divByBoth = numbers.Where(n => n % 3 == 0 && n % 5 == 0).ToList();

// Generic — divisible by N
int N = 4;
Func<int, bool> isDivisibleByN = n => n % N == 0;
var divByN = numbers.Where(isDivisibleByN).ToList();

// Count and Sum
int count = numbers.Count(n => n % 3 == 0);   // 10
int sum   = numbers.Where(n => n % 3 == 0).Sum(); // 165
bool any  = numbers.Any(n => n % 7 == 0);     // true
```

---

## 7. Generics and Delegates

### Generics — Benefits
```csharp
// Without generics: separate class per type, or object (loses type safety)
public class IntRepository  { public int GetById(int id) {...} }
public class StringRepository { public string GetById(int id) {...} }

// With generics: one implementation, type-safe, reusable
public class Repository<T> where T : class
{
    private readonly DbContext _context;
    public Repository(DbContext context) => _context = context;

    public async Task<T?> GetByIdAsync(int id) => await _context.Set<T>().FindAsync(id);
    public async Task<List<T>> GetAllAsync() => await _context.Set<T>().ToListAsync();
    public void Add(T entity) => _context.Set<T>().Add(entity);
}

// Usage — same class works for any entity
var engRepo = new Repository<EngagementActivity>(context);
var profRepo = new Repository<InvestorProfile>(context);
```

**Generic Constraints:**
```csharp
where T : class          // must be reference type
where T : struct         // must be value type
where T : new()          // must have parameterless constructor
where T : BaseClass      // must inherit from BaseClass
where T : IInterface     // must implement interface
where T : class, new()   // multiple constraints combined
```

**Generic Methods:**
```csharp
public static T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;

Max(3, 7);      // returns 7 (int)
Max("a", "z");  // returns "z" (string)
```

### Delegates — Action\<T\>, Func\<T\>, Predicate\<T\>

```csharp
// Action<T> — takes parameters, returns VOID
Action<string> log = message => Console.WriteLine(message);
Action<string, int> logWithLevel = (msg, level) => Console.WriteLine($"[{level}] {msg}");
log("Engagement created");

// Func<T, TResult> — takes parameters, returns a VALUE
// Last type parameter = return type
Func<int, bool>        isEven    = n => n % 2 == 0;
Func<int, int, int>    add       = (a, b) => a + b;
Func<string, string>   toUpper   = s => s.ToUpper();
Func<int, bool>        divBy3    = n => n % 3 == 0;

bool result = isEven(4);  // true

// Predicate<T> — takes T, always returns bool (shorthand for Func<T, bool>)
Predicate<int> isPositive = n => n > 0;
bool pos = isPositive(5);  // true
// Predicate<T> == Func<T, bool> — functionally identical, Predicate is older convention

// Capital Access: passing behaviour as parameter
public List<EngagementActivity> Filter(Func<EngagementActivity, bool> predicate)
    => _context.EngagementActivities.Where(predicate).ToList();

var pending   = Filter(e => e.Status == "Pending");
var large     = Filter(e => e.AttendeeCount > 50);
var myTenant  = Filter(e => e.TenantId == "spg-001");
```

**Custom Delegate (old style — rarely needed now):**
```csharp
delegate int MathOperation(int a, int b);  // define delegate type
MathOperation add = (a, b) => a + b;
int result = add(3, 4);  // 7
```

**Events using delegates:**
```csharp
public event Action<string> OnEngagementCreated;
OnEngagementCreated?.Invoke(engagementId);  // fire event
OnEngagementCreated += id => SendNotification(id);  // subscribe
```

---

## 8. async/await Pitfalls and Memory Leaks

### async/await Pitfalls

**① Deadlock with .Result or .Wait() ← Most Common Bug**
```csharp
// ❌ Deadlock: .Result blocks the calling thread while awaiting completion
// The async method needs the same thread to continue → both wait forever
public IActionResult Get()
{
    var result = GetDataAsync().Result;  // ❌ DEADLOCK in ASP.NET classic
    return Ok(result);
}

// ✅ Fix: async all the way — never block on async code
public async Task<IActionResult> Get()
{
    var result = await GetDataAsync();  // ✅
    return Ok(result);
}
```

**② async void ← Silent Exception Killer**
```csharp
// ❌ async void: exceptions are unhandled, crash the process, cannot be awaited
public async void SendNotification(string msg)
{
    await _emailService.SendAsync(msg);  // exception here → process crash ❌
}

// ✅ async Task: exceptions propagate correctly, can be awaited
public async Task SendNotificationAsync(string msg)
{
    await _emailService.SendAsync(msg);  // exception caught by caller ✅
}

// async void ONLY acceptable for: event handlers (button click etc.)
button.Click += async (s, e) => { await DoWorkAsync(); };  // only valid use ✅
```

**③ ConfigureAwait(false)**
```csharp
// In library code (not ASP.NET controllers): avoid capturing synchronization context
public async Task<string> GetDataAsync()
{
    var data = await _httpClient.GetStringAsync(url).ConfigureAwait(false);
    // .ConfigureAwait(false): don't resume on original thread → no deadlock risk ✅
    return data;
}
// In ASP.NET Core: synchronization context removed — ConfigureAwait(false) not strictly needed
// In class libraries: always use ConfigureAwait(false) to be safe
```

**④ Not awaiting → fire and forget (silent failure)**
```csharp
// ❌ No await: exception silently swallowed, method returns before completion
SendNotificationAsync(msg);  // ← not awaited! "fire and forget"

// ✅ Await it
await SendNotificationAsync(msg);
```

**⑤ Async/await is NOT always faster**
```csharp
// For CPU-bound work: async adds overhead without benefit
// async/await shines for I/O-bound: HTTP calls, DB queries, file reads
// CPU-bound: use Task.Run to offload to thread pool
var result = await Task.Run(() => ExpensiveCpuCalculation());
```

### Memory Leaks in .NET

```csharp
// ① Event handlers not unsubscribed — most common memory leak
public class EngagementNotifier
{
    public EngagementNotifier(EventBus bus)
    {
        bus.OnEngagement += HandleEngagement;  // ← subscriber keeps EventBus alive ❌
        // If EngagementNotifier goes out of scope, EventBus still holds reference
    }

    // ✅ Fix: unsubscribe in Dispose
    public void Dispose()
    {
        bus.OnEngagement -= HandleEngagement;  // ✅
    }
}

// ② Static collections holding references
static List<EngagementActivity> _cache = new();  // never cleared → grows forever ❌
// Fix: use WeakReference, or bounded cache, or IMemoryCache with expiry ✅

// ③ Not disposing IDisposable (HttpClient, DbContext, FileStream)
var client = new HttpClient();  // ❌ socket exhaustion — never disposed
// ✅ Use IHttpClientFactory or using block
using var client = new HttpClient();

// ④ Long-lived DbContext — holds tracked entities in memory
// Capital Access: DbContext registered as Scoped (per HTTP request) — auto-disposed ✅
// Anti-pattern: Singleton DbContext → tracks everything forever ❌

// ⑤ Capturing variables in long-lived lambdas
var largeList = GetMillionItems();
Action callback = () => Console.WriteLine(largeList.Count);  // largeList can't be GC'd ❌
```

**How to detect memory leaks:**
- `dotnet-counters monitor` — watch GC heap size
- Visual Studio Diagnostic Tools → Memory Usage snapshot
- Application Insights memory metrics in production
- `GC.GetTotalMemory(false)` — check allocated bytes

---

## 9. Default Interface Methods vs Abstract Classes

### Default Interface Methods (C# 8+)
```csharp
public interface INotificationService
{
    Task SendAsync(string message);   // abstract — must implement

    // Default implementation — optional to override
    async Task SendWithRetryAsync(string message, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try { await SendAsync(message); return; }
            catch when (i < maxRetries - 1) { await Task.Delay(1000); }
        }
    }
}

// Implementing class — doesn't need to override SendWithRetryAsync
public class EmailNotificationService : INotificationService
{
    public async Task SendAsync(string message) { /* email logic */ }
    // Inherits SendWithRetryAsync for free ✅
}
```

### Interface vs Abstract Class — Decision Guide

| | Interface | Abstract Class |
|---|-----------|---------------|
| Multiple inheritance | ✅ A class can implement many | ❌ Only one base class |
| Constructor | ❌ | ✅ Can have constructor |
| State (fields) | ❌ No instance fields | ✅ Can have fields |
| Access modifiers | Public only (historically) | Any (public, protected, private) |
| Default methods | ✅ C# 8+ | ✅ Always |
| IS-A relationship | "can do" / capability | "is a" / true inheritance |
| When to use | Define a contract/capability (IDisposable, ILogger) | Share code + enforce structure (BaseController) |

**Capital Access:**
```csharp
// Interface: IEngagementService — any service that provides engagement operations
// Abstract class: BaseApiController — shared auth + error handling for all controllers
public abstract class BaseApiController : ControllerBase
{
    protected string TenantId => User.FindFirst("tenantId")?.Value;
    protected IActionResult HandleError(Exception ex) { /* common logic */ }
}
```

**When EPAM asks "why not just use abstract class?"**
→ Because a class can only inherit ONE abstract class, but implement MANY interfaces. Interfaces enable composition over inheritance. Default methods (C# 8+) close the gap by allowing shared implementation without forcing a class hierarchy.

---

## 10. Configuration — IOptions, IOptionsMonitor, IOptionsSnapshot, Key Vault

### Configuration Sources in .NET Core (priority order, last wins)
```
appsettings.json
→ appsettings.{Environment}.json (Development, Production)
→ Environment Variables
→ Azure Key Vault
→ Command-line arguments
```

```csharp
// appsettings.json
{
  "EngagementSettings": {
    "MaxAttendeesPerEvent": 500,
    "DefaultTimeoutSeconds": 30
  }
}

// POCO class
public class EngagementSettings
{
    public int MaxAttendeesPerEvent { get; set; }
    public int DefaultTimeoutSeconds { get; set; }
}

// Register
builder.Services.Configure<EngagementSettings>(
    builder.Configuration.GetSection("EngagementSettings"));
```

### IOptions\<T\> vs IOptionsSnapshot\<T\> vs IOptionsMonitor\<T\>

| | IOptions\<T\> | IOptionsSnapshot\<T\> | IOptionsMonitor\<T\> |
|---|--------------|----------------------|---------------------|
| Lifetime | Singleton | Scoped (per request) | Singleton |
| Reads config at | App startup only | Each request | App startup + on change |
| Reflects config changes | ❌ No | ✅ Yes (next request) | ✅ Yes (immediately via OnChange) |
| Use in | Singleton services | Scoped/Transient services | Background services + live reload |

```csharp
// IOptions<T> — config read once at startup, never reloads
public class EngagementService
{
    private readonly EngagementSettings _settings;
    public EngagementService(IOptions<EngagementSettings> options)
        => _settings = options.Value;  // cached forever ✅ for static config
}

// IOptionsSnapshot<T> — re-reads config each HTTP request (Scoped)
public class ReportController : ControllerBase
{
    public ReportController(IOptionsSnapshot<EngagementSettings> options)
        => _settings = options.Value;  // fresh value per request ✅
}

// IOptionsMonitor<T> — live reload + change notification (Singleton-safe)
public class BackgroundWorker : BackgroundService
{
    public BackgroundWorker(IOptionsMonitor<EngagementSettings> monitor)
    {
        _settings = monitor.CurrentValue;
        monitor.OnChange(newSettings => {
            _settings = newSettings;   // called when appsettings changes ✅
            _logger.LogInformation("Config reloaded");
        });
    }
}
```

### Azure Key Vault Integration
```csharp
// Program.cs — adds Key Vault as a configuration source
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{builder.Configuration["KeyVaultName"]}.vault.azure.net/"),
    new DefaultAzureCredential());  // uses Managed Identity in Azure ✅ (no secrets in code)

// Capital Access: database connection strings, Service Bus connection strings,
// Okta client secrets → all stored in Key Vault, retrieved via Managed Identity
// Never hardcode secrets in appsettings.json ✅
```

---

## 11. Content Negotiation

Content negotiation = client and server agree on the **format** of the response.

```
Client sends:  Accept: application/json     → "I want JSON"
               Accept: application/xml      → "I want XML"
               Accept: text/csv            → "I want CSV"

Server sends:  Content-Type: application/json  → "Here's JSON"
```

```csharp
// ASP.NET Core handles content negotiation automatically
// Add XML support (JSON is default)
builder.Services.AddControllers()
    .AddXmlSerializerFormatters();   // ✅ now supports Accept: application/xml

// Custom formatter (e.g., CSV)
builder.Services.AddControllers(options =>
    options.OutputFormatters.Add(new CsvOutputFormatter()));

// Capital Access: all APIs return JSON only
// Explicitly reject non-JSON requests:
builder.Services.AddControllers(options =>
    options.RespectBrowserAcceptHeader = true);

// [Produces] attribute: restrict to specific format
[Produces("application/json")]
[HttpGet("{id}")]
public async Task<IActionResult> GetEngagement(int id) { ... }
```

---

## 12. Correlation ID — Purpose and Generation

**What it is:** A unique ID attached to every request that travels through all microservices, logs, and external calls — so you can trace a single user action across the entire system.

```
User request → API Gateway → Engagement Service → Notification Service → Email Provider
               X-Correlation-ID: abc-123         abc-123                abc-123
                                   ↓
               All logs share same ID → grep "abc-123" → full trace ✅
```

**Capital Access implementation:**
```csharp
// Middleware: generate or forward Correlation ID on every request
public class CorrelationIdMiddleware
{
    private const string Header = "X-Correlation-ID";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Use incoming ID (from upstream service) or generate new one
        var correlationId = context.Request.Headers[Header].FirstOrDefault()
                         ?? Guid.NewGuid().ToString();

        // Store in HttpContext so controllers + services can read it
        context.Items[Header] = correlationId;

        // Echo back in response so client can trace their request
        context.Response.Headers[Header] = correlationId;

        // Add to logging scope — all log statements in this request include it
        using (_logger.BeginScope(new { CorrelationId = correlationId }))
        {
            await _next(context);
        }
    }
}

// Register in Program.cs
app.UseMiddleware<CorrelationIdMiddleware>();

// Forward to downstream services (HttpClient)
_httpClient.DefaultRequestHeaders.Add("X-Correlation-ID",
    _httpContext.Items["X-Correlation-ID"]?.ToString());
```

---

## 13. SQL Injection

**What it is:** Attacker inserts SQL code into user input that gets executed by the database.

```csharp
// ❌ Vulnerable: string concatenation builds raw SQL
string sql = "SELECT * FROM Users WHERE Email = '" + userInput + "'";
// Input: ' OR '1'='1
// Result: SELECT * FROM Users WHERE Email = '' OR '1'='1'
// Returns ALL users ❌

// Input: '; DROP TABLE Users; --
// Deletes entire Users table ❌
```

**Fixes:**
```csharp
// ✅ Fix 1: Parameterized queries (ADO.NET)
var cmd = new SqlCommand("SELECT * FROM Users WHERE Email = @Email", conn);
cmd.Parameters.AddWithValue("@Email", userInput);
// @Email is treated as DATA not SQL — injection impossible ✅

// ✅ Fix 2: sp_executesql for dynamic SQL
EXEC sp_executesql N'SELECT * FROM Users WHERE Email = @Email',
                   N'@Email NVARCHAR(200)', @Email = @userInput;

// ✅ Fix 3: EF Core (always parameterized automatically)
var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
// EF Core NEVER concatenates — always uses parameters ✅

// ✅ Fix 4: Stored Procedures (parameters enforced)
EXEC sp_GetUserByEmail @Email = @userInput;
```

**Additional protection:**
- Principle of least privilege: DB user has only SELECT/INSERT rights, not DROP ✅
- Input validation + model validation attributes
- Web Application Firewall (WAF) in Azure

---

## 14. SQL Views

**What is a View?** A stored SELECT query — behaves like a virtual table.
```sql
-- Standard view — stored query, no physical storage, always fresh data
CREATE VIEW vw_PendingEngagements AS
SELECT e.Id, e.TenantId, e.CompanyId, e.Status, c.CompanyName
FROM   EngagementActivities e
JOIN   Companies c ON c.Id = e.CompanyId
WHERE  e.Status = 'Pending';

-- Use like a table
SELECT * FROM vw_PendingEngagements WHERE TenantId = 'spg-001';
```

**Benefits:**
- Simplifies complex queries for consumers
- Security: expose only specific columns (hide sensitive data)
- Backward compatibility: underlying table changes, view stays the same

**Indexed (Materialized) View** — physically stores the result:
```sql
CREATE VIEW vw_TenantEngagementSummary WITH SCHEMABINDING AS
SELECT TenantId, COUNT_BIG(*) AS Total, SUM(AttendeeCount) AS TotalAttendees
FROM dbo.EngagementActivities
GROUP BY TenantId;

CREATE UNIQUE CLUSTERED INDEX IX_vw_Summary ON vw_TenantEngagementSummary(TenantId);
-- Now SQL Server maintains this pre-computed result and updates it on DML ✅
-- Fast for heavy aggregation queries ✅
```

**Which operation does having many non-clustered indexes slow down?**
→ **Write operations (INSERT, UPDATE, DELETE)** — every write must update ALL indexes ❌
→ Read operations get FASTER with more indexes ✅

---

## 15. Clean Architecture

```
┌─────────────────────────────────┐
│         Presentation            │  Controllers, API endpoints, Angular
├─────────────────────────────────┤
│         Application             │  Use Cases, CQRS Commands/Queries, DTOs
├─────────────────────────────────┤
│           Domain                │  Entities, Value Objects, Domain Events (no dependencies)
├─────────────────────────────────┤
│        Infrastructure           │  EF Core, Azure Service Bus, HTTP Clients, Key Vault
└─────────────────────────────────┘

Dependency Rule: outer layers depend on inner layers. Inner layers know NOTHING about outer layers.
Domain has zero external dependencies ✅
```

**Benefits:**
- Testable: domain logic tested without DB or HTTP
- Swappable: replace EF Core with Dapper → only Infrastructure changes
- Clear boundaries: each layer has one responsibility

**Capital Access:** Engagement service uses Clean Architecture — MediatR handles CQRS commands in Application layer, EF Core in Infrastructure, domain entities in Domain layer.

---

## 16. How to Scale a Service

```
Vertical Scaling (Scale Up):   Bigger machine — more CPU/RAM. Limited ceiling. ❌ single point of failure
Horizontal Scaling (Scale Out): More instances behind a load balancer ✅ preferred
```

**Stateless design** — required for horizontal scaling:
```csharp
// ❌ Stateful: session stored in memory — sticky routing needed
HttpContext.Session.SetString("userId", id);

// ✅ Stateless: JWT carries state, Redis for shared cache
// Any instance can handle any request ✅
```

**Capital Access scaling strategies:**
- Azure Kubernetes Service (AKS) — auto-scale pods on CPU/memory
- Azure Service Bus — decouple services, absorb traffic spikes
- Redis cache — reduce DB load on hot read paths
- Async processing — Azure Functions / Durable Functions for long-running work
- Read replicas — route read-only queries away from primary DB
- API Gateway — rate limiting, load distribution

---

## 17. .NET Framework 4.7 → Modern .NET Migration

**Why migrate?**
- Cross-platform (Linux containers, AKS)
- Performance: .NET 8 is 3-5× faster than .NET Framework
- Modern features: minimal APIs, top-level statements, EF Core 8
- .NET Framework is in maintenance mode — no new features

**Migration approach (phased):**

```
Phase 1: Compatibility Analysis
  → Run .NET Upgrade Assistant: dotnet tool install -g upgrade-assistant
  → identifies incompatible NuGet packages, deprecated APIs
  → run: upgrade-assistant analyze MyApp.sln

Phase 2: Migrate Libraries First (bottom-up)
  → Convert class libraries to .NET Standard 2.0 first (compatible with both)
  → Replace incompatible packages (System.Web → Microsoft.AspNetCore)
  → Remove HttpContext.Current → IHttpContextAccessor

Phase 3: Migrate Entry Point (Web/API project)
  → Replace Global.asax → Program.cs + Startup.cs pattern
  → Replace Web.config → appsettings.json + environment variables
  → Replace System.Web.Http → Microsoft.AspNetCore.Mvc
  → Replace Unity/Autofac DI → built-in Microsoft.Extensions.DependencyInjection

Phase 4: Run Both in Parallel (Strangler Fig)
  → Route some traffic to new service while old runs
  → Gradually shift 100% when confident

Phase 5: Decommission old service
```

**DI in .NET Framework 4.7** (before built-in DI):
```csharp
// Had to use third-party containers:
// Unity: container.RegisterType<IEngagementService, EngagementService>();
// Autofac: builder.RegisterType<EngagementService>().As<IEngagementService>();
// Ninject, Castle Windsor, StructureMap

// .NET Core 2.0+: built-in DI
services.AddScoped<IEngagementService, EngagementService>();
```

---

## 18. MCP (Model Context Protocol) Server

**What is MCP?**
An open protocol (by Anthropic) that lets AI assistants (Claude, Copilot) connect to external tools and data sources in a standardized way.

```
Without MCP:  AI has only training data — no live system access
With MCP:     AI connects to your DB, APIs, file system via MCP servers

Architecture:
  AI (Claude) ←→ MCP Client ←→ MCP Server ←→ Your Tool/Data
```

**MCP Server exposes three things:**
```
Tools:     Functions AI can call (e.g., createEngagement, getInvestorProfile)
Resources: Data AI can read (e.g., files, DB records)
Prompts:   Reusable prompt templates
```

**Capital Access example — MCP server for engagement data:**
```typescript
// MCP Server (TypeScript/Node)
server.tool("getEngagementsByTenant", async ({ tenantId }) => {
    const data = await db.query(
        "SELECT * FROM EngagementActivities WHERE TenantId = ?", [tenantId]
    );
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
// Claude can now call this tool to answer "What engagements does spg-001 have?"
```

**How Claude Code uses MCP in this session:**
- Connected to your file system as an MCP server
- Reading/writing files, running git commands
- All through the MCP protocol

---

## 19. Observability in Microservices

**Three pillars:**

```
Logs:    What happened?           → Application Insights, Serilog, ELK Stack
Metrics: How is the system?       → Prometheus, Grafana, Azure Monitor (CPU, req/s, latency)
Traces:  Where did time go?       → Distributed tracing with Correlation ID across services
```

**Capital Access:**
```csharp
// Structured logging with Serilog + Application Insights
Log.Information("Engagement created {@EngagementId} for {@TenantId}", id, tenantId);
// JSON log: searchable in Application Insights ✅

// Correlation ID flows through all services (see section 12)
// Health checks exposed for AKS liveness/readiness probes
app.MapHealthChecks("/health");
```

**How to debug slow API response time:**
1. Check Application Insights → requests → slow requests → drill into traces
2. Look at dependency calls — is DB slow? External API slow?
3. Check SQL execution plans for slow queries
4. Use distributed trace → find which service/step takes the most time
5. Check CPU/memory metrics — is the service overloaded?
6. Check connection pool exhaustion (too many concurrent DB connections)

---

## 20. How to Track Issues in Production

```
1. Centralized Logging:    Application Insights / ELK Stack
   → Search by Correlation ID, Exception type, TenantId
   → Alert on error rate spike

2. Exception Monitoring:   Application Insights Exceptions blade
   → Stack trace, request details, frequency

3. Health Checks:          /health endpoint → AKS restarts unhealthy pods
   app.MapHealthChecks("/health/live");   // liveness: is app alive?
   app.MapHealthChecks("/health/ready");  // readiness: is app ready for traffic?

4. Alerts:                 Azure Monitor alerts → PagerDuty / Teams notifications
   → Alert: error rate > 5% in 5 minutes
   → Alert: p99 latency > 2000ms

5. Blue-Green / Canary:    Deploy to 10% traffic first
   → Monitor error rate before full rollout

Capital Access:
  → Application Insights for logs + traces
  → Correlation ID on all requests (X-Correlation-ID header)
  → Azure Service Bus dead-letter queue monitoring for failed messages
```
