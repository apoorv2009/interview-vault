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
4. [.NET Core & ASP.NET Core](#4-net-core--aspnet-core)
5. [Entity Framework Core](#5-entity-framework-core)
6. [LINQ](#6-linq)

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

## 4. .NET Core & ASP.NET Core

<!-- Content added in next session -->

## 5. Entity Framework Core

<!-- Content added in next session -->

## 6. LINQ

<!-- Content added in next session -->
